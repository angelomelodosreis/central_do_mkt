/**
 * Cria a BU de DEMONSTRAÇÃO, com dados fictícios.
 *
 * Serve para experimentar a plataforma — Panorama, Planejamento, Metas,
 * Calendário, Resultados — com uma BU cheia, sem tocar em número real de
 * ninguém. Roda no banco local e também no de produção.
 *
 * É IDEMPOTENTE por reconstrução: tudo que pertence à BU é apagado e escrito de
 * novo a cada execução. Os identificadores são fixos (`bu_demo`, `demo_*`), o
 * que garante que rodar duas vezes não deixe duas cópias — e que nada fora da
 * demonstração seja tocado.
 *
 * Uso:
 *   node scripts/db-seed-demo.mjs
 *   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." node scripts/db-seed-demo.mjs
 *
 * Para remover a BU inteira depois:
 *   node scripts/db-seed-demo.mjs --remover
 */
import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");
const apenasRemover = process.argv.includes("--remover");

if (!isLocalFile && !authToken) {
  console.error("TURSO_AUTH_TOKEN é obrigatório para bancos remotos.");
  process.exit(1);
}

const client = createClient(isLocalFile ? { url } : { url, authToken });

// ── Identidade da BU ───────────────────────────────────────────────────────

const BU = "bu_demo";
const CICLO = "demo_ciclo_2026";
const SQUAD = "demo_squad";

/**
 * A data de referência.
 *
 * Fixa numa variável, e não espalhada em `new Date()`, porque o valor do seed
 * está em o "o que vem por aí" do Panorama ter conteúdo: as iniciativas são
 * posicionadas em relação a HOJE, e não em datas absolutas que envelhecem.
 */
const HOJE = new Date();
HOJE.setHours(0, 0, 0, 0);

/** Timestamp em segundos, que é como este banco guarda data. */
const ts = (data) => Math.floor(data.getTime() / 1000);
const agora = ts(new Date());

/** Uma data a N dias de hoje. */
function emDias(dias) {
  const data = new Date(HOJE);
  data.setDate(data.getDate() + dias);
  return data;
}

/** A segunda-feira da semana de uma data. */
function segundaDe(data) {
  const copia = new Date(data);
  copia.setHours(0, 0, 0, 0);
  // getDay(): 0 = domingo. A semana começa na segunda.
  const recuo = (copia.getDay() + 6) % 7;
  copia.setDate(copia.getDate() - recuo);
  return copia;
}

// ── Limpeza ────────────────────────────────────────────────────────────────

/**
 * Apaga tudo que é da demonstração.
 *
 * A ordem não é livre: `strategy_cycle` referencia a BU com ON DELETE RESTRICT
 * — de propósito, para ninguém apagar uma BU e levar junto o planejamento de um
 * ano —, então o ciclo sai antes dela. O resto cai em cascata.
 */
const LIMPEZA = [
  `DELETE FROM bu_review WHERE business_unit_id = '${BU}'`,
  `DELETE FROM strategy_product WHERE business_unit_id = '${BU}'`,
  `DELETE FROM persona WHERE business_unit_id = '${BU}'`,
  `DELETE FROM weekly_result WHERE business_unit_id = '${BU}'`,
  `DELETE FROM strategy_cycle WHERE business_unit_id = '${BU}'`,
  `DELETE FROM squad WHERE business_unit_id = '${BU}'`,
  `DELETE FROM business_unit WHERE id = '${BU}'`,
];

// ── Os números ─────────────────────────────────────────────────────────────

/**
 * Vinte e seis semanas de fechamento, terminando na última semana completa.
 *
 * Os números não são aleatórios em torno de uma média: eles têm ESTAÇÃO. Duas
 * campanhas levantam a curva (uma há cerca de quatro meses, outra há cerca de
 * um mês) e o resto do tempo corre num patamar mais baixo. Uma série lisa
 * demais faria todo gráfico da plataforma parecer quebrado, e todo comparativo
 * "vs. período anterior" dar zero.
 */
