import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

const client = createClient(isLocalFile ? { url } : { url, authToken });

export async function seedInsightsLps(dbClient = client) {
  console.log("Semeando páginas e eventos de Heatmap para MedCof, Derma e Endócrino...");

  const pages = [
    {
      id: "lp-grupomedcof",
      name: "Grupo MedCof · Portal Principal",
      url: "https://grupomedcof.com.br",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-medcofderma",
      name: "MedCof Derma · Dermatologia & TED",
      url: "https://medcofderma.com.br",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-medcofendocrino",
      name: "MedCof Endócrino · TEEM & Especialidades",
      url: "https://medcofendocrino.com.br",
      version: "v1",
      isActive: 1,
    },
    {
      id: "lp-extensivo-2025",
      name: "Extensivo MedCof 2025 / 2026",
      url: "https://grupomedcof.com.br/extensivo-2025",
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
        sql: `INSERT INTO insight_page (id, name, url, version, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [p.id, p.name, p.url, p.version, p.isActive, now, now],
      });
      console.log(`[seed-insights] Página ${p.name} (${p.id}) cadastrada.`);
    }

    // Verifica se já existem eventos para não duplicar
    const eventsCount = await dbClient.execute({
      sql: "SELECT count(*) as total FROM insight_event WHERE page_id = ?",
      args: [p.id],
    });

    if (Number(eventsCount.rows[0].total || 0) === 0) {
      console.log(`[seed-insights] Gerando eventos de telemetria para ${p.id}...`);

      const ctas = [
        { id: "hero-primary-cta", label: "Quero me matricular agora", section: "hero", x: 500, y: 180, clicks: 84 },
        { id: "hero-secondary-cta", label: "Conhecer metodologia", section: "hero", x: 620, y: 180, clicks: 42 },
        { id: "qbank-demo-cta", label: "Testar QBank grátis", section: "metodologia", x: 480, y: 350, clicks: 65 },
        { id: "pricing-plan-annual", label: "Assinar Plano Anual", section: "precos", x: 320, y: 580, clicks: 58 },
        { id: "pricing-plan-rplus", label: "Assinar Intensivo R-Plus", section: "precos", x: 500, y: 580, clicks: 92 },
        { id: "lead-form-submit", label: "Enviar formulário de contato", section: "formulario", x: 500, y: 820, clicks: 47 },
        { id: "whatsapp-floating-btn", label: "Falar com consultor no WhatsApp", section: "global", x: 940, y: 920, clicks: 38 },
      ];

      const batch = [];
      let eventIdx = 0;

      // 1. Page views
      for (let i = 0; i < 280; i++) {
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
          // Dispersão natural ao redor do elemento
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
      for (let s = 0; s < 45; s++) {
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

  console.log("Semeação de páginas e eventos de Heatmap concluída com sucesso.");
}

// Execução direta
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await seedInsightsLps();
  } finally {
    client.close();
  }
}
