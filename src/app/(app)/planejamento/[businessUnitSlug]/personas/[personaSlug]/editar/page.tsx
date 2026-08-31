import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PersonaForm } from "../../persona-form";
import { TogglePersonaButton } from "./toggle-persona-button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { getPersonaBySlug } from "@/lib/modules/personas/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";

export const metadata: Metadata = { title: "Editar persona" };
export const dynamic = "force-dynamic";

type Params = Promise<{ businessUnitSlug: string; personaSlug: string }>;

export default async function EditPersonaPage({ params }: { params: Params }) {
  const { businessUnitSlug, personaSlug } = await params;
  const { unit, canEditModule } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  if (!canEditModule("personas")) {
    redirect(`/planejamento/${unit.slug}/personas/${personaSlug}`);
  }

  const found = await getPersonaBySlug(businessUnitSlug, personaSlug);
  if (!found) notFound();

  const base = `/planejamento/${unit.slug}/personas`;
  const viewHref = `${base}/${found.slug}`;

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href={base} className="hover:text-slate-900">
          Personas
        </Link>
        <span aria-hidden>/</span>
        <Link href={viewHref} className="hover:text-slate-900">
          {found.name}
        </Link>
        <span aria-hidden>/</span>
        <span className="text-slate-700">Editar</span>
      </nav>

      <PageHeader
        title="Editar persona"
        description="Toda alteração fica registrada na trilha de auditoria."
      />

      <PersonaForm
        mode="edit"
        cancelHref={viewHref}
        businessUnitId={unit.id}
        businessUnitLabel={unit.label}
        values={{
          personaId: found.id,
          name: found.name,
          headline: found.headline ?? "",
          ageRange: found.ageRange ?? "",
          gender: found.gender ?? "",
          location: found.location ?? "",
          income: found.income ?? "",
          education: found.education ?? "",
          careerStage: found.careerStage ?? "",
          currentRole: found.currentRole ?? "",
          workplace: found.workplace ?? "",
          careerGoal: found.careerGoal ?? "",
          interests: (found.interests ?? []).join("\n"),
          channels: (found.channels ?? []).join("\n"),
          notes: found.notes ?? "",
          pains: found.pains.map((entry) => ({
            pain: entry.pain,
            solution: entry.solution ?? "",
          })),
        }}
      />

      <div className="mt-8">
        <Card className={found.isActive ? "border-danger-200" : undefined}>
          <CardHeader
            title={found.isActive ? "Desativar persona" : "Reativar persona"}
            description={
              found.isActive
                ? "Ela sai das listagens, mas continua existindo — campanhas antigas que a citam seguem fazendo sentido."
                : "Ela volta a aparecer nas listagens."
            }
          />
          <CardBody>
            <TogglePersonaButton
              personaId={found.id}
              personaName={found.name}
              isActive={found.isActive}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
