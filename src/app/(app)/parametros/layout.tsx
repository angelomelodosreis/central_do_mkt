import type { ReactNode } from "react";

import { requirePermission } from "@/lib/auth/session";

/**
 * Área de parâmetros: o que define as regras que os outros módulos usam.
 *
 * Separada de Administração de propósito. Administração governa acessos —
 * usuários, permissões, domínios de e-mail, auditoria — e segue exclusiva de
 * administradores. Parâmetros é trabalho de configuração do produto, e o Líder
 * responde por ele.
 *
 * O layout é o portão; cada página revalida por conta própria também.
 */
export default async function ParametersLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePermission("parameters", "edit");
  return <>{children}</>;
}
