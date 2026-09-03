import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, gte, lte } from "drizzle-orm";

import { ResultsSummary, type ResumoDeResultados } from "./results-summary";
import { TaskRow, type TaskRowData } from "../../tarefas/task-row";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui/card";
import { can } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { timelineItem, GOAL_SCOPE_LABELS } from "@/lib/db/schema";
import { listBusinessUnitDocs } from "@/lib/modules/documentation/queries";
import { SquadView } from "@/components/org/squad-view";
import { listBusinessUnitMembers } from "@/lib/modules/org/scope";
import { listOpenPainsOfBusinessUnit } from "@/lib/modules/personas/queries";
import { requireStrategyBusinessUnit } from "@/lib/modules/strategy/access";
import {
  currentSemester,
  formatMetricValue,
  loadCycleGoals,
  metricLabel,
} from "@/lib/modules/strategy/goals";
import {
  INDICADORES,
  inicioDaSemana,
  somar,
  type Indicador,
} from "@/lib/modules/results/metrics";
import { listWeeklyResultsOfPeriod } from "@/lib/modules/results/queries";
import { listCycles, pickDefaultCycle } from "@/lib/modules/strategy/queries";
import { TIMELINE_KIND_CONFIG } from "@/lib/modules/strategy/timeline-kinds";
import { listTasksOfBusinessUnit } from "@/lib/modules/tasks/queries";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Visão geral" };
export const dynamic = "force-dynamic";

/** Quantos dias à frente a visão geral olha no calendário. */
const HORIZONTE_DIAS = 45;

