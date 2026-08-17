import { eq } from "drizzle-orm";

import { redirect } from "next/navigation";

import { requirePermission, type CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit } from "@/lib/db/schema";

/**
 * Quem pode editar o planejamento de uma BU.
 *
 * A matriz papel × módulo diz quem entra no módulo; quem mexe em CADA BU é o
 * dono dela. Administradores editam qualquer uma — sem essa saída, o
 * planejamento de uma BU congelaria assim que o dono saísse de férias ou da
 * empresa.
 */
export function canEditBusinessUnitStrategy(
  currentUser: CurrentUser,
  unit: { strategyOwnerId: string | null },
): boolean {
  if (currentUser.role === "admin") return true;
  return unit.strategyOwnerId === currentUser.id;
}

export type StrategyBusinessUnit = {
  id: string;
  slug: string;
  label: string;
  strategyOwnerId: string | null;
};

/**
 * Carrega a BU pelo slug e diz se o usuário pode editá-la.
 *
 * A checagem vive no servidor e é repetida em toda gravação: esconder o botão
 * de editar é conveniência visual, não segurança.
 */
export async function requireStrategyBusinessUnit(slug: string): Promise<{
  currentUser: CurrentUser;
  unit: StrategyBusinessUnit;
  canEdit: boolean;
}> {
  const currentUser = await requirePermission("strategy", "view");

  const db = await getDb();
  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
      strategyOwnerId: businessUnit.strategyOwnerId,
    })
    .from(businessUnit)
    .where(eq(businessUnit.slug, slug))
    .get();

  if (!unit) redirect("/planejamento");

  return {
    currentUser,
    unit,
    canEdit:
      canEditBusinessUnitStrategy(currentUser, unit) &&
      // Continua valendo a permissão de edição do módulo: ser dono da BU não
      // supera um papel que só tem leitura.
      currentUser.permissions.strategy.canEdit,
  };
}
