import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PersonaForm } from "../../../persona-form";
import { TogglePersonaButton } from "./toggle-persona-button";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import {
  getPersonaBySlug,
  listActiveBusinessUnits,
} from "@/lib/modules/personas/queries";

export const metadata: Metadata = { title: "Editar persona" };
export const dynamic = "force-dynamic";

type Params = Promise<{ businessUnitSlug: string; personaSlug: string }>;

export default async function EditPersonaPage({ params }: { params: Params }) {
  const { businessUnitSlug, personaSlug } = await params;
  await requirePermission("personas", "edit");

  const found = await getPersonaBySlug(businessUnitSlug, personaSlug);
  if (!found) notFound();

  const businessUnits = await listActiveBusinessUnits();
  const viewHref = `/personas/${found.businessUnitSlug}/${found.slug}`;

  return (
    <>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <Link href="/personas" className="hover:text-slate-900">
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
        businessUnits={businessUnits.map((unit) => ({
          id: unit.id,
          label: unit.label,
        }))}
        values={{
          personaId: found.id,
          businessUnitId: found.businessUnitId,
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
