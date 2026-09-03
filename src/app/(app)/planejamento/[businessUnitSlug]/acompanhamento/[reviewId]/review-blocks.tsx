"use client";

import { useState } from "react";

import {
  addAction,
  addLearning,
  addNote,
  deleteLearning,
  deleteNote,
  removeAction,
  saveReviewSummary,
  toggleNoteResolved,
  toggleReviewClosed,
} from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, Section } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Stat, StatGrid } from "@/components/ui/stat";
import {
  LEARNING_CATEGORIES,
  LEARNING_CATEGORY_LABELS,
  NOTE_KINDS,
  NOTE_KIND_LABELS,
  REVIEW_STATUSES,
  REVIEW_STATUS_DOTS,
  REVIEW_STATUS_LABELS,
  TASK_STATUS_LABELS,
  type LearningCategory,
  type NoteKind,
  type ReviewStatus,
  type TaskStatus,
} from "@/lib/db/schema";
import {
  SENTIDO,
  formatarIndicador,
  rotuloCurto,
  rotuloDoIndicador,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

export type ReviewView = {
  id: string;
  businessUnitId: string;
  meetingDate: string;
  status: ReviewStatus;
  statusNote: string | null;
  highlight: string | null;
  concern: string | null;
  closedAt: string | null;
};

export type PessoaView = { id: string; name: string; hint?: string };

/**
 * ── 1. Como estamos ────────────────────────────────────────────────────────
 *
 * O semáforo abre a reunião, e a justificativa é obrigatória na prática: um
 * amarelo sem motivo é uma opinião, e a reunião seguinte não consegue
 * verificar se ele melhorou.
 */
export function BlocoResumo({
  review,
  participantes,
  pessoas,
  convidados,
  canEdit,
}: {
  review: ReviewView;
  participantes: string[];
  pessoas: PessoaView[];
  convidados: string;
  canEdit: boolean;
}) {
  const [status, setStatus] = useState<ReviewStatus>(review.status);
  const [presentes, setPresentes] = useState<string[]>(participantes);

  return (
    <form action={saveReviewSummary}>
      <input type="hidden" name="reviewId" value={review.id} />
      <input type="hidden" name="status" value={status} />
      {presentes.map((id) => (
        <input key={id} type="hidden" name="participantes" value={id} />
      ))}

      <Card>
        <CardHeader
          title="Como estamos?"
          description="A leitura geral da BU neste momento, em uma frase."
          action={
            // `formAction` e não um <form> aninhado: form dentro de form é
            // HTML inválido, e o React derruba a hidratação da página inteira
            // por causa disso. O `reviewId` já viaja no formulário de fora.
            <Button
              type="submit"
              formAction={toggleReviewClosed}
              size="sm"
              variant="ghost"
            >
              {review.closedAt ? "Reabrir reunião" : "Fechar reunião"}
            </Button>
          }
        />

        <div className="space-y-4 px-5 pb-4 pt-2">
          <div className="flex flex-wrap gap-2">
            {REVIEW_STATUSES.map((valor) => (
              <button
                key={valor}
                type="button"
                disabled={!canEdit}
                onClick={() => setStatus(valor)}
                aria-pressed={status === valor}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
                  status === valor
                    ? "border-slate-400 bg-slate-50 font-medium text-slate-900"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 rounded-full",
                    REVIEW_STATUS_DOTS[valor],
                  )}
                />
                {REVIEW_STATUS_LABELS[valor]}
              </button>
            ))}
          </div>

          <Field
            label="Por quê?"
            htmlFor="status-note"
            hint="Uma frase. É o que a próxima reunião vai conferir."
          >
            <Input
              id="status-note"
              name="statusNote"
              defaultValue={review.statusNote ?? ""}
              disabled={!canEdit}
              maxLength={280}
              placeholder="Ex.: captação abaixo do esperado, mas conversão segurou o faturamento."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="O melhor do período" htmlFor="highlight">
              <Input
                id="highlight"
                name="highlight"
                defaultValue={review.highlight ?? ""}
                disabled={!canEdit}
                maxLength={280}
              />
            </Field>
            <Field label="O principal ponto de atenção" htmlFor="concern">
              <Input
                id="concern"
                name="concern"
                defaultValue={review.concern ?? ""}
                disabled={!canEdit}
                maxLength={280}
              />
            </Field>
          </div>

          <Field label="Quem participou">
            <div className="flex flex-wrap items-center gap-1.5">
              {presentes.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-sm"
                >
                  <span className="text-slate-900">
                    {pessoas.find((p) => p.id === id)?.name ?? "—"}
                  </span>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPresentes((atual) =>
                          atual.filter((item) => item !== id),
                        )
                      }
                      aria-label="Tirar da lista"
                      className="rounded px-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  ) : null}
                </span>
              ))}
              {canEdit ? (
                <Select
                  trigger="inline"
                  placeholder="+ Adicionar"
                  ariaLabel="Participantes"
                  values={presentes}
                  onToggleValue={(id) =>
                    setPresentes((atual) =>
                      atual.includes(id)
                        ? atual.filter((item) => item !== id)
                        : [...atual, id],
                    )
                  }
                  options={pessoas.map((pessoa) => ({
                    value: pessoa.id,
                    label: pessoa.name,
                    hint: pessoa.hint,
                  }))}
                />
              ) : null}
            </div>
          </Field>

          <Field
            label="Convidados"
            htmlFor="convidados"
            hint="Quem não tem conta na plataforma. Separe por vírgula."
          >
            <Input
              id="convidados"
              name="convidados"
              defaultValue={convidados}
              disabled={!canEdit}
              maxLength={280}
            />
          </Field>

          {canEdit ? (
            <Button type="submit" variant="primary">
              Salvar
            </Button>
          ) : null}
        </div>
      </Card>
    </form>
  );
}

