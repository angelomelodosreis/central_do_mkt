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
        hint: "Onde essa data foi confirmada. Marco sem fonte vira boato.",
      },
      {
        key: "impact",
        label: "Impacto no plano",
        type: "long",
        placeholder: "O que essa data obriga o time a fazer antes ou depois.",
      },
    ],
  },
  seasonality: {
    label: "Sazonalidade",
    plural: "Sazonalidades",
    description:
      "Períodos que mexem com a demanda: Black Friday, Natal, férias.",
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
  launch: {
    label: "Lançamento",
    plural: "Lançamentos",
    description: "Abertura de vendas de um produto, com suas fases.",
    chip: "bg-brand-100 text-brand-800 ring-brand-200",
    dot: "bg-brand-600",
    lane: "bg-brand-600",
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
  event: {
    label: "Evento",
    plural: "Eventos",
    description: "Acontecimentos presenciais ou ao vivo: congressos, jantares.",
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
  product_window: {
    label: "Janela de produto",
    plural: "Esteira de produtos",
    description:
      "Quando um produto está em campo: turma rodando, período de venda.",
    chip: "bg-emerald-100 text-emerald-900 ring-emerald-200",
    dot: "bg-emerald-500",
    lane: "bg-emerald-500",
    linksToProduct: true,
    fields: [
      {
        key: "window",
        label: "Tipo de janela",
        type: "text",
        placeholder: "Ex.: turma em andamento, período de venda, reoferta",
      },
      {
        key: "capacity",
        label: "Vagas",
        type: "text",
        placeholder: "Ex.: 300",
        hint: "Quando o produto tem limite de ocupação.",
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
};

/** Ordem em que as camadas aparecem nos controles e nas faixas do ano. */
export const TIMELINE_KIND_ORDER: TimelineKind[] = [
  "milestone",
  "seasonality",
  "launch",
  "event",
  "product_window",
  "communication",
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
  return TIMELINE_KIND_CONFIG[kind] ?? TIMELINE_KIND_CONFIG.milestone;
}
