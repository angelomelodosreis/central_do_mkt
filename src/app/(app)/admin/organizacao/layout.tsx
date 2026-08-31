import type { ReactNode } from "react";

import { OrgTabs } from "./org-tabs";
import { PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { listJobTitles, listOrgUnits } from "@/lib/modules/org/queries";

export const dynamic = "force-dynamic";

/**
 * Estrutura organizacional e cargos.
 *
 * Duas coisas relacionadas mas independentes, e a separação é o ponto: a
 * estrutura diz ONDE a pessoa trabalha, o cargo diz O QUE ela é. Duas pessoas
 * com o mesmo cargo podem estar em times diferentes, e a mesma pessoa participa
 * de vários times com um cargo só.
 */
export default async function OrganizacaoLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireAdmin();

  const [units, titles] = await Promise.all([listOrgUnits(), listJobTitles()]);

  return (
    <>
      <PageHeader
        title="Organização"
        description="Setor → Subsetor → Time, e o catálogo de cargos. Acesso se define na ficha de cada pessoa."
      />
      <OrgTabs units={units.length} jobTitles={titles.length} />
      {children}
    </>
  );
}
