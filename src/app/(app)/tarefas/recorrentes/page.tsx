import type { Metadata } from "next";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";

import {
  RecurrencesPanel,
  type Destinatario,
  type RegraNaTela,
} from "./recurrences-panel";
import { PageHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { task, TASK_CLOSED_STATUSES } from "@/lib/db/schema";
import { seesEverything } from "@/lib/modules/access/scope";
import { listOrgUnits } from "@/lib/modules/org/queries";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import {
  descreverRecorrencia,
  listRecurrences,
  proximaOcorrencia,
} from "@/lib/modules/tasks/recurrence";
import { listAssignableUsers } from "@/lib/modules/tasks/queries";
import { sortByName } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Tarefas recorrentes" };
export const dynamic = "force-dynamic";

export default async function RecorrentesPage() {
  const currentUser = await requirePermission("tasks", "view");
  const podeEditar = can(currentUser, "tasks", "edit");
  const veTudo = seesEverything(currentUser.scope);

  const regras = await listRecurrences(currentUser.id, veTudo || podeEditar);

  const db = await getDb();

  // Quantas ocorrências cada molde já gerou e quantas continuam abertas: é o
  // que diz se a recorrência está sendo cumprida ou só acumulando fila.
  const geradas =
    regras.length > 0
      ? await db
          .select({
            recurrenceId: task.recurrenceId,
            status: task.status,
          })
          .from(task)
          .where(
            inArray(
              task.recurrenceId,
              regras.map((regra) => regra.id),
            ),
          )
      : [];

  const [pessoas, unidades, bus] = await Promise.all([
    podeEditar ? listAssignableUsers() : Promise.resolve([]),
    podeEditar ? listOrgUnits() : Promise.resolve([]),
    listAccessibleBusinessUnits(currentUser),
  ]);

  const nomeDaPessoa = new Map(pessoas.map((p) => [p.id, p.name]));
  const nomeDoTime = new Map(unidades.map((u) => [u.id, u.name]));

  const agora = new Date();

  const naTela: RegraNaTela[] = regras.map((regra) => {
    const minhas = geradas.filter((linha) => linha.recurrenceId === regra.id);
    return {
      id: regra.id,
      title: regra.title,
      description: regra.description,
      priority: regra.priority,
      assigneeId: regra.assigneeId,
      assigneeName: regra.assigneeId
        ? (nomeDaPessoa.get(regra.assigneeId) ?? "alguém")
        : null,
      assignedTeamId: regra.assignedTeamId,
      assignedTeamName: regra.assignedTeamId
        ? `time ${nomeDoTime.get(regra.assignedTeamId) ?? "removido"}`
        : null,
      businessUnitId: regra.businessUnitId,
      frequency: regra.frequency,
      weekday: regra.weekday,
      dayOfMonth: regra.dayOfMonth,
      dueInDays: regra.dueInDays,
      isActive: regra.isActive,
      descricao: descreverRecorrencia(regra),
      proxima: proximaOcorrencia(regra, agora).toISOString(),
      geradas: minhas.length,
      abertas: minhas.filter(
        (linha) => !TASK_CLOSED_STATUSES.includes(linha.status),
      ).length,
    };
  });

  const destinatarios: Destinatario[] = [
    ...sortByName(pessoas, (pessoa) => pessoa.name).map((pessoa) => ({
      value: pessoa.id,
      label: pessoa.name,
      hint: pessoa.label ?? undefined,
      tipo: "pessoa" as const,
    })),
    ...sortByName(
      unidades.filter((unidade) => unidade.isActive),
      (unidade) => unidade.name,
    ).map((unidade) => ({
      value: unidade.id,
      label: unidade.name,
      hint: unidade.path,
      tipo: "time" as const,
    })),
  ];

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/tarefas" className="hover:text-slate-900">
          Tarefas
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">Recorrentes</span>
      </nav>

      <PageHeader
        title="Tarefas recorrentes"
        description="O que se repete em data fixa. Cada ocorrência vira uma tarefa de verdade no board de quem responde por ela — com prazo, situação e histórico próprios."
      />

      <RecurrencesPanel
        regras={naTela}
        destinatarios={destinatarios}
        businessUnits={bus.map((unidade) => ({
          id: unidade.id,
          label: unidade.label,
        }))}
        podeEditar={podeEditar}
      />
    </>
  );
}
