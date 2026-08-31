"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import {
  createBusinessUnit,
  toggleBusinessUnit,
  updateBusinessUnit,
} from "../actions";
import { INITIAL_BASE_STATE } from "../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, FIELD_WIDTHS } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

type DivisionRef = { id: string; name: string };

type UnitCard = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  isActive: boolean;
  divisionId: string | null;
  divisionName: string | null;
  productCount: number;
};

/**
 * As BUs, agrupadas pela divisão a que pertencem.
 *
 * O agrupamento é a tela inteira: a pergunta que se faz aqui é "a estrutura de
 * negócio está certa?", e uma lista alfabética de 22 BUs não responde isso.
 * Agrupadas, uma BU na divisão errada salta aos olhos.
 */
export function BusinessUnitsPanel({
  units,
  divisions,
}: {
  units: UnitCard[];
  divisions: DivisionRef[];
}) {
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<UnitCard | null>(null);

  const filtradas = useMemo(
    () => units.filter((unit) => matchesSearch(busca, unit.label, unit.slug)),
    [units, busca],
  );

  const grupos = useMemo(() => {
    const semDivisao = filtradas.filter((unit) => !unit.divisionId);
    const comDivisao = divisions
      .map((division) => ({
        division,
        units: filtradas.filter((unit) => unit.divisionId === division.id),
      }))
      .filter((grupo) => grupo.units.length > 0);
    return { comDivisao, semDivisao };
  }, [filtradas, divisions]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-56 flex-1">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por nome ou identificador…"
            aria-label="Buscar Business Unit"
          />
        </div>
        <Button variant="primary" onClick={() => setCriando(true)}>
          + Nova Business Unit
        </Button>
      </div>

      {filtradas.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-sm text-slate-400">
            Nenhuma BU encontrada para “{busca}”.
          </CardBody>
        </Card>
      ) : null}

      {grupos.semDivisao.length > 0 ? (
        <Grupo
          titulo="Sem divisão definida"
          aviso
          units={grupos.semDivisao}
          divisions={divisions}
          onEdit={setEditando}
        />
      ) : null}

      {grupos.comDivisao.map((grupo) => (
        <Grupo
          key={grupo.division.id}
          titulo={grupo.division.name}
          units={grupo.units}
          divisions={divisions}
          onEdit={setEditando}
        />
      ))}

      <NewUnitDrawer
        open={criando}
        onClose={() => setCriando(false)}
        divisions={divisions}
      />
      <EditUnitDrawer
        unit={editando}
        divisions={divisions}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}

