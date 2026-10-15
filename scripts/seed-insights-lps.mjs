import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

const client = createClient(isLocalFile ? { url } : { url, authToken });

export async function seedInsightsLps(dbClient = client) {
  console.log("Semeando páginas e eventos de Heatmap para todas as frentes e subdomínios MedCof...");

  const pages = [
    {
      id: "lp-grupomedcof",
      name: "Grupo MedCof · Portal Principal",
      url: "https://grupomedcof.com.br",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-medcofderma",
      name: "MedCof Derma · Dermatologia & TED",
      url: "https://medcofderma.com.br",
      businessUnitId: "bu_dermatologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-medcofendocrino",
      name: "MedCof Endócrino · TEEM & Especialidades",
      url: "https://medcofendocrino.com.br",
      businessUnitId: "bu_endocrinologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-extensivo-2025",
      name: "Extensivo MedCof 2025 / 2026",
      url: "https://grupomedcof.com.br/extensivo-2025",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-app-medcof",
      name: "App MedCof · Plataforma Web",
      url: "https://app.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-qbank-prime",
      name: "QBank Prime · Banco de Questões",
      url: "https://qbank.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-materiais",
      name: "Materiais & E-books Gratuitos",
      url: "https://materiais.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-blog",
      name: "Blog MedCof · Notícias & Editais",
      url: "https://blog.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-revalida",
      name: "MedCof Revalida · INEP & USP",
      url: "https://revalida.grupomedcof.com.br",
      businessUnitId: "bu_revalida",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-concursus",
      name: "Concursus · Carreiras e Concursos Médicos",
      url: "https://concursus.grupomedcof.com.br",
      businessUnitId: "bu_concursus",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-hiit-target",
      name: "HIIT Target · Revisão Reta Final",
      url: "https://grupomedcof.com.br/hiit-target",
      businessUnitId: "bu_residencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-cardiologia",
      name: "MedCof Cardiologia · R+ Cardio & TEC",
      url: "https://grupomedcof.com.br/cardiologia",
      businessUnitId: "bu_cardiologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-cirurgia",
      name: "MedCof Cirurgia · R+ Cirurgia Geral",
      url: "https://grupomedcof.com.br/cirurgia",
      businessUnitId: "bu_cirurgia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-clinica-medica",
      name: "MedCof Clínica Médica · R+ Clínica",
      url: "https://grupomedcof.com.br/clinica-medica",
      businessUnitId: "bu_clinica_medica",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-pediatria",
      name: "MedCof Pediatria · R+ Pediatria & TEP",
      url: "https://grupomedcof.com.br/pediatria",
      businessUnitId: "bu_pediatria",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-ginecologia",
      name: "MedCof Ginecologia e Obstetrícia · TEGO",
      url: "https://grupomedcof.com.br/ginecologia",
      businessUnitId: "bu_ginecologia_e_obstetricia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-ortopedia",
      name: "MedCof Ortopedia · TEOT & R+ Ortopedia",
      url: "https://grupomedcof.com.br/ortopedia",
      businessUnitId: "bu_ortopedia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-oftalmologia",
      name: "MedCof Oftalmologia · Prova CBO & R+",
      url: "https://grupomedcof.com.br/oftalmologia",
      businessUnitId: "bu_oftalmologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-anestesiologia",
      name: "MedCof Anestesiologia · TSA & R+ Anestesia",
      url: "https://grupomedcof.com.br/anestesiologia",
      businessUnitId: "bu_anestesiologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-medicina-intensiva",
      name: "MedCof UTI · Terapia Intensiva & AMIB",
      url: "https://grupomedcof.com.br/medicina-intensiva",
      businessUnitId: "bu_medicina_intensiva",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-pronto-socorro",
      name: "MedCof Pronto Socorro · Medicina de Emergência",
      url: "https://grupomedcof.com.br/ps",
      businessUnitId: "bu_medicina_de_emergencia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-radiologia",
      name: "MedCof Radiologia & Diagnóstico por Imagem",
      url: "https://grupomedcof.com.br/radiologia",
      businessUnitId: "bu_radiologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-urologia",
      name: "MedCof Urologia · TiSBU & R+ Urologia",
      url: "https://grupomedcof.com.br/urologia",
      businessUnitId: "bu_urologia",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-enamed",
      name: "MedCof Enamed · Preparação Exame Nacional",
      url: "https://grupomedcof.com.br/enamed",
      businessUnitId: "bu_enamed",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-internato",
      name: "MedCof Internato · Ciclo Clínico e Prático",
      url: "https://grupomedcof.com.br/internato",
      businessUnitId: "bu_internato",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-lifehacks",
      name: "MedCof Lifehacks · Condutas e Plantão Médico",
      url: "https://grupomedcof.com.br/lifehacks",
      businessUnitId: "bu_lifehacks",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-usa",
      name: "MedCof USA · USMLE Step 1 e 2 CK",
      url: "https://grupomedcof.com.br/usa",
      businessUnitId: "bu_usa",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-endocrino-pediatrica",
      name: "MedCof Endocrinologia Pediátrica · CAAEP",
      url: "https://medcofendocrino.com.br/pediatrica",
      businessUnitId: "bu_endocrinologia_pediatrica",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-otorrinolaringologia",
      name: "MedCof Otorrinolaringologia · Prova ABORL",
      url: "https://grupomedcof.com.br/otorrino",
      businessUnitId: "bu_otorrinolaringologia",
      version: "v1",
      isActive: 1,
    },
  ];

  const now = Date.now();

  for (const p of pages) {
    const existing = await dbClient.execute({
      sql: "SELECT id FROM insight_page WHERE id = ?",
      args: [p.id],
    });

    if (existing.rows.length === 0) {
      await dbClient.execute({
        sql: `INSERT INTO insight_page (id, name, url, business_unit_id, version, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, p.name, p.url, p.businessUnitId || null, p.version, p.isActive, now, now],
      });
      console.log(`[seed-insights] Página ${p.name} (${p.id}) cadastrada.`);
    } else {
      await dbClient.execute({
        sql: `UPDATE insight_page SET business_unit_id = ?, name = ?, url = ? WHERE id = ?`,
        args: [p.businessUnitId || null, p.name, p.url, p.id],
      });
    }

    // Verifica se já existem eventos para não duplicar
    const eventsCount = await dbClient.execute({
      sql: "SELECT count(*) as total FROM insight_event WHERE page_id = ?",
      args: [p.id],
    });

    if (Number(eventsCount.rows[0].total || 0) === 0) {
      console.log(`[seed-insights] Gerando eventos de telemetria para ${p.id}...`);

      const ctas = [
        { id: "hero-primary-cta", label: "Quero me matricular agora", section: "hero", x: 500, y: 180, clicks: 75 + Math.floor(Math.random() * 30) },
        { id: "hero-secondary-cta", label: "Conhecer metodologia", section: "hero", x: 620, y: 180, clicks: 35 + Math.floor(Math.random() * 20) },
        { id: "qbank-demo-cta", label: "Testar QBank grátis", section: "metodologia", x: 480, y: 350, clicks: 50 + Math.floor(Math.random() * 25) },
        { id: "pricing-plan-annual", label: "Assinar Plano Anual", section: "precos", x: 320, y: 580, clicks: 45 + Math.floor(Math.random() * 25) },
        { id: "pricing-plan-rplus", label: "Assinar Intensivo R-Plus", section: "precos", x: 500, y: 580, clicks: 80 + Math.floor(Math.random() * 30) },
        { id: "lead-form-submit", label: "Enviar formulário de contato", section: "formulario", x: 500, y: 820, clicks: 40 + Math.floor(Math.random() * 20) },
        { id: "whatsapp-floating-btn", label: "Falar com consultor no WhatsApp", section: "global", x: 940, y: 920, clicks: 30 + Math.floor(Math.random() * 20) },
      ];

      const batch = [];
      let eventIdx = 0;

      // 1. Page views
      const viewsCount = 200 + Math.floor(Math.random() * 150);
      for (let i = 0; i < viewsCount; i++) {
        const timeAgo = now - Math.floor(Math.random() * 25 * 86400000);
        const vp = i % 3 === 0 ? "mobile" : "desktop";
        const sId = `session_${p.id}_${i}`;

        batch.push({
          sql: `INSERT INTO insight_event (id, page_id, page_url, page_path, page_version, event_type, viewport, scroll_percent, utm_source, utm_medium, utm_campaign, session_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `ev_${now}_${p.id}_${eventIdx++}`,
            p.id,
            p.url,
            "/",
            p.version,
            "page_view",
            vp,
            0,
            i % 2 === 0 ? "google" : "instagram",
            i % 2 === 0 ? "cpc" : "stories",
            "campanha-conversao-2026",
            sId,
            timeAgo,
          ],
        });

        // 2. Scroll depth milestones
        [25, 50, 75, 90, 100].forEach((depth, idx) => {
          if (i % (idx + 1) === 0) {
            batch.push({
              sql: `INSERT INTO insight_event (id, page_id, page_url, page_path, page_version, event_type, viewport, scroll_percent, session_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                `ev_${now}_${p.id}_${eventIdx++}`,
                p.id,
                p.url,
                "/",
                p.version,
                "scroll_depth",
                vp,
                depth,
                sId,
                timeAgo + 2000,
              ],
            });
          }
        });

        // 3. Form start
        if (i % 4 === 0) {
          batch.push({
            sql: `INSERT INTO insight_event (id, page_id, page_url, page_path, page_version, event_type, element_id, element_label, section_id, viewport, session_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              `ev_${now}_${p.id}_${eventIdx++}`,
              p.id,
              p.url,
              "/",
              p.version,
              "form_start",
              "lead-form",
              "Início do Formulário",
              "formulario",
              vp,
              sId,
              timeAgo + 5000,
            ],
          });
        }
      }

      // 4. CTA clicks & Heatmap density clusters
      for (const cta of ctas) {
        for (let k = 0; k < cta.clicks; k++) {
          const timeAgo = now - Math.floor(Math.random() * 25 * 86400000);
          const vp = k % 3 === 0 ? "mobile" : "desktop";
          const jitterX = Math.round(cta.x + (Math.random() * 30 - 15));
          const jitterY = Math.round(cta.y + (Math.random() * 20 - 10));

          batch.push({
            sql: `INSERT INTO insight_event (id, page_id, page_url, page_path, page_version, event_type, element_id, element_label, section_id, viewport, x, y, session_id, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              `ev_${now}_${p.id}_${eventIdx++}`,
              p.id,
              p.url,
              "/",
              p.version,
              "cta_click",
              cta.id,
              cta.label,
              cta.section,
              vp,
              Math.max(0, Math.min(1000, jitterX)),
              Math.max(0, Math.min(1000, jitterY)),
              `session_${p.id}_cta_${k}`,
              timeAgo,
            ],
          });
        }
      }

      // 5. Form Submissions (Leads confirmados)
      const leadsCount = 25 + Math.floor(Math.random() * 25);
      for (let s = 0; s < leadsCount; s++) {
        const timeAgo = now - Math.floor(Math.random() * 25 * 86400000);
        const vp = s % 3 === 0 ? "mobile" : "desktop";

        batch.push({
          sql: `INSERT INTO insight_event (id, page_id, page_url, page_path, page_version, event_type, element_id, element_label, section_id, viewport, x, y, session_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            `ev_${now}_${p.id}_${eventIdx++}`,
            p.id,
            p.url,
            "/",
            p.version,
            "form_submit",
            "lead-form-submit",
            "Envio Confirmado de Lead",
            "formulario",
            vp,
            500,
            820,
            `session_${p.id}_lead_${s}`,
            timeAgo,
          ],
        });
      }

      // Inserção em lotes de 50
      for (let b = 0; b < batch.length; b += 50) {
        await dbClient.batch(batch.slice(b, b + 50));
      }
      console.log(`[seed-insights] Inseridos ${batch.length} eventos para ${p.id}.`);
    }
  }

  console.log("Semeação de páginas e eventos de Heatmap concluída com sucesso para todas as 29 frentes.");
}

// Execução direta
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await seedInsightsLps();
  } finally {
    client.close();
  }
}
