import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PersonaForm } from "../persona-form";
import { PageHeader } from "@/components/ui/card";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";

export const metadata: Metadata = { title: "Nova persona" };
export const dynamic = "force-dynamic";

export default async function NewPersonaPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, canEditModule } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  // Quem só consulta não deve nem abrir o formulário — a action recusaria, mas
  // preencher uma tela inteira para levar um "não" no fim é UX ruim.
  if (!canEditModule("personas")) {
    redirect(`/planejamento/${unit.slug}/personas`);
  }

  const base = `/planejamento/${unit.slug}/personas`;

  return (
    <>
      <PageHeader
        title="Nova persona"
        description={`Os campos são os mesmos para toda persona da plataforma — é isso que permite comparar o público de ${unit.label} com o das outras BUs.`}
      />

      <PersonaForm
        mode="create"
        cancelHref={base}
        businessUnitId={unit.id}
        businessUnitLabel={unit.label}
        values={{
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
    </>
  );
}
