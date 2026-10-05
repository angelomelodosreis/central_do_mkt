"use client";

import { useState, useTransition } from "react";

import { moveSquadMember } from "./actions";
import { readDrag, writeDrag } from "./drag";
import type { OrgPerson, OrgSquad } from "./types";
import { Avatar } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { plural } from "@/lib/utils/text";

/**
 * Squads por Business Unit, em colunas.
 *
 * Colunas lado a lado, e não uma lista de BUs empilhada, porque a pergunta desta
 * visão é comparativa: quem está sobrecarregado, qual BU está descoberta, quem
 * atende três squads ao mesmo tempo. Empilhado, comparar exigiria rolar.
 *
 * O arrastar move a pessoa de uma BU para outra. Só administrador arrasta; para
 * os demais a visão é de leitura.
 */
export function SquadsBoard({
  people,
  squads,
  canEdit,
  onOpenPerson,
}: {
  people: OrgPerson[];
  squads: OrgSquad[];
  canEdit: boolean;
  onOpenPerson: (userId: string) => void;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  const [movendo, iniciarMovimento] = useTransition();

  /**
   * Chama a action com um `FormData` montado na mão.
   *
   * Sem `<form>` de propósito: o gesto de arrastar não tem formulário natural, e
   * a tentativa de pendurá-lo num `<form>` escondido cai no mesmo problema do
   * `DataTransfer` — os campos só teriam o valor novo depois de uma
   * renderização, e o `requestSubmit()` acontece antes dela, enviando o
   * movimento anterior.
   */
  function mover(userId: string, fromId: string | null, toId: string) {
    const dados = new FormData();
    dados.set("userId", userId);
    dados.set("fromSquadId", fromId ?? "");
    dados.set("toSquadId", toId);
    iniciarMovimento(() => {
      void moveSquadMember(dados);
    });
  }

  const semSquad = people.filter((person) => person.squadIds.length === 0);

  return (
    <>
      <div
        className={cn(
          "-mx-4 overflow-x-auto px-4 pb-2 transition-opacity sm:mx-0 sm:px-0",
          movendo && "opacity-60",
        )}
      >
        <div className="flex w-max gap-3">
          {squads.map((unit) => {
            const doSquad = people.filter((person) =>
              person.squadIds.includes(unit.id),
            );
            const ativo = sobre === unit.id;

            return (
              <section
                key={unit.id}
                onDragOver={(event) => {
                  if (!canEdit) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setSobre(unit.id);
                }}
                onDragLeave={() =>
                  setSobre((atual) => (atual === unit.id ? null : atual))
                }
                onDrop={(event) => {
                  if (!canEdit) return;
                  event.preventDefault();
                  setSobre(null);

                  const payload = readDrag(event);
                  if (!payload || payload.fromId === unit.id) return;
                  mover(payload.userId, payload.fromId, unit.id);
                }}
                className={cn(
                  "flex w-64 shrink-0 flex-col rounded-2xl border bg-slate-50/70 p-2.5 transition-colors",
                  ativo
                    ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100"
                    : "border-slate-200",
                )}
              >
                <header className="mb-2 px-1">
                  <p className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display text-sm font-semibold text-slate-900">
                      {unit.label}
                    </span>
                    {unit.isActive ? null : (
                      <Badge tone="neutral">Desativado</Badge>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">
                    {unit.divisionName ? `${unit.divisionName} · ` : ""}
                    {doSquad.length === 0
                      ? "sem ninguém"
                      : `${plural(doSquad.length, "pessoa")}`}
                  </p>
                </header>

                <div className="flex flex-1 flex-col gap-1.5">
                  {doSquad.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-2 py-6 text-center text-xs text-slate-500">
                      {canEdit ? "Arraste alguém para cá" : "Squad não montado"}
                    </p>
                  ) : (
                    doSquad.map((person) => (
                      <MiniPerson
                        key={person.userId}
                        person={person}
                        fromId={unit.id}
                        canEdit={canEdit}
                        isLead={person.leadOfSquadIds.includes(unit.id)}
                        onOpen={onOpenPerson}
                        onRemove={(userId, squadId) => mover(userId, squadId, "")}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {semSquad.length > 0 ? (
        <section
          onDragOver={(event) => {
            if (!canEdit) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setSobre("fora_squad");
          }}
          onDragLeave={() =>
            setSobre((atual) => (atual === "fora_squad" ? null : atual))
          }
          onDrop={(event) => {
            if (!canEdit) return;
            event.preventDefault();
            setSobre(null);
            const payload = readDrag(event);
            if (!payload || !payload.fromId) return;
            mover(payload.userId, payload.fromId, "");
          }}
          className={cn(
            "mt-4 rounded-2xl border border-dashed p-3 transition-colors",
            sobre === "fora_squad"
              ? "border-red-400 bg-red-50/80 ring-2 ring-red-100"
              : "border-amber-300 bg-amber-50/60",
          )}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-amber-900">
              Fora de qualquer squad ({semSquad.length})
            </p>
            {canEdit ? (
              <span className="rounded-full border border-amber-200 bg-amber-100/90 px-2.5 py-0.5 text-xs font-normal text-amber-800">
                Arraste uma pessoa para cá para tirar do squad
              </span>
            ) : null}
          </div>
          <p className="mb-2.5 text-xs text-amber-800">
            Estas pessoas não veem planejamento de BU nenhuma. Arraste para um
            squad acima para alocar, ou solte aqui para desvincular.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {semSquad.map((person) => (
              <div key={person.userId} className="w-56">
                <MiniPerson
                  person={person}
                  fromId={null}
                  canEdit={canEdit}
                  isLead={false}
                  onOpen={onOpenPerson}
                />
              </div>
            ))}
          </div>
        </section>
      ) : canEdit ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setSobre("fora_squad");
          }}
          onDragLeave={() =>
            setSobre((atual) => (atual === "fora_squad" ? null : atual))
          }
          onDrop={(event) => {
            event.preventDefault();
            setSobre(null);
            const payload = readDrag(event);
            if (!payload || !payload.fromId) return;
            mover(payload.userId, payload.fromId, "");
          }}
          className={cn(
            "mt-4 rounded-2xl border border-dashed p-4 text-center text-xs transition-colors",
            sobre === "fora_squad"
              ? "border-red-400 bg-red-50 text-red-700 ring-2 ring-red-100"
              : "border-slate-300 text-slate-500 hover:border-slate-400",
          )}
        >
          Arraste uma pessoa para cá para tirar de qualquer squad
        </div>
      ) : null}
    </>
  );
}

function MiniPerson({
  person,
  fromId,
  canEdit,
  isLead,
  onOpen,
  onRemove,
}: {
  person: OrgPerson;
  fromId: string | null;
  canEdit: boolean;
  isLead: boolean;
  onOpen: (userId: string) => void;
  onRemove?: (userId: string, fromId: string) => void;
}) {
  const [arrastando, setArrastando] = useState(false);

  // Cargo e unidade de origem são o que explicam a mistura do squad: "quem do
  // Design está aqui". Sem eles o cartão seria só um nome.
  const contexto = [
    person.jobTitleName,
    ...person.positions.map((position) => position.teamName),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className={cn(
        "group relative flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left shadow-2xs transition-all",
        canEdit ? "hover:border-brand-300 hover:shadow-xs" : "",
        arrastando && "opacity-40",
      )}
    >
      <button
        type="button"
        draggable={canEdit}
        onDragStart={(event) => {
          if (!canEdit) return;
          writeDrag(event, { userId: person.userId, fromId });
          setArrastando(true);
        }}
        onDragEnd={() => setArrastando(false)}
        onClick={() => onOpen(person.userId)}
        className={cn(
          "min-w-0 flex-1 text-left",
          canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        )}
      >
        <span className="flex items-center gap-2">
          <Avatar name={person.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-xs font-medium text-slate-900">
                {person.name}
              </span>
              {isLead ? (
                <span
                  title="Responde por este squad"
                  aria-label="Responde por este squad"
                  className="size-1.5 shrink-0 rounded-full bg-brand-500"
                />
              ) : null}
            </span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {contexto || "fora da estrutura"}
            </span>
          </span>
        </span>
      </button>

      {canEdit && fromId && onRemove ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(person.userId, fromId);
          }}
          title={`Tirar ${person.name} deste squad`}
          aria-label={`Tirar ${person.name} deste squad`}
          className="ml-1 shrink-0 rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
        >
          <svg
            className="size-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      ) : null}
    </div>
  );
}
