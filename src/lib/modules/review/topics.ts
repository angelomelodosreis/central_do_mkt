import type { ReviewTopic } from "@/lib/db/schema";

/**
 * O roteiro: o que perguntar em cada tema.
 *
 * As perguntas são o produto. Quem abre esta tela é o Coordenador Médico, que
 * não é de marketing — e o valor não está em ele preencher campos, está em ele
 * saber o que perguntar ao Analista. Um checklist de campos produz uma ata que
 * ninguém lê; um roteiro de perguntas produz uma reunião melhor.
 *
 * Escritas em segunda pessoa e sem jargão de propósito: "quanto investimos e o
 * que voltou" em vez de "eficiência de mídia". Onde o termo técnico é
 * inevitável (CRM, tracking), a pergunta explica o que ele é.
 */
export type TopicConfig = {
  label: string;
  /** Uma linha dizendo do que se trata, para quem não é da área. */
  about: string;
  /** As perguntas a fazer ao Analista, na ordem. */
  questions: string[];
};

export const TOPIC_CONFIG: Record<ReviewTopic, TopicConfig> = {
  media: {
    label: "Mídia",
    about: "O dinheiro investido em anúncios e o que ele trouxe.",
    questions: [
      "Quanto investimos no período?",
      "Quantos leads isso trouxe, e a que custo?",
      "Ficou dentro do que a gente esperava?",
      "O que explica o desempenho?",
    ],
  },
  campaigns: {
    label: "Campanhas e criativos",
    about: "As peças que foram ao ar — vídeos, imagens, textos de anúncio.",
    questions: [
      "O que performou melhor, e o que performou pior?",
      "Por quê?",
      "O que vamos manter, testar ou mudar?",
    ],
  },
  funnel: {
    label: "Funil",
    about: "O caminho do interessado até virar aluno.",
    questions: [
      "Em que etapa estamos perdendo mais gente?",
      "Isso mudou em relação ao período anterior?",
      "Já sabemos o motivo?",
    ],
  },
  sales: {
    label: "Captação, vendas e faturamento",
    about: "Quantos entraram, quantos compraram e quanto entrou de dinheiro.",
    questions: [
      "Estamos no ritmo necessário para bater a meta?",
      "O que mudou desde a última reunião?",
      "Se estamos abaixo, o que precisa acontecer para recuperar?",
    ],
  },
  crm: {
    label: "CRM e relacionamento",
    about: "Os e-mails, mensagens e contatos com quem já está na nossa base.",
    questions: [
      "O que foi disparado no período?",
      "A base está respondendo — abrindo, clicando, comprando?",
      "Tem alguém parado na base que a gente deveria estar chamando?",
    ],
  },
  tracking: {
    label: "Tracking",
    about: "Se a medição está funcionando — sem ela, todo o resto é chute.",
    questions: [
      "Os números estão batendo entre as ferramentas?",
      "Perdemos alguma medição no período?",
    ],
  },
  tests: {
    label: "Testes",
    about: "O que a BU está experimentando de propósito para aprender.",
    questions: [
      "O que estamos testando agora?",
      "Algum teste já tem conclusão?",
      "O que fazemos com o que aprendemos?",
    ],
  },
  benchmark: {
    label: "Concorrência",
    about: "O que os outros estão fazendo.",
    questions: [
      "Alguém do mercado fez algo relevante no período?",
      "Isso muda alguma coisa para a gente?",
    ],
  },
  audience: {
    label: "Conversa com o público",
    about: "O que os alunos e interessados estão dizendo.",
    questions: [
      "Falamos com alunos ou interessados no período?",
      "O que apareceu de recorrente na fala deles?",
    ],
  },
  projections: {
    label: "Projeção",
    about: "Para onde o período caminha se nada mudar.",
    questions: [
      "Se seguirmos nesse ritmo, onde fechamos o mês?",
      "O que precisaria mudar para chegar na meta?",
    ],
  },
};

/**
 * A ordem em que os temas aparecem.
 *
 * É a ordem da conversa: primeiro o dinheiro que saiu, depois o que foi feito
 * com ele, depois o que aconteceu no funil e nas vendas. Investigação (testes,
 * concorrência, público) e o olhar para a frente ficam no fim, porque são os
 * temas que uma reunião apertada pula sem prejuízo.
 */
export const TOPIC_ORDER: ReviewTopic[] = [
  "media",
  "campaigns",
  "funnel",
  "sales",
  "crm",
  "tracking",
  "tests",
  "benchmark",
  "audience",
  "projections",
];