/**
 * ── 2. Resultados ──────────────────────────────────────────────────────────
 *
 * Nada se digita aqui. Vem do fechamento semanal que a BU já lança — pedir os
 * mesmos números na reunião criaria duas fontes para a mesma verdade, e a
 * segunda seria preenchida com pressa cinco minutos antes.
 */
export function BlocoResultados({
  resultados,
  dias,
  desde,
  baseDaBu,
}: {
  resultados: Array<{
    metric: Indicador;
    realizado: number | null;
    variacao: number | null;
  }>;
  dias: number;
  desde: string;
  baseDaBu: string;
}) {
  const temNumero = resultados.some((linha) => linha.realizado !== null);

  return (
    <Card>
      <CardHeader
        title="O que aconteceu nos números"
        description={`Desde ${formatDate(new Date(desde))} — ${dias} dias. Comparado com os ${dias} dias anteriores.`}
        action={
          <a
            href={`${baseDaBu}/resultados`}
            className="text-xs text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
          >
            Lançar semana
          </a>
        }
      />
      {temNumero ? (
        <StatGrid>
          {resultados.map((linha) => (
            <Stat
              key={linha.metric}
              label={rotuloCurto(linha.metric)}
              labelCompleto={rotuloDoIndicador(linha.metric)}
              value={formatarIndicador(linha.metric, linha.realizado)}
              variacao={linha.variacao}
              sentido={SENTIDO[linha.metric]}
              tamanho="sm"
            />
          ))}
        </StatGrid>
      ) : (
        <p className="px-5 pb-4 pt-1 text-sm text-slate-500">
          Nenhum número lançado neste período. O fechamento semanal fica em
          Planejamento › Resultados.
        </p>
      )}
    </Card>
  );
}

/**
 * ── 3. O que fizemos e o que aprendemos ────────────────────────────────────
 *
 * Quatro perguntas por item, sempre as mesmas. O documento antigo tinha um
 * bloco por tipo de ação e a maioria voltava vazia toda semana; aqui o tipo é
 * etiqueta e registra-se só o que foi relevante.
 */
