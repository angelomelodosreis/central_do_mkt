import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, count, eq, inArray } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  squad,
  squadMember,
  strategyCycle,
  timelineItem,
  user,
} from "@/lib/db/schema";
import {
  listAccessibleBusinessUnits,
  seesAllBusinessUnits,
} from "@/lib/modules/org/scope";

export const metadata: Metadata = { title: "Planejamento" };
export const dynamic = "force-dynamic";

export default async function StrategyIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const currentUser = await requirePermission("strategy", "view");
  const { erro } = await searchParams;

  const units = await listAccessibleBusinessUnits(currentUser);

  // Quem trabalha numa BU só cai direto nela. Para um analista, esta lista
  // intermediária seria uma tela com um único link — um clique a mais, todo dia,
  // para chegar onde ele sempre vai.
  if (units.length === 1 && !seesAllBusinessUnits(currentUser)) {
    redirect(`/planejamento/${units[0].slug}`);
  }

  const db = await getDb();
  const unitIds = units.map((unit) => unit.id);

  const cycles =
    unitIds.length === 0
      ? []
      : await db
          .select({
            id: strategyCycle.id,
            businessUnitId: strategyCycle.businessUnitId,
          })
          .from(strategyCycle)
          .where(inArray(strategyCycle.businessUnitId, unitIds))
          .orderBy(asc(strategyCycle.startsAt));

  const itemCounts = new Map<string, number>();
  if (cycles.length > 0) {
    const rows = await db
      .select({ cycleId: timelineItem.cycleId, total: count() })
      .from(timelineItem)
      .groupBy(timelineItem.cycleId);
    for (const row of rows) itemCounts.set(row.cycleId, row.total);
  }

  // Uma consulta só: dela saem o responsável e o tamanho da equipe de cada BU.
  const memberships =
    unitIds.length === 0
      ? []
      : await db
          .select({
            businessUnitId: squad.businessUnitId,
            isLead: squadMember.isLead,
            name: user.name,
          })
          .from(squadMember)
          .innerJoin(squad, eq(squadMember.squadId, squad.id))
          .innerJoin(user, eq(squadMember.userId, user.id))
          .where(inArray(squad.businessUnitId, unitIds));

  const leadByUnit = new Map<string, string>();
  const teamSize = new Map<string, number>();
  for (const row of memberships) {
    if (row.isLead) leadByUnit.set(row.businessUnitId, row.name);
    teamSize.set(
      row.businessUnitId,
      (teamSize.get(row.businessUnitId) ?? 0) + 1,
    );
  }

  const cards = units.map((unit) => {
    const unitCycles = cycles.filter((c) => c.businessUnitId === unit.id);
    return {
      ...unit,
      ciclos: unitCycles.length,
      itens: unitCycles.reduce(
        (sum, cycle) => sum + (itemCounts.get(cycle.id) ?? 0),
        0,
      ),
      leadName: leadByUnit.get(unit.id) ?? null,
      pessoas: teamSize.get(unit.id) ?? 0,
    };
  });

  const minhas = cards.filter((unit) => unit.isMember);
  const outras = cards.filter((unit) => !unit.isMember);

  return (
    <>
      <PageHeader
        title="Planejamento"
        description="O ano de cada Business Unit: calendário, personas, produtos, metas e documentação."
      />

      {erro === "fora-do-escopo" ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Essa Business Unit não está entre as suas. Fale com a coordenação se
          você precisa trabalhar nela.
        </div>
      ) : null}

      {units.length === 0 ? (
        <EmptyState
          title="Você ainda não está em nenhuma Business Unit"
          description="O planejamento é sempre de uma BU, e o acesso vem do vínculo com ela. Um administrador precisa te incluir na equipe da BU em que você trabalha."
        />
      ) : (
        <div className="space-y-6">
          {minhas.length > 0 ? (
            <section>
              {outras.length > 0 ? (
                <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Minhas Business Units
                </h2>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                {minhas.map((unit) => (
                  <UnitCard key={unit.id} unit={unit} destaque />
                ))}
              </div>
            </section>
          ) : null}

          {outras.length > 0 ? (
            <section>
              {minhas.length > 0 ? (
                <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Outras Business Units
                </h2>
              ) : null}
              <Card>
                <CardHeader
                  title={`${outras.length} ${outras.length === 1 ? "BU" : "BUs"} no seu alcance`}
                  description="Você acompanha estas BUs sem ser da equipe delas."
                />
                <CardBody className="px-0 py-0">
                  <ul className="divide-y divide-slate-100">
                    {outras.map((unit) => (
                      <li key={unit.id}>
                        <Link
                          href={`/planejamento/${unit.slug}`}
                          className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-3 transition-colors hover:bg-slate-50"
                        >
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-900">
                              {unit.label}
                            </span>
                            {unit.isActive ? null : (
                              <Badge tone="neutral">Inativa</Badge>
                            )}
                            {unit.ciclos === 0 ? (
                              <Badge tone="warning">Sem ciclo</Badge>
                            ) : null}
                          </span>
                          <span className="text-xs text-slate-500">
                            {unit.leadName
                              ? `Responde: ${unit.leadName}`
                              : "Sem responsável"}
                            {unit.itens > 0 ? ` · ${unit.itens} itens` : ""}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

function UnitCard({
  unit,
  destaque,
}: {
  unit: {
    slug: string;
    label: string;
    ciclos: number;
    itens: number;
    leadName: string | null;
    pessoas: number;
    isLead: boolean;
    isActive: boolean;
  };
  destaque?: boolean;
}) {
  return (
    <Link
      href={`/planejamento/${unit.slug}`}
      className={`group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md ${
        destaque
          ? "border-brand-200 hover:border-brand-400"
          : "border-slate-200 hover:border-brand-300"
      }`}
    >
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-display font-semibold text-slate-900 group-hover:text-brand-700">
          {unit.label}
        </span>
        {unit.isLead ? <Badge tone="brand">Você responde</Badge> : null}
        {unit.isActive ? null : <Badge tone="neutral">Inativa</Badge>}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {unit.ciclos === 0
          ? "Nenhum ciclo criado — o planejamento começa por aqui."
          : unit.itens === 0
            ? "Ciclo criado, calendário vazio."
            : `${unit.itens} ${unit.itens === 1 ? "item no calendário" : "itens no calendário"}`}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {unit.leadName ? `Responsável: ${unit.leadName}` : "Sem responsável"}
        {unit.pessoas > 1 ? ` · ${unit.pessoas} pessoas na equipe` : ""}
      </p>
    </Link>
  );
}
