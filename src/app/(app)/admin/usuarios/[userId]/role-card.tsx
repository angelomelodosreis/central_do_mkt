"use client";

import { toggleSuperAdmin } from "../../organizacao/actions";
import { changeUserRole } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { USER_ROLES, USER_ROLE_LABELS, type UserRole } from "@/lib/db/schema";

const DESCRICOES: Record<UserRole, string> = {
  admin: "Configura a ferramenta: permissões, domínios, bases e auditoria.",
  leader: "Define os parâmetros que o time usa e delega tarefas.",
  editor: "Produz: documentação, personas, calendário e planejamento.",
  member: "Consulta e executa as próprias tarefas.",
};

/**
 * O que a pessoa pode FAZER — metade do modelo de acesso.
 *
 * A outra metade (sobre o quê) fica no cartão de escopos. As duas são
 * separadas porque nenhuma sozinha descreve a realidade: dois "Líder" podem ter
 * alcances completamente diferentes, e é exatamente esse caso que um papel
 * sozinho não representa.
 */
export function RoleCard({
  userId,
  role,
  isSuperAdmin,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  isSelf: boolean;
}) {
  return (
    <Card>
      <CardHeader
        title="Papel no sistema"
        description="O que ela pode fazer. Sobre o quê fica no cartão de escopos, abaixo."
      />
      <CardBody className="space-y-4">
        <form
          action={changeUserRole}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="userId" value={userId} />
          <div className="min-w-56 flex-1">
            <Field label="Papel" htmlFor="papel" hint={DESCRICOES[role]}>
              <Select
                id="papel"
                name="role"
                defaultValue={role}
                disabled={isSelf}
                options={USER_ROLES.map((item) => ({
                  value: item,
                  label: USER_ROLE_LABELS[item],
                  hint: DESCRICOES[item],
                }))}
              />
            </Field>
          </div>
          <Button type="submit" variant="secondary" disabled={isSelf}>
            Salvar papel
          </Button>
        </form>

        {isSelf ? (
          <p className="text-xs text-slate-500">
            Você não altera o próprio papel — com um administrador só, isso
            trancaria a plataforma para fora dela mesma.
          </p>
        ) : null}

        <div className="rounded-lg border border-slate-200 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                Administração da plataforma
                {isSuperAdmin ? <Badge tone="brand">Ativa</Badge> : null}
              </p>
              <p className="mt-1 max-w-lg text-xs text-slate-500">
                Separado da responsabilidade sobre o negócio de propósito. Isto
                aqui é a chave de fenda — permissões, domínios de e-mail, bases
                oficiais e auditoria — e sobrevive a qualquer configuração da
                matriz. Quem tem enxerga tudo, sem depender de vínculo.
              </p>
            </div>
            <form action={toggleSuperAdmin}>
              <input type="hidden" name="userId" value={userId} />
              <Button
                type="submit"
                size="sm"
                variant={isSuperAdmin ? "danger" : "secondary"}
                disabled={isSelf}
              >
                {isSuperAdmin ? "Remover" : "Conceder"}
              </Button>
            </form>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
