import type { Metadata } from "next";
import Link from "next/link";

import { NameGeneratorForm, type FormTemplate } from "./name-generator-form";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { getPageHrefById } from "@/lib/modules/documentation/queries";
import {
  listActiveBusinessUnits,
  listActiveTemplates,
} from "@/lib/modules/name-generator/queries";

export const metadata: Metadata = { title: "Gerador de Nomes" };
export const dynamic = "force-dynamic";

/**
 * Página de convenções para a qual o botão do cabeçalho aponta.
 *
 * É o `id` da linha, e não o caminho: o slug muda junto com o título, o id não.
 */
const CONVENTIONS_PAGE_ID = "page_nomenclatura_listas";

export default async function NameGeneratorPage() {
  const currentUser = await requirePermission("name_generator", "view");

  // Os modelos e as BUs vêm do banco: cadastrar um modelo novo ou uma BU nova
  // aparece aqui imediatamente, sem precisar mexer no código.
  const [templates, businessUnits, conventionsHref] = await Promise.all([
    listActiveTemplates(),
    listActiveBusinessUnits(),
    can(currentUser, "documentation")
      ? getPageHrefById(CONVENTIONS_PAGE_ID, currentUser)
      : null,
  ]);

  const formTemplates: FormTemplate[] = templates.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    blockSeparator: template.blockSeparator,
    fields: template.fields.map((field) => ({
      id: field.id,
      position: field.position,
      fieldType: field.fieldType,
      label: field.label,
      hint: field.hint,
      placeholder: field.placeholder,
      isRequired: field.isRequired,
      options: field.options,
    })),
  }));

  // Quem cadastra modelo é quem tem a permissão de Parâmetros — não mais só o
  // administrador, já que o Líder passou a parametrizar.
  const podeParametrizar = can(currentUser, "parameters", "edit");

  return (
    <>
      <PageHeader
        title="Gerador de Nomes"
        description="Escolha o que você quer nomear, preencha os campos e copie o nome já padronizado."
        action={
          // Sem endereço resolvido (página excluída ou restrita), o botão não
          // aparece — melhor não ter atalho do que ter um que leva a lugar nenhum.
          conventionsHref ? (
            <ButtonLink href={conventionsHref} variant="secondary">
              Ver as convenções
            </ButtonLink>
          ) : null
        }
      />

      {formTemplates.length === 0 ? (
        <EmptyState
          title="Nenhum modelo de nomenclatura cadastrado"
          description={
            podeParametrizar
              ? "Cadastre o primeiro modelo para o time começar a usar o gerador."
              : "Quem cuida dos parâmetros precisa cadastrar os modelos antes de usar o gerador."
          }
          action={
            podeParametrizar ? (
              <ButtonLink href="/parametros/nomenclaturas">
                Cadastrar modelo
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <Card>
          <CardHeader
            title="Montar nome"
            description={
              businessUnits.length === 0
                ? "Atenção: nenhuma Business Unit ativa cadastrada."
                : undefined
            }
          />
          <CardBody>
            <NameGeneratorForm
              templates={formTemplates}
              businessUnits={businessUnits}
            />
          </CardBody>
        </Card>
      )}

      {podeParametrizar && formTemplates.length > 0 ? (
        <p className="mt-6 text-xs text-slate-500">
          Precisa de um formato novo?{" "}
          <Link
            href="/parametros/nomenclaturas"
            className="font-medium text-brand-600 hover:underline"
          >
            Cadastre um modelo
          </Link>{" "}
          em Parâmetros → Nomenclaturas.
        </p>
      ) : null}
    </>
  );
}
