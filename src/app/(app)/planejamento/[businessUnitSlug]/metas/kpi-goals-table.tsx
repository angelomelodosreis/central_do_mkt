"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Target,
  BarChart2,
  Lightbulb,
  Info,
  Plus,
  Trash2,
  Save,
  Check,
  ArrowLeft,
  X,
  HelpCircle,
} from "lucide-react";
import { saveCycleObjectiveAndGoalsAction } from "../../actions";
import type { StrategyKpiGoal } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";

type GoalRow = {
  id: string;
  title: string;
  tags: string[];
  primaryKpiName: string;
  primaryKpiTarget: string;
  secondaryKpiName: string;
  secondaryKpiTarget: string;
  sortOrder: number;
};

const SUGGESTED_DIAGNOSIS_TAGS = [
  "Mercado em crescimento",
  "Oportunidade de market share",
  "Baixa consideração de marca",
  "Crescimento da base",
  "Potencial de crescimento",
  "Eficiência de aquisição",
  "Demanda não capturada",
  "Conversão abaixo do histórico",
  "Gargalo em topo de funil",
  "Aumento de concorrência",
  "Oportunidade de ganho de eficiência",
];

const DEFAULT_ROWS_TEMPLATE: GoalRow[] = [
  {
    id: "temp-1",
    title: "Ampliar a participação de mercado da BU.",
    tags: ["Mercado em crescimento", "Oportunidade de market share"],
    primaryKpiName: "Market share",
    primaryKpiTarget: "8,2%",
    secondaryKpiName: "Nº de alunos, Conversão",
    secondaryKpiTarget: "200, ≥ 2,4%",
    sortOrder: 10,
  },
  {
    id: "temp-2",
    title: "Aumentar o reconhecimento da marca.",
    tags: ["Baixa consideração de marca", "Crescimento da base"],
    primaryKpiName: "Consideração de marca",
    primaryKpiTarget: "25%",
    secondaryKpiName: "Busca pela marca, NPS",
    secondaryKpiTarget: "+40%, 70",
    sortOrder: 20,
  },
  {
    id: "temp-3",
    title: "Aumentar o crescimento e a rentabilidade da BU.",
    tags: ["Potencial de crescimento", "Eficiência de aquisição"],
    primaryKpiName: "Faturamento",
    primaryKpiTarget: "R$ 12 mi",
    secondaryKpiName: "Margem de contribuição, ROAS",
    secondaryKpiTarget: "≥ 30%, ≥ 2,7x",
    sortOrder: 30,
  },
];

function parseTags(raw?: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(/(?=🔗)/)
    .map((tag) => tag.replace(/^🔗/, "").trim())
    .filter((tag) => tag.length > 0);
}