function semanas() {
  const linhas = [];
  const ultimaSegunda = segundaDe(emDias(-7));

  for (let atras = 25; atras >= 0; atras -= 1) {
    const inicio = new Date(ultimaSegunda);
    inicio.setDate(inicio.getDate() - atras * 7);

    // Duas ondas de campanha, nas semanas 17-19 e 4-6 contadas de trás.
    const emCampanha =
      (atras >= 17 && atras <= 19) || (atras >= 4 && atras <= 6);
    // Uma oscilação suave, para a série não ter degraus.
    const onda = Math.sin(atras / 2.4) * 0.12;
    const fator = (emCampanha ? 1.85 : 0.94) + onda;

    const leads = Math.round(1120 * fator);
    const mediaSpend = Math.round(34_500 * fator * 100) / 100;
    const sales = Math.round(27 * fator);
    // O ticket varia pouco: é preço de tabela com desconto ocasional.
    const ticket = emCampanha ? 3_290 : 3_780;
    const revenue = Math.round(sales * ticket * 100) / 100;

    linhas.push({
      id: `demo_sem_${25 - atras}`,
      weekStart: ts(inicio),
      leads,
      mediaSpend,
      sales,
      revenue,
      note: emCampanha ? "Semana de campanha aberta." : null,
    });
  }

  return linhas;
}

/**
 * As metas do ciclo.
 *
 * Calculadas a partir da série, e não escolhidas à toa: uma meta desligada do
 * realizado faria toda tela de comparação mostrar 300% ou 4%, e ninguém
 * conseguiria julgar se a leitura está certa. Aqui a BU fecha o ano um pouco
 * acima da meta de faturamento e um pouco abaixo da de leads — que é o tipo de
 * situação que a ferramenta existe para mostrar.
 */
function metas(linhas) {
  const somar = (campo) => linhas.reduce((total, l) => total + l[campo], 0);
  // 26 semanas são metade do ano; a meta anual dobra o realizado, corrigido.
  const revenue = Math.round((somar("revenue") * 2 * 0.96) / 1000) * 1000;
  const sales = Math.round((somar("sales") * 2 * 0.96) / 10) * 10;
  const leads = Math.round((somar("leads") * 2 * 1.08) / 100) * 100;
  const mediaSpend = Math.round((somar("mediaSpend") * 2) / 1000) * 1000;

  return [
    ["revenue", revenue, "Dobro do realizado no primeiro semestre, com folga."],
    ["sales", sales, null],
    [
      "leads",
      leads,
      "Depende de a verba de mídia ser mantida no segundo semestre.",
    ],
    ["media_spend", mediaSpend, null],
    ["average_ticket", Math.round(revenue / sales), null],
    [
      "sales_conversion",
      2.4,
      "Conversão lead → venda observada no ano passado.",
    ],
    ["cac", Math.round(mediaSpend / sales), null],
    ["roas", Math.round((revenue / mediaSpend) * 10) / 10, null],
  ];
}

// ── O calendário ───────────────────────────────────────────────────────────

/**
 * As iniciativas do ano.
 *
 * Posicionadas em relação a hoje para o "o que vem por aí" do Panorama ter o
 * que mostrar nas três janelas — 7, 30 e 90 dias — e para o histórico ter
 * lançamentos já fechados, com resultado atribuído.
 */
