"use client";

import type { OrgPerson, OrgUnit } from "./types";
import { Avatar } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

/**
 * A área inteira, de cima para baixo.
 *
 * Desenhada com bordas em CSS, e não com uma biblioteca de grafos: a estrutura é
 * uma árvore de poucos níveis, e os conectores são duas linhas por nó. Trazer um
 * motor de layout resolveria um problema que não temos e adicionaria peso ao
 * pacote de uma tela que se abre de vez em quando.
 *
 * O nível de cada unidade vem de `parentOrgUnitId`. Unidades sem pai são as
 * colunas de primeiro nível — é o que faz Design, Copy e Social aparecerem sob
 * Conteúdo em vez de soltos na mesma fileira.
 */
export function MarketingTree({
  people,
  units,
  onOpenPerson,
}: {
  people: OrgPerson[];
  units: OrgUnit[];
  onOpenPerson: (userId: string) => void;
}) {
  const raizes = units.filter((unit) => !unit.parentOrgUnitId);

  if (units.length === 0) {
    return (
      <EmptyState
        title="Nenhuma unidade cadastrada"
        description="A estrutura é montada a partir de setores, subsetores e times. Cadastre-os em Administração › Organização."
      />
    );
  }

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      <div className="flex w-max min-w-full justify-center gap-6">
        {raizes.map((raiz) => (
          <TeamNode
            key={raiz.id}
            team={raiz}
            units={units}
            people={people}
            onOpenPerson={onOpenPerson}
            nivel={0}
          />
        ))}
      </div>
    </div>
  );
}

function TeamNode({
  team,
  units,
  people,
  onOpenPerson,
  nivel,
}: {
  team: OrgUnit;
  units: OrgUnit[];
  people: OrgPerson[];
  onOpenPerson: (userId: string) => void;
  nivel: number;
}) {
  const filhos = units.filter((item) => item.parentOrgUnitId === team.id);

  const doTime = people
    .filter((person) =>
      person.positions.some((position) => position.teamId === team.id),
    )
    .sort((a, b) => {
      const pa = a.positions.find((p) => p.teamId === team.id)!;
      const pb = b.positions.find((p) => p.teamId === team.id)!;
      return (
        Number(pb.isLead) - Number(pa.isLead) ||
        // Senioridade vem do cargo da PESSOA: ela tem um só, e ele não muda de
        // unidade para unidade.
        a.jobTitleOrder - b.jobTitleOrder ||
        a.name.localeCompare(b.name, "pt-BR")
      );
    });

  const lider = doTime.find((person) =>
    person.positions.some(
      (position) => position.teamId === team.id && position.isLead,
    ),
  );
  const equipe = doTime.filter((person) => person.userId !== lider?.userId);

  return (
    <div className="flex flex-col items-center">
      {/* Caixa do time */}
      <div
        className={cn(
          "min-w-52 max-w-64 rounded-xl border px-3.5 py-2.5 text-center shadow-sm",
          nivel === 0
            ? "border-brand-300 bg-brand-50"
            : "border-slate-200 bg-white",
        )}
      >
        <p className="font-display text-sm font-semibold text-slate-900">
          {team.name}
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {doTime.length === 0
            ? "sem ninguém"
            : `${doTime.length} ${doTime.length === 1 ? "pessoa" : "pessoas"}`}
        </p>
      </div>

      {/* Quem responde pelo time, logo abaixo da caixa */}
      {lider ? (
        <>
          <Conector />
          <PersonNode
            person={lider}
            teamId={team.id}
            onOpen={onOpenPerson}
            destaque
          />
        </>
      ) : null}

      {equipe.length > 0 ? (
        <>
          <Conector />
          <div className="flex flex-col gap-1.5">
            {equipe.map((person) => (
              <PersonNode
                key={person.userId}
                person={person}
                teamId={team.id}
                onOpen={onOpenPerson}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Times abaixo deste */}
      {filhos.length > 0 ? (
        <>
          <Conector />
          <div className="relative flex gap-5 pt-4">
            {/* Barra horizontal ligando os filhos, só quando há mais de um. */}
            {filhos.length > 1 ? (
              <span
                aria-hidden
                className="absolute left-0 right-0 top-0 h-px bg-slate-300"
                style={{
                  left: `calc(100% / ${filhos.length * 2})`,
                  right: `calc(100% / ${filhos.length * 2})`,
                }}
              />
            ) : null}
            {filhos.map((filho) => (
              <div
                key={filho.id}
                className="relative flex flex-col items-center"
              >
                {filhos.length > 1 ? (
                  <span
                    aria-hidden
                    className="absolute -top-4 h-4 w-px bg-slate-300"
                  />
                ) : null}
                <TeamNode
                  team={filho}
                  units={units}
                  people={people}
                  onOpenPerson={onOpenPerson}
                  nivel={nivel + 1}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PersonNode({
  person,
  teamId,
  onOpen,
  destaque = false,
}: {
  person: OrgPerson;
  teamId: string;
  onOpen: (userId: string) => void;
  destaque?: boolean;
}) {
  const posicao = person.positions.find((item) => item.teamId === teamId);
  // Outros times da pessoa: é o que revela quem atua em mais de uma frente, a
  // informação que a versão em quadro branco do organograma não conseguia dar.
  const outros = person.positions.filter((item) => item.teamId !== teamId);

  return (
    <button
      type="button"
      onClick={() => onOpen(person.userId)}
      className={cn(
        "flex w-52 items-center gap-2 rounded-xl border bg-white px-2.5 py-1.5 text-left shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/50",
        // Quem responde pelo time ganha contorno e um filete à esquerda: sem
        // isso ele era só a primeira linha da lista, e "primeiro" não comunica
        // "lidera".
        destaque
          ? "border-brand-300 border-l-4 border-l-brand-500 font-medium"
          : "border-slate-200",
      )}
    >
      <Avatar name={person.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-slate-900">
          {person.name}
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {person.jobTitleName ?? "sem cargo"}
          {destaque ? " · responde pela unidade" : ""}
        </span>
      </span>
      {outros.length > 0 ? (
        <Badge tone="neutral">+{outros.length}</Badge>
      ) : null}
    </button>
  );
}

function Conector() {
  return <span aria-hidden className="h-4 w-px bg-slate-300" />;
}