export function KpiGoalsTable({
  businessUnitId,
  businessUnitSlug,
  businessUnitName,
  cycleId,
  cycleSlug,
  canEdit,
  initialCycleObjective,
  initialCyclePeriod,
  initialGoals,
  diagnosisInsights = [],
}: {
  businessUnitId: string;
  businessUnitSlug: string;
  businessUnitName: string;
  cycleId: string;
  cycleSlug?: string;
  canEdit: boolean;
  initialCycleObjective?: string | null;
  initialCyclePeriod?: string | null;
  initialGoals: StrategyKpiGoal[];
  diagnosisInsights?: string[];
}) {
  const [cycleObjective, setCycleObjective] = useState(
    initialCycleObjective ?? "",
  );
  const [cyclePeriod, setCyclePeriod] = useState(
    initialCyclePeriod ?? "Jan – Jun/2027",
  );

  const [goals, setGoals] = useState<GoalRow[]>(() => {
    if (initialGoals.length > 0) {
      return initialGoals.map((g, idx) => ({
        id: g.id,
        title: g.title,
        tags: parseTags(g.diagnosisBaseline),
        primaryKpiName: g.primaryKpiName ?? "",
        primaryKpiTarget: g.primaryKpiTarget ?? "",
        secondaryKpiName: g.secondaryKpiName ?? "",
        secondaryKpiTarget: g.secondaryKpiTarget ?? "",
        sortOrder: g.sortOrder ?? (idx + 1) * 10,
      }));
    }
    return DEFAULT_ROWS_TEMPLATE;
  });

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Popover para adicionar tags a uma linha
  const [activePickerRowId, setActivePickerRowId] = useState<string | null>(
    null,
  );
  const [customTagInput, setCustomTagInput] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setActivePickerRowId(null);
        setCustomTagInput("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const objectiveExamples = [
    `Ser a principal referência nacional em educação médica para ${businessUnitName}.`,
    "Ampliar nossa participação e fortalecer a liderança da BU no mercado.",
    "Tornar a BU uma das marcas mais reconhecidas e consideradas em sua categoria.",
    "Consolidar a BU como uma operação de crescimento sustentável e relevante.",
    "Ser a principal referência em desenvolvimento de carreira médica.",
  ];

  function handleObjectiveChange(val: string) {
    if (val.length > 500) return;
    setCycleObjective(val);
    setHasChanges(true);
    setStatusMessage(null);
  }

  function handlePeriodChange(val: string) {
    setCyclePeriod(val);
    setHasChanges(true);
    setStatusMessage(null);
  }

  function handleApplyExample(text: string) {
    if (!canEdit) return;
    setCycleObjective(text);
    setHasChanges(true);
    setStatusMessage(null);
  }

  function updateGoalRow(id: string, updates: Partial<GoalRow>) {
    setGoals((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...updates } : row)),
    );
    setHasChanges(true);
    setStatusMessage(null);
  }

  function removeGoalRow(id: string) {
    setGoals((prev) => prev.filter((row) => row.id !== id));
    setHasChanges(true);
    setStatusMessage(null);
  }

  function addGoalRow() {
    const newIndex = goals.length + 1;
    const newRow: GoalRow = {
      id: `temp-${Date.now()}`,
      title: "",
      tags: [],
      primaryKpiName: "",
      primaryKpiTarget: "",
      secondaryKpiName: "",
      secondaryKpiTarget: "",
      sortOrder: newIndex * 10,
    };
    setGoals((prev) => [...prev, newRow]);
    setHasChanges(true);
    setStatusMessage(null);
  }

  function addTagToRow(rowId: string, tagText: string) {
    const clean = tagText.trim();
    if (!clean) return;
    setGoals((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          if (row.tags.includes(clean)) return row;
          return { ...row, tags: [...row.tags, clean] };
        }
        return row;
      }),
    );
    setHasChanges(true);
    setStatusMessage(null);
  }

  function removeTagFromRow(rowId: string, tagText: string) {
    setGoals((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return { ...row, tags: row.tags.filter((t) => t !== tagText) };
        }
        return row;
      }),
    );
    setHasChanges(true);
    setStatusMessage(null);
  }

  function handleSave() {
    if (!canEdit) return;
    startTransition(async () => {
      setStatusMessage(null);
      const payloadGoals = goals.map((g, idx) => ({
        id: g.id.startsWith("temp-") ? undefined : g.id,
        title: g.title.trim() || `Meta ${idx + 1}`,
        diagnosisBaseline:
          g.tags.length > 0 ? g.tags.map((t) => `🔗 ${t}`).join(" ") : null,
        primaryKpiName: g.primaryKpiName.trim() || null,
        primaryKpiTarget: g.primaryKpiTarget.trim() || null,
        secondaryKpiName: g.secondaryKpiName.trim() || null,
        secondaryKpiTarget: g.secondaryKpiTarget.trim() || null,
        sortOrder: (idx + 1) * 10,
      }));

      const res = await saveCycleObjectiveAndGoalsAction({
        businessUnitId,
        cycleId,
        cycleObjective,
        cyclePeriod,
        goals: payloadGoals,
      });

      if (res.ok) {
        setHasChanges(false);
        setStatusMessage("Metas do ciclo salvas com sucesso!");
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage(res.error || "Erro ao salvar metas.");
      }
    });
  }

  const diagnosticoHref = `/planejamento/${businessUnitSlug}/diagnostico${
    cycleSlug ? `?ciclo=${cycleSlug}` : ""
  }`;

  return (
    <div className="space-y-8">
      {/* ── PARTE 3: Cabeçalho Geral ── */}
      <div>
        <span className="inline-block rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-pink-600 bg-pink-50 border border-pink-200">
          PARTE 3
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-900">
          Objetivo e Metas do Ciclo
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Com base no diagnóstico da BU, defina o objetivo macro do ciclo e desdobre em metas mensuráveis.
        </p>
      </div>

      {/* ── SEÇÃO 1: Objetivo da BU no ciclo ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600 border border-pink-100">
              <Target className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Objetivo da BU no ciclo
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
                Defina a ambição macro da BU para este ciclo. O objetivo representa onde queremos chegar como negócio e não precisa conter números ou KPIs. As metas serão os desdobramentos mensuráveis que nos aproximam desse objetivo.
              </p>
            </div>
          </div>

          {/* Aviso Importante */}
          <div className="flex max-w-sm shrink-0 items-start gap-2.5 rounded-xl border border-pink-200/80 bg-pink-50/50 p-3 shadow-2xs">
            <Info className="size-4 shrink-0 text-pink-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-pink-800">Importante</p>
              <p className="text-xs font-medium text-pink-700 leading-relaxed mt-0.5">
                O objetivo é a direção estratégica da BU. Ele deve ser amplo e inspiracional, sem entrar em detalhes de produtos, campanhas ou KPIs.
              </p>
            </div>
          </div>
        </div>

        {/* Input de Objetivo da BU no ciclo */}
        <div>
          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1 mb-1.5">
            Objetivo da BU no ciclo <span className="text-pink-600">*</span>
          </label>
          <div className="relative">
            <textarea
              value={cycleObjective}
              disabled={!canEdit}
              maxLength={500}
              onChange={(e) => handleObjectiveChange(e.target.value)}
              placeholder="Ex.: Ser a principal referência nacional em educação médica para Ginecologia e Obstetrícia."
              rows={3}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white p-3.5 pb-6 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition resize-none",
                !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
              )}
            />
            <span className="absolute bottom-2.5 right-3 text-xs tabular-nums font-mono text-slate-400">
              {cycleObjective.length}/500
            </span>
          </div>
        </div>

        {/* Chips de Exemplos Clicáveis */}
        <div className="rounded-xl border border-pink-100 bg-pink-50/20 p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 mb-2.5">
            <Lightbulb className="size-3.5" />
            <span>Exemplos de objetivo da BU:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {objectiveExamples.map((example, idx) => (
              <button
                key={idx}
                type="button"
                disabled={!canEdit}
                onClick={() => handleApplyExample(example)}
                className="rounded-xl border border-pink-200/60 bg-white p-2.5 text-left text-[11px] font-medium text-slate-700 hover:border-pink-400 hover:bg-pink-50/50 hover:text-slate-900 transition shadow-2xs group"
              >
                <span className="leading-snug">{example}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2: Metas do ciclo ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-600 border border-pink-100">
              <BarChart2 className="size-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Metas do ciclo
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Desdobre o objetivo em 3 a 5 metas principais, com KPIs claros e mensuráveis. Utilize como embasamento os achados do diagnóstico.
              </p>
            </div>
          </div>

          {/* Aviso KPI Secundário */}
          <div className="flex max-w-sm shrink-0 items-start gap-2.5 rounded-xl border border-pink-200/80 bg-pink-50/50 p-3 shadow-2xs">
            <Info className="size-4 shrink-0 text-pink-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-pink-800">KPI secundário</p>
              <p className="text-xs font-medium text-pink-700 leading-relaxed mt-0.5">
                Você pode adicionar um ou mais KPIs secundários, separados por vírgula.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Metas 2.0 Inline */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-3 py-3 w-10 text-center">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[210px]">
                    Meta <span className="text-pink-600">*</span>
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[260px]">
                    <span className="flex items-center gap-1">
                      Embasamento no Diagnóstico <span className="text-pink-600">*</span>
                      <HelpCircle className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[140px]">
                    KPI Principal <span className="text-pink-600">*</span>
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[110px]">
                    Valor-Alvo <span className="text-pink-600">*</span>
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[180px]">
                    <span className="flex items-center gap-1">
                      KPI Secundário (um ou mais)
                      <HelpCircle className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-3 min-w-[120px]">
                    Valor-Alvo
                  </th>
                  {canEdit && (
                    <th scope="col" className="px-3 py-3 w-10 text-center">
                      <span className="sr-only">Ações</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {goals.map((row, index) => {
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/40 transition-colors align-top"
                    >
                      {/* # */}
                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-pink-50 text-[11px] font-bold text-pink-600 border border-pink-100">
                          {index + 1}
                        </span>
                      </td>

                      {/* Meta * */}
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <textarea
                            value={row.title}
                            disabled={!canEdit}
                            maxLength={200}
                            onChange={(e) =>
                              updateGoalRow(row.id, { title: e.target.value })
                            }
                            placeholder="Ex.: Ampliar a participação de mercado da BU."
                            rows={2}
                            className={cn(
                              "w-full rounded-xl border border-slate-200 bg-white p-2.5 pb-5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition resize-none",
                              !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
                            )}
                          />
                          <span className="absolute bottom-1.5 right-2 text-[9px] tabular-nums font-mono text-slate-400">
                            {row.title.length}/200
                          </span>
                        </div>
                      </td>

                      {/* Embasamento no Diagnóstico * */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {row.tags.map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700 border border-purple-200"
                              >
                                <span>🔗 {tag}</span>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => removeTagFromRow(row.id, tag)}
                                    className="text-purple-400 hover:text-purple-900"
                                  >
                                    <X className="size-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>

                          {canEdit && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePickerRowId(
                                    activePickerRowId === row.id ? null : row.id,
                                  );
                                  setCustomTagInput("");
                                }}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-pink-600 transition"
                              >
                                <Plus className="size-3 text-pink-500" />
                                Adicionar insight do diagnóstico
                              </button>

                              {/* Dropdown / Popover de Insights */}
                              {activePickerRowId === row.id && (
                                <div
                                  ref={pickerRef}
                                  className="absolute left-0 top-full z-20 mt-1 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg space-y-3"
                                >
                                  {diagnosisInsights.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Do diagnóstico da BU
                                      </p>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {diagnosisInsights.map((ins, iIdx) => (
                                          <button
                                            key={iIdx}
                                            type="button"
                                            onClick={() => {
                                              addTagToRow(row.id, ins);
                                              setActivePickerRowId(null);
                                            }}
                                            className="rounded bg-slate-50 px-2 py-0.5 text-[10px] text-slate-700 hover:bg-purple-100 hover:text-purple-800 border border-slate-200 transition"
                                          >
                                            {ins}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      Insights sugeridos
                                    </p>
                                    <div className="mt-1 flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                                      {SUGGESTED_DIAGNOSIS_TAGS.map(
                                        (tag, sIdx) => (
                                          <button
                                            key={sIdx}
                                            type="button"
                                            onClick={() => {
                                              addTagToRow(row.id, tag);
                                              setActivePickerRowId(null);
                                            }}
                                            className="rounded bg-purple-50/60 px-2 py-0.5 text-[10px] text-purple-700 hover:bg-purple-200 border border-purple-200/80 transition"
                                          >
                                            + {tag}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  </div>

                                  <div className="border-t border-slate-100 pt-2">
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        value={customTagInput}
                                        onChange={(e) =>
                                          setCustomTagInput(e.target.value)
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            addTagToRow(row.id, customTagInput);
                                            setCustomTagInput("");
                                            setActivePickerRowId(null);
                                          }
                                        }}
                                        placeholder="Novo insight…"
                                        className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] focus:outline-none focus:border-pink-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          addTagToRow(row.id, customTagInput);
                                          setCustomTagInput("");
                                          setActivePickerRowId(null);
                                        }}
                                        className="rounded bg-pink-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-pink-700"
                                      >
                                        Ok
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* KPI Principal * */}
                      <td className="px-4 py-3.5">
                        <input
                          type="text"
                          value={row.primaryKpiName}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateGoalRow(row.id, {
                              primaryKpiName: e.target.value,
                            })
                          }
                          placeholder="Ex.: Market share"
                          className={cn(
                            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition",
                            !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
                          )}
                        />
                      </td>

                      {/* Valor-Alvo * */}
                      <td className="px-4 py-3.5">
                        <input
                          type="text"
                          value={row.primaryKpiTarget}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateGoalRow(row.id, {
                              primaryKpiTarget: e.target.value,
                            })
                          }
                          placeholder="Ex.: 8,2%"
                          className={cn(
                            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition",
                            !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
                          )}
                        />
                      </td>

                      {/* KPI Secundário (um ou mais) */}
                      <td className="px-4 py-3.5">
                        <input
                          type="text"
                          value={row.secondaryKpiName}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateGoalRow(row.id, {
                              secondaryKpiName: e.target.value,
                            })
                          }
                          placeholder="Ex.: Nº de alunos, Conversão"
                          className={cn(
                            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition",
                            !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
                          )}
                        />
                      </td>

                      {/* Valor-Alvo (Secundário) */}
                      <td className="px-4 py-3.5">
                        <input
                          type="text"
                          value={row.secondaryKpiTarget}
                          disabled={!canEdit}
                          onChange={(e) =>
                            updateGoalRow(row.id, {
                              secondaryKpiTarget: e.target.value,
                            })
                          }
                          placeholder="Ex.: 200, ≥ 2,4%"
                          className={cn(
                            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 transition",
                            !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
                          )}
                        />
                      </td>

                      {/* Ações */}
                      {canEdit && (
                        <td className="px-3 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeGoalRow(row.id)}
                            className="rounded p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Remover meta"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botão tracejado: + Adicionar nova meta */}
        {canEdit && (
          <button
            type="button"
            onClick={addGoalRow}
            className="w-full rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/20 py-3 text-xs font-semibold text-pink-600 hover:bg-pink-50/60 hover:border-pink-400 transition flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <Plus className="size-4" />
            Adicionar nova meta
          </button>
        )}
      </div>

      {/* ── Barra de Ações e Salvar Metas ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
        <Link
          href={diagnosticoHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
        >
          <ArrowLeft className="size-3.5 text-slate-500" />
          Voltar para Diagnóstico da BU
        </Link>

        <div className="flex items-center gap-3">
          {hasChanges && !statusMessage && (
            <span className="text-xs text-amber-700 font-medium">
              ● Alterações não salvas
            </span>
          )}

          {!hasChanges && !statusMessage && canEdit && (
            <span className="text-xs text-slate-400">
              Todas as metas salvas no ciclo.
            </span>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending || (!hasChanges && !statusMessage)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-2xs transition",
                hasChanges
                  ? "bg-pink-600 text-white hover:bg-pink-700"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                isPending && "opacity-60 cursor-not-allowed",
              )}
            >
              {isPending ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando metas…
                </>
              ) : statusMessage ? (
                <>
                  <Check className="size-3.5 text-emerald-600" />
                  {statusMessage}
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  Salvar Objetivo e Metas
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
