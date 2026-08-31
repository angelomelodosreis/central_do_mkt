import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
} from "@/components/ui/card";
import { DOC_VISIBILITY_LABELS } from "@/lib/db/schema";
import { listBusinessUnitDocs } from "@/lib/modules/documentation/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Documentos da BU" };
export const dynamic = "force-dynamic";

export default async function BusinessUnitDocsPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, currentUser, canEditModule } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  const canEdit = canEditModule("documentation");
  const docs = await listBusinessUnitDocs(unit.id, currentUser);

  const internos = docs.filter((doc) => doc.scope === "business_unit");
  const publicados = docs.filter((doc) => doc.scope === "general");

  return (
    <>
      <PageHeader
        title="Documentos"
        description={`Testes, pesquisas de mercado e o que mais ${unit.label} documenta. Cada documento pode ficar só aqui ou também na biblioteca geral do time.`}
        action={
          canEdit ? (
            <ButtonLink href={`/planejamento/${unit.slug}/documentos/nova`}>
              Novo documento
            </ButtonLink>
          ) : null
        }
      />

      {docs.length === 0 ? (
        <EmptyState
          title="Nenhum documento nesta BU"
          description={
            canEdit
              ? "Registre aqui as pesquisas, os testes e os aprendizados da BU. No cadastro você escolhe se aquilo fica interno ou vai para a biblioteca geral."
              : "Assim que a equipe da BU documentar algo, aparece aqui."
          }
          action={
            canEdit ? (
              <ButtonLink href={`/planejamento/${unit.slug}/documentos/nova`}>
                Criar documento
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          <DocGroup
            title="Internos da BU"
            description="Visíveis apenas para quem trabalha nesta BU."
            docs={internos}
          />
          <DocGroup
            title="Publicados na biblioteca geral"
            description="Também aparecem em Documentação, para o time todo."
            docs={publicados}
          />
        </div>
      )}
    </>
  );
}

function DocGroup({
  title,
  description,
  docs,
}: {
  title: string;
  description: string;
  docs: Awaited<ReturnType<typeof listBusinessUnitDocs>>;
}) {
  if (docs.length === 0) return null;

  return (
    <Card>
      <CardHeader
        title={`${title} (${docs.length})`}
        description={description}
      />
      <CardBody className="px-0 py-0">
        <ul className="divide-y divide-slate-100">
          {docs.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/documentacao/${doc.categorySlug}/${doc.slug}`}
                className="block px-5 py-3.5 transition-colors hover:bg-slate-50"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {doc.title}
                    </span>
                    <Badge tone="neutral">{doc.categoryName}</Badge>
                    {doc.visibility !== "all_active_users" ? (
                      <Badge tone="warning">
                        {DOC_VISIBILITY_LABELS[doc.visibility]}
                      </Badge>
                    ) : null}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    atualizado em {formatDate(doc.updatedAt)}
                  </span>
                </span>
                {doc.summary ? (
                  <span className="mt-0.5 block text-sm text-slate-500">
                    {doc.summary}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
