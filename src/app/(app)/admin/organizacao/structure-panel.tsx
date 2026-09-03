"use client";

import { useActionState, useState } from "react";

import { createOrgUnit, toggleOrgUnit, updateOrgUnit } from "./actions";
import { INITIAL_ORG_STATE } from "./form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  ORG_UNIT_KINDS,
  ORG_UNIT_KIND_LABELS,
  type OrgUnitKind,
} from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import { plural } from "@/lib/utils/text";

export type UnitRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  kind: OrgUnitKind;
  isActive: boolean;
  depth: number;
  parentOrgUnitId: string | null;
  memberCount: number;
  totalMemberCount: number;
  memberNames: string[];
};

const KIND_TONES: Record<OrgUnitKind, "brand" | "neutral"> = {
  sector: "brand",
  subsector: "brand",
  team: "neutral",
};

/**
 * A estrutura inteira numa lista indentada, e não em cartões soltos.
 *
 * A indentação É a informação: o que se confere aqui é se cada unidade está
 * pendurada no lugar certo. Cartões lado a lado mostram as unidades mas escondem
 * a hierarquia, que é a única coisa que essa tela existe para mostrar.
 */
export function StructurePanel({ units }: { units: UnitRow[] }) {
  const [criando, setCriando] = useState<{ parentId: string | null } | null>(
    null,
  );
  const [editando, setEditando] = useState<UnitRow | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {units.filter((unit) => unit.kind === "team").length} times em{" "}
          {units.filter((unit) => unit.kind === "subsector").length} subsetores.
        </p>
        <Button
          variant="primary"
          onClick={() => setCriando({ parentId: null })}
        >
          + Novo setor, subsetor ou time
        </Button>
      </div>

      <Card>
        <CardBody className="px-0 py-0">
          <ul className="divide-y divide-slate-100">
            {units.map((unit) => (
              <li
                key={unit.id}
                className={cn(
                  "flex flex-wrap items-start justify-between gap-3 px-5 py-3",
                  !unit.isActive && "bg-slate-50/60",
                )}
              >
                <div
                  className="min-w-0 flex-1"
                  // A indentação vem do nível na árvore. Uma classe por nível
                  // exigiria uma classe nova a cada nível que a estrutura ganhe.
                  style={{ paddingLeft: `${unit.depth * 1.5}rem` }}
                >
                  <p className="flex flex-wrap items-center gap-2">
                    {unit.depth > 0 ? (
                      <span aria-hidden className="text-slate-300">
                        └
                      </span>
                    ) : null}
                    <span
                      className={cn(
                        "font-medium text-slate-900",
                        unit.kind === "sector" && "font-display text-base",
                      )}
                    >
                      {unit.name}
                    </span>
                    <Badge tone={KIND_TONES[unit.kind]}>
                      {ORG_UNIT_KIND_LABELS[unit.kind]}
                    </Badge>
                    {unit.isActive ? null : <Badge>Inativa</Badge>}
                  </p>

                  {/*
                    Uma contagem só por linha. Um time mostra quem está nele;
                    um setor mostra quantos respondem a ele no total — que é a
                    pergunta que se faz de um setor. Os dois números em toda
                    linha ensinavam a ignorar os dois.
                  */}
                  <p className="mt-0.5 text-xs text-slate-500">
                    {unit.kind === "team"
                      ? unit.memberCount > 0
                        ? plural(unit.memberCount, "pessoa")
                        : "sem ninguém"
                      : unit.totalMemberCount > 0
                        ? `${plural(unit.totalMemberCount, "pessoa")} abaixo`
                        : "sem ninguém abaixo"}
                  </p>

                  {unit.memberNames.length > 0 ? (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {unit.memberNames.join(", ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  {unit.kind !== "team" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCriando({ parentId: unit.id })}
                    >
                      + Criar aqui dentro
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditando(unit)}
                  >
                    Editar
                  </Button>
                  <form action={toggleOrgUnit}>
                    <input type="hidden" name="teamId" value={unit.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {unit.isActive ? "Desativar" : "Reativar"}
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <NewUnitDrawer
        open={criando !== null}
        parentId={criando?.parentId ?? null}
        units={units}
        onClose={() => setCriando(null)}
      />
      <EditUnitDrawer
        unit={editando}
        units={units}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}

/** Opções de "está dentro de", com o caminho visível na indentação do rótulo. */
function opcoesDePai(units: UnitRow[], excluirId?: string) {
  const proibidos = new Set<string>();
  if (excluirId) {
    // Uma unidade não pode ser pendurada nela mesma nem nos próprios
    // descendentes: o ramo sumiria da árvore inteira, porque o percurso nunca
    // chegaria nele. O servidor recusa; aqui a opção nem aparece.
    const fila = [excluirId];
    while (fila.length > 0) {
      const atual = fila.shift()!;
      proibidos.add(atual);
      for (const unit of units) {
        if (unit.parentOrgUnitId === atual) fila.push(unit.id);
      }
    }
  }

  return units
    .filter((unit) => unit.kind !== "team" && !proibidos.has(unit.id))
    .map((unit) => ({
      value: unit.id,
      label: `${"— ".repeat(unit.depth)}${unit.name}`,
      triggerLabel: unit.name,
      hint: ORG_UNIT_KIND_LABELS[unit.kind],
    }));
}

function NewUnitDrawer({
  open,
  parentId,
  units,
  onClose,
}: {
  open: boolean;
  parentId: string | null;
  units: UnitRow[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createOrgUnit,
    INITIAL_ORG_STATE,
  );

  const pai = units.find((unit) => unit.id === parentId);
  // Dentro de um subsetor, o que se cria é um time; solto, um setor. É o caso
  // esmagadoramente mais comum, e continua editável.
  const kindSugerido: OrgUnitKind =
    pai?.kind === "subsector" ? "team" : pai ? "subsector" : "sector";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Novo setor, subsetor ou time"
      description={pai ? `Dentro de ${pai.name}.` : undefined}
    >
      <form
        action={formAction}
        // Remontar ao trocar de pai: sem isso o nível sugerido continuaria o da
        // abertura anterior, e o campo mentiria sobre o que vai ser criado.
        key={parentId ?? "raiz"}
        className="space-y-4"
      >
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

        <Field label="Nome" htmlFor="unit-name" required>
          <Input
            id="unit-name"
            name="name"
            required
            maxLength={80}
            placeholder="Ex.: Mídia e Aquisição"
          />
        </Field>

        <Field label="Nível" htmlFor="unit-kind" required>
          <Select
            id="unit-kind"
            name="kind"
            defaultValue={kindSugerido}
            options={ORG_UNIT_KINDS.map((kind) => ({
              value: kind,
              label: ORG_UNIT_KIND_LABELS[kind],
            }))}
          />
        </Field>

        <Field
          label="Está dentro de"
          htmlFor="unit-parent"
          hint="Quem responde pelo nível de cima responde por tudo que está abaixo."
        >
          <Select
            id="unit-parent"
            name="parentOrgUnitId"
            defaultValue={parentId ?? ""}
            options={[
              { value: "", label: "Nada acima (primeiro nível)" },
              ...opcoesDePai(units),
            ]}
          />
        </Field>

        <Field label="Descrição" htmlFor="unit-description">
          <Input id="unit-description" name="description" maxLength={200} />
        </Field>

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Criando…" : "Criar"}
        </Button>
      </form>
    </Drawer>
  );
}

function EditUnitDrawer({
  unit,
  units,
  onClose,
}: {
  unit: UnitRow | null;
  units: UnitRow[];
  onClose: () => void;
}) {
  return (
    <Drawer
      open={unit !== null}
      onClose={onClose}
      title={unit ? `Editar ${unit.name}` : ""}
    >
      {unit ? (
        <form action={updateOrgUnit} className="space-y-4" onSubmit={onClose}>
          <input type="hidden" name="teamId" value={unit.id} />

          <Field label="Nome" htmlFor="edit-unit-name" required>
            <Input
              id="edit-unit-name"
              name="name"
              required
              maxLength={80}
              defaultValue={unit.name}
            />
          </Field>

          <Field label="Nível" htmlFor="edit-unit-kind" required>
            <Select
              id="edit-unit-kind"
              name="kind"
              defaultValue={unit.kind}
              options={ORG_UNIT_KINDS.map((kind) => ({
                value: kind,
                label: ORG_UNIT_KIND_LABELS[kind],
              }))}
            />
          </Field>

          <Field label="Está dentro de" htmlFor="edit-unit-parent">
            <Select
              id="edit-unit-parent"
              name="parentOrgUnitId"
              defaultValue={unit.parentOrgUnitId ?? ""}
              options={[
                { value: "", label: "Nada acima (primeiro nível)" },
                ...opcoesDePai(units, unit.id),
              ]}
            />
          </Field>

          <Field label="Descrição" htmlFor="edit-unit-description">
            <Input
              id="edit-unit-description"
              name="description"
              maxLength={200}
              defaultValue={unit.description ?? ""}
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
