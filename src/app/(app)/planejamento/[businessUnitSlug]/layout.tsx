import type { ReactNode } from "react";
import Link from "next/link";

import { BusinessUnitTabs, type WorkspaceTab } from "./business-unit-tabs";
import { BuSwitcher } from "./bu-switcher";
import { Badge } from "@/components/ui/badge";
import { can } from "@/lib/auth/session";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { getWorkspaceCounts } from "@/lib/modules/strategy/workspace";

export const dynamic = "force-dynamic";

/**
 * Casca da Business Unit.
 *
 * Aqui é onde a reestruturação aparece: personas, calendário, produtos, metas e
 * documentos deixaram de ser módulos soltos no menu e passaram a ser áreas de
 * uma BU. O motivo é que ninguém trabalha "em personas" — trabalha no
 * planejamento da Residência, e a persona é uma das peças dele. Com módulos
 * separados, montar o quadro de uma BU exigia visitar quatro telas e recompor a
 * ligação de cabeça.
 *
 * O portão de acesso mora aqui, e não em cada página: é uma decisão só, e
 * qualquer rota nova dentro da BU nasce protegida.
 */
export default async function BusinessUnitLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, currentUser, isMember, seesAll } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  const [counts, accessibleUnits] = await Promise.all([
    getWorkspaceCounts(unit.id, currentUser),
    listAccessibleBusinessUnits(currentUser),
  ]);
  const base = `/planejamento/${unit.slug}`;

  // Ordem lógica do trabalho MedCof: Ciclos da BU -> Diagnóstico -> Objetivo e Metas -> Resultados -> Acompanhamento -> Rituais -> Ativos
  const tabs: WorkspaceTab[] = [
    { href: base, label: "Visão geral" },
    { href: `${base}/ciclos`, label: "Ciclos da BU" },
    { href: `${base}/diagnostico`, label: "Diagnóstico" },
    { href: `${base}/metas`, label: "Objetivo e Metas" },
    { href: `${base}/resultados`, label: "Resultados" },
    { href: `${base}/acompanhamento`, label: "Acompanhamento" },
    { href: `${base}/revisao-trimestral`, label: "Revisão Trimestral" },
    {
      href: `${base}/calendario`,
      label: "Calendário",
      count: counts.itensCalendario,
    },
  ];

  if (can(currentUser, "personas")) {
    tabs.push({
      href: `${base}/personas`,
      label: "Personas",
      count: counts.personas,
    });
  }

  tabs.push({
    href: `${base}/produtos`,
    label: "Esteira de produtos",
    count: counts.produtos,
  });

  if (can(currentUser, "documentation")) {
    tabs.push({
      href: `${base}/documentos`,
      label: "Documentos",
      count: counts.documentos,
    });
  }

  return (
    <>
      <div className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/planejamento"
            className="text-xs text-slate-500 transition-colors hover:text-brand-700 font-medium"
          >
            ← Todas as Business Units
          </Link>
          <BuSwitcher
            currentSlug={unit.slug}
            units={accessibleUnits.map((u) => ({
              slug: u.slug,
              label: u.label,
            }))}
          />
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900">
            {unit.label}
          </h1>
          {isMember ? <Badge tone="brand">Você trabalha aqui</Badge> : null}
          {/* Quem tem alcance de coordenação precisa saber quando está numa BU
              que não é sua — sem isso, editar por engano é fácil. */}
          {!isMember && seesAll ? (
            <Badge tone="neutral">Visão de coordenação</Badge>
          ) : null}
          {unit.isActive ? null : <Badge tone="warning">BU inativa</Badge>}
        </div>
        {unit.description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            {unit.description}
          </p>
        ) : null}
      </div>

      <BusinessUnitTabs tabs={tabs} baseHref={base} />

      {children}
    </>
  );
}