export function BlocoAprendizados({
  reviewId,
  itens,
  canEdit,
}: {
  reviewId: string;
  itens: Array<{
    id: string;
    category: string;
    whatWeDid: string;
    whatHappened: string | null;
    whatWeLearned: string | null;
    nextStep: string | null;
  }>;
  canEdit: boolean;
}) {
  const [adicionando, setAdicionando] = useState(false);

  return (
    <Card>
      <CardHeader
        title="O que fizemos e o que aprendemos"
        description="Só o que foi relevante no período. Não precisa preencher tudo."
        action={
          canEdit && !adicionando ? (
            <Button size="sm" onClick={() => setAdicionando(true)}>
              + Registrar
            </Button>
          ) : null
        }
      />

      {itens.length === 0 && !adicionando ? (
        <p className="px-5 pb-4 pt-1 text-sm text-slate-500">
          Nada registrado ainda.
        </p>
      ) : null}

      <ul className="divide-y divide-slate-100">
        {itens.map((item) => (
          <li key={item.id} className="px-5 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">
                    {LEARNING_CATEGORY_LABELS[
                      item.category as LearningCategory
                    ] ?? item.category}
                  </Badge>
                  <span className="text-sm font-medium text-slate-900">
                    {item.whatWeDid}
                  </span>
                </p>
                {item.whatHappened ? (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Aconteceu:</span>{" "}
                    {item.whatHappened}
                  </p>
                ) : null}
                {item.whatWeLearned ? (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Aprendemos:</span>{" "}
                    {item.whatWeLearned}
                  </p>
                ) : null}
                {item.nextStep ? (
                  <p className="text-sm text-slate-600">
                    <span className="text-slate-400">Vamos:</span>{" "}
                    {item.nextStep}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <form action={deleteLearning}>
                  <input type="hidden" name="learningId" value={item.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remover
                  </Button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {adicionando ? (
        <form
          action={addLearning}
          className="space-y-3 border-t border-slate-100 px-5 py-4"
        >
          <input type="hidden" name="reviewId" value={reviewId} />
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Field label="Tipo" htmlFor="learning-cat">
              <Select
                id="learning-cat"
                name="category"
                defaultValue="media"
                size="sm"
                options={LEARNING_CATEGORIES.map((valor) => ({
                  value: valor,
                  label: LEARNING_CATEGORY_LABELS[valor],
                }))}
              />
            </Field>
            <Field label="O que fizemos?" htmlFor="learning-did" required>
              <Input
                id="learning-did"
                name="whatWeDid"
                required
                maxLength={280}
                placeholder="Ex.: trocamos o criativo principal do Meta"
              />
            </Field>
          </div>
          <Field label="O que aconteceu?" htmlFor="learning-happened">
            <Input
              id="learning-happened"
              name="whatHappened"
              maxLength={280}
              placeholder="Ex.: CPL caiu de R$ 18 para R$ 12 em quatro dias"
            />
          </Field>
          <Field label="O que aprendemos?" htmlFor="learning-learned">
            <Input
              id="learning-learned"
              name="whatWeLearned"
              maxLength={280}
              placeholder="Ex.: prova social do aluno funciona melhor que a do professor"
            />
          </Field>
          <Field label="O que vamos fazer com isso?" htmlFor="learning-next">
            <Input
              id="learning-next"
              name="nextStep"
              maxLength={280}
              placeholder="Ex.: gravar mais três depoimentos de alunos"
            />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Registrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdicionando(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}

/**
 * ── 4. Problemas, oportunidades e decisões ─────────────────────────────────
 *
 * O raciocínio da reunião. Sem isto a ferramenta guarda o que foi feito e
 * esquece por que foi feito — e seis meses depois ninguém lembra se a mudança
 * de canal foi decisão consciente ou acidente.
 */
export function BlocoAnotacoes({
  reviewId,
  itens,
  valendo,
  canEdit,
}: {
  reviewId: string;
  itens: Array<{
    id: string;
    kind: NoteKind;
    text: string;
    dependsOn: string | null;
    resolvedAt: Date | string | null;
  }>;
  valendo: Array<{
    id: string;
    kind: NoteKind;
    text: string;
    dependsOn: string | null;
    meetingDate: Date | string;
  }>;
  canEdit: boolean;
}) {
  const [adicionando, setAdicionando] = useState(false);
  const [tipo, setTipo] = useState<NoteKind>("problem");

  return (
    <Card>
      <CardHeader
        title="Problemas, oportunidades e decisões"
        description="O raciocínio da reunião. Decisão e bloqueio continuam valendo nas próximas."
        action={
          canEdit && !adicionando ? (
            <Button size="sm" onClick={() => setAdicionando(true)}>
              + Registrar
            </Button>
          ) : null
        }
      />

      {itens.length === 0 && !adicionando ? (
        <p className="px-5 pb-4 pt-1 text-sm text-slate-500">
          Nada registrado ainda.
        </p>
      ) : null}

      <ul className="divide-y divide-slate-100">
        {itens.map((item) => (
          <li key={item.id} className="flex flex-wrap gap-3 px-5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                <Badge
                  tone={
                    item.kind === "blocker"
                      ? "warning"
                      : item.kind === "decision"
                        ? "brand"
                        : "neutral"
                  }
                >
                  {NOTE_KIND_LABELS[item.kind]}
                </Badge>
                <span className={cn(item.resolvedAt && "line-through")}>
                  {item.text}
                </span>
              </p>
              {item.dependsOn ? (
                <p className="text-xs text-slate-500">
                  depende de {item.dependsOn}
                </p>
              ) : null}
            </div>
            {canEdit ? (
              <div className="flex shrink-0 gap-1">
                {item.kind === "blocker" || item.kind === "hypothesis" ? (
                  <form action={toggleNoteResolved}>
                    <input type="hidden" name="noteId" value={item.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      {item.resolvedAt ? "Reabrir" : "Resolver"}
                    </Button>
                  </form>
                ) : null}
                <form action={deleteNote}>
                  <input type="hidden" name="noteId" value={item.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remover
                  </Button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {adicionando ? (
        <form
          action={addNote}
          className="space-y-3 border-t border-slate-100 px-5 py-4"
        >
          <input type="hidden" name="reviewId" value={reviewId} />
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Field label="Tipo" htmlFor="note-kind">
              <Select
                id="note-kind"
                name="kind"
                value={tipo}
                onValueChange={(valor) => setTipo(valor as NoteKind)}
                size="sm"
                options={NOTE_KINDS.map((valor) => ({
                  value: valor,
                  label: NOTE_KIND_LABELS[valor],
                }))}
              />
            </Field>
            <Field label="O quê" htmlFor="note-text" required>
              <Input id="note-text" name="text" required maxLength={400} />
            </Field>
          </div>
          {tipo === "blocker" ? (
            <Field
              label="Depende de quem"
              htmlFor="note-depends"
              hint="Bloqueio sem dono não sai do lugar."
            >
              <Input id="note-depends" name="dependsOn" maxLength={120} />
            </Field>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Registrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdicionando(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {valendo.length > 0 ? (
        <Section title="Continua valendo de antes" divider>
          <ul className="divide-y divide-slate-100">
            {valendo.map((item) => (
              <li key={item.id} className="px-5 py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <Badge tone={item.kind === "blocker" ? "warning" : "neutral"}>
                    {NOTE_KIND_LABELS[item.kind]}
                  </Badge>
                  {item.text}
                </p>
                <p className="text-xs text-slate-500">
                  {item.dependsOn ? `depende de ${item.dependsOn} · ` : ""}
                  de {formatDate(new Date(item.meetingDate))}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </Card>
  );
}

/**
 * ── 5. Próximas ações ──────────────────────────────────────────────────────
 *
 * Cada ação vira uma TAREFA no board de quem ficou com ela. É a diferença
 * entre o documento antigo e um sistema: ali a ação combinada dependia de
 * alguém reabrir o arquivo; aqui ela aparece na fila da pessoa no dia
 * seguinte, e volta para a reunião seguinte se não for feita.
 */
export function BlocoAcoes({
  reviewId,
  acoes,
  pendentes,
  pessoas,
  canEdit,
  baseDoAcompanhamento,
}: {
  reviewId: string;
  acoes: Array<{
    id: string;
    title: string;
    expectedResult: string | null;
    status: TaskStatus;
    dueDate: Date | string | null;
    assigneeName: string | null;
  }>;
  pendentes: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: Date | string | null;
    assigneeName: string | null;
    fromReviewId: string;
    fromMeetingDate: Date | string;
  }>;
  pessoas: PessoaView[];
  canEdit: boolean;
  baseDoAcompanhamento: string;
}) {
  const [adicionando, setAdicionando] = useState(false);

  return (
    <Card>
      <CardHeader
        title="O que precisa acontecer agora"
        description="Cada ação vira uma tarefa no board de quem ficou com ela."
        action={
          canEdit && !adicionando ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => setAdicionando(true)}
            >
              + Nova ação
            </Button>
          ) : null
        }
      />

      {/* O que ficou de antes vem PRIMEIRO: a reunião começa conferindo o que
          foi combinado, e não combinando mais. */}
      {pendentes.length > 0 ? (
        <Section title="Vindo das reuniões anteriores" divider>
          <ul className="divide-y divide-slate-100">
            {pendentes.map((acao) => (
              <li key={acao.id} className="px-5 py-2.5">
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                  {acao.title}
                  <Badge
                    tone={acao.status === "blocked" ? "warning" : "neutral"}
                  >
                    {TASK_STATUS_LABELS[acao.status]}
                  </Badge>
                </p>
                <p className="text-xs text-slate-500">
                  {acao.assigneeName ?? "sem responsável"}
                  {acao.dueDate
                    ? ` · prazo ${formatDate(new Date(acao.dueDate))}`
                    : ""}
                  {" · de "}
                  <a
                    href={`${baseDoAcompanhamento}/${acao.fromReviewId}`}
                    className="underline decoration-slate-300 underline-offset-2 hover:text-slate-800"
                  >
                    {formatDate(new Date(acao.fromMeetingDate))}
                  </a>
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section
        title={pendentes.length > 0 ? "Combinadas nesta reunião" : undefined}
        divider={pendentes.length > 0}
      >
        {acoes.length === 0 && !adicionando ? (
          <p className="px-5 pb-4 pt-1 text-sm text-slate-500">
            Nenhuma ação combinada ainda.
          </p>
        ) : null}

        <ul className="divide-y divide-slate-100">
          {acoes.map((acao) => (
            <li key={acao.id} className="flex flex-wrap gap-3 px-5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm text-slate-900">
                  {acao.title}
                  <Badge
                    tone={acao.status === "blocked" ? "warning" : "neutral"}
                  >
                    {TASK_STATUS_LABELS[acao.status]}
                  </Badge>
                </p>
                <p className="text-xs text-slate-500">
                  {acao.assigneeName ?? "sem responsável"}
                  {acao.dueDate
                    ? ` · prazo ${formatDate(new Date(acao.dueDate))}`
                    : ""}
                </p>
                {acao.expectedResult ? (
                  <p className="mt-0.5 text-sm text-slate-600">
                    <span className="text-slate-400">Esperamos:</span>{" "}
                    {acao.expectedResult}
                  </p>
                ) : null}
              </div>
              {canEdit ? (
                <form action={removeAction}>
                  <input type="hidden" name="actionId" value={acao.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Remover
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      {adicionando ? (
        <form
          action={addAction}
          className="space-y-3 border-t border-slate-100 px-5 py-4"
        >
          <input type="hidden" name="reviewId" value={reviewId} />
          <Field label="Ação" htmlFor="action-title" required>
            <Input
              id="action-title"
              name="title"
              required
              maxLength={200}
              placeholder="Ex.: gravar três depoimentos de alunos"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Responsável" htmlFor="action-assignee">
              <Select
                id="action-assignee"
                name="assigneeId"
                placeholder="Você mesmo"
                options={pessoas.map((pessoa) => ({
                  value: pessoa.id,
                  label: pessoa.name,
                  hint: pessoa.hint,
                }))}
              />
            </Field>
            <Field label="Prazo" htmlFor="action-due">
              <Input id="action-due" name="dueDate" type="date" />
            </Field>
          </div>
          <Field
            label="Resultado esperado"
            htmlFor="action-result"
            hint="O que deve ter mudado quando isto estiver pronto."
          >
            <Input id="action-result" name="expectedResult" maxLength={280} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Combinar ação
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setAdicionando(false)}
            >
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </Card>
  );
}
