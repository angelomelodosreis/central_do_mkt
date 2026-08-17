import type { Metadata } from "next";
import Link from "next/link";

import { toggleTemplate } from "./actions";
import { NewTemplateForm } from "./new-template-form";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { describeTemplateFormat } from "@/lib/modules/name-generator/generate";
import { listAllTemplates } from "@/lib/modules/name-generator/queries";

export const metadata: Metadata = { title: "Nomenclaturas" };
export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  await requirePermission("parameters", "edit");
  const templates = await listAllTemplates();

  const activeCount = templates.filter((template) => template.isActive).length;

  return (
    <>
      <PageHeader
        title="Nomenclaturas"
        description="Modelos que o Gerador de Nomes sabe montar. Criar um modelo novo aqui já o disponibiliza para o time, sem precisar de programação."
      />

      <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        {activeCount} de {templates.length}{" "}
        {templates.length === 1 ? "modelo está ativo" : "modelos estão ativos"}.
        Apenas os ativos aparecem no{" "}
        <Link
          href="/gerador-de-nomes"
          className="font-medium underline hover:no-underline"
        >
          Gerador de Nomes
        </Link>
        .
      </div>

      <Card>
        <CardHeader
          title="Novo modelo"
          description="Depois de criar, você define os blocos que compõem o nome."
        />
        <CardBody>
          <NewTemplateForm />
        </CardBody>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader title={`Modelos cadastrados (${templates.length})`} />
          <CardBody className="px-0 py-0">
            {templates.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Nenhum modelo cadastrado ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {templates.map((template) => {
                  const hasFields = template.fields.length > 0;
                  return (
                    <li
                      key={template.id}
                      className={`flex flex-wrap items-start justify-between gap-4 px-5 py-4 ${
                        template.isActive ? "" : "bg-slate-50/60"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/parametros/nomenclaturas/${template.id}`}
                            className="font-medium text-slate-900 hover:text-brand-700 hover:underline"
                          >
                            {template.name}
                          </Link>
                          {template.isActive ? (
                            <Badge tone="success">Ativo</Badge>
                          ) : (
                            <Badge tone="neutral">Inativo</Badge>
                          )}
                          {!hasFields ? (
                            <Badge tone="warning">Sem campos</Badge>
                          ) : null}
                        </p>

                        {template.description ? (
                          <p className="mt-0.5 text-sm text-slate-500">
                            {template.description}
                          </p>
                        ) : null}

                        <code className="mt-1.5 block font-mono text-xs text-slate-500">
                          {hasFields
                            ? describeTemplateFormat(
                                template.fields,
                                template.blockSeparator,
                              )
                            : "defina os blocos para ver o formato"}
                        </code>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <ButtonLink
                          href={`/parametros/nomenclaturas/${template.id}`}
                          size="sm"
                          variant="secondary"
                        >
                          Editar blocos
                        </ButtonLink>
                        <form action={toggleTemplate}>
                          <input
                            type="hidden"
                            name="templateId"
                            value={template.id}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant={template.isActive ? "danger" : "secondary"}
                            disabled={!template.isActive && !hasFields}
                            title={
                              !template.isActive && !hasFields
                                ? "Defina ao menos um bloco antes de ativar"
                                : undefined
                            }
                          >
                            {template.isActive ? "Desativar" : "Ativar"}
                          </Button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
