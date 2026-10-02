import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, count, eq, inArray } from "drizzle-orm";

import { plural } from "@/lib/utils/text";
import { cn } from "@/lib/utils/cn";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  EmptyState,
  PageHeader,
  SectionTitle,
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
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { BuDirectory, type BuDirectoryItem } from "./bu-directory";
import { PlanningMethodologyGuide } from "./methodology-guide";

export const metadata: Metadata = { title: "Planejamento e Business Units" };
export const dynamic = "force-dynamic";

export default async function StrategyIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aba?: string }>;
}) {
  const currentUser = await requirePermission("strategy", "view");
  const { erro, aba } = await searchParams;
  const currentTab = aba === "lista" ? "lista" : "planejamento";

  const [units, allUnits] = await Promise.all([
    listAccessibleBusinessUnits(currentUser),
    listBusinessUnits({ includeInactive: false }),
  ]);

  // Quem trabalha numa BU só cai direto nela apenas se não estiver navegando para a aba de lista
  if (
    currentTab === "planejamento" &&
    units.length === 1 &&
    !seesAllBusinessUnits(currentUser)
  ) {
    redirect(`/planejamento/${units[0].slug}`);
  }

  const db = await getDb();
  const allUnitIds = allUnits.map((unit) => unit.id);

  const cycles =
    allUnitIds.length === 0
      ? []
      : await db
          .select({
            id: strategyCycle.id,
            businessUnitId: strategyCycle.businessUnitId,
          })
          .from(strategyCycle)
          .where(inArray(strategyCycle.businessUnitId, allUnitIds))
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
    allUnitIds.length === 0
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
          .where(inArray(squad.businessUnitId, allUnitIds));

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

  const accessibleIds = new Set(units.map((u) => u.id));
  const directoryUnits: BuDirectoryItem[] = allUnits.map((u) => {
    const uCycles = cycles.filter((c) => c.businessUnitId === u.id);
    return {
      id: u.id,
      slug: u.slug,
      code: u.code,
      label: u.label,
      description: u.description,
      divisionId: u.divisionId,
      divisionName: u.divisionName,
      isActive: u.isActive,
      leadName: leadByUnit.get(u.id) ?? null,
      pessoas: teamSize.get(u.id) ?? 0,
      ciclos: uCycles.length,
      itens: uCycles.reduce(
        (sum, cycle) => sum + (itemCounts.get(cycle.id) ?? 0),
        0,
      ),
      hasAccess: accessibleIds.has(u.id),
      isLead: units.find((item) => item.id === u.id)?.isLead ?? false,
    };
  });

  return (
    <>
      <PageHeader
        title="Planejamento e Business Units"
        description="O ano de cada Business Unit: calendário, personas, produtos, metas e catálogo oficial."
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

      <PlanningMethodologyGuide />

      {/* Abas: Meu Planejamento vs Lista Oficial de BUs */}
      <div className="mb-6 border-b border-slate-200">
        <div className="flex gap-6">
          <Link
            href="/planejamento"
            className={cn(
              "flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors",
              currentTab === "planejamento"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <span>Meu Planejamento</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                currentTab === "planejamento"
                  ? "bg-brand-50 text-brand-700"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {units.length}
            </span>
          </Link>

          <Link
            href="/planejamento?aba=lista"
            className={cn(
              "flex items-center gap-2 border-b-2 pb-3 text-sm font-semibold transition-colors",
              currentTab === "lista"
                ? "border-brand-600 text-brand-600"
                : "border-transparent text-slate-500 hover:text-slate-900",
            )}
          >
            <span>Lista Oficial de BUs</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                currentTab === "lista"
                  ? "bg-brand-50 text-brand-700"
                  : "bg-slate-100 text-slate-600",
              )}
            >
              {allUnits.length}
            </span>
          </Link>
        </div>
      </div>

      {currentTab === "lista" ? (
        <BuDirectory
          units={directoryUnits}
          userAccessibleCount={units.length}
        />
      ) : units.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            title="Você ainda não está em nenhuma Business Unit"
            description="O planejamento é sempre de uma BU, e o acesso vem do vínculo com ela. Você pode consultar o catálogo na aba 'Lista Oficial de BUs' e solicitar acesso no seu Perfil."
          />
          <div className="flex justify-center">
            <Link
              href="/planejamento?aba=lista"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-700"
            >
              Ver Lista Oficial das 23 BUs →
            </Link>
          </div>
        </div>
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
              <SectionTitle count={outras.length}>
                {minhas.length > 0
                  ? "Outras Business Units"
                  : "Business Units no seu alcance"}
              </SectionTitle>
              <Card>
                <CardBody className="px-0 py-0">
                  <ul className="divide-y divide-slate-100">
                    {outras.map((unit) => (
                      <li key={unit.id}>
                        <Link
                          href={`/planejamento/${unit.slug}`}
                          className="block px-5 py-3 transition-colors hover:bg-slate-50"
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
                          <span className="mt-0.5 block text-xs text-slate-500">
                            {unit.leadName
                              ? `Responde: ${unit.leadName}`
                              : "Sem responsável"}
                            {unit.itens > 0
                              ? ` · ${plural(unit.itens, "item", "itens")}`
                              : ""}
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
            : `${plural(unit.itens, "item", "itens")} no calendário`}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        {unit.leadName ? `Responsável: ${unit.leadName}` : "Sem responsável"}
        {unit.pessoas > 1
          ? ` · ${plural(unit.pessoas, "pessoa")} na equipe`
          : ""}
      </p>
    </Link>
  );
}
