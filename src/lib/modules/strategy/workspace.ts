import { and, count, eq, inArray } from "drizzle-orm";

import type { CurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  documentationPage,
  persona,
  strategyCycle,
  strategyProduct,
  timelineItem,
} from "@/lib/db/schema";
import { visibilitiesFor } from "@/lib/modules/documentation/queries";

export type WorkspaceCounts = {
  personas: number;
  produtos: number;
  documentos: number;
  itensCalendario: number;
  ciclos: number;
};

/**
 * Contagens do cabeçalho da BU, em cinco consultas agregadas.
 *
 * Números pequenos ao lado das abas, mas eles carregam a informação que faltava
 * ao abrir uma BU: onde já existe conteúdo e onde ainda não se começou.
 */
export async function getWorkspaceCounts(
  businessUnitId: string,
  currentUser: CurrentUser,
): Promise<WorkspaceCounts> {
  const db = await getDb();

  const [personas, produtos, documentos, cycles] = await Promise.all([
    db
      .select({ total: count() })
      .from(persona)
      .where(
        and(
          eq(persona.businessUnitId, businessUnitId),
          eq(persona.isActive, true),
        ),
      ),
    db
      .select({ total: count() })
      .from(strategyProduct)
      .where(
        and(
          eq(strategyProduct.businessUnitId, businessUnitId),
          eq(strategyProduct.isActive, true),
        ),
      ),
    db
      .select({ total: count() })
      .from(documentationPage)
      .where(
        and(
          eq(documentationPage.businessUnitId, businessUnitId),
          // A visibilidade por papel continua valendo dentro da BU: trabalhar
          // na BU não dá acesso a página marcada como restrita a líderes.
          inArray(
            documentationPage.visibility,
            visibilitiesFor(currentUser.role),
          ),
        ),
      ),
    db
      .select({ id: strategyCycle.id })
      .from(strategyCycle)
      .where(eq(strategyCycle.businessUnitId, businessUnitId)),
  ]);

  const cycleIds = cycles.map((cycle) => cycle.id);
  const itens =
    cycleIds.length === 0
      ? 0
      : (
          await db
            .select({ total: count() })
            .from(timelineItem)
            .where(inArray(timelineItem.cycleId, cycleIds))
        )[0].total;

  return {
    personas: personas[0].total,
    produtos: produtos[0].total,
    documentos: documentos[0].total,
    itensCalendario: itens,
    ciclos: cycleIds.length,
  };
}
