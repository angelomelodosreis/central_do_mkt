import type { Metadata } from "next";
import Link from "next/link";

import { TemplatesPanel } from "./templates-panel";
import { PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { describeTemplateFormat } from "@/lib/modules/name-generator/generate";
import { listAllTemplates } from "@/lib/modules/name-generator/queries";

export const metadata: Metadata = { title: "Modelos de nomenclatura" };
export const dynamic = "force-dynamic";

/**
 * Gestão dos modelos, dentro do próprio Gerador de Nomes.
 *
 * Deixou de ser um menu à parte ("Parâmetros") porque aquele menu tinha uma
 * única área e ela pertence a esta ferramenta: quem cria um modelo é quem
 * acabou de descobrir que falta um formato. Obrigar a sair do gerador, achar
 * outro menu e voltar era o caminho longo para uma decisão tomada aqui.
 */
export default async function TemplatesPage() {
  await requirePermission("parameters", "edit");
  const templates = await listAllTemplates();

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/gerador-de-nomes" className="hover:text-slate-900">
          Gerador de Nomes
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">Modelos</span>
      </nav>

      <PageHeader
        title="Modelos de nomenclatura"
        description="Cada modelo é uma sequência de blocos unidos por um separador. Só os ativos aparecem no gerador."
      />

      <TemplatesPanel
        templates={templates.map((template) => ({
          id: template.id,
          name: template.name,
          description: template.description,
          isActive: template.isActive,
          fieldCount: template.fields.length,
          format:
            template.fields.length > 0
              ? describeTemplateFormat(template.fields, template.blockSeparator)
              : null,
        }))}
      />
    </>
  );
}
