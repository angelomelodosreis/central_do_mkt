import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  task,
  taskRecurrence,
  RECURRENCE_FREQUENCY_LABELS,
  WEEKDAY_LABELS,
  type RecurrenceFrequency,
  type TaskRecurrence,
} from "@/lib/db/schema";
import { newId } from "@/lib/utils/id";

const DIA = 86_400_000;

/** Meia-noite local — a data da ocorrência é um dia, não um instante. */
function meiaNoite(data: Date): Date {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  return copia;
}

/**
 * As datas em que um molde deveria ter produzido tarefa até hoje.
 *
 * Olha para trás numa janela curta e não desde sempre: quem cria uma
 * recorrência semanal hoje não quer as 52 ocorrências do ano passado
 * aparecendo na fila de uma vez. Quatro semanas é o bastante para cobrir a
 * volta de férias de quem ficou fora e ainda assim não entulhar o board.
 */
const JANELA_DE_RECUPERACAO = 28 * DIA;

export function ocorrenciasDevidas(
  regra: Pick<
    TaskRecurrence,
    "frequency" | "weekday" | "dayOfMonth" | "createdAt"
  >,
  ate: Date,
): Date[] {
  const fim = meiaNoite(ate);
  const inicio = meiaNoite(
    new Date(
      Math.max(
        fim.getTime() - JANELA_DE_RECUPERACAO,
        regra.createdAt.getTime(),
      ),
    ),
  );

  const datas: Date[] = [];

  if (regra.frequency === "monthly") {
    // Percorre mês a mês a partir do mês do início. `dia 0` do mês seguinte é
    // o último do mês atual, que é como o dia 31 vira 28 em fevereiro em vez
    // de escorregar para março.
    const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
    while (cursor <= fim) {
      const ultimoDia = new Date(
        cursor.getFullYear(),
        cursor.getMonth() + 1,
        0,
      ).getDate();
      const dia = Math.min(regra.dayOfMonth, ultimoDia);
      const data = new Date(cursor.getFullYear(), cursor.getMonth(), dia);
      if (data >= inicio && data <= fim) datas.push(data);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return datas;
  }

  const passo = regra.frequency === "biweekly" ? 14 : 7;

  // Ancora na primeira ocorrência do dia da semana pedido a partir da criação
  // da regra: em `biweekly`, é ela que decide quais são as semanas "sim".
  const ancora = meiaNoite(regra.createdAt);
  const ajuste = (regra.weekday - ancora.getDay() + 7) % 7;
  const cursor = new Date(ancora.getTime() + ajuste * DIA);

  while (cursor <= fim) {
    if (cursor >= inicio) datas.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + passo);
  }

  return datas;
}

/**
 * Cria as tarefas que os moldes ativos já deviam ter produzido.
 *
 * Roda na abertura das Tarefas em vez de num agendador: a plataforma não tem
 * processo de fundo, e um agendador seria infraestrutura nova para resolver
 * algo que a primeira visita do dia resolve. O efeito prático é o mesmo — a
 * tarefa aparece no board de quem abre a tela — e o custo é uma consulta a
 * mais numa página que já faz várias.
 *
 * A chave única (recorrência, data) é a rede de segurança: duas abas abrindo
 * ao mesmo tempo tentam inserir a mesma ocorrência, e o banco recusa a
 * segunda em vez de duplicar a tarefa.
 */
export async function materializeRecurrences(
  agora = new Date(),
): Promise<number> {
  const db = await getDb();

  const regras = await db
    .select()
    .from(taskRecurrence)
    .where(eq(taskRecurrence.isActive, true));

  if (regras.length === 0) return 0;

  const jaCriadas = await db
    .select({
      recurrenceId: task.recurrenceId,
      occurrenceDate: task.occurrenceDate,
    })
    .from(task)
    .where(
      inArray(
        task.recurrenceId,
        regras.map((regra) => regra.id),
      ),
    );

  const existentes = new Set(
    jaCriadas
      .filter((linha) => linha.recurrenceId && linha.occurrenceDate)
      .map(
        (linha) => `${linha.recurrenceId}:${linha.occurrenceDate!.getTime()}`,
      ),
  );

  let criadas = 0;

  for (const regra of regras) {
    for (const data of ocorrenciasDevidas(regra, agora)) {
      const chave = `${regra.id}:${data.getTime()}`;
      if (existentes.has(chave)) continue;

      try {
        await db.insert(task).values({
          id: newId("tsk"),
          title: regra.title,
          description: regra.description,
          status: "todo",
          priority: regra.priority,
          dueDate:
            regra.dueInDays > 0
              ? new Date(data.getTime() + regra.dueInDays * DIA)
              : data,
          assigneeId: regra.assigneeId,
          assignedTeamId: regra.assigneeId ? null : regra.assignedTeamId,
          businessUnitId: regra.businessUnitId,
          recurrenceId: regra.id,
          occurrenceDate: data,
          createdBy: regra.createdBy,
          createdAt: agora,
          updatedAt: agora,
        });
        existentes.add(chave);
        criadas += 1;
      } catch {
        // Colisão da chave única: outra aba criou esta mesma ocorrência entre
        // a leitura e a escrita. É o resultado desejado — a tarefa existe.
      }
    }
  }

  return criadas;
}

/** "Toda semana, sexta" · "Todo mês, dia 5" — a regra em uma linha. */
export function descreverRecorrencia(regra: {
  frequency: RecurrenceFrequency;
  weekday: number;
  dayOfMonth: number;
}): string {
  if (regra.frequency === "monthly") {
    return `${RECURRENCE_FREQUENCY_LABELS.monthly}, dia ${regra.dayOfMonth}`;
  }
  return `${RECURRENCE_FREQUENCY_LABELS[regra.frequency]}, ${WEEKDAY_LABELS[regra.weekday] ?? "segunda"}`;
}

/** A próxima data em que o molde vai gerar tarefa. */
export function proximaOcorrencia(
  regra: Pick<
    TaskRecurrence,
    "frequency" | "weekday" | "dayOfMonth" | "createdAt"
  >,
  agora = new Date(),
): Date {
  const hoje = meiaNoite(agora);

  if (regra.frequency === "monthly") {
    const nesteMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      Math.min(
        regra.dayOfMonth,
        new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate(),
      ),
    );
    if (nesteMes > hoje) return nesteMes;
    const proximo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1);
    return new Date(
      proximo.getFullYear(),
      proximo.getMonth(),
      Math.min(
        regra.dayOfMonth,
        new Date(proximo.getFullYear(), proximo.getMonth() + 1, 0).getDate(),
      ),
    );
  }

  const passo = regra.frequency === "biweekly" ? 14 : 7;
  const ancora = meiaNoite(regra.createdAt);
  const ajuste = (regra.weekday - ancora.getDay() + 7) % 7;
  const cursor = new Date(ancora.getTime() + ajuste * DIA);
  while (cursor <= hoje) cursor.setDate(cursor.getDate() + passo);
  return cursor;
}

/** As regras que uma pessoa pode ver: as que ela criou ou que caem para ela. */
export async function listRecurrences(userId: string, todas: boolean) {
  const db = await getDb();
  const linhas = await db.select().from(taskRecurrence);

  return todas
    ? linhas
    : linhas.filter(
        (regra) => regra.createdBy === userId || regra.assigneeId === userId,
      );
}

export async function getRecurrence(id: string) {
  const db = await getDb();
  return db
    .select()
    .from(taskRecurrence)
    .where(and(eq(taskRecurrence.id, id)))
    .get();
}
