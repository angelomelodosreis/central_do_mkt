import type { Metadata } from "next";
import Link from "next/link";
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
import { strategyCycle, timelineItem, user } from "@/lib/db/schema";
import { listStrategyBusinessUnits } from "@/lib/modules/strategy/queries";

export const metadata: Metadata = { title: "Planejamento" };
export const dynamic = "force-dynamic";

export default async function StrategyIndexPage() {
  const currentUser = await requirePermission("strategy", "view");
  const units = await listStrategyBusinessUnits();

  const db = await getDb();

  // Contagem de itens por BU, para a listagem mostrar onde já existe plano.
  const cycles = await db
    .select({
      id: strategyCycle.id,
      businessUnitId: strategyCycle.businessUnitId,
      name: strategyCycle.name,
      slug: strategyCycle.slug,
      isCurrent: strategyCycle.isCurrent,
    })
    .from(strategyCycle)
    .orderBy(asc(strategyCycle.startsAt));

  const counts = new Map<string, number>();
  if (cycles.length > 0) {
    const rows = await db
      .select({ cycleId: timelineItem.cycleId, total: count() })
      .from(timelineItem)
      .groupBy(timelineItem.cycleId);
    for (const row of rows) counts.set(row.cycleId, row.total);
  }

  const ownerIds = units
    .map((unit) => unit.strategyOwnerId)
    .filter((id): id is string => Boolean(id));

  const owners = new Map<string, string>();
  if (ownerIds.length > 0) {
    const rows = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(inArray(user.id, ownerIds));
    for (const row of rows) owners.set(row.id, row.name);
  }

  const cards = units.map((unit) => {
    const unitCycles = cycles.filter((c) => c.businessUnitId === unit.id);
    const itens = unitCycles.reduce(
      (sum, cycle) => sum + (counts.get(cycle.id) ?? 0),
      0,
    );
    return {
      ...unit,
      ciclos: unitCycles.length,
      itens,
      ownerName: unit.strategyOwnerId
        ? (owners.get(unit.strategyOwnerId) ?? null)
        : null,
      souDono: unit.strategyOwnerId === currentUser.id,
    };
  });

  const comPlano = cards.filter((c) => c.ciclos > 0);
  const semPlano = cards.filter((c) => c.ciclos === 0);

  return (
    <>
      <PageHeader
        title="Planejamento"
        description="O ano de cada Business Unit: calendário, estratégia, produtos e metas."
      />

      {units.length === 0 ? (
        <EmptyState
          title="Nenhuma Business Unit ativa"
          description="O planejamento é sempre de uma BU. Cadastre uma em Administração > Business Units."
        />
      ) : (
        <div className="space-y-6">
          {comPlano.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {comPlano.map((unit) => (
                <UnitCard key={unit.id} unit={unit} />
              ))}
            </div>
          ) : null}

          {semPlano.length > 0 ? (
            <Card>
              <CardHeader
                title="Ainda sem planejamento"
                description="Abra uma BU para criar o primeiro ciclo."
              />
              <CardBody>
                <ul className="flex flex-wrap gap-1.5">
                  {semPlano.map((unit) => (
                    <li key={unit.id}>
                      <Link
                        href={`/planejamento/${unit.slug}`}
                        className="block rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-slate-700 transition-colors hover:bg-brand-100 hover:text-brand-800"
                      >
                        {unit.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}

function UnitCard({
  unit,
}: {
  unit: {
    slug: string;
    label: string;
    ciclos: number;
    itens: number;
    ownerName: string | null;
    souDono: boolean;
  };
}) {
  return (
    <Link
      href={`/planejamento/${unit.slug}`}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
    >
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-display font-semibold text-slate-900 group-hover:text-brand-700">
          {unit.label}
        </span>
        {unit.souDono ? <Badge tone="brand">Você responde</Badge> : null}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {unit.itens === 0
          ? "Ciclo criado, calendário vazio."
          : `${unit.itens} ${unit.itens === 1 ? "item no calendário" : "itens no calendário"}`}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        {unit.ownerName
          ? `Responsável: ${unit.ownerName}`
          : "Sem responsável definido"}
      </p>
    </Link>
  );
}
