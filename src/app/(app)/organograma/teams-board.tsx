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
                      ? "Arraste alguém para cá para incluir na unidade"
                      : "Ninguém diretamente nesta unidade"}
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {doTime.map((person) => {
                      const posicao = person.positions.find(
                        (p) => p.teamId === team.id,
                      )!;
                      return (
                        // O cartão inteiro é o alvo: um "editar" de 11px
                        // embaixo era um alvo pequeno para a ação mais comum
                        // desta tela.
                        <button
                          key={person.userId}
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
        <Card className="border-amber-300">
          <CardHeader
            title={`Fora da estrutura (${semTime.length})`}
            description="Não recebem tarefa endereçada a unidade. Arraste para uma unidade acima."
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
        </Card>
      ) : null}
    </div>
  );
}
