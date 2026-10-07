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
  GraduationCap,
  Star,
  Leaf,
  Users,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import { saveCycleObjectiveAndGoalsAction } from "../../actions";
import type { StrategyKpiGoal } from "@/lib/db/schema";
import { cn } from "@/lib/utils/cn";
import {
  Target3DIllustration,
  GrowthChart3DIllustration,
} from "@/components/ui/cycle-3d-illustrations";
import { CycleStepper } from "@/components/ui/cycle-stepper";

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
  "CAC acima do ideal",
  "Baixa penetração no mercado",
];

const COMMON_KPIS = [
  "Faturamento Bruto",
  "Novas matrículas",
  "Market share",
  "CAC",
  "Consideração de marca",
  "Volume de Vendas",
  "LTV",
  "ROAS",
  "NPS",
  "Margem de Contribuição",
];

const DEFAULT_ROWS_TEMPLATE: GoalRow[] = [
  {
    id: "temp-1",
    title: "Captura de Demanda e Penetração de Mercado no Ciclo",
    tags: ["Demanda não capturada", "Mercado em crescimento"],
    primaryKpiName: "Faturamento Bruto",
    primaryKpiTarget: "R$ 1.500.000",
    secondaryKpiName: "Volume de Vendas, Ticket Médio",
    secondaryKpiTarget: "",
    sortOrder: 10,
  },
  {
    id: "temp-2",
    title: "Crescimento da Base de Alunos",
    tags: ["Baixa penetração no mercado", "Oportunidade de expansão"],
    primaryKpiName: "Novas matrículas",
    primaryKpiTarget: "1.570",
    secondaryKpiName: "Conversão, CAC",
    secondaryKpiTarget: "",
    sortOrder: 20,
  },
  {
    id: "temp-3",
    title: "Rentabilidade e Eficiência",
    tags: ["CAC acima do ideal", "Oportunidade de otimização"],
    primaryKpiName: "CAC",
    primaryKpiTarget: "≤ R$ 1.331",
    secondaryKpiName: "LTV, Margem Bruta",
    secondaryKpiTarget: "",
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
  onSelectTab,
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
  onSelectTab?: (tab: "diagnostico" | "metas" | "revisoes") => void;
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
    {
      icon: GraduationCap,
      text: `Ser a principal referência nacional em educação médica para ${businessUnitName}.`,
    },
    {
      icon: BarChart2,
      text: "Ampliar nossa participação e fortalecer a liderança da BU no mercado.",
    },
    {
      icon: Star,
      text: "Tornar a BU uma das marcas mais reconhecidas e consideradas em sua categoria.",
    },
    {
      icon: Leaf,
      text: "Consolidar a BU como uma operação de crescimento sustentável e relevante.",
    },
    {
      icon: Users,
      text: "Ser a principal referência em desenvolvimento de carreira médica.",
    },
  ];

  function handleObjectiveChange(val: string) {
    if (val.length > 500) return;
    setCycleObjective(val);
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
      {/* ── PARTE 3: Top Header com Stepper Oficial ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 border border-rose-200">
              PARTE 3
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Objetivo e Metas do Ciclo
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Com base no diagnóstico da BU, defina o objetivo macro do ciclo e desdobre em metas mensuráveis.
          </p>
        </div>

        {/* Stepper Oficial */}
        <div className="shrink-0">
          <CycleStepper activeStep="metas" onSelectStep={onSelectTab} />
        </div>
      </div>

      {/* ── SEÇÃO 1: OBJETIVO DO CICLO (Card 3D Pastel) ── */}
      <div className="rounded-3xl border border-rose-100/90 bg-gradient-to-r from-rose-50/50 via-pink-50/20 to-white p-6 sm:p-7 shadow-2xs space-y-6">
        {/* Topo do Banner com Ilustração 3D */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 border border-rose-200/60 shadow-2xs">
              <Target className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-500">
                OBJETIVO DO CICLO
              </span>
              <h2 className="mt-0.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Para onde queremos chegar neste ciclo?
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Defina a ambição macro da BU. O objetivo representa onde queremos chegar como negócio e não precisa conter números ou KPIs. As metas serão os desdobramentos mensuráveis que nos aproximam desse objetivo.
              </p>
            </div>
          </div>

          {/* Ilustração 3D Alvo com Flecha */}
          <div className="hidden sm:flex shrink-0 items-center justify-center">
            <Target3DIllustration className="w-48 h-36" />
          </div>

          {/* Callout Importante */}
          <div className="flex max-w-xs shrink-0 items-start gap-3 rounded-2xl border border-rose-200/70 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <Info className="size-4.5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-rose-900">Importante</p>
              <p className="mt-0.5 text-xs font-medium text-rose-800/90 leading-relaxed">
                O objetivo é a direção estratégica da BU. Ele deve ser amplo e inspiracional, sem entrar em detalhes de produtos, campanhas ou KPIs.
              </p>
            </div>
          </div>
        </div>

        {/* Input de Objetivo da BU no ciclo */}
        <div>
          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1 mb-1.5">
            Objetivo da BU no ciclo <span className="text-rose-600">*</span>
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
                "w-full rounded-2xl border border-slate-200 bg-white p-4 pb-7 text-sm text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100 transition resize-none shadow-2xs",
                !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
              )}
            />
            <span className="absolute bottom-2.5 right-3.5 text-xs tabular-nums font-mono text-slate-400">
              {cycleObjective.length}/500
            </span>
          </div>
        </div>

        {/* Chips de Exemplos Clicáveis com Ícones Dedicados */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/30 p-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 mb-3">
            <Lightbulb className="size-4" />
            <span>Exemplos de objetivo da BU:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {objectiveExamples.map((example, idx) => {
              const Icon = example.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canEdit}
                  onClick={() => handleApplyExample(example.text)}
                  className="rounded-2xl border border-rose-100 bg-white p-3.5 text-left text-xs font-medium text-slate-700 hover:border-rose-300 hover:bg-rose-50/50 hover:text-slate-900 transition shadow-2xs flex flex-col justify-between gap-2.5 cursor-pointer group"
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition">
                    <Icon className="size-4" />
                  </div>
                  <span className="leading-snug text-[11px] text-slate-700 group-hover:text-slate-900">
                    {example.text}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── SEÇÃO 2: METAS DO CICLO (Card 3D Pastel) ── */}
      <div className="rounded-3xl border border-violet-100/90 bg-gradient-to-r from-violet-50/50 via-purple-50/20 to-white p-6 sm:p-7 shadow-2xs space-y-6">
        {/* Topo do Banner com Ilustração 3D */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 border border-violet-200/60 shadow-2xs">
              <BarChart2 className="size-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-500">
                METAS DO CICLO
              </span>
              <h2 className="mt-0.5 font-display text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Como vamos <span className="text-violet-600">chegar lá?</span>
              </h2>
              <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xl">
                Desdobre o objetivo em 3 a 5 metas principais, com KPIs claros e mensuráveis. Utilize como embasamento os achados do diagnóstico.
              </p>
            </div>
          </div>

          {/* Ilustração 3D Barras de Crescimento */}
          <div className="hidden sm:flex shrink-0 items-center justify-center">
            <GrowthChart3DIllustration className="w-48 h-36" />
          </div>

          {/* Callout KPI secundário */}
          <div className="flex max-w-xs shrink-0 items-start gap-3 rounded-2xl border border-violet-200/70 bg-white/90 backdrop-blur-xs p-4 shadow-2xs">
            <Info className="size-4.5 shrink-0 text-violet-600 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-violet-900">KPI secundário</p>
              <p className="mt-0.5 text-xs font-medium text-violet-800/90 leading-relaxed">
                Você pode adicionar um ou mais KPIs secundários, separados por vírgula.
              </p>
            </div>
          </div>
        </div>

        {/* Tabela de Metas 2.0 Fiel à Referência */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th scope="col" className="px-3 py-3.5 w-12 text-center">
                    #
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[220px]">
                    Meta <span className="text-rose-600">*</span>
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[270px]">
                    <span className="flex items-center gap-1">
                      Embasamento no Diagnóstico <span className="text-rose-600">*</span>
                      <HelpCircle className="size-3 text-slate-400" />
                    </span>
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[150px]">
                    KPI Principal <span className="text-rose-600">*</span>
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[120px]">
                    Valor-Alvo <span className="text-rose-600">*</span>
                  </th>
                  <th scope="col" className="px-4 py-3.5 min-w-[190px]">
                    <span className="flex items-center gap-1">
                      KPI Secundário (um ou mais)
                      <HelpCircle className="size-3 text-slate-400" />
                    </span>
                  </th>
                  {canEdit && (
                    <th scope="col" className="px-3 py-3.5 w-12 text-center">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {goals.map((row, index) => {
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/50 transition-colors align-top"
                    >
                      {/* # Badge Rosa Circular */}
                      <td className="px-3 py-4 text-center">
                        <span className="inline-flex size-7 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-700 border border-rose-200 shadow-2xs">
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
                            placeholder="Ex.: Captura de Demanda e Penetração de Mercado no Ciclo"
                            rows={2}
                            className={cn(
                              "w-full rounded-xl border border-slate-200 bg-white p-2.5 pb-5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 transition resize-none shadow-2xs",
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
                                className="inline-flex items-center gap-1 rounded-lg bg-purple-50/80 px-2.5 py-1 text-[11px] font-semibold text-purple-700 border border-purple-200 shadow-2xs"
                              >
                                <span>🔗 {tag}</span>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => removeTagFromRow(row.id, tag)}
                                    className="text-purple-400 hover:text-purple-900 cursor-pointer"
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
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-violet-700 transition cursor-pointer"
                              >
                                <Plus className="size-3 text-violet-600" />
                                Adicionar insight do diagnóstico
                              </button>

                              {/* Dropdown / Popover de Insights */}
                              {activePickerRowId === row.id && (
                                <div
                                  ref={pickerRef}
                                  className="absolute left-0 top-full z-20 mt-1 w-80 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl space-y-3"
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
                                            className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-purple-100 hover:text-purple-800 border border-slate-200 transition cursor-pointer"
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
                                            className="rounded-lg bg-purple-50/70 px-2 py-0.5 text-[10px] font-medium text-purple-700 hover:bg-purple-200 border border-purple-200/80 transition cursor-pointer"
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
                                        className="w-full rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] focus:outline-none focus:border-violet-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          addTagToRow(row.id, customTagInput);
                                          setCustomTagInput("");
                                          setActivePickerRowId(null);
                                        }}
                                        className="rounded-lg bg-violet-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-violet-700 cursor-pointer"
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

                      {/* KPI Principal * com Datalist/Sugestões */}
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <input
                            type="text"
                            list={`kpi-options-${row.id}`}
                            value={row.primaryKpiName}
                            disabled={!canEdit}
                            onChange={(e) =>
                              updateGoalRow(row.id, {
                                primaryKpiName: e.target.value,
                              })
                            }
                            placeholder="Ex.: Faturamento Bruto"
                            className={cn(
                              "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 transition shadow-2xs",
                              !canEdit && "bg-slate-50 text-slate-600 cursor-not-allowed",
                            )}
                          />
                          <datalist id={`kpi-options-${row.id}`}>
                            {COMMON_KPIS.map((kpi, kIdx) => (
                              <option key={kIdx} value={kpi} />
                            ))}
                          </datalist>
                        </div>
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
                          placeholder="Ex.: R$ 1.500.000"
                          className={cn(
                            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 transition shadow-2xs font-medium",
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
                          placeholder="Ex.: Volume de Vendas, Ticket Médio"
                          className={cn(
                            "w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100 transition shadow-2xs",
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
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Remover meta"
                          >
                            <Trash2 className="size-4" />
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

        {/* Botão em Pílula Roxo: + Adicionar meta (Exatamente como o mockup) */}
        {canEdit && (
          <div className="pt-2">
            <button
              type="button"
              onClick={addGoalRow}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-white px-5 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-50 hover:border-purple-400 transition shadow-2xs cursor-pointer"
            >
              <Plus className="size-4" />
              Adicionar meta
            </button>
          </div>
        )}
      </div>

      {/* ── Barra de Ações e Salvar Metas ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        <Link
          href={diagnosticoHref}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
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
                "inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-semibold shadow-2xs transition cursor-pointer",
                hasChanges
                  ? "bg-rose-600 text-white hover:bg-rose-700"
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
