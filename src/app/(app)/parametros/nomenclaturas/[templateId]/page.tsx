import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddFieldForm } from "./add-field-form";
import { EditTemplateForm } from "./edit-template-form";
import { TemplateFieldRow } from "./template-field-row";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { describeTemplateFormat } from "@/lib/modules/name-generator/generate";
import { getTemplateById } from "@/lib/modules/name-generator/queries";

export const metadata: Metadata = { title: "Editar modelo" };
export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requirePermission("parameters", "edit");
  const { templateId } = await params;

  const template = await getTemplateById(templateId);
  if (!template) notFound();

  const hasFields = template.fields.length > 0;

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/parametros/nomenclaturas" className="hover:text-slate-900">
          Nomenclaturas
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{template.name}</span>
      </nav>

      <PageHeader
        title={template.name}
        description="Os blocos abaixo formam o nome, na ordem em que aparecem."
      />

      <div className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <p className="text-xs text-slate-500">Formato resultante</p>
        <code className="mt-1 block break-all font-mono text-sm text-slate-900">
          {hasFields
            ? describeTemplateFormat(template.fields, template.blockSeparator)
            : "— defina os blocos abaixo —"}
        </code>
        <p className="mt-2 text-xs text-slate-500">
          {template.isActive
            ? "Este modelo está ativo e aparece no Gerador de Nomes."
            : hasFields
              ? "Este modelo está inativo. Ative-o na listagem para o time poder usá-lo."
              : "Adicione ao menos um bloco para poder ativar este modelo."}
        </p>
      </div>

      <Card>
        <CardHeader title="Blocos do nome" />
        <CardBody className="px-0 py-0">
          {!hasFields ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">
              Nenhum bloco definido. Adicione o primeiro abaixo.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {template.fields.map((field, index) => (
                <TemplateFieldRow
                  key={field.id}
                  field={field}
                  index={index}
                  total={template.fields.length}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader
            title="Adicionar bloco"
            description="Cada bloco vira um campo no formulário do gerador."
          />
          <CardBody>
            <AddFieldForm templateId={template.id} />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader title="Nome e descrição" />
          <CardBody>
            <EditTemplateForm
              templateId={template.id}
              name={template.name}
              description={template.description ?? ""}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