function iniciativas() {
  return [
    // ── Já aconteceu ──
    {
      id: "demo_item_lanc_marco",
      kind: "launch",
      title: "Lançamento Intensivo — turma de março",
      summary: "Primeira campanha do ano, com carrinho de sete dias.",
      de: -175,
      ate: -168,
      status: "done",
      owner: "Analista da BU",
      details: {
        phase: "Carrinho aberto",
        offer: "Intensivo 2026 com bônus de simulados",
        goal: "180 matrículas",
      },
      resultado: {
        revenue: 612_000,
        sales: 171,
        leads: 5_940,
        mediaSpend: 148_000,
        note: "Bateu 95% da meta. O bônus de simulados foi o argumento mais citado no atendimento.",
      },
    },
    {
      id: "demo_item_congresso_maio",
      kind: "event",
      title: "Congresso de Clínica Médica — estande",
      summary: "Estande com captação de leads por QR e sorteio.",
      de: -110,
      ate: -108,
      status: "done",
      owner: "Marketing de Eventos",
      details: {
        location: "São Paulo · Expo Center Norte",
        audience: "Residentes e recém-formados",
        role: "Estande com captação e palestra de 20 minutos",
      },
      resultado: {
        revenue: 96_000,
        sales: 24,
        leads: 1_310,
        mediaSpend: 62_000,
        attendance: 780,
        note: "Custo alto por lead, mas a base captada converteu bem no lançamento seguinte.",
      },
    },
    {
      id: "demo_item_lanc_agosto",
      kind: "launch",
      title: "Lançamento Extensivo — pré-venda de agosto",
      summary: "Pré-venda para a base, antes da abertura geral.",
      de: -35,
      ate: -28,
      status: "done",
      owner: "Analista da BU",
      details: {
        phase: "Pré-venda para a base",
        offer: "Extensivo 2027 com condição de fundador",
        goal: "220 matrículas",
      },
      resultado: {
        revenue: 742_000,
        sales: 208,
        leads: 6_480,
        mediaSpend: 171_000,
        note: "A condição de fundador antecipou matrícula que viria em setembro — comparar com cuidado.",
      },
    },
    {
      id: "demo_item_marco_edital",
      kind: "milestone",
      title: "Edital da prova de residência publicado",
      summary: "Data confirmada: a prova acontece em janeiro.",
      de: -60,
      ate: -60,
      status: "done",
      owner: null,
      details: {
        source: "Site oficial da instituição",
        impact:
          "Define a janela do Intensivo e o prazo do cronograma de conteúdo.",
      },
    },

    // ── Próximos 7 dias ──
    {
      id: "demo_item_campanha_setembro",
      kind: "communication",
      title: "Campanha de setembro no ar",
      summary: "Frente de conteúdo e mídia para reaquecer a base.",
      de: 2,
      ate: 25,
      status: "confirmed",
      owner: "Analista da BU",
      details: {
        channel: "Instagram, YouTube e e-mail",
        cadence: "Três peças por semana",
        theme: "Rotina de estudo de quem passou",
      },
    },
    {
      id: "demo_item_jantar",
      kind: "event",
      title: "Jantar com coordenadores de residência",
      summary: "Encontro fechado, 30 convidados.",
      de: 5,
      ate: 5,
      status: "confirmed",
      owner: "Coordenação Médica",
      details: {
        location: "São Paulo · restaurante no Itaim",
        audience: "Coordenadores de programas de residência",
        role: "Anfitrião",
      },
    },

    // ── Próximos 30 dias ──
    {
      id: "demo_item_congresso_setembro",
      kind: "event",
      title: "Congresso Brasileiro de Emergência",
      summary: "Estande e duas palestras no palco principal.",
      de: 21,
      ate: 23,
      status: "confirmed",
      owner: "Marketing de Eventos",
      details: {
        location: "Rio de Janeiro · Riocentro",
        audience: "Emergencistas e residentes de clínica",
        role: "Estande, duas palestras e captação por QR",
      },
    },
    {
      id: "demo_item_lanc_outubro",
      kind: "launch",
      title: "Lançamento Extensivo 2027 — abertura geral",
      summary: "A campanha grande do segundo semestre.",
      de: 25,
      ate: 33,
      status: "planned",
      owner: "Analista da BU",
      details: {
        phase: "Aquecimento e carrinho",
        offer: "Extensivo 2027 completo",
        goal: "420 matrículas",
      },
    },

    // ── Próximos 90 dias ──
    {
      id: "demo_item_webinar",
      kind: "communication",
      title: "Webinar de resultados da turma",
      summary: "Aprovados contam a rotina de estudo.",
      de: 45,
      ate: 45,
      status: "planned",
      owner: "Conteúdo",
      details: {
        channel: "YouTube ao vivo",
        cadence: "Evento único",
        theme: "Prova de resultado",
      },
    },
    {
      id: "demo_item_black_friday",
      kind: "seasonality",
      title: "Black Friday",
      summary: "Semana de maior tráfego e menor margem do ano.",
      de: 78,
      ate: 84,
      status: "planned",
      owner: null,
      details: {
        expectedEffect: "Pico de tráfego, queda de ticket médio",
        playbook:
          "Oferta definida em outubro. Sem desconto em cima de desconto.",
      },
    },
    {
      id: "demo_item_fechamento",
      kind: "milestone",
      title: "Fechamento das matrículas do ciclo",
      summary: "Depois desta data, só entra na turma seguinte.",
      de: 88,
      ate: 88,
      status: "planned",
      owner: null,
      details: {
        source: "Calendário acadêmico interno",
        impact: "Última janela de faturamento do ciclo.",
      },
    },
  ];
}

// ── Escrita ────────────────────────────────────────────────────────────────

const literal = (valor) =>
  valor === null || valor === undefined
    ? "NULL"
    : typeof valor === "number"
      ? String(valor)
      : `'${String(valor).replace(/'/g, "''")}'`;

