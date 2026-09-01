"use client";

import { useActionState, useState } from "react";

import { createDivision, toggleDivision, updateDivision } from "../actions";
import { INITIAL_BASE_STATE } from "../form-state";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

type UnitRef = { id: string; label: string };

type DivisionCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isActive: boolean;
  businessUnitCount: number;
  units: UnitRef[];
};

/**
 * As divisões, com as BUs de cada uma à vista.
 *
 * A lista das BUs aparece dentro do cartão porque a divisão só significa alguma
 * coisa através delas: "MedCof Formação Médica" sozinho não diz nada, "Enamed,
 * Internato, Residência" diz tudo. Sem isso, conferir o cadastro exigiria abrir
 * a aba de BUs e filtrar mentalmente.
 */
export function DivisionsPanel({
  divisions,
  orphanUnits,
}: {
  divisions: DivisionCard[];
  orphanUnits: UnitRef[];
}) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<DivisionCard | null>(null);

  return (
    <div className="space-y-5">
      {orphanUnits.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {orphanUnits.length}{" "}
            {orphanUnits.length === 1
              ? "Business Unit está"
              : "Business Units estão"}{" "}
            sem divisão.
          </p>
          <p className="mt-0.5">
            {orphanUnits.map((unit) => unit.label).join(", ")} — defina a
            divisão na aba Business Units.
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button variant="primary" onClick={() => setCriando(true)}>
          + Nova divisão
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {divisions.map((division) => (
          <Card
            key={division.id}
            className={cn(!division.isActive && "bg-slate-50/60")}
          >
            <CardHeader
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {division.name}
                  {division.isActive ? null : <Badge>Inativa</Badge>}
                </span>
              }
              description={
                <code className="font-mono text-xs text-slate-500">
                  {division.slug}
                </code>
              }
            />
            <CardBody className="space-y-3">
              {division.description ? (
                <p className="text-sm text-slate-600">{division.description}</p>
              ) : null}

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {division.businessUnitCount}{" "}
                  {division.businessUnitCount === 1
                    ? "Business Unit"
                    : "Business Units"}
                </p>
                {division.units.length > 0 ? (
                  <p className="mt-1 text-sm text-slate-700">
                    {division.units.map((unit) => unit.label).join(" · ")}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    Nenhuma BU nesta divisão ainda.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditando(division)}
                >
                  Editar
                </Button>
                <ButtonLink
                  size="sm"
                  variant="ghost"
                  href="/admin/bases/business-units"
                >
                  Ver BUs
                </ButtonLink>
                <form action={toggleDivision} className="ml-auto">
                  <input type="hidden" name="divisionId" value={division.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    {division.isActive ? "Desativar" : "Reativar"}
                  </Button>
                </form>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <NewDivisionDrawer open={criando} onClose={() => setCriando(false)} />
      <EditDivisionDrawer
        division={editando}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}

function NewDivisionDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createDivision,
    INITIAL_BASE_STATE,
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova divisão de negócio"
      description="O nível mais alto da estrutura. As BUs apontam para ela."
    >
      <form action={formAction} className="space-y-4">
        {state.message ? (
          <p
            role="status"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              state.status === "error"
                ? "border-danger-200 bg-danger-50 text-danger-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
          >
            {state.message}
          </p>
        ) : null}

        <Field label="Nome" htmlFor="division-name" required>
          <Input
            id="division-name"
            name="name"
            required
            maxLength={80}
            placeholder="Ex.: MedCof Especialidades"
          />
        </Field>

        <Field
          label="Identificador"
          htmlFor="division-slug"
          hint="Opcional — sai do nome quando em branco. Não muda depois."
        >
          <Input
            id="division-slug"
            name="slug"
            maxLength={60}
            placeholder="especialidades"
            className="font-mono"
          />
        </Field>

        <Field label="Descrição" htmlFor="division-description">
          <Input
            id="division-description"
            name="description"
            maxLength={200}
            placeholder="O que reúne as BUs desta divisão."
          />
        </Field>

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Criando…" : "Criar divisão"}
        </Button>
      </form>
    </Drawer>
  );
}

function EditDivisionDrawer({
  division,
  onClose,
}: {
  division: DivisionCard | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={division !== null}
      onClose={onClose}
      title={division ? `Editar ${division.name}` : ""}
      description="O identificador não muda: ele já circulou fora da ferramenta."
    >
      {division ? (
        <form action={updateDivision} className="space-y-4" onSubmit={onClose}>
          <input type="hidden" name="divisionId" value={division.id} />

          <Field label="Nome" htmlFor="edit-division-name" required>
            <Input
              id="edit-division-name"
              name="name"
              required
              maxLength={80}
              defaultValue={division.name}
            />
          </Field>

          <Field label="Descrição" htmlFor="edit-division-description">
            <Input
              id="edit-division-description"
              name="description"
              maxLength={200}
              defaultValue={division.description ?? ""}
            />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
