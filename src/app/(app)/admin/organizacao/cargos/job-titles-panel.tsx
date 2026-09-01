"use client";

import { useActionState, useState } from "react";

import {
  createJobTitle,
  deleteJobTitle,
  toggleJobTitle,
  updateJobTitle,
} from "../actions";
import { INITIAL_ORG_STATE } from "../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

type UnitRef = { id: string; name: string; depth: number };

type TitleRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  suggestedTeamId: string | null;
  suggestedTeamName: string | null;
  peopleCount: number;
};

/**
 * Faixas de senioridade.
 *
 * Um número solto ("ordem 40") não diz nada a quem cadastra um cargo novo;
 * faixas nomeadas dizem. O número continua sendo o que ordena — é ele que faz o
 * organograma ler de cima para baixo — mas ninguém precisa inventá-lo.
 */
const NIVEIS = [
  { value: "10", label: "Direção" },
  { value: "20", label: "Gerência" },
  { value: "30", label: "Coordenação" },
  { value: "40", label: "Supervisão" },
  { value: "50", label: "Analista / especialista" },
  { value: "60", label: "Assistente" },
  { value: "70", label: "Estágio" },
];

function nomeDoNivel(sortOrder: number): string {
  return (
    NIVEIS.find((nivel) => Number(nivel.value) === sortOrder)?.label ??
    `Ordem ${sortOrder}`
  );
}

/**
 * O catálogo de cargos, ordenado por senioridade.
 *
 * GLOBAL, e não por time: os cargos reais já carregam a área no nome
 * ("Supervisor de Design"), e cargo acompanha a pessoa quando ela muda de time.
 * O time sugerido serve só para agrupar o seletor.
 *
 * Nada aqui concede permissão. Duas pessoas com o mesmo cargo podem ter
 * alcances diferentes — isso se define na ficha de cada uma.
 */