export default async function BusinessUnitOverviewPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { unit, currentUser, canEdit } =
    await requireStrategyBusinessUnit(businessUnitSlug);

  const base = `/planejamento/${unit.slug}`;
  const db = await getDb();

  const cycles = await listCycles(unit.id);
  const cycle = pickDefaultCycle(cycles);

  const agora = new Date();
  const limite = new Date(agora.getTime() + HORIZONTE_DIAS * 86_400_000);

  const [proximos, dores, docs, tarefas, equipe, metas, semanais] =
    await Promise.all([
      cycle
        ? db
            .select()
            .from(timelineItem)
            .where(
              and(
                eq(timelineItem.cycleId, cycle.id),
                // Item que já começou mas ainda não terminou também conta como
                // "o que vem": uma janela de venda aberta é justamente o que está
                // em jogo agora.
                gte(timelineItem.endsAt, agora),
                lte(timelineItem.startsAt, limite),
              ),
            )
            .orderBy(asc(timelineItem.startsAt))
            .limit(8)
        : Promise.resolve([]),
      can(currentUser, "personas")
        ? listOpenPainsOfBusinessUnit(unit.id)
        : Promise.resolve([]),
      can(currentUser, "documentation")
        ? listBusinessUnitDocs(unit.id, currentUser)
        : Promise.resolve([]),
      can(currentUser, "tasks")
        ? listTasksOfBusinessUnit(unit.id)
        : Promise.resolve([]),
      listBusinessUnitMembers(unit.id),
      cycle ? loadCycleGoals(cycle.id) : Promise.resolve(null),
      cycle
        ? listWeeklyResultsOfPeriod(
            [unit.id],
            // O mais antigo entre o começo do ciclo e oito semanas atrás: o
            // primeiro alimenta a comparação com a meta, o segundo alimenta a
            // variação recente de uma BU cujo ciclo começou ontem.
            new Date(
              Math.min(
                cycle.startsAt.getTime(),
                inicioDaSemana(agora).getTime() - 8 * 7 * 86_400_000,
              ),
            ),
            agora,
          )
        : Promise.resolve([]),
    ]);

  const semestreEmCurso = cycle ? currentSemester(cycle) : null;

  // ── Resumo dos resultados ─────────────────────────────────────────────────
  // Quatro semanas contra as quatro anteriores: é o horizonte em que uma
  // mudança de rota ainda cabe. Trimestre é balanço, semana é ruído.
  const SEMANAS_COMPARADAS = 4;
  const semanaAtual = inicioDaSemana(agora);
  const corteRecente =
    semanaAtual.getTime() - SEMANAS_COMPARADAS * 7 * 86_400_000;
  const corteAnterior = corteRecente - SEMANAS_COMPARADAS * 7 * 86_400_000;

  const noPeriodo = (de: number, ate: number) =>
    semanais.filter(
      (linha) =>
        linha.weekStart.getTime() >= de && linha.weekStart.getTime() < ate,
    );

  const alvosDoCiclo = (metas?.cycle?.targets ?? []).filter(
    (alvo): alvo is typeof alvo & { metric: Indicador } =>
      INDICADORES.some((indicador) => indicador.metric === alvo.metric),
  );

  const resumo: ResumoDeResultados = {
    recente: somar(noPeriodo(corteRecente, semanaAtual.getTime())),
    anterior: somar(noPeriodo(corteAnterior, corteRecente)),
    semanasComparadas: SEMANAS_COMPARADAS,
    noCiclo: somar(
      cycle
        ? semanais.filter(
            (linha) => linha.weekStart.getTime() >= cycle.startsAt.getTime(),
          )
        : [],
    ),
    // A miniatura mostra as últimas semanas lançadas, e não as do ciclo: um
    // ciclo que ainda não começou (o de 2027 aberto em setembro de 2026)
    // deixaria a tendência em branco justamente para quem já está lançando.
    serie: semanais
      .slice()
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime())
      .slice(-13)
      .map((linha) => ({
        weekStart: linha.weekStart.getTime(),
        revenue: linha.revenue,
      })),
    metas: alvosDoCiclo.map((alvo) => ({
      metric: alvo.metric,
      alvo: alvo.target,
    })),
    vazio: semanais.length === 0,
  };

  if (!cycle) {
    return (
      <EmptyState
        title="O planejamento desta BU ainda não começou"
        description="Tudo — calendário, metas, esteira de produtos — pendura num ciclo. Crie o primeiro para abrir o ano."
        action={
          canEdit ? (
            <ButtonLink href={`${base}/calendario`}>
              Criar o primeiro ciclo
            </ButtonLink>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <ResultsSummary resumo={resumo} base={base} canEdit={canEdit} />

      {/*
        A meta como direção, não como placar.
        O objetivo do ciclo e o do semestre em curso são o que orienta decisão
        no dia a dia; atingimento e evolução ficam no dashboard externo, e
        repeti-los aqui só criaria uma segunda fonte para o mesmo número.
      */}
      {metas ? (
        <Card>
          <CardHeader
            title={`Metas de ${cycle.name}`}
            description="A direção do ciclo e o compromisso do semestre em curso."
            action={
              <ButtonLink href={`${base}/metas`} variant="ghost" size="sm">
                Ver as metas
              </ButtonLink>
            }
          />
          <CardBody className="space-y-4">
            {metas.cycle ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {GOAL_SCOPE_LABELS.cycle}
                </p>
                <p className="mt-1 font-display text-lg leading-snug text-slate-900">
                  {metas.cycle.objective}
                </p>
                {metas.cycle.targets.length > 0 ? (
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {metas.cycle.targets.map((alvo) => (
                      <li
                        key={alvo.metric}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                      >
                        {metricLabel(alvo.metric)}
                        {": "}
                        <span className="font-semibold tabular-nums">
                          {formatMetricValue(alvo.metric, alvo.target)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                A meta geral do ciclo ainda não foi definida.
              </p>
            )}

            {semestreEmCurso && metas[semestreEmCurso] ? (
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {GOAL_SCOPE_LABELS[semestreEmCurso]} · em curso
                </p>
                <p className="mt-1 text-sm text-slate-800">
                  {metas[semestreEmCurso]!.objective}
                </p>
                {metas[semestreEmCurso]!.fronts.length > 0 ? (
                  <p className="mt-1.5 text-xs text-slate-500">
                    Frentes:{" "}
                    {metas[semestreEmCurso]!.fronts.map((f) => f.title).join(
                      " · ",
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title={
            equipe.length === 1
              ? "Squad · 1 pessoa"
              : `Squad · ${equipe.length} pessoas`
          }
          description="Quem atende esta BU, agrupado pela unidade de origem."
          action={
            <ButtonLink href="/organograma" variant="ghost" size="sm">
              Organograma
            </ButtonLink>
          }
        />
        <CardBody>
          <SquadView
            people={equipe.map((pessoa) => ({
              userId: pessoa.userId,
              name: pessoa.name,
              role: pessoa.role,
              jobTitleName: pessoa.jobTitleName,
              jobTitleOrder: pessoa.jobTitleOrder,
              isLead: pessoa.isLead,
              positions: pessoa.positions,
            }))}
            emptyTitle="Squad ainda não montado"
            emptyDescription="Um administrador monta o squad em Administração › Squads. Sem ninguém no squad, só quem responde pela organização enxerga este planejamento."
          />
        </CardBody>
      </Card>

      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(22rem,1fr))]">
        <Card>
          <CardHeader
            title="O que vem por aí"
            description={`Próximos ${HORIZONTE_DIAS} dias no calendário.`}
            action={
              <ButtonLink href={`${base}/calendario`} variant="ghost" size="sm">
                Calendário
              </ButtonLink>
            }
          />
          <CardBody className="px-0 py-0">
            {proximos.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-slate-500">
                Nada marcado para os próximos {HORIZONTE_DIAS} dias.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {proximos.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span
                          aria-hidden
                          className={`size-2 shrink-0 rounded-full ${TIMELINE_KIND_CONFIG[item.kind].dot}`}
                        />
                        <span className="text-sm font-medium text-slate-900">
                          {item.title}
                        </span>
                      </span>
                      <span className="mt-0.5 block pl-4 text-xs text-slate-500">
                        {TIMELINE_KIND_CONFIG[item.kind].label}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {formatDate(item.startsAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {tarefas.length > 0 ? (
          <Card>
            <CardHeader
              title={`Tarefas abertas nesta BU (${tarefas.length})`}
              action={
                <ButtonLink href="/tarefas" variant="ghost" size="sm">
                  Todas as tarefas
                </ButtonLink>
              }
            />
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-slate-100">
                {tarefas.slice(0, 5).map((item) => (
                  <TaskRow
                    key={item.id}
                    destinos={[]}
                    task={
                      {
                        id: item.id,
                        title: item.title,
                        status: item.status,
                        priority: item.priority,
                        dueDate: item.dueDate?.toISOString() ?? null,
                        blockedReason: item.blockedReason,
                        assigneeId: item.assigneeId,
                        assigneeName: item.assigneeName,
                        assignedTeamName: item.assignedTeamName,
                        businessUnitLabel: null,
                        businessUnitSlug: null,
                        createdByName: item.createdByName,
                        createdAt: item.createdAt.toISOString(),
                        // A visão geral é leitura: mexer na tarefa acontece em
                        // Tarefas, onde está o contexto completo dela.
                        relation: {
                          isAssignee: false,
                          isDelegator: false,
                          canClaim: false,
                        },
                      } satisfies TaskRowData
                    }
                  />
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(22rem,1fr))]">
        {dores.length > 0 ? (
          <Card className="border-amber-200">
            <CardHeader
              title={`${dores.length} ${
                dores.length === 1 ? "dor sem solução" : "dores sem solução"
              }`}
              description="Pauta de produto: o que o público sente e ainda não respondemos."
              action={
                <ButtonLink href={`${base}/personas`} variant="ghost" size="sm">
                  Personas
                </ButtonLink>
              }
            />
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-slate-100">
                {dores.slice(0, 5).map((dor) => (
                  <li key={dor.id} className="px-5 py-2.5">
                    <p className="text-sm text-slate-800">{dor.pain}</p>
                    <Link
                      href={`${base}/personas/${dor.personaSlug}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      {dor.personaName}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        {docs.length > 0 ? (
          <Card>
            <CardHeader
              title="Documentação recente"
              action={
                <ButtonLink
                  href={`${base}/documentos`}
                  variant="ghost"
                  size="sm"
                >
                  Todos
                </ButtonLink>
              }
            />
            <CardBody className="px-0 py-0">
              <ul className="divide-y divide-slate-100">
                {docs.slice(0, 5).map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/documentacao/${doc.categorySlug}/${doc.slug}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 px-5 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <span className="text-sm font-medium text-slate-900">
                        {doc.title}
                      </span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {doc.scope === "general" ? "na biblioteca" : "interno"}
                        {" · "}
                        {formatDate(doc.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
