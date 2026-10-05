"use client";

import { useState, useTransition } from "react";

import { moveTeamMember } from "./actions";
import { readDrag, writeDrag } from "./drag";
import type { OrgPerson, OrgUnit } from "./types";
import { ORG_UNIT_KIND_LABELS } from "@/lib/db/schema";
import { PersonCard } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { plural } from "@/lib/utils/text";

/**
 * Estrutura de cada time: quem responde por ele, depois a equipe.
 *
 * Ordenada por senioridade do cargo, e não por nome: a pergunta desta visão é
 * "como o time é composto" — quantos analistas, quantos assistentes —, e a ordem
 * alfabética embaralharia exatamente isso.
 */
export function TeamsBoard({
  people,
  units,
  canEdit,
  onOpenPerson,
}: {
  people: OrgPerson[];
  units: OrgUnit[];
  canEdit: boolean;
  onOpenPerson: (userId: string) => void;
}) {
  const [sobre, setSobre] = useState<string | null>(null);
  const [movendo, iniciarMovimento] = useTransition();

  function mover(userId: string, fromId: string | null, toId: string) {
    const dados = new FormData();
    dados.set("userId", userId);
    dados.set("fromTeamId", fromId ?? "");
    dados.set("toTeamId", toId);
    iniciarMovimento(() => {
      void moveTeamMember(dados);
    });
  }

  const semTime = people.filter((person) => person.positions.length === 0);

  return (
    <div
      className={cn("space-y-5 transition-opacity", movendo && "opacity-60")}
    >
      {units.map((team) => {
        const doTime = people
          .filter((person) =>
            person.positions.some((position) => position.teamId === team.id),
          )
          .sort((a, b) => {
            const pa = a.positions.find((p) => p.teamId === team.id)!;
            const pb = b.positions.find((p) => p.teamId === team.id)!;
            return (
              Number(pb.isLead) - Number(pa.isLead) ||
              // Senioridade vem do CARGO da pessoa: ela tem um só, e ele não
              // muda de unidade para unidade.
              a.jobTitleOrder - b.jobTitleOrder ||
              a.name.localeCompare(b.name, "pt-BR")
            );
          });

        const ativo = sobre === team.id;

        return (
          <Card
            key={team.id}
            className={cn(
              "transition-colors",
              ativo && "border-brand-400 ring-2 ring-brand-100",
            )}
          >
            <div
              onDragOver={(event) => {
                if (!canEdit) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setSobre(team.id);
              }}
              onDragLeave={() =>
                setSobre((atual) => (atual === team.id ? null : atual))
              }
              onDrop={(event) => {
                if (!canEdit) return;
                event.preventDefault();
                setSobre(null);
                const payload = readDrag(event);
                if (!payload || payload.fromId === team.id) return;
                mover(payload.userId, payload.fromId, team.id);
              }}
            >
              <CardHeader
                title={
                  <span className="flex flex-wrap items-center gap-2">
                    {team.name}
                    <Badge tone={team.kind === "team" ? "neutral" : "brand"}>
                      {ORG_UNIT_KIND_LABELS[team.kind]}
                    </Badge>
                    {team.isActive ? null : (
                      <Badge tone="neutral">Inativa</Badge>
                    )}
                    <span className="text-xs font-normal text-slate-500">
                      {doTime.length === 0
                        ? "sem ninguém"
                        : `${plural(doTime.length, "pessoa")}`}
                    </span>
                  </span>
                }
                description={team.description ?? undefined}
              />
              <CardBody>
                {doTime.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500">
                    {canEdit
                      ? "Arraste alguém para cá"
                      : "Ninguém aqui diretamente"}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {doTime.map((person) => {
                      const posicao = person.positions.find(
                        (p) => p.teamId === team.id,
                      )!;
                      return (
                        <div key={person.userId} className="group relative">
                          <button
                            type="button"
                            draggable={canEdit}
                            onDragStart={(event) =>
                              canEdit &&
                              writeDrag(event, {
                                userId: person.userId,
                                fromId: team.id,
                              })
                            }
                            onClick={() => onOpenPerson(person.userId)}
                            className={cn(
                              "block w-full text-left",
                              canEdit && "cursor-grab active:cursor-grabbing",
                            )}
                          >
                            <PersonCard
                              className="hover:border-brand-300 hover:bg-brand-50/40"
                              person={{
                                userId: person.userId,
                                name: person.name,
                                jobTitleName: person.jobTitleName,
                                positions: person.positions,
                                isLead: posicao.isLead,
                              }}
                              hideTeamId={team.id}
                            />
                          </button>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                mover(person.userId, team.id, "");
                              }}
                              title={`Tirar ${person.name} deste time`}
                              aria-label={`Tirar ${person.name} deste time`}
                              className="absolute top-2.5 right-2.5 rounded-lg border border-slate-200 bg-white/95 p-1 text-slate-400 opacity-0 shadow-2xs transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
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
                    })}
                  </div>
                )}
              </CardBody>
            </div>
          </Card>
        );
      })}

      {semTime.length > 0 ? (
        <Card
          className={cn(
            "transition-colors",
            sobre === "fora_time"
              ? "border-red-400 bg-red-50/60 ring-2 ring-red-100"
              : "border-amber-300",
          )}
        >
          <div
            onDragOver={(event) => {
              if (!canEdit) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setSobre("fora_time");
            }}
            onDragLeave={() =>
              setSobre((atual) => (atual === "fora_time" ? null : atual))
            }
            onDrop={(event) => {
              if (!canEdit) return;
              event.preventDefault();
              setSobre(null);
              const payload = readDrag(event);
              if (!payload || !payload.fromId) return;
              mover(payload.userId, payload.fromId, "");
            }}
          >
            <CardHeader
              title={
                <span className="flex w-full items-center justify-between">
                  <span>Fora da estrutura ({semTime.length})</span>
                  {canEdit ? (
                    <span className="rounded-full border border-amber-200 bg-amber-100/90 px-2.5 py-0.5 text-xs font-normal text-amber-800">
                      Arraste alguém para cá para tirar do time
                    </span>
                  ) : null}
                </span>
              }
              description="Não recebem tarefa endereçada a um time. Arraste para o time de cada pessoa, ou arraste para cá para tirar de um time."
            />
            <CardBody>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {semTime.map((person) => (
                  <button
                    key={person.userId}
                    type="button"
                    draggable={canEdit}
                    onDragStart={(event) =>
                      canEdit &&
                      writeDrag(event, { userId: person.userId, fromId: null })
                    }
                    onClick={() => onOpenPerson(person.userId)}
                    className={cn(
                      "block w-full text-left",
                      canEdit && "cursor-grab active:cursor-grabbing",
                    )}
                  >
                    <PersonCard
                      className="hover:border-brand-300 hover:bg-brand-50/40"
                      person={{
                        userId: person.userId,
                        name: person.name,
                        jobTitleName: person.jobTitleName,
                        positions: [],
                      }}
                    />
                  </button>
                ))}
              </div>
            </CardBody>
          </div>
        </Card>
      ) : canEdit ? (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setSobre("fora_time");
          }}
          onDragLeave={() =>
            setSobre((atual) => (atual === "fora_time" ? null : atual))
          }
          onDrop={(event) => {
            event.preventDefault();
            setSobre(null);
            const payload = readDrag(event);
            if (!payload || !payload.fromId) return;
            mover(payload.userId, payload.fromId, "");
          }}
          className={cn(
            "rounded-2xl border border-dashed p-4 text-center text-xs transition-colors",
            sobre === "fora_time"
              ? "border-red-400 bg-red-50 text-red-700 ring-2 ring-red-100"
              : "border-slate-300 text-slate-500 hover:border-slate-400",
          )}
        >
          Arraste uma pessoa para cá para tirar de qualquer time
        </div>
      ) : null}
    </div>
  );
}
