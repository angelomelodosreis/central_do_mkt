import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { TaskRow, type TaskRowData } from "../tarefas/task-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  SectionTitle,
} from "@/components/ui/card";
import { can, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { MODULE_LABELS, user } from "@/lib/db/schema";
import { describePositions } from "@/lib/modules/org/people";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { listMyTasks, relationFor } from "@/lib/modules/tasks/queries";
import { plural } from "@/lib/utils/text";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; modulo?: string }>;
}) {
  const currentUser = await requireUser();
  const { erro, modulo } = await searchParams;

  const db = await getDb();

  const [tarefas, minhasBus, pendentes] = await Promise.all([
    can(currentUser, "tasks") ? listMyTasks(currentUser) : Promise.resolve([]),
    can(currentUser, "strategy")
      ? listAccessibleBusinessUnits(currentUser)
      : Promise.resolve([]),
    currentUser.role === "admin"
      ? db
          .select({ total: count() })
          .from(user)
          .where(eq(user.status, "pending"))
      : Promise.resolve([{ total: 0 }]),
  ]);

  const pendingUsers = pendentes[0].total;
  const atrasadas = tarefas.filter(
    (item) => item.dueDate && item.dueDate.getTime() < Date.now(),
  ).length;

  // As BUs em que a pessoa trabalha vêm primeiro: para um analista, é o atalho
  // que ele usa todo dia.
  const bus = minhasBus.filter((unit) => unit.isMember);
  const buParaMostrar = bus.length > 0 ? bus : minhasBus.slice(0, 6);

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;
  const deniedModuleLabel =
    modulo && modulo in MODULE_LABELS
      ? MODULE_LABELS[modulo as keyof typeof MODULE_LABELS]
      : null;

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description={
          describePositions(currentUser.positions, currentUser.jobTitleName) ??
          "Ferramentas, processos e estratégia do marketing da MedCof em um só lugar."
        }
      />

      {pendingUsers > 0 ? (
        <Link
          href="/admin/usuarios"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100"
        >
          <span
            aria-hidden
            className="size-2 shrink-0 rounded-full bg-amber-500"
          />
          <span className="min-w-0 flex-1">
            <strong className="font-medium">
              {plural(pendingUsers, "cadastro")}
            </strong>{" "}
            {pendingUsers === 1 ? "aguarda" : "aguardam"} aprovação. Sem isso,
            {pendingUsers === 1
              ? " essa pessoa não acessa"
              : " essas pessoas não acessam"}{" "}
            nada.
          </span>
          <span aria-hidden className="shrink-0 text-amber-700">
            →
          </span>
        </Link>
      ) : null}

      {erro === "sem-permissao" ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Você não tem permissão para acessar
          {deniedModuleLabel ? ` o módulo ${deniedModuleLabel}` : " essa área"}.
          Fale com um administrador se precisar desse acesso.
        </div>
      ) : null}

      {/* A fila vem primeiro. É a pergunta que a pessoa abre a ferramenta para
          responder — antes de qualquer atalho ou número agregado. */}
      {can(currentUser, "tasks") ? (
        <Card className={atrasadas > 0 ? "mb-6 border-danger-200" : "mb-6"}>
          <CardHeader
            title={
              tarefas.length === 0
                ? "Minhas tarefas"
                : `Minhas tarefas (${tarefas.length})`
            }
            description={
              atrasadas > 0
                ? `${atrasadas} ${atrasadas === 1 ? "está atrasada" : "estão atrasadas"}.`
                : "O que está na sua fila e na do seu time."
            }
            action={
              <ButtonLink href="/tarefas" variant="ghost" size="sm">
                Ver todas
              </ButtonLink>
            }
          />
          <CardBody className="px-0 py-0">
            {tarefas.length === 0 ? (
              <EmptyState
                variant="inline"
                title="Nada pendente para você agora."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {tarefas.slice(0, 5).map((item) => (
                  <TaskRow
                    key={item.id}
                    destinos={[]}
                    task={
                      {
                        id: item.id,
                        title: item.title,
                        status: item.status,
                        priority: item.priority,
                        dueDate: item.dueDate?.toISOString() ?? null,
                        blockedReason: item.blockedReason,
                        assigneeId: item.assigneeId,
                        assigneeName: null,
                        assignedTeamName: item.assignedTeamName,
                        businessUnitLabel: item.businessUnitLabel,
                        businessUnitSlug: item.businessUnitSlug,
                        createdByName: item.createdByName,
                        createdAt: item.createdAt.toISOString(),
                        // O painel é a fila da própria pessoa: aqui ela é
                        // sempre a executora, nunca a gestora.
                        relation: relationFor(currentUser, item, {
                          canDelegate: false,
                        }),
                      } satisfies TaskRowData
                    }
                  />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Sem cartão: são atalhos, e um cartão com cabeçalho e descrição em
          volta de meia dúzia de pílulas pesa mais que o conteúdo que carrega. */}
      {buParaMostrar.length > 0 ? (
        <section className="mb-6">
          <SectionTitle
            action={
              <ButtonLink href="/planejamento" variant="ghost" size="sm">
                Ver planejamento
              </ButtonLink>
            }
          >
            {bus.length > 0 ? "Minhas Business Units" : "Business Units"}
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {buParaMostrar.map((unit) => (
              <Link
                key={unit.id}
                href={`/planejamento/${unit.slug}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
              >
                {unit.label}
                {unit.isLead ? <Badge tone="brand">responde</Badge> : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
