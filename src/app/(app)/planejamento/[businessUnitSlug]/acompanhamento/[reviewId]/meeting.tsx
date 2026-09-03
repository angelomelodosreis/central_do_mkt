"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";

import {
  addEncaminhamento,
  finishReview,
  removeEncaminhamento,
  setReviewStatus,
  setTopicStatus,
  setTopicText,
  updatePendencia,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  REVIEW_STATUSES,
  REVIEW_STATUS_DOTS,
  REVIEW_STATUS_LABELS,
  type ReviewStatus,
  type ReviewTopic,
  type TaskStatus,
  type TopicStatus,
} from "@/lib/db/schema";
import {
  SENTIDO,
  formatarIndicador,
  rotuloDoIndicador,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { TOPIC_CONFIG, TOPIC_ORDER } from "@/lib/modules/review/topics";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";
import { plural } from "@/lib/utils/text";

export type TemaView = {
  topic: ReviewTopic;
  status: TopicStatus;
  note: string | null;
  decision: string | null;
};

export type PendenciaView = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: string | null;
  assigneeName: string | null;
  fromMeetingDate: string;
  followUpNote: string | null;
};

export type EncaminhamentoView = {
  id: string;
  title: string;
  topic: ReviewTopic | null;
  dueDate: string | null;
  assigneeName: string | null;
};

export type NumeroView = {
  metric: Indicador | "media_spend";
  realizado: number | null;
  meta: number | null;
  versusMeta: number | null;
  versusAnterior: number | null;
};

export type PessoaView = { id: string; name: string; hint?: string };

/**
 * O modo reunião.
 *
 * Quem usa esta tela é o Coordenador Médico, AO VIVO, enquanto conversa com o
 * Analista — e ele é leigo em marketing. Tudo aqui serve a uma coisa: dizer a
 * ele o que olhar e o que perguntar.
 *
 * Três regras que explicam cada decisão de interface abaixo:
 *
 *   Nada de "Salvar". Cada clique e cada campo que perde o foco já gravou.
 *   Só a exceção se digita. Tema sem problema é um clique e nada mais.
 *   A ordem é a da conversa: o que ficou pendente, os números, o roteiro, e a
 *   avaliação da BU no FIM — no começo ninguém tem base para dá-la.
 */
