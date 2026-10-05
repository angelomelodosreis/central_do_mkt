"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

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
  type UserNotification,
} from "@/lib/db/schema";
import {
  markNotificationAsReadAction,
  markAllNotificationsAsReadAction,
} from "@/lib/modules/notifications/actions";
import { isOverdue } from "@/lib/modules/tasks/state";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

export type Visao = "para_mim" | "deleguei" | "todas" | "historico" | "notificacoes";

const VISAO_LABELS: Record<Visao, string> = {
  para_mim: "Para mim",
  deleguei: "Deleguei",
  todas: "Todas",
  historico: "Histórico",
  notificacoes: "Menções & Avisos",
};

const VISAO_DESCRICOES: Record<Visao, string> = {
  para_mim:
    "O que é seu, acompanhamentos e o que está aberto para o seu time, do mais urgente para o menos.",
  deleguei: "O que você passou para outras pessoas e como está cada uma.",
  todas: "Tudo em aberto no seu escopo de responsabilidade.",
  historico: "Concluídas e canceladas, na ordem em que terminaram.",
  notificacoes:
    "Avisos em tempo real de onde você foi mencionado em threads ou recebeu follow-ups de planejamento.",
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
 * Agora com suporte total a:
 * - Menções e notificações em threads de revisão
 * - Acompanhamentos atribuídos de BUs
 * - Edição de tarefas para quem as criou
 */
export function TasksWorkspace({
  paraMim,
  deleguei,
  todas,
  historico,
  notifications = [],
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
  notifications?: UserNotification[];
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
  const [notifList, setNotifList] = useState<UserNotification[]>(notifications);

  const unreadNotifCount = notifList.filter((n) => n.isRead === 0).length;

  const listas: Record<Visao, TaskRowData[]> = {
    para_mim: paraMim,
    deleguei,
    todas,
    historico,
    notificacoes: [],
  };

  const abas: Visao[] = podeVerTodas
    ? ["para_mim", "deleguei", "todas", "historico", "notificacoes"]
    : ["para_mim", "deleguei", "historico", "notificacoes"];

  const lista = listas[visao] || [];

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
    return TASK_STATUSES.filter((status) => contagem.has(status)).map(
      (status) => ({
        label: TASK_STATUS_LABELS[status],
        value: contagem.get(status)!,
        tone: status === "blocked" ? ("alert" as const) : ("neutral" as const),
      }),
    );
  }, [lista]);

  // Lista de destinos aberta para quem pode delegar OU quem criou tarefas gerir suas criações
  const destinos: Destino[] = [
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
  ];

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
    <div className="space-y-4">
      {/* Banner de Aviso de Menções quando houver novas */}
      {unreadNotifCount > 0 && visao !== "notificacoes" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-purple-50/80 p-3.5 text-xs text-purple-950 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-xs shadow-xs">
              @
            </span>
            <div>
              <p className="font-semibold text-slate-900">
                Você tem {unreadNotifCount} nova{unreadNotifCount > 1 ? "s" : ""} menção{unreadNotifCount > 1 ? "ões" : ""} em threads de planejamento
              </p>
              <p className="text-slate-600">
                Veja o que foi solicitado ou alinhado pela coordenação e colegas.
              </p>
            </div>
          </div>
          <button
            onClick={() => setVisao("notificacoes")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 font-semibold text-white shadow-xs hover:bg-purple-700 transition"
          >
            <span>Ver Menções</span>
            <ArrowRight className="size-3" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <PillTabs<Visao>
          value={visao}
          onChange={(proxima) => {
            setVisao(proxima);
            setFiltros(FILTROS_VAZIOS);
          }}
          items={abas.map((aba) => ({
            value: aba,
            label: VISAO_LABELS[aba],
            count:
              aba === "notificacoes"
                ? unreadNotifCount
                : listas[aba]?.length ?? 0,
            alert:
              (aba === "deleguei" &&
                deleguei.some((item) => item.status === "blocked")) ||
              (aba === "notificacoes" && unreadNotifCount > 0),
          }))}
        />
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Visão de Menções & Avisos */}
      {visao === "notificacoes" ? (
        <Card>
          <CardBody className="px-0 py-0">
            {notifList.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <EmptyState
                  title={VAZIO_TITULOS.notificacoes}
                  description={VAZIO_DESCRICOES.notificacoes}
                />
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between px-5 py-3 bg-slate-50/80 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-700">
                    {notifList.length} aviso(s) e menção(ões) ({unreadNotifCount} pendente{unreadNotifCount === 1 ? "" : "s"})
                  </span>
                  {unreadNotifCount > 0 && (
                    <button
                      onClick={async () => {
                        setNotifList((prev) => prev.map((n) => ({ ...n, isRead: 1 })));
                        try {
                          await markAllNotificationsAsReadAction();
                          toast.success("Todas as notificações foram marcadas como lidas.");
                        } catch {
                          toast.error("Erro ao atualizar notificações.");
                        }
                      }}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition"
                    >
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                {notifList.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "p-4 transition hover:bg-slate-50 flex items-start justify-between gap-3",
                      notif.isRead === 0 && "bg-purple-50/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                          notif.type === "mention"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-brand-100 text-brand-700",
                        )}
                      >
                        {notif.type === "mention" ? "@" : "📋"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">
                            {notif.title}
                          </span>
                          {notif.isRead === 0 && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-700">
                              Novo
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400">
                            {new Date(notif.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                          {notif.content}
                        </p>
                        {notif.link && (
                          <div className="pt-1 flex items-center gap-2">
                            <Link
                              href={notif.link}
                              onClick={async () => {
                                if (notif.isRead === 0) {
                                  setNotifList((prev) =>
                                    prev.map((n) => (n.id === notif.id ? { ...n, isRead: 1 } : n)),
                                  );
                                  await markNotificationAsReadAction(notif.id);
                                }
                              }}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
                            >
                              <span>Abrir conversa / item na Central</span>
                              <ArrowRight className="size-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                    {notif.isRead === 0 && (
                      <button
                        onClick={async () => {
                          setNotifList((prev) =>
                            prev.map((n) => (n.id === notif.id ? { ...n, isRead: 1 } : n)),
                          );
                          await markNotificationAsReadAction(notif.id);
                        }}
                        className="rounded px-2.5 py-1 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 transition"
                        title="Marcar como lida"
                      >
                        Marcar lida
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : (
        <>
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
                    ...TASK_STATUSES.map((status) => ({
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
                    { value: "", label: "Todas as prioridades" },
                    ...TASK_PRIORITIES.map((prioridade) => ({
                      value: prioridade,
                      label: TASK_PRIORITY_LABELS[prioridade],
                    })),
                  ]}
                />
              </div>

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
        </>
      )}

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
  para_mim: "Nenhuma tarefa para você",
  deleguei: "Você não passou nenhuma tarefa",
  todas: "Nenhuma tarefa em aberto",
  historico: "Nenhuma tarefa encerrada",
  notificacoes: "Nenhum aviso ou menção no momento",
};

const VAZIO_DESCRICOES: Record<Visao, string> = {
  para_mim:
    "Sua fila está limpa. Tarefas endereçadas ao seu time e acompanhamentos de planejamento também aparecem aqui.",
  deleguei:
    "Tarefas criadas para outras pessoas ou para um time aparecem aqui, com a situação de cada uma.",
  todas: "Ninguém no seu escopo tem tarefa em aberto.",
  historico: "Tarefas concluídas e canceladas ficam guardadas aqui.",
  notificacoes:
    "Quando alguém mencionar você em uma thread ou atribuir um follow-up, você receberá um aviso aqui.",
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
