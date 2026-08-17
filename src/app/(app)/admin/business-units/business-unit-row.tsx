"use client";

import { useState } from "react";

import { toggleBusinessUnit, updateBusinessUnit } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

export function BusinessUnitRow({
  unit,
  people,
}: {
  unit: {
    id: string;
    slug: string;
    label: string;
    description: string | null;
    isActive: boolean;
    strategyOwnerId: string | null;
    strategyOwnerName: string | null;
  };
  /** Quem pode responder pela BU no módulo de Planejamento. */
  people: { id: string; name: string }[];
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="bg-slate-50 px-5 py-4">
        <form action={updateBusinessUnit} className="space-y-3">
          <input type="hidden" name="businessUnitId" value={unit.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`label-${unit.id}`}
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Nome de exibição
              </label>
              <Input
                id={`label-${unit.id}`}
                name="label"
                defaultValue={unit.label}
                maxLength={60}
                required
              />
            </div>
            <div>
              <label
                htmlFor={`description-${unit.id}`}
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Descrição
              </label>
              <Input
                id={`description-${unit.id}`}
                name="description"
                defaultValue={unit.description ?? ""}
                maxLength={200}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor={`owner-${unit.id}`}
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Responsável pelo planejamento
            </label>
            <Select
              id={`owner-${unit.id}`}
              name="strategyOwnerId"
              defaultValue={unit.strategyOwnerId ?? ""}
            >
              <option value="">Ninguém definido</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-slate-500">
              Só esta pessoa (e administradores) edita o calendário e a
              estratégia desta BU.
            </p>
          </div>

          <p className="text-xs text-slate-500">
            O slug{" "}
            <code className="font-mono text-slate-700">{unit.slug}</code> não
            pode ser alterado: ele já foi usado em nomes de listas no CRM.
          </p>
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Salvar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setIsEditing(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-4 px-5 py-3.5 ${
        unit.isActive ? "" : "bg-slate-50/60"
      }`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{unit.label}</span>
          <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700">
            {unit.slug}
          </code>
          {unit.isActive ? null : <Badge tone="neutral">Inativa</Badge>}
        </p>
        {unit.description ? (
          <p className="mt-0.5 text-sm text-slate-500">{unit.description}</p>
        ) : null}
        <p className="mt-0.5 text-xs text-slate-400">
          {unit.strategyOwnerName
            ? `Planejamento: ${unit.strategyOwnerName}`
            : "Planejamento sem responsável"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => setIsEditing(true)}
        >
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
  );
}
