import type { Metadata } from "next";

import { GeneratorWorkspace } from "./generator-workspace";
import type { FormTemplate } from "./name-generator-form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { can, requirePermission } from "@/lib/auth/session";
import { loadBaseOptions } from "@/lib/modules/bases/queries";
import { getPageHrefById } from "@/lib/modules/documentation/queries";
import { describeTemplateFormat } from "@/lib/modules/name-generator/generate";
import { listActiveTemplates } from "@/lib/modules/name-generator/queries";

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

  // Os modelos e as bases vêm do banco: cadastrar um modelo novo ou uma BU nova
  // aparece aqui imediatamente, sem precisar mexer no código.
  const [templates, baseOptions, conventionsHref] = await Promise.all([
    listActiveTemplates(),
    loadBaseOptions(),
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
      sourceKey: field.sourceKey,
    })),
  }));

  // Quem gere os modelos é quem tem a permissão correspondente — o menu
  // separado de Parâmetros deixou de existir, mas a permissão continua sendo a
  // linha que separa quem USA de quem DEFINE.
  const podeGerir = can(currentUser, "parameters", "edit");

  const formatos = Object.fromEntries(
    templates.map((template) => [
      template.id,
      describeTemplateFormat(template.fields, template.blockSeparator),
    ]),
  );

  return (
    <>
      <PageHeader
        title="Gerador de Nomes"
        description="Escolha o que você quer nomear, preencha os campos e copie o nome já padronizado."
        action={
          <div className="flex flex-wrap gap-2">
            {/* Sem endereço resolvido (página excluída ou restrita), o botão não
                aparece — melhor não ter atalho do que ter um que leva a lugar
                nenhum. */}
            {conventionsHref ? (
              <ButtonLink href={conventionsHref} variant="ghost">
                Ver as convenções
              </ButtonLink>
            ) : null}
            {podeGerir ? (
              <ButtonLink href="/gerador-de-nomes/modelos" variant="secondary">
                Gerir modelos
              </ButtonLink>
            ) : null}
          </div>
        }
      />

      {formTemplates.length === 0 ? (
        <EmptyState
          title="Nenhum modelo de nomenclatura cadastrado"
          description={
            podeGerir
              ? "Crie o primeiro modelo para o time começar a usar o gerador."
              : "Quem cuida dos modelos precisa cadastrá-los antes de usar o gerador."
          }
          action={
            podeGerir ? (
              <ButtonLink href="/gerador-de-nomes/modelos">
                + Criar modelo
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <GeneratorWorkspace
          templates={formTemplates}
          formats={formatos}
          baseOptions={baseOptions}
          canManage={podeGerir}
        />
      )}
    </>
  );
}
