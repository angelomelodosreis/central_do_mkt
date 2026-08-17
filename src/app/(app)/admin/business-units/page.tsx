import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";

import { BusinessUnitRow } from "./business-unit-row";
import { NewBusinessUnitForm } from "./new-business-unit-form";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { businessUnit, user } from "@/lib/db/schema";
import { getPageHrefById } from "@/lib/modules/documentation/queries";

export const metadata: Metadata = { title: "Business Units" };
export const dynamic = "force-dynamic";

/** Pelo `id`, e não pelo caminho: o slug muda junto com o título da página. */
const BU_REFERENCE_PAGE_ID = "page_business_units";

export default async function AdminBusinessUnitsPage() {
  const admin = await requireAdmin();
  const db = await getDb();

  const referenceHref = await getPageHrefById(BU_REFERENCE_PAGE_ID, admin);

  const units = await db
    .select()
    .from(businessUnit)
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));

  const activeCount = units.filter((unit) => unit.isActive).length;

  // Quem pode responder por uma BU no Planejamento: só gente ativa na
  // plataforma — apontar para uma conta suspensa travaria a edição da BU.
  const people = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.status, "active"))
    .orderBy(asc(user.name));

  const peopleById = new Map(people.map((person) => [person.id, person.name]));

  return (
    <>
      <PageHeader
        title="Business Units"
        description="Fonte única de verdade das BUs. Esta lista alimenta o dropdown do Gerador de Nomes e a página de referência na Documentação."
      />

      <div className="mb-6 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
        {activeCount} de {units.length} BUs estão ativas. Alterações aqui
        aparecem imediatamente no{" "}
        <Link
          href="/gerador-de-nomes"
          className="font-medium underline hover:no-underline"
        >
          Gerador de Nomes
        </Link>{" "}
        {referenceHref ? (
          <>
            {" "}e na{" "}
            <Link
              href={referenceHref}
              className="font-medium underline hover:no-underline"
            >
              página de referência
            </Link>
          </>
        ) : null}
        .
      </div>

      <Card>
        <CardHeader
          title="Cadastrar nova BU"
          description="O slug é o que entra na nomenclatura das listas e não pode ser alterado depois."
        />
        <CardBody>
          <NewBusinessUnitForm />
        </CardBody>
      </Card>

      <div className="mt-6">
        <Card>
          <CardHeader title={`BUs cadastradas (${units.length})`} />
          <CardBody className="px-0 py-0">
            <ul className="divide-y divide-slate-100">
              {units.map((unit) => (
                <BusinessUnitRow
                  key={unit.id}
                  people={people}
                  unit={{
                    id: unit.id,
                    slug: unit.slug,
                    label: unit.label,
                    description: unit.description,
                    isActive: unit.isActive,
                    strategyOwnerId: unit.strategyOwnerId,
                    strategyOwnerName: unit.strategyOwnerId
                      ? (peopleById.get(unit.strategyOwnerId) ?? null)
                      : null,
                  }}
                />
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
