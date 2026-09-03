"use client";

import { useMemo, useState } from "react";

import {
  NewTaskDrawer,
  type AssignablePerson,
  type AssignableTeam,
} from "./new-task-drawer";
import { TaskRow, type Destino, type TaskRowData } from "./task-row";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, EmptyState } from "@/components/ui/card";
import { Input, FIELD_WIDTHS } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PillTabs, StatSummary } from "@/components/ui/tabs";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type TaskStatus,
} from "@/lib/db/schema";
import { isOverdue } from "@/lib/modules/tasks/state";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

export type Visao = "para_mim" | "deleguei" | "todas" | "historico";

const VISAO_LABELS: Record<Visao, string> = {
  para_mim: "Para mim",
  deleguei: "Deleguei",
  todas: "Todas",
  historico: "Histórico",
};

const VISAO_DESCRICOES: Record<Visao, string> = {
  para_mim:
    "O que é seu e o que está aberto para o seu time, do mais urgente para o menos.",
  deleguei: "O que você passou para outras pessoas e como está cada uma.",
  todas: "Tudo em aberto no seu escopo de responsabilidade.",
  historico: "Concluídas e canceladas, na ordem em que terminaram.",
};

type Filtros = {
  busca: string;
  status: string;
  prioridade: string;
  responsavel: string;
  delegador: string;
  businessUnit: string;
  /** Só atrasadas. */
  atrasadas: boolean;
  /** Só travadas. */
  travadas: boolean;
};

const FILTROS_VAZIOS: Filtros = {
  busca: "",
  status: "",
  prioridade: "",
  responsavel: "",
  delegador: "",
  businessUnit: "",
  atrasadas: false,
  travadas: false,
};

/**
 * A área de tarefas, organizada por PERSPECTIVA.
 *
 * Duas perguntas diferentes, duas abas: "o que eu preciso fazer" e "o que eu
 * passei e como está". São visões de papéis opostos sobre a mesma base — e
 * misturá-las era o que fazia quem delegou receber botões de execução.
 *
 * Os filtros mudam com a aba: filtrar por responsável em "Para mim" seria um
 * seletor com uma opção só.
 */
