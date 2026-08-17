import type { Metadata } from "next";
import Link from "next/link";

import { PersonaForm } from "../persona-form";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { listActiveBusinessUnits } from "@/lib/modules/personas/queries";

export const metadata: Metadata = { title: "Nova persona" };
export const dynamic = "force-dynamic";

export default async function NewPersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ bu?: string }>;
}) {
  await requirePermission("personas", "edit");
  const businessUnits = await listActiveBusinessUnits();
  const { bu } = await searchParams;

  const selected = businessUnits.find((unit) => unit.slug === bu);

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/personas" className="hover:text-slate-900">
          Personas
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">Nova persona</span>
      </nav>

      <PageHeader
        title="Nova persona"
        description="Os campos são os mesmos para toda persona — é isso que permite comparar públicos de BUs diferentes."
      />

      {businessUnits.length === 0 ? (
        <EmptyState
          title="Nenhuma Business Unit ativa"
          description="Toda persona pertence a uma BU. Cadastre uma em Administração > Business Units."
        />
      ) : (
        <PersonaForm
          mode="create"
          cancelHref="/personas"
          businessUnits={businessUnits.map((unit) => ({
            id: unit.id,
            label: unit.label,
          }))}
          values={{
            businessUnitId: selected?.id ?? "",
            name: "",
            headline: "",
            ageRange: "",
            gender: "",
            location: "",
            income: "",
            education: "",
            careerStage: "",
            currentRole: "",
            workplace: "",
            careerGoal: "",
            interests: "",
            channels: "",
            notes: "",
            pains: [],
          }}
        />
      )}
    </>
  );
}
