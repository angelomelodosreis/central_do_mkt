import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TemplateBuilder } from "./template-builder";
import { requirePermission } from "@/lib/auth/session";
import { getTemplateById } from "@/lib/modules/name-generator/queries";
import { countBaseOptions, loadBaseOptions } from "@/lib/modules/bases/queries";

export const metadata: Metadata = { title: "Construtor de modelo" };
export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  await requirePermission("parameters", "edit");
  const { templateId } = await params;

  const [template, baseOptions] = await Promise.all([
    getTemplateById(templateId),
    loadBaseOptions(),
  ]);

  if (!template) notFound();

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/gerador-de-nomes" className="hover:text-slate-900">
          Gerador de Nomes
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <Link href="/gerador-de-nomes/modelos" className="hover:text-slate-900">
          Modelos
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">{template.name}</span>
      </nav>

      <TemplateBuilder
        template={{
          id: template.id,
          slug: template.slug,
          name: template.name,
          description: template.description,
          blockSeparator: template.blockSeparator,
          isActive: template.isActive,
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
            dateFormat: field.dateFormat,
          })),
        }}
        // As contagens explicam de onde o bloco tira as opções — "Produtos (64)"
        // responde na hora se a base está cadastrada, sem sair da tela.
        baseCounts={countBaseOptions(baseOptions)}
        baseSamples={{
          business_division:
            baseOptions.business_division[0]?.value ?? "divisao",
          business_unit: baseOptions.business_unit[0]?.value ?? "bu",
          product: baseOptions.product[0]?.value ?? "produto",
        }}
      />
    </>
  );
}