function Grupo({
  titulo,
  units,
  divisions,
  aviso,
  onEdit,
}: {
  titulo: string;
  units: UnitCard[];
  divisions: DivisionRef[];
  aviso?: boolean;
  onEdit: (unit: UnitCard) => void;
}) {
  return (
    <Card className={cn(aviso && "border-amber-200")}>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3",
          aviso ? "border-amber-200 bg-amber-50" : "border-slate-200",
        )}
      >
        <h2
          className={cn(
            "text-sm font-semibold",
            aviso ? "text-amber-900" : "text-slate-900",
          )}
        >
          {titulo}
        </h2>
        <span
          className={cn(
            "text-xs tabular-nums",
            aviso ? "text-amber-800" : "text-slate-500",
          )}
        >
          {units.length} {units.length === 1 ? "BU" : "BUs"}
        </span>
      </div>

      <ul className="divide-y divide-slate-100">
        {units.map((unit) => (
          <li
            key={unit.id}
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 px-5 py-3",
              !unit.isActive && "bg-slate-50/60",
            )}
          >
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{unit.label}</span>
                <code className="font-mono text-xs text-slate-500">
                  {unit.slug}
                </code>
                {unit.isActive ? null : <Badge>Inativa</Badge>}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {unit.productCount > 0 ? (
                  <Link
                    href="/admin/bases/produtos"
                    className="hover:text-brand-700 hover:underline"
                  >
                    {unit.productCount}{" "}
                    {unit.productCount === 1 ? "produto" : "produtos"}
                  </Link>
                ) : (
                  <span className="text-slate-400">
                    nenhum produto vinculado
                  </span>
                )}
                {unit.description ? ` · ${unit.description}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {/* Trocar a divisão direto na linha: é a correção mais provável
                  nesta tela, e abrir um formulário para ela seria trabalho
                  desproporcional ao tamanho da mudança. */}
              <form
                action={updateBusinessUnit}
                className="flex items-center gap-1.5"
              >
                <input type="hidden" name="businessUnitId" value={unit.id} />
                <input type="hidden" name="label" value={unit.label} />
                <input
                  type="hidden"
                  name="description"
                  value={unit.description ?? ""}
                />
                <div className={FIELD_WIDTHS.lg}>
                  <Select
                    name="divisionId"
                    size="sm"
                    defaultValue={unit.divisionId ?? ""}
                    ariaLabel={`Divisão de ${unit.label}`}
                    options={[
                      { value: "", label: "Sem divisão" },
                      ...divisions.map((division) => ({
                        value: division.id,
                        label: division.name,
                      })),
                    ]}
                  />
                </div>
                <Button type="submit" size="sm" variant="secondary">
                  Salvar
                </Button>
              </form>

              <Button size="sm" variant="ghost" onClick={() => onEdit(unit)}>
                Editar
              </Button>

              <form action={toggleBusinessUnit}>
                <input type="hidden" name="businessUnitId" value={unit.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant={unit.isActive ? "danger" : "secondary"}
                >
                  {unit.isActive ? "Desativar" : "Reativar"}
                </Button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function NewUnitDrawer({
  open,
  onClose,
  divisions,
}: {
  open: boolean;
  onClose: () => void;
  divisions: DivisionRef[];
}) {
  const [state, formAction, isPending] = useActionState(
    createBusinessUnit,
    INITIAL_BASE_STATE,
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Nova Business Unit"
      description="O squad dela é criado junto — sem squad, ninguém teria como ser vinculado à BU."
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

        <Field label="Nome" htmlFor="unit-label" required>
          <Input
            id="unit-label"
            name="label"
            required
            maxLength={80}
            placeholder="Ex.: Clínica Médica"
          />
        </Field>

        <Field
          label="Identificador"
          htmlFor="unit-slug"
          hint="Opcional — sai do nome quando em branco. É o que entra nos nomes gerados, e não muda depois."
        >
          <Input
            id="unit-slug"
            name="slug"
            maxLength={60}
            placeholder="clinica_medica"
            className="font-mono"
          />
        </Field>

        <Field label="Divisão" htmlFor="unit-division">
          <Select
            id="unit-division"
            name="divisionId"
            defaultValue=""
            options={[
              { value: "", label: "Definir depois" },
              ...divisions.map((division) => ({
                value: division.id,
                label: division.name,
              })),
            ]}
          />
        </Field>

        <Field label="Descrição" htmlFor="unit-description">
          <Input id="unit-description" name="description" maxLength={200} />
        </Field>

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Cadastrando…" : "Cadastrar BU"}
        </Button>
      </form>
    </Drawer>
  );
}

function EditUnitDrawer({
  unit,
  divisions,
  onClose,
}: {
  unit: UnitCard | null;
  divisions: DivisionRef[];
  onClose: () => void;
}) {
  return (
    <Drawer
      open={unit !== null}
      onClose={onClose}
      title={unit ? `Editar ${unit.label}` : ""}
      description="O identificador não muda: nomes já gerados apontam para ele."
    >
      {unit ? (
        <form
          action={updateBusinessUnit}
          className="space-y-4"
          onSubmit={onClose}
        >
          <input type="hidden" name="businessUnitId" value={unit.id} />

          <Field label="Nome" htmlFor="edit-unit-label" required>
            <Input
              id="edit-unit-label"
              name="label"
              required
              maxLength={80}
              defaultValue={unit.label}
            />
          </Field>

          <Field label="Divisão" htmlFor="edit-unit-division">
            <Select
              id="edit-unit-division"
              name="divisionId"
              defaultValue={unit.divisionId ?? ""}
              options={[
                { value: "", label: "Sem divisão" },
                ...divisions.map((division) => ({
                  value: division.id,
                  label: division.name,
                })),
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

          <p className="text-xs text-slate-500">
            Identificador:{" "}
            <code className="font-mono text-slate-700">{unit.slug}</code>
          </p>

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
