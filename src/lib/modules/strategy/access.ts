import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { requirePermission, type CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit, type ModuleKey } from "@/lib/db/schema";
import {
  canSeeBusinessUnit,
  isResponsibleForBusinessUnit,
  seesEverything,
} from "@/lib/modules/access/scope";
import { isBusinessUnitMember } from "@/lib/modules/org/scope";

export type StrategyBusinessUnit = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  isActive: boolean;
};

export type BusinessUnitAccess = {
  currentUser: CurrentUser;
  unit: StrategyBusinessUnit;
  /** A pessoa tem vínculo formal com esta BU. */
  isMember: boolean;
  /** Alcance total: administra a plataforma ou responde pela organização. */
  seesAll: boolean;
  /**
   * RESPONDE pela BU — mais estreito que enxergá-la.
   *
   * Participar do squad abre a leitura; responder pela BU, pela divisão dela ou
   * pela organização é o que caracteriza a coordenação daquela frente.
   */
  isResponsible: boolean;
  /** Pode editar o planejamento (calendário, produtos, metas). */
  canEdit: boolean;
  /**
   * Pode editar uma área específica dentro da BU.
   *
   * Existe porque a BU reúne áreas de módulos diferentes — personas,
   * documentação, planejamento — e cada uma tem a sua linha na matriz de
   * permissões. Sem isso, quem pode editar o calendário editaria as personas
   * de tabela, ignorando a matriz.
   */
  canEditModule: (moduleKey: ModuleKey) => boolean;
};

/**
 * Carrega a BU pelo slug e resolve o que a pessoa pode fazer nela.
 *
 * Duas checagens independentes, nesta ordem:
 *
 * 1. ALCANCE — sem vínculo (e sem papel de coordenação), a BU responde como se
 *    não existisse. O redirect é para a lista, e não uma mensagem de "sem
 *    permissão": revelar que existe uma BU chamada X para quem não pode vê-la
 *    já é informação.
 * 2. EDIÇÃO — o papel decide. Vínculo abre a porta, papel diz se pode mexer.
 *
 * A checagem vive no servidor e é repetida em toda gravação: esconder o botão
 * de editar é conveniência visual, não segurança.
 */
export async function requireStrategyBusinessUnit(
  slug: string,
): Promise<BusinessUnitAccess> {
  const currentUser = await requirePermission("strategy", "view");

  const db = await getDb();
  const unit = await db
    .select({
      id: businessUnit.id,
      slug: businessUnit.slug,
      label: businessUnit.label,
      description: businessUnit.description,
      isActive: businessUnit.isActive,
    })
    .from(businessUnit)
    .where(eq(businessUnit.slug, slug))
    .get();

  if (!unit) redirect("/planejamento");

  const seesAll = seesEverything(currentUser.scope);
  // Consultado mesmo para quem vê tudo: é o que diferencia "esta BU é minha" de
  // "estou olhando a BU de outra pessoa" no cabeçalho.
  const isMember = await isBusinessUnitMember(currentUser.id, unit.id);
  const podeVer = canSeeBusinessUnit(currentUser.scope, unit.id);

  if (!podeVer) redirect("/planejamento?erro=fora-do-escopo");

  const canEditModule = (moduleKey: ModuleKey) =>
    podeVer && currentUser.permissions[moduleKey].canEdit;

  return {
    currentUser,
    unit,
    isMember,
    seesAll,
    isResponsible: isResponsibleForBusinessUnit(currentUser.scope, unit.id),
    canEdit: canEditModule("strategy"),
    canEditModule,
  };
}

/**
 * Versão para server actions: mesma regra, mas erra em vez de redirecionar —
 * uma action precisa devolver mensagem para o formulário, não trocar de página.
 */
export async function assertCanEditBusinessUnit(
  businessUnitId: string,
  moduleKey: ModuleKey = "strategy",
): Promise<CurrentUser> {
  const currentUser = await requirePermission(moduleKey, "edit");

  const allowed = canSeeBusinessUnit(currentUser.scope, businessUnitId);

  if (!allowed) {
    throw new Error("Você não trabalha nesta Business Unit.");
  }

  return currentUser;
}
