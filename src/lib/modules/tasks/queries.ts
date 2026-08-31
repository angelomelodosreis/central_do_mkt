import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNull,
  not,
  notInArray,
  or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";

import type { CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  task,
  team,
  teamMember,
  user,
  TASK_CLOSED_STATUSES,
  TASK_STATUSES,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/db/schema";
import { seesEverything } from "@/lib/modules/access/scope";
import { describePositions, listPeople } from "@/lib/modules/org/people";
import type { TaskRelation } from "@/lib/modules/tasks/state";

export type TaskListItem = Task & {
  assigneeName: string | null;
  assignedTeamName: string | null;
  businessUnitLabel: string | null;
  businessUnitSlug: string | null;
  createdByName: string | null;
};

/** Ordem de urgência, para o SQL ordenar sem depender do alfabeto. */
const PRIORITY_RANK: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * `user` entra duas vezes na listagem — responsável e quem delegou —, então
 * precisa de apelido. Sem ele, a segunda junção sobrescreveria a primeira e o
 * nome de quem delegou sairia igual ao do responsável.
 */
const assignee = alias(user, "assignee");
const creator = alias(user, "creator");

function baseQuery(db: Awaited<ReturnType<typeof getDb>>) {
  return db
    .select({
      task,
      assigneeName: assignee.name,
      createdByName: creator.name,
      assignedTeamName: team.name,
      businessUnitLabel: businessUnit.label,
      businessUnitSlug: businessUnit.slug,
    })
    .from(task)
    .leftJoin(assignee, eq(task.assigneeId, assignee.id))
    .leftJoin(creator, eq(task.createdBy, creator.id))
    .leftJoin(team, eq(task.assignedTeamId, team.id))
    .leftJoin(businessUnit, eq(task.businessUnitId, businessUnit.id));
}

function toItem(row: {
  task: Task;
  assigneeName: string | null;
  createdByName: string | null;
  assignedTeamName: string | null;
  businessUnitLabel: string | null;
  businessUnitSlug: string | null;
}): TaskListItem {
  return {
    ...row.task,
    assigneeName: row.assigneeName,
    createdByName: row.createdByName,
    assignedTeamName: row.assignedTeamName,
    businessUnitLabel: row.businessUnitLabel,
    businessUnitSlug: row.businessUnitSlug,
  };
}

/** Ordena por urgência, depois por prazo, depois pelas mais recentes. */
export function sortTasks(items: TaskListItem[]): TaskListItem[] {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (byPriority !== 0) return byPriority;

    // Sem prazo vai para o fim: uma tarefa com data marcada é mais urgente que
    // uma sem, na mesma prioridade.
    const aDue = a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    const bDue = b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;

    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * A condição "está na minha fila", em SQL.
 *
 * Extraída porque duas listas dependem dela em sentidos opostos: a fila usa a
 * condição, e o acompanhamento do que foi delegado usa a NEGAÇÃO dela. Com as
 * duas escritas à mão, elas divergem — e foi o que fez uma tarefa endereçada ao
 * próprio time aparecer nas duas listas ao mesmo tempo.
 */
function minhaFila(currentUser: CurrentUser) {
  const atribuidaAMim = eq(task.assigneeId, currentUser.id);

  // As unidades incluem as de CIMA: uma tarefa endereçada a "Conteúdo" é para
  // quem está em Conteúdo, e quem está em Design está dentro dele. Sem os
  // ancestrais, endereçar ao subsetor não chegaria a ninguém.
  const unidades = [...currentUser.scope.taskOrgUnitIds];
  if (unidades.length === 0) return atribuidaAMim;

  return or(
    atribuidaAMim,
    // Tarefa de QUALQUER uma das minhas unidades conta como minha enquanto
    // ninguém a assumiu — quem atende três frentes recebe a fila das três.
    and(inArray(task.assignedTeamId, unidades), isNull(task.assigneeId)),
  )!;
}

/**
 * Como a pessoa se relaciona com uma tarefa.
 *
 * Um lugar só decide isso, e é consultado pela tela e pelo servidor. Enquanto
 * cada um calculava por conta própria, "quem pode concluir" e "quem vê o botão
 * de concluir" eram duas respostas diferentes para a mesma pergunta.
 */
export function relationFor(
  currentUser: CurrentUser,
  item: Pick<Task, "assigneeId" | "assignedTeamId" | "createdBy">,
  { canDelegate }: { canDelegate: boolean },
): TaskRelation {
  const daMinhaUnidade =
    item.assignedTeamId !== null &&
    currentUser.scope.taskOrgUnitIds.has(item.assignedTeamId);

  return {
    isAssignee: item.assigneeId === currentUser.id,
    // Quem delega (coordenação) gere as tarefas alheias; quem criou gere as
    // suas. As duas coisas dão a mesma visão de acompanhamento.
    isDelegator: item.createdBy === currentUser.id || canDelegate,
    canClaim: daMinhaUnidade && !item.assigneeId,
  };
}

/**
 * Todas as tarefas dentro do ESCOPO da pessoa.
 *
 * Existe para quem coordena: sem uma visão geral, acompanhar a equipe exigiria
 * abrir a fila de cada pessoa uma a uma.
 *
 * O recorte é o escopo de responsabilidade, e é aqui que a herança faz
 * trabalho de verdade: quem responde pelo subsetor Conteúdo enxerga as tarefas
 * dos cinco times abaixo dele sem que ninguém precise cadastrar os cinco — e
 * enxerga as do time que nascer amanhã. Quem responde só pela própria unidade
 * vê só a dela, mesmo tendo o mesmo cargo.
 */
export async function listAllTasks(
  currentUser: CurrentUser,
  { includeClosed = false }: { includeClosed?: boolean } = {},
): Promise<TaskListItem[]> {
  const db = await getDb();
  const abertas = includeClosed
    ? undefined
    : notInArray(task.status, TASK_CLOSED_STATUSES);

  if (seesEverything(currentUser.scope)) {
    const rows = await baseQuery(db).where(abertas).orderBy(asc(task.dueDate));
    return sortTasks(rows.map(toItem));
  }

  const unidades = [...currentUser.scope.orgUnitIds];
  if (unidades.length === 0) return [];

  // Quem está nas unidades sob responsabilidade — o escopo alcança as pessoas,
  // não só as filas endereçadas às unidades.
  const pessoas = await db
    .select({ userId: teamMember.userId })
    .from(teamMember)
    .where(inArray(teamMember.teamId, unidades));

  const ids = [...new Set(pessoas.map((linha) => linha.userId))];

  const doEscopo = or(
    inArray(task.assignedTeamId, unidades),
    ids.length > 0 ? inArray(task.assigneeId, ids) : undefined,
  )!;

  const rows = await baseQuery(db)
    .where(abertas ? and(doEscopo, abertas) : doEscopo)
    .orderBy(asc(task.dueDate));

  return sortTasks(rows.map(toItem));
}

/**
 * A fila de uma pessoa: o que é dela e o que está aberto para o time dela.
 *
 * As duas coisas na mesma lista de propósito. Uma tarefa endereçada ao time é
 * trabalho que precisa de dono — separá-la numa outra aba é o caminho mais curto
 * para ninguém assumi-la.
 */
export async function listMyTasks(
  currentUser: CurrentUser,
  { includeClosed = false }: { includeClosed?: boolean } = {},
): Promise<TaskListItem[]> {
  const db = await getDb();

  const mine = minhaFila(currentUser);

  const rows = await baseQuery(db)
    .where(
      includeClosed
        ? mine
        : and(mine, notInArray(task.status, TASK_CLOSED_STATUSES)),
    )
    .orderBy(asc(task.dueDate));

  return sortTasks(rows.map(toItem));
}

/** O que a pessoa passou para outras — a visão de quem delegou. */
export async function listTasksIDelegated(
  currentUser: CurrentUser,
  { includeClosed = false }: { includeClosed?: boolean } = {},
): Promise<TaskListItem[]> {
  const db = await getDb();

  // Criada por mim E fora da minha fila.
  //
  // A segunda metade não é detalhe: quem delega para o próprio time continua
  // sendo do time, então a tarefa cairia nas DUAS listas e a tela mostraria a
  // mesma pendência duas vezes. "Fora da minha fila" é exatamente o
  // complemento de `listMyTasks`, e as duas definições precisam andar juntas.
  const criadas = and(
    eq(task.createdBy, currentUser.id),
    not(minhaFila(currentUser)),
  );

  const rows = await baseQuery(db)
    .where(
      includeClosed
        ? criadas
        : and(criadas, notInArray(task.status, TASK_CLOSED_STATUSES)),
    )
    .orderBy(asc(task.dueDate));

  return sortTasks(rows.map(toItem));
}

/**
 * Tarefas encerradas que dizem respeito à pessoa.
 *
 * Inclui as que ela executou E as que ela delegou, porque as duas respondem à
 * mesma pergunta ("o que saiu da frente?") e separá-las obrigaria a olhar duas
 * listas para ter o histórico. Ordenadas pela conclusão, não pela criação: o que
 * interessa num histórico é o que terminou por último.
 */
export async function listClosedTasks(
  currentUser: CurrentUser,
  { limit = 60 }: { limit?: number } = {},
): Promise<TaskListItem[]> {
  const db = await getDb();

  const minhas = or(
    eq(task.assigneeId, currentUser.id),
    eq(task.createdBy, currentUser.id),
  );

  const rows = await baseQuery(db)
    .where(and(minhas, inArray(task.status, TASK_CLOSED_STATUSES)))
    .orderBy(desc(task.completedAt), desc(task.updatedAt))
    .limit(limit);

  return rows.map(toItem);
}

/**
 * Quantas tarefas delegadas estão em cada situação.
 *
 * É o resumo que faltava para acompanhar sem ler a lista inteira: saber que há
 * três travadas é o que faz alguém abrir a lista. Calculado em memória sobre as
 * tarefas já carregadas, para não repetir a consulta com um `group by`.
 */
export function summarizeByStatus(
  items: TaskListItem[],
): Array<{ status: TaskStatus; total: number }> {
  const contagem = new Map<TaskStatus, number>();
  for (const item of items) {
    contagem.set(item.status, (contagem.get(item.status) ?? 0) + 1);
  }

  // Ordem fixa (a do enum), e não por contagem: um resumo que reordena a cada
  // carregamento obriga a reler os rótulos toda vez.
  return TASK_STATUSES.filter((status) => contagem.has(status)).map(
    (status) => ({
      status,
      total: contagem.get(status)!,
    }),
  );
}

/** Tarefas de uma BU, para a visão geral do espaço de trabalho. */
export async function listTasksOfBusinessUnit(
  businessUnitId: string,
  { includeClosed = false }: { includeClosed?: boolean } = {},
): Promise<TaskListItem[]> {
  const db = await getDb();

  const daBu = eq(task.businessUnitId, businessUnitId);
  const rows = await baseQuery(db)
    .where(
      includeClosed
        ? daBu
        : and(daBu, notInArray(task.status, TASK_CLOSED_STATUSES)),
    )
    .orderBy(asc(task.dueDate));

  return sortTasks(rows.map(toItem));
}

/**
 * Uma tarefa, se a pessoa pode vê-la.
 *
 * Pode ver quem é o responsável, quem é do time destinatário, quem criou — e a
 * coordenação. Fora disso a tarefa responde como inexistente: a lista de
 * pendências de alguém é informação dele.
 */
export async function getTaskForUser(
  taskId: string,
  currentUser: CurrentUser,
): Promise<TaskListItem | null> {
  const db = await getDb();

  const row = await baseQuery(db).where(eq(task.id, taskId)).get();
  if (!row) return null;

  const item = toItem(row);

  if (seesEverything(currentUser.scope)) return item;
  if (item.assigneeId === currentUser.id) return item;
  if (item.createdBy === currentUser.id) return item;
  if (
    item.assignedTeamId &&
    currentUser.scope.taskOrgUnitIds.has(item.assignedTeamId)
  ) {
    return item;
  }

  return null;
}

/** Contagens da fila, para os avisos do painel e do menu. */
export async function countMyOpenTasks(
  currentUser: CurrentUser,
): Promise<{ total: number; atrasadas: number }> {
  const tasks = await listMyTasks(currentUser);
  const now = Date.now();

  return {
    total: tasks.length,
    atrasadas: tasks.filter(
      (item) => item.dueDate && item.dueDate.getTime() < now,
    ).length,
  };
}

/**
 * Pessoas ativas a quem se pode endereçar uma tarefa.
 *
 * O rótulo vem de `describePositions`, que resume os vários times numa linha —
 * quem atende três squads apareceria três vezes no seletor se cada vínculo
 * virasse uma opção.
 */
export async function listAssignableUsers(): Promise<
  Array<{ id: string; name: string; label: string | null }>
> {
  const people = await listPeople();
  return people.map((person) => ({
    id: person.id,
    name: person.name,
    label: describePositions(person.positions, person.jobTitleName),
  }));
}

/** Usado pela tela de auditoria e pelos testes de escopo. */
export async function listTasksByIds(ids: string[]): Promise<Task[]> {
  if (ids.length === 0) return [];
  const db = await getDb();
  return db
    .select()
    .from(task)
    .where(inArray(task.id, ids))
    .orderBy(desc(task.createdAt));
}
