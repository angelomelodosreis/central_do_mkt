import type { TimelineKind, TimelineStatus } from "@/lib/db/schema";

/**
 * Um campo próprio de uma categoria.
 *
 * Os campos vivem aqui, em código, e não numa tela de configuração: o objetivo
 * do módulo é comparar BUs entre si, e isso só funciona se todo "congresso"
 * responder às mesmas perguntas. Acrescentar um campo é uma linha nesta lista.
 */
export type KindField = {
  key: string;
  label: string;
  /** `text` vira uma linha; `long` vira um campo de várias linhas. */
  type: "text" | "long";
  placeholder?: string;
  hint?: string;
};

export type KindConfig = {
  label: string;
  /** Plural, para títulos de agrupamento. */
  plural: string;
  description: string;
  /**
   * Cor da camada. São classes fixas (e não montadas em tempo de execução)
   * porque o Tailwind só inclui no CSS as classes que consegue ver no código.
   */
  chip: string;
  dot: string;
  /** Faixa da visão anual. */
  lane: string;
  fields: KindField[];
  /** Categorias que fazem sentido ligar a um produto. */
  linksToProduct: boolean;
};

export const TIMELINE_KIND_CONFIG: Record<TimelineKind, KindConfig> = {
  event: {
    label: "Evento",
    plural: "Eventos",
    description: "Acontecimentos presenciais ou ao vivo: congressos, simpósios, encontros.",
    chip: "bg-sky-100 text-sky-900 ring-sky-200",
    dot: "bg-sky-500",
    lane: "bg-sky-500",
    linksToProduct: true,
    fields: [
      {
        key: "location",
        label: "Onde",
        type: "text",
        placeholder: "Ex.: São Paulo, Hotel Tivoli",
      },
      {
        key: "audience",
        label: "Público",
        type: "text",
        placeholder: "Ex.: 200 alunos do Extensivo",
      },
      {
        key: "role",
        label: "Nosso papel",
        type: "text",
        placeholder: "Ex.: patrocínio, estande, palestra",
      },
    ],
  },
  theoretical_exam: {
    label: "Prova teórica",
    plural: "Provas teóricas",
    description:
      "Datas e períodos de provas teóricas de residência médica e concursos.",
    chip: "bg-amber-100 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    lane: "bg-amber-500",
    linksToProduct: false,
    fields: [
      {
        key: "institution",
        label: "Instituição / Concurso",
        type: "text",
        placeholder: "Ex.: USP, UNIFESP, ENARE, SUS-SP",
      },
      {
        key: "phase",
        label: "Fase / Detalhes",
        type: "text",
        placeholder: "Ex.: 1ª fase teórica, publicação do gabarito",
      },
    ],
  },
  practical_exam: {
    label: "Prova prática",
    plural: "Provas práticas",
    description:
      "Datas de provas práticas, habilidades e multimídia de residência.",
    chip: "bg-indigo-100 text-indigo-900 ring-indigo-200",
    dot: "bg-indigo-500",
    lane: "bg-indigo-500",
    linksToProduct: false,
    fields: [
      {
        key: "institution",
        label: "Instituição / Concurso",
        type: "text",
        placeholder: "Ex.: USP, UNIFESP, IAMSPE",
      },
      {
        key: "phase",
        label: "Fase / Formato",
        type: "text",
        placeholder: "Ex.: 2ª fase prática de estações clínicas",
      },
    ],
  },
  dinner: {
    label: "Jantar",
    plural: "Jantares",
    description: "Jantares de confraternização, premiação e recepção de alunos.",
    chip: "bg-rose-100 text-rose-900 ring-rose-200",
    dot: "bg-rose-500",
    lane: "bg-rose-500",
    linksToProduct: true,
    fields: [
      {
        key: "location",
        label: "Local",
        type: "text",
        placeholder: "Ex.: Restaurante Fogo de Chão, SP",
      },
      {
        key: "audience",
        label: "Capacidade / Público",
        type: "text",
        placeholder: "Ex.: 80 convidados (aprovados R1)",
      },
    ],
  },
  launch: {
    label: "Lançamento",
    plural: "Lançamentos",
    description: "Abertura de vendas de um produto, com suas fases.",
    chip: "bg-red-100 text-red-900 ring-red-200",
    dot: "bg-red-600",
    lane: "bg-red-600",
    linksToProduct: true,
    fields: [
      {
        key: "phase",
        label: "Fase",
        type: "text",
        placeholder: "Ex.: pré-lançamento, carrinho aberto, última chamada",
      },
      {
        key: "offer",
        label: "Oferta",
        type: "text",
        placeholder: "Ex.: 12x sem juros, lote promocional",
      },
      {
        key: "goal",
        label: "Meta do lançamento",
        type: "text",
        placeholder: "Ex.: 400 matrículas",
      },
    ],
  },
  communication: {
    label: "Comunicação",
    plural: "Frentes de comunicação",
    description: "Podcast, live de conteúdo, séries de e-mail e afins.",
    chip: "bg-slate-100 text-slate-800 ring-slate-300",
    dot: "bg-slate-500",
    lane: "bg-slate-500",
    linksToProduct: true,
    fields: [
      {
        key: "channel",
        label: "Canal",
        type: "text",
        placeholder: "Ex.: Podcast, Instagram, YouTube",
      },
      {
        key: "cadence",
        label: "Frequência",
        type: "text",
        placeholder: "Ex.: semanal, quinzenal",
      },
      {
        key: "theme",
        label: "Tema",
        type: "long",
        placeholder: "Sobre o que essa frente fala nesse período.",
      },
    ],
  },
  seasonality: {
    label: "Sazonalidade de mercado",
    plural: "Sazonalidades de mercado",
    description:
      "Períodos externos do mercado e calendário médico: datas comemorativas, férias.",
    chip: "bg-violet-100 text-violet-900 ring-violet-200",
    dot: "bg-violet-500",
    lane: "bg-violet-500",
    linksToProduct: false,
    fields: [
      {
        key: "expectedEffect",
        label: "Efeito esperado",
        type: "text",
        placeholder: "Ex.: pico de tráfego, queda de conversão",
      },
      {
        key: "playbook",
        label: "Como agimos",
        type: "long",
        placeholder: "O que o time faz nesse período.",
      },
    ],
  },
  other: {
    label: "Outros",
    plural: "Outros",
    description: "Demais compromissos, reuniões, lembretes e momentos estratégicos.",
    chip: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    dot: "bg-emerald-500",
    lane: "bg-emerald-500",
    linksToProduct: false,
    fields: [
      {
        key: "notes",
        label: "Observações",
        type: "long",
        placeholder: "Detalhes adicionais sobre este item.",
      },
    ],
  },
  // Aliases e suporte legado
  milestone: {
    label: "Marco",
    plural: "Marcos",
    description:
      "Datas do mundo lá fora que o time não controla: edital, prova, resultado.",
    chip: "bg-amber-100 text-amber-900 ring-amber-200",
    dot: "bg-amber-500",
    lane: "bg-amber-500",
    linksToProduct: false,
    fields: [
      {
        key: "source",
        label: "Fonte",
        type: "text",
        placeholder: "Ex.: edital publicado no site da instituição",
      },
    ],
  },
  product_window: {
    label: "Janela de Produto (MedCof)",
    plural: "Janelas de Produtos (MedCof)",
    description: "Período comercial ou acadêmico de um curso MedCof.",
    chip: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    dot: "bg-emerald-500",
    lane: "bg-emerald-500",
    linksToProduct: true,
    fields: [],
  },
  prova_teorica: null as any,
  prova_pratica: null as any,
  jantar: null as any,
  outros: null as any,
};

