import type { Metadata } from "next";
import { eq } from "drizzle-orm";

import { PageHeader } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jobTitle, twoFactor, type UserRole } from "@/lib/db/schema";
import { USER_ROLE_LABELS } from "@/lib/db/schema/auth.schema";
import { listAccessibleBusinessUnits } from "@/lib/modules/org/scope";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { getUserBuRequests } from "@/lib/modules/access/bu-requests";
import { loadPositions } from "@/lib/modules/org/people";
import { listOrgUnits } from "@/lib/modules/org/queries";
import { sortByName } from "@/lib/utils/text";
import { ProfileEditor, type ProfileData } from "./profile-editor";

export const metadata: Metadata = {
  title: "Meu Perfil | Central do Marketing",
};
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await requireUser();
  const db = await getDb();

  const [
    accessibleUnits,
    allUnits,
    myRequests,
    positions,
    orgUnits,
    twoFactorRecord,
    activeJobTitles,
  ] = await Promise.all([
    listAccessibleBusinessUnits(currentUser),
    listBusinessUnits({ includeInactive: false }),
    getUserBuRequests(currentUser.id),
    loadPositions([currentUser.id]),
    listOrgUnits(),
    db
      .select({ verified: twoFactor.verified })
      .from(twoFactor)
      .where(eq(twoFactor.userId, currentUser.id))
      .get(),
    db
      .select({
        id: jobTitle.id,
        name: jobTitle.name,
        sortOrder: jobTitle.sortOrder,
      })
      .from(jobTitle)
      .where(eq(jobTitle.isActive, true)),
  ]);

  const userPositions = positions.get(currentUser.id) ?? [];
  const primaryPos =
    userPositions.find((p) => p.isPrimary) ?? userPositions[0] ?? null;

  const role = currentUser.role as UserRole;
  const profileData: ProfileData = {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    emailDomain: currentUser.emailDomain,
    role,
    roleLabel: USER_ROLE_LABELS[role] ?? role,
    jobTitleId: currentUser.jobTitleId,
    jobTitleName: currentUser.jobTitleName,
    availableJobTitles: sortByName(activeJobTitles, (item) => item.name).map(
      (item) => ({
        id: item.id,
        name: item.name,
        sortOrder: item.sortOrder,
      }),
    ),
    isSuperAdmin: currentUser.isSuperAdmin,
    twoFactorEnabled: Boolean(twoFactorRecord),
    twoFactorVerified: twoFactorRecord?.verified === true,
    primaryTeamId: primaryPos?.teamId ?? null,
    teams: userPositions.map((p) => ({
      id: p.teamId,
      name: p.teamName,
      path: p.path,
      isPrimary: p.isPrimary,
      isLead: p.isLead,
    })),
    availableTeams: orgUnits
      .filter((u) => u.isActive)
      .map((u) => ({
        id: u.id,
        name: u.name,
        slug: u.slug,
        kind: u.kind,
        path: u.path,
        depth: u.depth,
      })),
    accessibleUnits,
    allUnits: allUnits.map((u) => ({
      id: u.id,
      slug: u.slug,
      code: u.code,
      label: u.label,
      divisionName: u.divisionName,
    })),
    myRequests,
  };

  return (
    <>
      <PageHeader
        title="Meu Perfil"
        description="Configure seu time no organograma, gerencie seu acesso como leitor às Business Units e mantenha seus dados atualizados."
      />

      <div className="mt-6">
        <ProfileEditor data={profileData} />
      </div>
    </>
  );
}