async function main() {
  const comandos = [...LIMPEZA];

  if (!apenasRemover) {
    comandos.push(
      `INSERT INTO business_unit
         (id, slug, label, description, division_id, is_active, sort_order, created_at, updated_at)
       VALUES (${literal(BU)}, 'demonstracao', 'Demonstração',
         'BU de teste, com dados fictícios. Serve para experimentar a plataforma sem mexer em número real de ninguém.',
         'div_formacao_medica', 1, 9999, ${agora}, ${agora})`,

      `INSERT INTO squad (id, business_unit_id, slug, name, is_active, created_at, updated_at)
       VALUES (${literal(SQUAD)}, ${literal(BU)}, 'demonstracao', 'Squad Demonstração', 1, ${agora}, ${agora})`,

      `INSERT INTO strategy_cycle
         (id, business_unit_id, slug, name, starts_at, ends_at, is_current, created_at, updated_at)
       VALUES (${literal(CICLO)}, ${literal(BU)}, '2026', 'Demonstração · 2026',
         ${ts(new Date(HOJE.getFullYear(), 0, 1))},
         ${ts(new Date(HOJE.getFullYear(), 11, 31))}, 1, ${agora}, ${agora})`,
    );

    // ── Produtos ──
    //
    // O produto pertence à BU, e não ao ciclo: ele atravessa os anos. É a
    // janela de venda dele que mora no calendário do ciclo.
    const produtos = [
      [
        "demo_prod_extensivo",
        "extensivo-2027",
        "Extensivo 2027",
        "ongoing",
        "Extensivo",
      ],
      [
        "demo_prod_intensivo",
        "intensivo",
        "Intensivo",
        "one_time",
        "Intensivo",
      ],
      [
        "demo_prod_bootcamp",
        "bootcamp-de-provas",
        "Bootcamp de Provas",
        "one_time",
        "Boot Camp",
      ],
    ];
    produtos.forEach(([id, slug, nome, cadencia, familia], indice) => {
      comandos.push(
        `INSERT INTO strategy_product
           (id, business_unit_id, slug, name, cadence, family, is_active, sort_order, created_at, updated_at)
         VALUES (${literal(id)}, ${literal(BU)}, ${literal(slug)}, ${literal(nome)},
           ${literal(cadencia)}, ${literal(familia)}, 1, ${indice}, ${agora}, ${agora})`,
      );
    });

    // ── Meta do ciclo ──
    const linhas = semanas();
    const alvos = metas(linhas);

    comandos.push(
      `INSERT INTO strategy_goal
         (id, cycle_id, scope, objective, rationale, fronts, non_goals, success_signal, risks, created_at, updated_at)
       VALUES ('demo_meta_ciclo', ${literal(CICLO)}, 'cycle',
         'Dobrar a base de alunos do Extensivo sem aumentar o custo por matrícula.',
         'A campanha de março mostrou que existe demanda acima do que a operação captava. O gargalo passou a ser previsibilidade, não interesse.',
         ${literal(
           JSON.stringify([
             {
               title: "Duas campanhas grandes por semestre",
               detail:
                 "Em vez de uma campanha por ano e promoções soltas no meio.",
             },
             {
               title: "Conteúdo de prova social",
               detail:
                 "Aprovados contando a rotina de estudo, não depoimento genérico.",
             },
             {
               title: "Relacionamento com a base parada",
               detail:
                 "Quem baixou material e nunca comprou é o maior grupo inexplorado.",
             },
           ]),
         )},
         'Não vamos abrir turma nova de especialidade neste ciclo. Não vamos competir por preço na Black Friday.',
         'O time de vendas passar a reclamar de volume de atendimento, e não de falta de lead.',
         'Depende da verba de mídia se manter no segundo semestre. Se o edital atrasar, a janela do Intensivo encolhe.',
         ${agora}, ${agora})`,
    );

    alvos.forEach(([metrica, alvo, nota], indice) => {
      comandos.push(
        `INSERT INTO strategy_goal_target (id, goal_id, metric, target, note, sort_order, created_at, updated_at)
         VALUES (${literal(`demo_alvo_${metrica}`)}, 'demo_meta_ciclo', ${literal(metrica)},
           ${alvo}, ${literal(nota)}, ${indice}, ${agora}, ${agora})`,
      );
    });

    // ── Fechamentos semanais ──
    linhas.forEach((linha) => {
      comandos.push(
        `INSERT INTO weekly_result
           (id, business_unit_id, week_start, revenue, sales, leads, media_spend, note, created_at, updated_at)
         VALUES (${literal(linha.id)}, ${literal(BU)}, ${linha.weekStart},
           ${linha.revenue}, ${linha.sales}, ${linha.leads}, ${linha.mediaSpend},
           ${literal(linha.note)}, ${agora}, ${agora})`,
      );
    });

    // ── Calendário e resultado das iniciativas ──
    iniciativas().forEach((item) => {
      comandos.push(
        `INSERT INTO timeline_item
           (id, cycle_id, kind, title, summary, starts_at, ends_at, product_id, owner, status, details, created_at, updated_at)
         VALUES (${literal(item.id)}, ${literal(CICLO)}, ${literal(item.kind)},
           ${literal(item.title)}, ${literal(item.summary)},
           ${ts(emDias(item.de))}, ${ts(emDias(item.ate))}, NULL,
           ${literal(item.owner)}, ${literal(item.status)},
           ${literal(JSON.stringify(item.details))}, ${agora}, ${agora})`,
      );

      if (item.resultado) {
        const r = item.resultado;
        comandos.push(
          `INSERT INTO initiative_result
             (id, timeline_item_id, revenue, sales, leads, media_spend, attendance, note, created_at, updated_at)
           VALUES (${literal(`${item.id}_res`)}, ${literal(item.id)},
             ${r.revenue}, ${r.sales}, ${r.leads}, ${r.mediaSpend},
             ${r.attendance ?? "NULL"}, ${literal(r.note)}, ${agora}, ${agora})`,
        );
      }
    });

    // ── Personas ──
    const personas = [
      {
        id: "demo_persona_r1",
        slug: "residente-recem-formado",
        name: "Marina, recém-formada",
        headline: "Formou há oito meses e ainda não passou.",
        ageRange: "24 a 27 anos",
        location: "Capital ou região metropolitana",
        careerStage: "Recém-formada, segunda tentativa",
        currentRole: "Plantonista em pronto-socorro",
        careerGoal: "Residência em Clínica Médica num programa de referência",
        interests: [
          "Simulados comentados",
          "Rotina de estudo",
          "Relatos de aprovados",
        ],
        channels: ["Instagram", "YouTube", "WhatsApp"],
        notes:
          "Compra quando enxerga um plano de estudo concreto, não quando vê desconto.",
        dores: [
          [
            "Estuda sozinha e não sabe se está no ritmo certo",
            "Cronograma com marcos e simulado de diagnóstico",
          ],
          [
            "Plantão come o tempo de estudo",
            "Aulas curtas e material para ouvir no deslocamento",
          ],
        ],
      },
      {
        id: "demo_persona_r3",
        slug: "residente-em-formacao",
        name: "Caio, residente do terceiro ano",
        headline: "Já está na residência e quer a subespecialidade.",
        ageRange: "28 a 32 anos",
        location: "Grandes centros",
        careerStage: "R3, decidindo a subespecialidade",
        currentRole: "Residente de Clínica Médica",
        careerGoal: "Aprovação em programa de subespecialidade concorrido",
        interests: ["Prova específica", "Artigos e diretrizes", "Networking"],
        channels: ["Instagram", "E-mail", "Grupos de residência"],
        notes:
          "Sensível a conteúdo raso. Precisa de profundidade para levar a sério.",
        dores: [
          [
            "A prova específica tem pouco material bom disponível",
            "Trilha exclusiva da especialidade",
          ],
          [
            "Tempo é ainda mais escasso que na graduação",
            "Estudo por questão, com revisão espaçada",
          ],
        ],
      },
    ];

    personas.forEach((persona, indice) => {
      comandos.push(
        `INSERT INTO persona
           (id, business_unit_id, slug, name, headline, age_range, location, career_stage,
            current_role, career_goal, interests, channels, notes, is_active, sort_order, created_at, updated_at)
         VALUES (${literal(persona.id)}, ${literal(BU)}, ${literal(persona.slug)},
           ${literal(persona.name)}, ${literal(persona.headline)}, ${literal(persona.ageRange)},
           ${literal(persona.location)}, ${literal(persona.careerStage)}, ${literal(persona.currentRole)},
           ${literal(persona.careerGoal)}, ${literal(JSON.stringify(persona.interests))},
           ${literal(JSON.stringify(persona.channels))}, ${literal(persona.notes)},
           1, ${indice}, ${agora}, ${agora})`,
      );

      persona.dores.forEach(([dor, solucao], posicao) => {
        comandos.push(
          `INSERT INTO persona_pain (id, persona_id, position, pain, solution)
           VALUES (${literal(`${persona.id}_dor_${posicao}`)}, ${literal(persona.id)},
             ${posicao}, ${literal(dor)}, ${literal(solucao)})`,
        );
      });
    });
  }

  for (const comando of comandos) {
    await client.execute(comando);
  }

  console.log(
    apenasRemover
      ? `BU de demonstração removida de ${url}`
      : `BU de demonstração criada em ${url} — ${comandos.length} comandos`,
  );
}

try {
  await main();
} catch (erro) {
  console.error("Falha ao aplicar a demonstração:", erro.message);
  process.exit(1);
} finally {
  client.close();
}