// Vinculação de aliases para compartilharem a mesma configuração exata
TIMELINE_KIND_CONFIG.prova_teorica = TIMELINE_KIND_CONFIG.theoretical_exam;
TIMELINE_KIND_CONFIG.prova_pratica = TIMELINE_KIND_CONFIG.practical_exam;
TIMELINE_KIND_CONFIG.jantar = TIMELINE_KIND_CONFIG.dinner;
TIMELINE_KIND_CONFIG.outros = TIMELINE_KIND_CONFIG.other;

/** Ordem em que as tags aparecem nos controles, filtros e nas faixas do ano. */
export const TIMELINE_KIND_ORDER: TimelineKind[] = [
  "event",
  "theoretical_exam",
  "practical_exam",
  "dinner",
  "launch",
  "communication",
  "seasonality",
  "other",
];

export const TIMELINE_STATUS_LABELS: Record<TimelineStatus, string> = {
  planned: "Planejado",
  confirmed: "Confirmado",
  in_progress: "Em andamento",
  done: "Concluído",
  at_risk: "Em risco",
  cancelled: "Cancelado",
};

/**
 * Só os estados que merecem sinal visual no card. Planejado e confirmado são o
 * caminho normal e não precisam de enfeite — poluir o calendário com um ponto
 * em cada card é o mesmo que não ter sinal nenhum.
 */
export const TIMELINE_STATUS_SIGNAL: Partial<
  Record<TimelineStatus, { dot: string; label: string }>
> = {
  in_progress: { dot: "bg-sky-500", label: "Em andamento" },
  at_risk: { dot: "bg-amber-500", label: "Em risco" },
  done: { dot: "bg-emerald-500", label: "Concluído" },
  cancelled: { dot: "bg-slate-300", label: "Cancelado" },
};

export function kindConfig(kind: TimelineKind): KindConfig {
  return TIMELINE_KIND_CONFIG[kind] ?? TIMELINE_KIND_CONFIG.event;
}
