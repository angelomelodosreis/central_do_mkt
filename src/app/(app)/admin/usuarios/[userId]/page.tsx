import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { UserFile, type OrgUnitOption, type UserFileData } from "./user-file";
import { requireUserManagementAccess } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  squad,
  twoFactor,
  user,
} from "@/lib/db/schema";
import { listGrantsForUser } from "@/lib/modules/access/explain";
import { getUserBuRequests } from "@/lib/modules/access/bu-requests";
import { loadPositions, loadSquads } from "@/lib/modules/org/people";
import { listActiveJobTitles, listOrgUnits } from "@/lib/modules/org/queries";
import { sortByName } from "@/lib/utils/text";

export const dynamic = "force-dynamic";

type Params = Promise<{ userId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { userId } = await params;
  await requireUserManagementAccess();
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
 * Uma tela, um cartão, cinco linhas: cargo, time, papel, squads e do que ela
 * responde. Eram seis cartões com cabeçalho e descrição cada — mais moldura do
 * que conteúdo, para uma ficha que cabe numa tela.
 */
export default async function UserDetailPage({ params }: { params: Params }) {
  const { userId } = await params;
  const admin = await requireUserManagementAccess();

  const db = await getDb();
  const alvo = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
      jobTitleId: user.jobTitleId,
      createdAt: user.createdAt,
    })
    .from(user)
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
    grants,
    buRequests,
  ] = await Promise.all([
    loadPositions([alvo.id]),
    loadSquads([alvo.id]),
    listOrgUnits(),
    listActiveJobTitles(),
    db
      .select({ id: businessUnit.id, label: businessUnit.label })
      .from(businessUnit)
      .where(eq(businessUnit.isActive, true)),
    db
      .select({
        id: squad.id,
        label: businessUnit.label,
      })
      .from(squad)
      .innerJoin(businessUnit, eq(squad.businessUnitId, businessUnit.id)),
    db
      .select({ id: businessDivision.id, name: businessDivision.name })
      .from(businessDivision),
    listGrantsForUser(alvo.id),
    getUserBuRequests(alvo.id),
  ]);

  // O sinal de cadastro concluído é `two_factor.verified`, e não
  // `user.two_factor_enabled`: este último é ligado assim que a pessoa gera o
  // segredo, antes de ela confirmar o primeiro código — ver
  // `ligarFatorSemTrocarSessao` em src/lib/auth/two-factor.ts.
  const cadastrouOAplicativo =
    (
      await db
        .select({ verified: twoFactor.verified })
        .from(twoFactor)
        .where(eq(twoFactor.userId, alvo.id))
        .get()
    )?.verified === true;

  const person: UserFileData = {
    id: alvo.id,
    name: alvo.name,
    email: alvo.email,
    status: alvo.status,
    role: alvo.role,
    isSuperAdmin: alvo.isSuperAdmin,
    twoFactorEnabled: cadastrouOAplicativo,
    jobTitleId: alvo.jobTitleId,
    createdAt: alvo.createdAt.toISOString(),
    teams: (positions.get(alvo.id) ?? []).map((position) => ({
      teamId: position.teamId,
    })),
    squads: (squads.get(alvo.id) ?? []).map((item) => ({
      squadId: item.squadId,
    })),
    grants,
    requestedBUs: buRequests.map((r) => ({
      businessUnitId: r.businessUnitId,
      label: r.businessUnitLabel,
      code: r.businessUnitCode,
      note: r.note,
    })),
  };

  const orgUnits: OrgUnitOption[] = sortByName(
    units.filter((unit) => unit.isActive),
    (unit) => unit.name,
  ).map((unit) => ({
    id: unit.id,
    name: unit.name,
    kind: unit.kind,
    path: unit.path,
    areaId: unit.areaId,
  }));

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

      <UserFile
        person={person}
        jobTitles={sortByName(jobTitles, (title) => title.name).map(
          (title) => ({
            id: title.id,
            name: title.name,
            teamIds: title.teamIds,
          }),
        )}
        orgUnits={orgUnits}
        divisions={sortByName(divisions, (division) => division.name)}
        businessUnits={sortByName(todasAsBus, (unit) => unit.label)}
        squads={sortByName(todosOsSquads, (item) => item.label)}
        isSelf={alvo.id === admin.id}
      />
    </>
  );
}
