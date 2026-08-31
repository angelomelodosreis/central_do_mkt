"use client";

import { useState, useTransition } from "react";

import { moveSquadMember } from "./actions";
import { readDrag, writeDrag } from "./drag";
import type { OrgPerson, OrgSquad } from "./types";
import { Avatar } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

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
                  <p className="text-xs text-slate-400">
                    {unit.divisionName ? `${unit.divisionName} · ` : ""}
                    {doSquad.length === 0
                      ? "sem ninguém"
                      : `${doSquad.length} ${doSquad.length === 1 ? "pessoa" : "pessoas"}`}
                  </p>
                </header>

                <div className="flex flex-1 flex-col gap-1.5">
                  {doSquad.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-2 py-6 text-center text-xs text-slate-400">
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
          onDragOver={(event) => canEdit && event.preventDefault()}
          className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-3"
        >
          <p className="mb-2 text-sm font-medium text-amber-900">
            Fora de qualquer squad ({semSquad.length})
          </p>
          <p className="mb-2.5 text-xs text-amber-800">
            Estas pessoas não veem planejamento de BU nenhuma. Arraste para um
            squad acima.
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
}: {
  person: OrgPerson;
  fromId: string | null;
  canEdit: boolean;
  isLead: boolean;
  onOpen: (userId: string) => void;
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
        "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left shadow-sm transition-all",
        canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        arrastando && "opacity-40",
        "hover:border-brand-300 hover:shadow",
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
          <span className="mt-0.5 block truncate text-[11px] text-slate-400">
            {contexto || "fora da estrutura"}
          </span>
        </span>
      </span>
    </button>
  );
}