export function TasksWorkspace({
  paraMim,
  deleguei,
  todas,
  historico,
  people,
  teams,
  businessUnits,
  podeDelegar,
  podeVerTodas,
  currentUserId,
}: {
  paraMim: TaskRowData[];
  deleguei: TaskRowData[];
  todas: TaskRowData[];
  historico: TaskRowData[];
  people: AssignablePerson[];
  teams: AssignableTeam[];
  businessUnits: { id: string; label: string }[];
  podeDelegar: boolean;
  podeVerTodas: boolean;
  currentUserId: string;
}) {
  const [visao, setVisao] = useState<Visao>("para_mim");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS);
  const [criando, setCriando] = useState(false);

  const listas: Record<Visao, TaskRowData[]> = {
    para_mim: paraMim,
    deleguei,
    todas,
    historico,
  };

  const abas: Visao[] = podeVerTodas
    ? ["para_mim", "deleguei", "todas", "historico"]
    : ["para_mim", "deleguei", "historico"];

  const lista = listas[visao];

  const travadasNaAba = lista.filter(
    (item) => item.status === "blocked",
  ).length;
  const atrasadasNaAba = lista.filter((item) =>
    isOverdue(item.dueDate, item.status),
  ).length;

  const visiveis = useMemo(() => {
    return lista.filter((item) => {
      if (filtros.status && item.status !== filtros.status) return false;
      if (filtros.prioridade && item.priority !== filtros.prioridade) {
        return false;
      }
      if (filtros.responsavel && item.assigneeId !== filtros.responsavel) {
        return false;
      }
      if (filtros.delegador && item.createdByName !== filtros.delegador) {
        return false;
      }
      if (
        filtros.businessUnit &&
        item.businessUnitLabel !== filtros.businessUnit
      ) {
        return false;
      }
      if (filtros.atrasadas && !isOverdue(item.dueDate, item.status)) {
        return false;
      }
      if (filtros.travadas && item.status !== "blocked") return false;

      return matchesSearch(
        filtros.busca,
        item.title,
        item.assigneeName,
        item.assignedTeamName,
        item.createdByName,
        item.businessUnitLabel,
      );
    });
  }, [lista, filtros]);

  const resumo = useMemo(() => {
    const contagem = new Map<TaskStatus, number>();
    for (const item of lista) {
      contagem.set(item.status, (contagem.get(item.status) ?? 0) + 1);
    }
    // Ordem fixa (a do enum), e não por contagem: um resumo que reordena a cada
    // carregamento obriga a reler os rótulos toda vez.
    return TASK_STATUSES.filter((status) => contagem.has(status)).map(
      (status) => ({
        label: TASK_STATUS_LABELS[status],
        value: contagem.get(status)!,
        tone: status === "blocked" ? ("alert" as const) : ("neutral" as const),
      }),
    );
  }, [lista]);

  const destinos: Destino[] = podeDelegar
    ? [
        ...teams.map((team) => ({
          value: `team:${team.id}`,
          label: `${"— ".repeat(team.depth)}${team.name}`,
          triggerLabel: team.name,
          hint: team.path,
        })),
        ...people.map((person) => ({
          value: `user:${person.id}`,
          label: person.name,
          hint: person.label ?? undefined,
        })),
      ]
    : [];

  const temFiltro =
    Boolean(
      filtros.busca ||
      filtros.status ||
      filtros.prioridade ||
      filtros.responsavel ||
      filtros.delegador ||
      filtros.businessUnit,
    ) ||
    filtros.atrasadas ||
    filtros.travadas;

  function set<K extends keyof Filtros>(chave: K, valor: Filtros[K]) {
    setFiltros((atual) => ({ ...atual, [chave]: valor }));
  }

  // Nomes de quem delegou, extraídos da lista: montar o seletor a partir do que
  // está na tela evita oferecer filtros que não devolvem nada.
  const delegadores = [
    ...new Set(lista.map((item) => item.createdByName).filter(Boolean)),
  ] as string[];

  const responsaveis = [
    ...new Map(
      lista
        .filter((item) => item.assigneeId && item.assigneeName)
        .map((item) => [item.assigneeId!, item.assigneeName!]),
    ),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs<Visao>
          value={visao}
          onChange={(proxima) => {
            setVisao(proxima);
            // Filtros de uma aba raramente fazem sentido na outra — e um filtro
            // esquecido faz a aba nova parecer vazia.
            setFiltros(FILTROS_VAZIOS);
          }}
          items={abas.map((aba) => ({
            value: aba,
            label: VISAO_LABELS[aba],
            count: listas[aba].length,
            alert:
              aba === "deleguei" &&
              deleguei.some((item) => item.status === "blocked"),
          }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* Recorrentes fica ao lado da criação porque é a outra forma de
              colocar trabalho na fila — e não uma configuração escondida. */}
          {podeDelegar ? (
            <ButtonLink href="/tarefas/recorrentes" variant="secondary">
              Recorrentes
            </ButtonLink>
          ) : null}
          <Button variant="primary" onClick={() => setCriando(true)}>
            + Nova tarefa
          </Button>
        </div>
      </div>

      <p className="text-sm text-slate-500">{VISAO_DESCRICOES[visao]}</p>

      {resumo.length > 0 && visao !== "para_mim" ? (
        <Card>
          <CardBody>
            <StatSummary items={resumo} />
          </CardBody>
        </Card>
      ) : null}

      {/* Busca e filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="min-w-56 flex-1">
            <Input
              value={filtros.busca}
              onChange={(event) => set("busca", event.target.value)}
              placeholder="Buscar tarefa, pessoa ou BU…"
              aria-label="Buscar tarefa"
            />
          </div>
          <FiltroRapido
            ativo={filtros.atrasadas}
            onClick={() => set("atrasadas", !filtros.atrasadas)}
            total={atrasadasNaAba}
          >
            Atrasadas
          </FiltroRapido>
          <FiltroRapido
            ativo={filtros.travadas}
            onClick={() => set("travadas", !filtros.travadas)}
            total={travadasNaAba}
          >
            Travadas
          </FiltroRapido>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className={FIELD_WIDTHS.md}>
            <Select
              value={filtros.status}
              onValueChange={(valor) => set("status", valor)}
              ariaLabel="Filtrar por situação"
              size="sm"
              placeholder="Situação"
              options={[
                { value: "", label: "Todas as situações" },
                ...TASK_STATUSES.filter((status) =>
                  visao === "historico"
                    ? status === "done" || status === "cancelled"
                    : status !== "done" && status !== "cancelled",
                ).map((status) => ({
                  value: status,
                  label: TASK_STATUS_LABELS[status],
                })),
              ]}
            />
          </div>

          <div className={FIELD_WIDTHS.md}>
            <Select
              value={filtros.prioridade}
              onValueChange={(valor) => set("prioridade", valor)}
              ariaLabel="Filtrar por prioridade"
              size="sm"
              placeholder="Prioridade"
              options={[
                { value: "", label: "Qualquer prioridade" },
                ...TASK_PRIORITIES.map((priority) => ({
                  value: priority,
                  label: TASK_PRIORITY_LABELS[priority],
                })),
              ]}
            />
          </div>

          {/* Em "Para mim" o responsável é sempre a própria pessoa: o seletor
              teria uma opção só. */}
          {visao !== "para_mim" && responsaveis.length > 1 ? (
            <div className={FIELD_WIDTHS.lg}>
              <Select
                value={filtros.responsavel}
                onValueChange={(valor) => set("responsavel", valor)}
                ariaLabel="Filtrar por responsável"
                size="sm"
                placeholder="Responsável"
                options={[
                  { value: "", label: "Qualquer responsável" },
                  ...responsaveis.map(([id, nome]) => ({
                    value: id,
                    label: nome,
                  })),
                ]}
              />
            </div>
          ) : null}

          {/* Em "Deleguei" quem delegou é sempre a própria pessoa. */}
          {visao !== "deleguei" && delegadores.length > 1 ? (
            <div className={FIELD_WIDTHS.lg}>
              <Select
                value={filtros.delegador}
                onValueChange={(valor) => set("delegador", valor)}
                ariaLabel="Filtrar por quem delegou"
                size="sm"
                placeholder="Quem passou"
                options={[
                  { value: "", label: "Qualquer origem" },
                  ...delegadores.map((nome) => ({ value: nome, label: nome })),
                ]}
              />
            </div>
          ) : null}

          {businessUnits.length > 0 ? (
            <div className={FIELD_WIDTHS.lg}>
              <Select
                value={filtros.businessUnit}
                onValueChange={(valor) => set("businessUnit", valor)}
                ariaLabel="Filtrar por Business Unit"
                size="sm"
                placeholder="Business Unit"
                options={[
                  { value: "", label: "Qualquer BU" },
                  ...businessUnits.map((unit) => ({
                    value: unit.label,
                    label: unit.label,
                  })),
                ]}
              />
            </div>
          ) : null}

          {temFiltro ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFiltros(FILTROS_VAZIOS)}
            >
              Limpar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardBody className="px-0 py-0">
          {visiveis.length === 0 ? (
            <div className="px-5 py-10">
              {temFiltro ? (
                <EmptyState
                  title="Nenhuma tarefa com esses filtros"
                  description="Ajuste a busca ou limpe os filtros para ver a lista inteira."
                  action={
                    <Button
                      variant="secondary"
                      onClick={() => setFiltros(FILTROS_VAZIOS)}
                    >
                      Limpar filtros
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  title={VAZIO_TITULOS[visao]}
                  description={VAZIO_DESCRICOES[visao]}
                  action={
                    visao === "deleguei" && podeDelegar ? (
                      <Button onClick={() => setCriando(true)}>
                        + Nova tarefa
                      </Button>
                    ) : null
                  }
                />
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiveis.map((item) => (
                <TaskRow key={item.id} task={item} destinos={destinos} />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <NewTaskDrawer
        open={criando}
        onClose={() => setCriando(false)}
        people={people}
        teams={teams}
        businessUnits={businessUnits}
        podeDelegar={podeDelegar}
        currentUserId={currentUserId}
      />
    </div>
  );
}

const VAZIO_TITULOS: Record<Visao, string> = {
  para_mim: "Nada pendente",
  deleguei: "Você ainda não passou nenhuma tarefa",
  todas: "Nada em aberto",
  historico: "Nada encerrado ainda",
};

const VAZIO_DESCRICOES: Record<Visao, string> = {
  para_mim:
    "Sua fila está limpa. Tarefas endereçadas ao seu time também aparecem aqui.",
  deleguei:
    "Tarefas criadas para outras pessoas ou para um time aparecem aqui, com a situação de cada uma.",
  todas: "Ninguém no seu escopo tem tarefa em aberto.",
  historico: "Tarefas concluídas e canceladas ficam guardadas aqui.",
};

function FiltroRapido({
  ativo,
  total,
  onClick,
  children,
}: {
  ativo: boolean;
  total: number;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      disabled={total === 0 && !ativo}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:cursor-not-allowed disabled:opacity-40",
        ativo
          ? "border-amber-300 bg-amber-50 text-amber-900"
          : "border-slate-300 bg-white text-slate-600 hover:border-slate-400",
      )}
    >
      {children}
      <span className="tabular-nums text-xs">{total}</span>
    </button>
  );
}