export function Meeting({
  reviewId,
  meetingDate,
  closedAt,
  status,
  statusNote,
  periodoDias,
  desde,
  temas,
  pendencias,
  encaminhamentos,
  numeros,
  secundarios,
  pessoas,
  canEdit,
}: {
  reviewId: string;
  meetingDate: string;
  closedAt: string | null;
  status: ReviewStatus | null;
  statusNote: string | null;
  periodoDias: number;
  desde: string;
  temas: TemaView[];
  pendencias: PendenciaView[];
  encaminhamentos: EncaminhamentoView[];
  numeros: NumeroView[];
  secundarios: NumeroView[];
  pessoas: PessoaView[];
  canEdit: boolean;
}) {
  const porTema = new Map(temas.map((tema) => [tema.topic, tema]));

  const revisados = temas.filter((tema) => tema.status === "ok").length;
  const atencoes = temas.filter((tema) => tema.status === "attention").length;

  const faturamento = numeros.find((linha) => linha.metric === "revenue");

  return (
    <div className="space-y-4">
      <Bloco
        numero={1}
        titulo="O que ficou da última vez"
        subtitulo={
          pendencias.length === 0
            ? "Nada em aberto — comece pelos números."
            : "Confira cada uma antes de falar de coisa nova."
        }
      >
        {pendencias.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {pendencias.map((pendencia) => (
              <Pendencia
                key={pendencia.id}
                pendencia={pendencia}
                canEdit={canEdit}
              />
            ))}
          </ul>
        ) : null}
      </Bloco>

      <Bloco
        numero={2}
        titulo="Como estão os números"
        subtitulo={`Últimos ${periodoDias} dias, desde ${formatDate(new Date(desde))}. Lançados pelo Analista.`}
      >
        <div className="grid grid-cols-2 gap-px bg-slate-100 sm:grid-cols-4">
          {numeros.map((linha) => (
            <NumeroGrande key={linha.metric} numero={linha} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 px-5 py-2.5">
          {secundarios.map((linha) => (
            <span key={linha.metric} className="text-xs text-slate-500">
              {rotuloDoIndicador(linha.metric)}{" "}
              <span className="font-medium tabular-nums text-slate-700">
                {formatarIndicador(linha.metric, linha.realizado)}
              </span>
            </span>
          ))}
        </div>
      </Bloco>

      <Bloco
        numero={3}
        titulo="O que perguntar ao Analista"
        subtitulo="Abra um tema para ver as perguntas. Pule o que não fizer sentido hoje."
      >
        <ul className="divide-y divide-slate-100">
          {TOPIC_ORDER.map((topic) => (
            <Tema
              key={topic}
              reviewId={reviewId}
              topic={topic}
              tema={porTema.get(topic)}
              encaminhamentos={encaminhamentos.filter(
                (item) => item.topic === topic,
              )}
              pessoas={pessoas}
              canEdit={canEdit}
            />
          ))}
        </ul>
      </Bloco>

      <Bloco
        numero={4}
        titulo="Como está a BU?"
        subtitulo="Agora que você viu os números e ouviu o Analista."
      >
        <div className="px-5 pb-4 pt-1">
          {/* O resumo antes da escolha: o Coordenador acabou de percorrer dez
              temas, e lembrar quantos deram problema é trabalho que a tela
              pode fazer por ele. */}
          <p className="mb-3 text-sm text-slate-600">
            Nesta reunião:{" "}
            {[
              revisados > 0
                ? `${plural(revisados, "ponto revisado", "pontos revisados")} sem problema`
                : null,
              atencoes > 0
                ? `${plural(atencoes, "ponto de atenção", "pontos de atenção")}`
                : null,
              encaminhamentos.length > 0
                ? `${plural(encaminhamentos.length, "encaminhamento")}`
                : null,
              faturamento?.versusMeta != null
                ? `faturamento ${Math.abs(faturamento.versusMeta).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}% ${faturamento.versusMeta < 0 ? "abaixo" : "acima"} da meta`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "nada registrado ainda"}
            .
          </p>

          <div className="flex flex-wrap gap-2">
            {REVIEW_STATUSES.map((valor) => (
              <BotaoDeStatus
                key={valor}
                reviewId={reviewId}
                valor={valor}
                selecionado={status === valor}
                canEdit={canEdit}
              />
            ))}
          </div>

          {status ? (
            <div className="mt-3">
              <CampoAutosave
                aria-label="Justificativa"
                placeholder="Quer explicar em uma frase? (opcional)"
                defaultValue={statusNote ?? ""}
                disabled={!canEdit}
                acao={setReviewStatus}
                campos={{ reviewId, status }}
                nomeDoValor="statusNote"
              />
            </div>
          ) : null}
        </div>
      </Bloco>

      {canEdit ? (
        <form action={finishReview} className="flex justify-end">
          <input type="hidden" name="reviewId" value={reviewId} />
          <Button type="submit" variant={closedAt ? "secondary" : "primary"}>
            {closedAt ? "Reabrir acompanhamento" : "Finalizar acompanhamento"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}

/** Um bloco numerado do roteiro. O número é a ordem da conversa. */
function Bloco({
  numero,
  titulo,
  subtitulo,
  children,
}: {
  numero: number;
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3 px-5 pb-2 pt-4">
        <span
          aria-hidden
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600"
        >
          {numero}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500">{subtitulo}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

const ESCOLHAS = [
  { valor: "concluido", label: "Concluído", status: "done" },
  { valor: "andamento", label: "Em andamento", status: "in_progress" },
  { valor: "nao_feito", label: "Não feito", status: "todo" },
] as const;

/**
 * Uma pendência da reunião anterior: três botões e nada mais.
 *
 * "Não feito" mantém a tarefa aberta de propósito — ela volta na próxima
 * reunião, que é exatamente o que o documento arquivado nunca fez.
 */
function Pendencia({
  pendencia,
  canEdit,
}: {
  pendencia: PendenciaView;
  canEdit: boolean;
}) {
  const [pendente, iniciar] = useTransition();
  const [escolhaLocal, setEscolhaLocal] = useState<TaskStatus>(
    pendencia.status,
  );

  function escolher(valor: string, status: TaskStatus) {
    setEscolhaLocal(status);
    const dados = new FormData();
    dados.set("actionId", pendencia.id);
    dados.set("escolha", valor);
    iniciar(() => {
      void updatePendencia(dados);
    });
  }

  return (
    <li className={cn("px-5 py-3", pendente && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-900">{pendencia.title}</p>
          <p className="text-xs text-slate-500">
            {pendencia.assigneeName ?? "sem responsável"}
            {pendencia.dueDate
              ? ` · prazo ${formatDate(new Date(pendencia.dueDate))}`
              : ""}
            {` · de ${formatDate(new Date(pendencia.fromMeetingDate))}`}
          </p>
        </div>

        {canEdit ? (
          <div className="flex shrink-0 flex-wrap gap-1">
            {ESCOLHAS.map((escolha) => (
              <button
                key={escolha.valor}
                type="button"
                onClick={() => escolher(escolha.valor, escolha.status)}
                aria-pressed={escolhaLocal === escolha.status}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  escolhaLocal === escolha.status
                    ? "border-slate-400 bg-slate-100 font-medium text-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                {escolha.label}
              </button>
            ))}
          </div>
        ) : (
          <Badge tone="neutral">{pendencia.status}</Badge>
        )}
      </div>

      {escolhaLocal !== "done" && canEdit ? (
        <div className="mt-2">
          <CampoAutosave
            aria-label={`Observação sobre ${pendencia.title}`}
            placeholder="Por que ainda não? (opcional)"
            defaultValue={pendencia.followUpNote ?? ""}
            acao={updatePendencia}
            campos={{ actionId: pendencia.id }}
            nomeDoValor="valor"
          />
        </div>
      ) : null}
    </li>
  );
}

/** Um número grande, com a meta embaixo quando existe. */
function NumeroGrande({ numero }: { numero: NumeroView }) {
  const sentido = SENTIDO[numero.metric];
  const comparacao = numero.versusMeta ?? numero.versusAnterior;
  const contraMeta = numero.versusMeta !== null;

  const bom =
    comparacao === null || comparacao === 0 || sentido === "neutro"
      ? null
      : comparacao > 0 === (sentido === "sobe");

  return (
    <div className="bg-white px-5 py-3">
      <p className="truncate text-xs uppercase tracking-wide text-slate-500">
        {rotuloDoIndicador(numero.metric)}
      </p>
      <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-slate-900">
        {formatarIndicador(numero.metric, numero.realizado)}
      </p>
      {numero.meta !== null ? (
        <p className="text-xs text-slate-500">
          Meta: {formatarIndicador(numero.metric, numero.meta)}
        </p>
      ) : null}
      {comparacao === null ? (
        <p className="text-xs text-slate-400">sem comparação</p>
      ) : (
        <p
          className={cn(
            "text-xs tabular-nums",
            bom === null && "text-slate-500",
            bom === true && "text-emerald-700",
            bom === false && "text-danger-700",
          )}
        >
          {comparacao > 0 ? "↑" : "↓"}{" "}
          {Math.abs(comparacao).toLocaleString("pt-BR", {
            maximumFractionDigits: 1,
          })}
          %{" "}
          {contraMeta ? (comparacao < 0 ? "abaixo" : "acima") : "vs. anterior"}
        </p>
      )}
    </div>
  );
}

/**
 * Um tema do roteiro.
 *
 * Fechado, é uma linha com dois botões. Aberto, mostra as perguntas a fazer —
 * que é o produto desta tela. O campo de texto só existe depois de "precisa de
 * atenção": é a regra de registrar apenas a exceção, aplicada ao gesto.
 */
function Tema({
  reviewId,
  topic,
  tema,
  encaminhamentos,
  pessoas,
  canEdit,
}: {
  reviewId: string;
  topic: ReviewTopic;
  tema: TemaView | undefined;
  encaminhamentos: EncaminhamentoView[];
  pessoas: PessoaView[];
  canEdit: boolean;
}) {
  const config = TOPIC_CONFIG[topic];
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [statusLocal, setStatusLocal] = useState<TopicStatus | undefined>(
    tema?.status,
  );
  const [criandoAcao, setCriandoAcao] = useState(false);

  function marcar(status: TopicStatus) {
    const novo = statusLocal === status ? undefined : status;
    setStatusLocal(novo);
    if (status === "attention") setAberto(true);

    const dados = new FormData();
    dados.set("reviewId", reviewId);
    dados.set("topic", topic);
    dados.set("status", status);
    iniciar(() => {
      void setTopicStatus(dados);
    });
  }

  return (
    <li className={cn(pendente && "opacity-60")}>
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5">
        <button
          type="button"
          onClick={() => setAberto((atual) => !atual)}
          aria-expanded={aberto}
          className="flex min-w-0 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
        >
          <span
            aria-hidden
            className={cn(
              "text-slate-400 transition-transform",
              aberto && "rotate-90",
            )}
          >
            ›
          </span>
          <span className="truncate text-sm font-medium text-slate-900">
            {config.label}
          </span>
          {statusLocal === "attention" ? (
            <Badge tone="warning">Atenção</Badge>
          ) : null}
          {encaminhamentos.length > 0 ? (
            <span className="text-xs text-slate-500">
              {plural(encaminhamentos.length, "encaminhamento")}
            </span>
          ) : null}
        </button>

        {canEdit ? (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => marcar("ok")}
              aria-pressed={statusLocal === "ok"}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                statusLocal === "ok"
                  ? "border-emerald-300 bg-emerald-50 font-medium text-emerald-800"
                  : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
            >
              ✓ Tudo certo
            </button>
            <button
              type="button"
              onClick={() => marcar("attention")}
              aria-pressed={statusLocal === "attention"}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                statusLocal === "attention"
                  ? "border-amber-300 bg-amber-50 font-medium text-amber-800"
                  : "border-slate-200 text-slate-600 hover:border-slate-300",
              )}
            >
              ⚠ Atenção
            </button>
          </div>
        ) : statusLocal ? (
          <Badge tone={statusLocal === "ok" ? "success" : "warning"}>
            {statusLocal === "ok" ? "Tudo certo" : "Atenção"}
          </Badge>
        ) : null}
      </div>

      {aberto ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <div>
            <p className="text-xs text-slate-500">{config.about}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Pergunte ao Analista
            </p>
            <ul className="mt-1 space-y-0.5">
              {config.questions.map((pergunta) => (
                <li key={pergunta} className="text-sm text-slate-700">
                  {pergunta}
                </li>
              ))}
            </ul>
          </div>

          {canEdit ? (
            <div className="space-y-2">
              {statusLocal === "attention" ? (
                <CampoAutosave
                  aria-label={`O que precisa ser acompanhado em ${config.label}`}
                  placeholder="O que precisa ser acompanhado?"
                  defaultValue={tema?.note ?? ""}
                  acao={setTopicText}
                  campos={{ reviewId, topic, campo: "note" }}
                  nomeDoValor="valor"
                />
              ) : null}

              <CampoAutosave
                aria-label={`Decisão sobre ${config.label}`}
                placeholder="Decidimos alguma coisa aqui? (opcional)"
                defaultValue={tema?.decision ?? ""}
                acao={setTopicText}
                campos={{ reviewId, topic, campo: "decision" }}
                nomeDoValor="valor"
              />
            </div>
          ) : (
            <>
              {tema?.note ? (
                <p className="text-sm text-slate-700">
                  <span className="text-slate-400">Acompanhar:</span>{" "}
                  {tema.note}
                </p>
              ) : null}
              {tema?.decision ? (
                <p className="text-sm text-slate-700">
                  <span className="text-slate-400">Decisão:</span>{" "}
                  {tema.decision}
                </p>
              ) : null}
            </>
          )}

          {encaminhamentos.length > 0 ? (
            <ul className="space-y-1">
              {encaminhamentos.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 text-sm text-slate-700"
                >
                  <span aria-hidden className="text-slate-400">
                    →
                  </span>
                  {item.title}
                  <span className="text-xs text-slate-500">
                    {item.assigneeName}
                    {item.dueDate
                      ? ` · ${formatDate(new Date(item.dueDate))}`
                      : ""}
                  </span>
                  {canEdit ? (
                    <form action={removeEncaminhamento}>
                      <input type="hidden" name="actionId" value={item.id} />
                      <button
                        type="submit"
                        aria-label={`Tirar ${item.title}`}
                        className="rounded px-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        ✕
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {canEdit ? (
            criandoAcao ? (
              <FormularioDeEncaminhamento
                reviewId={reviewId}
                topic={topic}
                pessoas={pessoas}
                onFechar={() => setCriandoAcao(false)}
              />
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCriandoAcao(true)}
              >
                + Encaminhamento
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/** O que precisa ser feito, por quem, até quando. Três campos e acabou. */
function FormularioDeEncaminhamento({
  reviewId,
  topic,
  pessoas,
  onFechar,
}: {
  reviewId: string;
  topic: ReviewTopic;
  pessoas: PessoaView[];
  onFechar: () => void;
}) {
  return (
    <form
      action={addEncaminhamento}
      onSubmit={onFechar}
      className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-2"
    >
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="topic" value={topic} />
      <div className="min-w-48 flex-1">
        <Input
          name="title"
          required
          maxLength={200}
          autoFocus
          placeholder="O que precisa ser feito?"
          className="h-9"
        />
      </div>
      <div className="w-44">
        <Select
          name="assigneeId"
          size="sm"
          placeholder="Responsável"
          ariaLabel="Responsável"
          options={pessoas.map((pessoa) => ({
            value: pessoa.id,
            label: pessoa.name,
            hint: pessoa.hint,
          }))}
        />
      </div>
      <div className="w-36">
        <Input name="dueDate" type="date" aria-label="Prazo" className="h-9" />
      </div>
      <Button type="submit" size="sm" variant="primary">
        Criar
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onFechar}>
        Cancelar
      </Button>
    </form>
  );
}

function BotaoDeStatus({
  reviewId,
  valor,
  selecionado,
  canEdit,
}: {
  reviewId: string;
  valor: ReviewStatus;
  selecionado: boolean;
  canEdit: boolean;
}) {
  const [pendente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={!canEdit || pendente}
      aria-pressed={selecionado}
      onClick={() => {
        const dados = new FormData();
        dados.set("reviewId", reviewId);
        dados.set("status", valor);
        iniciar(() => {
          void setReviewStatus(dados);
        });
      }}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        selecionado
          ? "border-slate-400 bg-slate-50 font-medium text-slate-900"
          : "border-slate-200 text-slate-600 hover:border-slate-300",
      )}
    >
      <span
        aria-hidden
        className={cn("size-2.5 rounded-full", REVIEW_STATUS_DOTS[valor])}
      />
      {REVIEW_STATUS_LABELS[valor]}
    </button>
  );
}

/**
 * Campo que grava sozinho.
 *
 * Grava quando o campo perde o foco e quando a digitação para por um segundo —
 * e não a cada tecla, que seria uma gravação por letra. O que ele NÃO tem é um
 * botão: a reunião acontece falando, e um "Salvar" ao lado de cada campo é um
 * "Salvar" que alguém vai esquecer de clicar.
 */
function CampoAutosave({
  acao,
  campos,
  nomeDoValor,
  defaultValue,
  ...props
}: {
  acao: (formData: FormData) => Promise<void>;
  campos: Record<string, string>;
  nomeDoValor: string;
  defaultValue: string;
} & Omit<React.ComponentProps<"input">, "onChange" | "onBlur" | "ref">) {
  const [pendente, iniciar] = useTransition();
  const ultimoGravado = useRef(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function gravar(valor: string) {
    if (valor === ultimoGravado.current) return;
    ultimoGravado.current = valor;

    const dados = new FormData();
    for (const [chave, conteudo] of Object.entries(campos)) {
      dados.set(chave, conteudo);
    }
    dados.set(nomeDoValor, valor);
    iniciar(() => {
      void acao(dados);
    });
  }

  return (
    <div className="relative">
      <Input
        {...props}
        defaultValue={defaultValue}
        onChange={(evento) => {
          const valor = evento.target.value;
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => gravar(valor), 1000);
        }}
        onBlur={(evento) => {
          if (timer.current) clearTimeout(timer.current);
          gravar(evento.target.value);
        }}
        className="h-9 pr-16"
      />
      {pendente ? (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
          salvando
        </span>
      ) : null}
    </div>
  );
}
