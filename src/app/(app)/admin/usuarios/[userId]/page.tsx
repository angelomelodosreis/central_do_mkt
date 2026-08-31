import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { AccessSummaryCard } from "./access-summary-card";
import { IdentityCard } from "./identity-card";
import { OrgCard } from "./org-card";
import { RoleCard } from "./role-card";
import { ScopesCard } from "./scopes-card";
import { SquadsCard } from "./squads-card";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  jobTitle,
  squad,
  user,
} from "@/lib/db/schema";
import { summarizeAccess } from "@/lib/modules/access/explain";
import { loadPositions, loadSquads } from "@/lib/modules/org/people";
import { listActiveJobTitles, listOrgUnits } from "@/lib/modules/org/queries";

export const dynamic = "force-dynamic";

type Params = Promise<{ userId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { userId } = await params;
  await requireAdmin();
  const db = await getDb();
  const alvo = await db
    .select({ name: user.name })
    .from(user)
    .where(eq(user.id, userId))
    .get();
  return { title: alvo?.name ?? "Usuário" };
}

/**
 * A ficha de uma pessoa.
 *
 * Seis blocos, na ordem em que as perguntas aparecem: quem é, onde está na
 * organização, o que pode fazer, sobre o que responde, de que squads participa
 * e — no fim — o que tudo isso significa junto.
 *
 * O resumo por último e não primeiro de propósito: ele é a CONSEQUÊNCIA das
 * cinco decisões acima, e lê-lo antes de ver de onde vem seria pedir para
 * confiar num número.
 */
export default async function UserDetailPage({ params }: { params: Params }) {
  const { userId } = await params;
  const admin = await requireAdmin();

  const db = await getDb();
  const alvo = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      status: user.status,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      jobTitleId: user.jobTitleId,
      jobTitleName: jobTitle.name,
      approvedAt: user.approvedAt,
      createdAt: user.createdAt,
    })
    .from(user)
    .leftJoin(jobTitle, eq(user.jobTitleId, jobTitle.id))
    .where(eq(user.id, userId))
    .get();

  if (!alvo) notFound();

  const [
    positions,
    squads,
    units,
    jobTitles,
    todasAsBus,
    todosOsSquads,
    divisions,
    resumo,
  ] = await Promise.all([
    loadPositions([alvo.id]),
    loadSquads([alvo.id]),
    listOrgUnits(),
    listActiveJobTitles(),
    db
      .select({ id: businessUnit.id, label: businessUnit.label })
      .from(businessUnit)
      .where(eq(businessUnit.isActive, true))
      .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label)),
    db
      .select({
        id: squad.id,
        name: squad.name,
        businessUnitId: squad.businessUnitId,
        businessUnitLabel: businessUnit.label,
      })
      .from(squad)
      .innerJoin(businessUnit, eq(squad.businessUnitId, businessUnit.id))
      .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label)),
    db
      .select({ id: businessDivision.id, name: businessDivision.name })
      .from(businessDivision)
      .orderBy(asc(businessDivision.sortOrder)),
    summarizeAccess({
      userId: alvo.id,
      role: alvo.role,
      isSuperAdmin: alvo.isSuperAdmin,
    }),
  ]);

  const minhasPosicoes = positions.get(alvo.id) ?? [];
  const meusSquads = squads.get(alvo.id) ?? [];

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/admin/usuarios" className="hover:text-slate-900">
          Usuários e acessos
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{alvo.name}</span>
      </nav>

      <div className="space-y-5">
        <IdentityCard
          person={{
            id: alvo.id,
            name: alvo.name,
            email: alvo.email,
            status: alvo.status,
            createdAt: alvo.createdAt.toISOString(),
            approvedAt: alvo.approvedAt?.toISOString() ?? null,
          }}
          isSelf={alvo.id === admin.id}
        />

        <OrgCard
          userId={alvo.id}
          jobTitleId={alvo.jobTitleId}
          jobTitles={jobTitles.map((title) => ({
            id: title.id,
            name: title.name,
          }))}
          positions={minhasPosicoes.map((position) => ({
            membershipId: position.membershipId,
            teamId: position.teamId,
            teamName: position.teamName,
            path: position.path,
            isLead: position.isLead,
            isPrimary: position.isPrimary,
          }))}
          units={units
            .filter((unit) => unit.isActive)
            .map((unit) => ({
              id: unit.id,
              name: unit.name,
              depth: unit.depth,
              kind: unit.kind,
            }))}
        />

        <RoleCard
          userId={alvo.id}
          role={alvo.role}
          isSuperAdmin={alvo.isSuperAdmin}
          isSelf={alvo.id === admin.id}
        />

        <ScopesCard
          userId={alvo.id}
          grants={resumo.grants}
          units={units.map((unit) => ({
            id: unit.id,
            name: unit.name,
            depth: unit.depth,
          }))}
          divisions={divisions}
          businessUnits={todasAsBus}
          squads={todosOsSquads.map((item) => ({
            id: item.id,
            label: item.businessUnitLabel,
          }))}
        />

        <SquadsCard
          userId={alvo.id}
          squads={meusSquads.map((item) => ({
            membershipId: item.membershipId,
            squadId: item.squadId,
            businessUnitLabel: item.businessUnitLabel,
            isLead: item.isLead,
          }))}
          allSquads={todosOsSquads.map((item) => ({
            id: item.id,
            label: item.businessUnitLabel,
          }))}
        />

        <AccessSummaryCard summary={resumo} />
      </div>
    </>
  );
}