export function JobTitlesPanel({
  titles,
  units,
}: {
  titles: TitleRow[];
  units: UnitRef[];
}) {
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<TitleRow | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const porNivel = NIVEIS.map((nivel) => ({
    nivel,
    cargos: titles.filter(
      (title) => title.sortOrder === Number(nivel.value) && title.isActive,
    ),
  })).filter((grupo) => grupo.cargos.length > 0);

  const foraDaFaixa = titles.filter(
    (title) =>
      title.isActive &&
      !NIVEIS.some((nivel) => Number(nivel.value) === title.sortOrder),
  );
  const inativos = titles.filter((title) => !title.isActive);

  const grupos = [
    ...porNivel.map((grupo) => ({
      titulo: grupo.nivel.label,
      cargos: grupo.cargos,
    })),
    ...(foraDaFaixa.length > 0
      ? [{ titulo: "Outros", cargos: foraDaFaixa }]
      : []),
    ...(inativos.length > 0 ? [{ titulo: "Inativos", cargos: inativos }] : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Cargo descreve a pessoa. Quem pode o quê é papel + escopo, na ficha
          dela.
        </p>
        <Button variant="primary" onClick={() => setCriando(true)}>
          + Novo cargo
        </Button>
      </div>

      {/* Um cartão só, e as faixas viram cabeçalhos de trecho.
          Sete cartões empilhados davam sete molduras, sete sombras e sete
          espaçamentos para uma lista contínua de dezesseis linhas — a moldura
          pesava mais que o conteúdo, e a leitura de cima a baixo quebrava a
          cada faixa. */}
      <Card>
        <CardBody className="px-0 py-0">
          {grupos.map((grupo) => (
            <section key={grupo.titulo}>
              <h2 className="border-y border-slate-200 bg-slate-50/70 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 first:border-t-0">
                {grupo.titulo}
              </h2>
              <ul className="divide-y divide-slate-100">
                {grupo.cargos.map((title) => (
                  <li
                    key={title.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 px-5 py-2.5",
                      !title.isActive && "bg-slate-50/60",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {title.name}
                        </span>
                        {title.isActive ? null : <Badge>Inativo</Badge>}
                        {title.peopleCount > 0 ? (
                          <Badge tone="neutral">
                            {title.peopleCount}{" "}
                            {title.peopleCount === 1 ? "pessoa" : "pessoas"}
                          </Badge>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {title.suggestedTeamName
                          ? `costuma ser de ${title.suggestedTeamName}`
                          : "sem time definido"}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditando(title)}
                      >
                        Editar
                      </Button>
                      <form action={toggleJobTitle}>
                        <input
                          type="hidden"
                          name="jobTitleId"
                          value={title.id}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          {title.isActive ? "Desativar" : "Reativar"}
                        </Button>
                      </form>
                      {/* Excluir só existe quando ninguém ocupa o cargo:
                          ocupado, apagar deixaria pessoas apontando para nada
                          e o cargo sumiria do perfil delas sem ninguém
                          perceber. Em `ghost` e não em vermelho porque, com
                          dezesseis cargos na tela, dezesseis botões vermelhos
                          gritavam "apagar" na lista inteira — o vermelho fica
                          para a confirmação, onde a decisão acontece. */}
                      {title.peopleCount === 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExcluindo(title.id)}
                        >
                          Excluir
                        </Button>
                      ) : null}
                    </div>

                    {/* A confirmação abre na própria linha: o nome do cargo
                        que vai sumir continua à vista enquanto se decide. */}
                    {excluindo === title.id ? (
                      <div className="mt-2 flex w-full flex-wrap items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2">
                        <p className="min-w-0 flex-1 text-sm text-danger-900">
                          Excluir <strong>{title.name}</strong>? Ninguém ocupa
                          este cargo. Dá para desfazer em Administração ›
                          Auditoria.
                        </p>
                        <form action={deleteJobTitle}>
                          <input
                            type="hidden"
                            name="jobTitleId"
                            value={title.id}
                          />
                          <Button type="submit" size="sm" variant="danger">
                            Excluir
                          </Button>
                        </form>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExcluindo(null)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </CardBody>
      </Card>

      <NewTitleDrawer
        open={criando}
        units={units}
        onClose={() => setCriando(false)}
      />
      <EditTitleDrawer
        title={editando}
        units={units}
        onClose={() => setEditando(null)}
      />
    </div>
  );
}

function opcoesDeUnidade(units: UnitRef[]) {
  return units.map((unit) => ({
    value: unit.id,
    label: `${"— ".repeat(unit.depth)}${unit.name}`,
    triggerLabel: unit.name,
  }));
}

function NewTitleDrawer({
  open,
  units,
  onClose,
}: {
  open: boolean;
  units: UnitRef[];
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createJobTitle,
    INITIAL_ORG_STATE,
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Novo cargo"
      description="Vale para toda a empresa. Não concede permissão nenhuma."
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

        <Field label="Nome do cargo" htmlFor="title-name" required>
          <Input
            id="title-name"
            name="name"
            required
            maxLength={80}
            placeholder="Ex.: Analista de Mídia de Performance"
          />
        </Field>

        <Field
          label="Nível"
          htmlFor="title-level"
          hint="Define a ordem em que o cargo aparece no organograma."
        >
          <Select
            id="title-level"
            name="sortOrder"
            defaultValue="50"
            options={NIVEIS}
          />
        </Field>

        <Field
          label="Costuma ficar em"
          htmlFor="title-team"
          hint="Opcional. Só agrupa o seletor — não impede dar o cargo a alguém de outro time."
        >
          <Select
            id="title-team"
            name="suggestedTeamId"
            defaultValue=""
            options={[
              { value: "", label: "Nenhuma" },
              ...opcoesDeUnidade(units),
            ]}
          />
        </Field>

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Criando…" : "Criar cargo"}
        </Button>
      </form>
    </Drawer>
  );
}

function EditTitleDrawer({
  title,
  units,
  onClose,
}: {
  title: TitleRow | null;
  units: UnitRef[];
  onClose: () => void;
}) {
  return (
    <Drawer
      open={title !== null}
      onClose={onClose}
      title={title ? `Editar ${title.name}` : ""}
    >
      {title ? (
        <form action={updateJobTitle} className="space-y-4" onSubmit={onClose}>
          <input type="hidden" name="jobTitleId" value={title.id} />

          <Field label="Nome do cargo" htmlFor="edit-title-name" required>
            <Input
              id="edit-title-name"
              name="name"
              required
              maxLength={80}
              defaultValue={title.name}
            />
          </Field>

          <Field label="Nível" htmlFor="edit-title-level">
            <Select
              id="edit-title-level"
              name="sortOrder"
              defaultValue={String(title.sortOrder)}
              options={
                NIVEIS.some((nivel) => Number(nivel.value) === title.sortOrder)
                  ? NIVEIS
                  : [
                      ...NIVEIS,
                      {
                        value: String(title.sortOrder),
                        label: nomeDoNivel(title.sortOrder),
                      },
                    ]
              }
            />
          </Field>

          <Field label="Costuma ficar em" htmlFor="edit-title-team">
            <Select
              id="edit-title-team"
              name="suggestedTeamId"
              defaultValue={title.suggestedTeamId ?? ""}
              options={[
                { value: "", label: "Nenhuma" },
                ...opcoesDeUnidade(units),
              ]}
            />
          </Field>

          <p className="text-xs text-slate-500">
            {title.peopleCount > 0
              ? `${title.peopleCount} ${title.peopleCount === 1 ? "pessoa ocupa" : "pessoas ocupam"} este cargo.`
              : "Ninguém ocupa este cargo."}
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
