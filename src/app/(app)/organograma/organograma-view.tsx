"use client";

import { useState } from "react";

import { MarketingTree } from "./marketing-tree";
import { PersonDrawer } from "./person-drawer";
import { SquadsBoard } from "./squads-board";
import { TeamsBoard } from "./teams-board";
import {
  ORG_VIEWS,
  ORG_VIEW_DESCRIPTIONS,
  ORG_VIEW_EDIT_HINTS,
  ORG_VIEW_LABELS,
  type OrgSnapshot,
  type OrgView,
} from "./types";
import { Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ORG_UNIT_KIND_LABELS } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

/**
 * As três visões do mesmo organograma.
 *
 * Trocar de visão é troca de estado no cliente, e não de rota: os dados são os
 * mesmos, e recarregar a cada aba tornaria a comparação — que é o motivo de
 * haver três visões — mais lenta do que pensar.
 */
export function OrganogramaView({
  snapshot,
  canEdit,
}: {
  snapshot: OrgSnapshot;
  canEdit: boolean;
}) {
  const [view, setView] = useState<OrgView>("squads");
  const [busca, setBusca] = useState("");
  const [timeFiltrado, setTimeFiltrado] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);

  /**
   * A busca DESTACA em vez de filtrar nas visões de estrutura.
   *
   * Filtrar uma árvore esconde os nós que dão sentido aos que sobraram: procurar
   * "Marina" e receber um cartão solto, fora de qualquer time, não responde
   * "onde a Marina está". Nos squads, onde cada coluna é independente, filtrar
   * funciona — e é o que se quer ao procurar uma pessoa entre 22 colunas.
   */
  const pessoasFiltradas = busca.trim()
    ? snapshot.people.filter((person) =>
        matchesSearch(
          busca,
          person.name,
          person.email,
          person.jobTitleName,
          ...person.positions.map((position) => position.teamName),
        ),
      )
    : snapshot.people;

  const unidadesVisiveis = timeFiltrado
    ? snapshot.units.filter((unit) => unit.id === timeFiltrado)
    : snapshot.units;

  const pessoaAberta = snapshot.people.find(
    (person) => person.userId === aberto,
  );

  return (
    <>
      {/* Seletor de visão */}
      <div className="mb-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max min-w-full gap-1 rounded-xl bg-slate-100 p-1">
          {ORG_VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              aria-pressed={view === item}
              className={cn(
                "whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                view === item
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              {ORG_VIEW_LABELS[item]}
            </button>
          ))}
        </div>
      </div>

      <p className="mb-4 text-sm text-slate-500">
        {ORG_VIEW_DESCRIPTIONS[view]}
        {canEdit
          ? ORG_VIEW_EDIT_HINTS[view]
            ? ` ${ORG_VIEW_EDIT_HINTS[view]}`
            : ""
          : " Você está vendo em modo de leitura."}
      </p>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar por pessoa, unidade ou cargo…"
            aria-label="Buscar no organograma"
          />
        </div>
        {view === "times" ? (
          <div className="w-56">
            <Select
              value={timeFiltrado}
              onValueChange={setTimeFiltrado}
              ariaLabel="Filtrar por unidade"
              placeholder="Todas as unidades"
              options={[
                { value: "", label: "Todas as unidades" },
                ...snapshot.units.map((unit) => ({
                  value: unit.id,
                  label: unit.name,
                  hint: ORG_UNIT_KIND_LABELS[unit.kind],
                })),
              ]}
            />
          </div>
        ) : null}
        {busca.trim() ? (
          <p className="pb-2.5 text-xs text-slate-500">
            {pessoasFiltradas.length}{" "}
            {pessoasFiltradas.length === 1
              ? "pessoa encontrada"
              : "pessoas encontradas"}
          </p>
        ) : null}
      </div>

      {view === "squads" ? (
        <SquadsBoard
          people={pessoasFiltradas}
          squads={snapshot.squads}
          canEdit={canEdit}
          onOpenPerson={setAberto}
        />
      ) : null}

      {view === "times" ? (
        <TeamsBoard
          people={pessoasFiltradas}
          units={unidadesVisiveis}
          canEdit={canEdit}
          onOpenPerson={setAberto}
        />
      ) : null}

      {view === "marketing" ? (
        <MarketingTree
          people={snapshot.people}
          units={snapshot.units}
          onOpenPerson={setAberto}
        />
      ) : null}

      {pessoaAberta ? (
        <PersonDrawer
          person={pessoaAberta}
          snapshot={snapshot}
          canEdit={canEdit}
          onClose={() => setAberto(null)}
        />
      ) : null}
    </>
  );
}
