import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { TaskRow, type TaskRowData } from "../tarefas/task-row";
import { NavIcon, type NavIconKey } from "@/components/layout/nav-icons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { can, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  MODULE_LABELS,
  namingTemplate,
  user,
} from "@/lib/db/schema";
import { describePositions } from "@/lib/modules/org/people";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { listMyTasks, relationFor } from "@/lib/modules/tasks/queries";

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

  const [tarefas, minhasBus, templates, pendentes] = await Promise.all([
    can(currentUser, "tasks") ? listMyTasks(currentUser) : Promise.resolve([]),
    can(currentUser, "strategy")
      ? listAccessibleBusinessUnits(currentUser)
      : Promise.resolve([]),
    db
      .select({ total: count() })
      .from(namingTemplate)
      .where(eq(namingTemplate.isActive, true)),
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

  const shortcuts = [
    can(currentUser, "documentation") && {
      href: "/documentacao",
      title: "Documentação",
      description:
        "Biblioteca geral: processos, convenções e material do time todo.",
      icon: "docs" as NavIconKey,
    },
    can(currentUser, "name_generator") && {
      href: "/gerador-de-nomes",
      title: "Gerador de Nomes",
      description:
        "Monte nomes padronizados de listas, tags e outros itens do CRM.",
      icon: "generator" as NavIconKey,
    },
    currentUser.role === "admin" && {
      href: "/admin/usuarios",
      title: "Aprovar acessos",
      description:
        pendingUsers > 0
          ? `${pendingUsers} ${pendingUsers === 1 ? "pessoa aguardando" : "pessoas aguardando"} aprovação.`
          : "Ninguém aguardando aprovação no momento.",
      icon: "admin" as NavIconKey,
      highlight: pendingUsers > 0,
    },
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    description: string;
    icon: NavIconKey;
    highlight?: boolean;
  }>;

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
              <p className="px-5 py-6 text-center text-sm text-slate-500">
                Nada pendente para você agora.
              </p>
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

      {buParaMostrar.length > 0 ? (
        <Card className="mb-6">
          <CardHeader
            title={bus.length > 0 ? "Minhas Business Units" : "Business Units"}
            description="Calendário, personas, produtos, metas e documentos de cada uma."
            action={
              <ButtonLink href="/planejamento" variant="ghost" size="sm">
                Planejamento
              </ButtonLink>
            }
          />
          <CardBody className="flex flex-wrap gap-2">
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
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100"
              >
                <NavIcon name={shortcut.icon} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-slate-900 group-hover:text-brand-700">
                  {shortcut.title}
                  {shortcut.highlight ? (
                    <span className="inline-flex size-2 rounded-full bg-amber-500" />
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {shortcut.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {currentUser.role === "admin" ? (
        <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
          <StatCard
            label="Business Units ativas"
            value={await countActiveBusinessUnits()}
          />
          <StatCard
            label="Modelos de nomenclatura"
            value={templates[0].total}
          />
          <StatCard label="Cadastros aguardando" value={pendingUsers} />
        </div>
      ) : null}
    </>
  );
}

async function countActiveBusinessUnits(): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ total: count() })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true));
  return row.total;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </Card>
  );
}
