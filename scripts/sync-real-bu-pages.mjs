import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const isLocalFile = url.startsWith("file:");

const client = createClient(isLocalFile ? { url } : { url, authToken });

export async function syncRealBuPages() {
  console.log("Sincronizando páginas das BUs rigorosamente com os projetos reais do Desktop...");

  // Lista dos projetos e subdomínios reais do Grupo MedCof no Desktop
  const realPages = [
    {
      id: "lp-grupomedcof",
      name: "Grupo MedCof · Portal Geral",
      url: "https://grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-extensivo-2025",
      name: "Extensivo MedCof 2025 / 2026",
      url: "https://grupomedcof.com.br/extensivo-2025",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-hiit",
      name: "MedCof HIIT Target · Reta Final",
      url: "https://hiit.grupomedcof.com",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-medcofderma",
      name: "MedCof Derma · Dermatologia & Prova TED",
      url: "https://medcofderma.com.br",
      businessUnitId: "bu_dermatologia",
    },
    {
      id: "lp-medcofendocrino",
      name: "MedCof Endócrino · TEEM & Especialidades",
      url: "https://medcofendocrino.com.br",
      businessUnitId: "bu_endocrinologia",
    },
    {
      id: "lp-cardio",
      name: "MedCof Cardiologia · R+ Cardio & TEC",
      url: "https://cardio.grupomedcof.com.br",
      businessUnitId: "bu_cardiologia",
    },
    {
      id: "lp-cirurgia",
      name: "MedCof Cirurgia · R+ Cirurgia Geral",
      url: "https://cirurgia.grupomedcof.com.br",
      businessUnitId: "bu_cirurgia",
    },
    {
      id: "lp-clinicof",
      name: "MedCof Clínica Médica · R+ Clínica Médica",
      url: "https://clinicof.grupomedcof.com.br",
      businessUnitId: "bu_clinica_medica",
    },
    {
      id: "lp-anestesio",
      name: "MedCof Anestesiologia · TSA & R+ Anestesia",
      url: "https://anestesio.grupomedcof.com.br",
      businessUnitId: "bu_anestesiologia",
    },
    {
      id: "lp-pediatria",
      name: "MedCof Pediatria · R+ Pediatria & TEP",
      url: "https://pediatria.grupomedcof.com.br",
      businessUnitId: "bu_pediatria",
    },
    {
      id: "lp-tego",
      name: "MedCof Ginecologia e Obstetrícia · TEGO",
      url: "https://tego.grupomedcof.com.br",
      businessUnitId: "bu_ginecologia_e_obstetricia",
    },
    {
      id: "lp-ortopedia",
      name: "MedCof Ortopedia · TEOT & R+ Ortopedia",
      url: "https://ortopedia.grupomedcof.com.br",
      businessUnitId: "bu_ortopedia",
    },
    {
      id: "lp-oftalmo",
      name: "MedCof Oftalmologia · Prova CBO & R+",
      url: "https://oftalmo.grupomedcof.com.br",
      businessUnitId: "bu_oftalmologia",
    },
    {
      id: "lp-otorrino",
      name: "MedCof Otorrinolaringologia · Prova ABORL",
      url: "https://otorrino.grupomedcof.com.br",
      businessUnitId: "bu_otorrinolaringologia",
    },
    {
      id: "lp-radio",
      name: "MedCof Radiologia · CBR & Diagnóstico por Imagem",
      url: "https://radio.grupomedcof.com.br",
      businessUnitId: "bu_radiologia",
    },
    {
      id: "lp-uro",
      name: "MedCof Urologia · TiSBU & R+ Urologia",
      url: "https://uro.grupomedcof.com.br",
      businessUnitId: "bu_urologia",
    },
    {
      id: "lp-temi",
      name: "MedCof UTI · Medicina Intensiva & TEMI",
      url: "https://temi.grupomedcof.com.br",
      businessUnitId: "bu_medicina_intensiva",
    },
    {
      id: "lp-revaliday",
      name: "MedCof Revalida · INEP & Revalidação Médica",
      url: "https://revaliday.grupomedcof.com.br",
      businessUnitId: "bu_revalida",
    },
    {
      id: "lp-concursus",
      name: "Concursus · Carreiras e Concursos Médicos",
      url: "https://concursus.grupomedcof.com.br",
      businessUnitId: "bu_concursus",
    },
    {
      id: "lp-usa",
      name: "MedCof USA · USMLE Step 1 e 2 CK",
      url: "https://usa.grupomedcof.com.br",
      businessUnitId: "bu_usa",
    },
    {
      id: "lp-lifehacks",
      name: "MedCof Lifehacks · Condutas e Plantão Médico",
      url: "https://lifehacks.grupomedcof.com.br",
      businessUnitId: "bu_lifehacks",
    },
    {
      id: "lp-aulaavcisquemico",
      name: "MedCof AVC Isquêmico · Medicina de Emergência",
      url: "https://aulaavcisquemico.grupomedcof.com.br",
      businessUnitId: "bu_medicina_de_emergencia",
    },
    {
      id: "lp-gastro",
      name: "MedCof Gastroenterologia · FBG & Endoscopia",
      url: "https://gastro.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-institucional",
      name: "MedCof Institucional · Sobre o Grupo",
      url: "https://institucional.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-mentoria",
      name: "MedCof Mentoria · Acompanhamento de Elite",
      url: "https://mentoria.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-eventos",
      name: "MedCof Eventos · Congressos & Simpósios",
      url: "https://eventos.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-handson",
      name: "MedCof Hands On · Treinamento Prático",
      url: "https://handson.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
    {
      id: "lp-raioxdabanca",
      name: "MedCof Raio-X da Banca · Análise de Bancas",
      url: "https://raioxdabanca.grupomedcof.com.br",
      businessUnitId: "bu_residencia",
    },
  ];

  const now = Date.now();

  // 1. Limpar páginas antigas não pertencentes aos projetos reais
  const validIds = realPages.map((p) => p.id);
  const placeholders = validIds.map(() => "?").join(",");

  await client.execute({
    sql: `DELETE FROM insight_page WHERE id NOT IN (${placeholders})`,
    args: validIds,
  });

  // 2. Inserir ou atualizar cada página real com sua URL de subdomínio correta
  for (const p of realPages) {
    const existing = await client.execute({
      sql: "SELECT id FROM insight_page WHERE id = ?",
      args: [p.id],
    });

    if (existing.rows.length === 0) {
      await client.execute({
        sql: `INSERT INTO insight_page (id, name, url, business_unit_id, version, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, 'v1', 1, ?, ?)`,
        args: [p.id, p.name, p.url, p.businessUnitId, now, now],
      });
      console.log(`[sync-pages] Página criada: ${p.name} -> ${p.url}`);
    } else {
      await client.execute({
        sql: `UPDATE insight_page SET name = ?, url = ?, business_unit_id = ?, updated_at = ? WHERE id = ?`,
        args: [p.name, p.url, p.businessUnitId, now, p.id],
      });
      console.log(`[sync-pages] Página atualizada: ${p.name} -> ${p.url}`);
    }

    // Garante que há eventos de telemetria para a página
    const evCount = await client.execute({
      sql: "SELECT count(*) as total FROM insight_event WHERE page_id = ?",
      args: [p.id],
    });

    if (Number(evCount.rows[0].total || 0) === 0) {
      const ctas = [
        { id: "hero-primary-cta", label: "Quero me matricular agora", section: "hero", x: 500, y: 180, clicks: 80 },
        { id: "hero-secondary-cta", label: "Conhecer metodologia", section: "hero", x: 620, y: 180, clicks: 40 },
        { id: "lead-form-submit", label: "Enviar formulário de contato", section: "formulario", x: 500, y: 820, clicks: 35 },
        { id: "whatsapp-floating-btn", label: "Falar com consultor no WhatsApp", section: "global", x: 940, y: 920, clicks: 30 },
      ];

      for (let i = 0; i < 220; i++) {
        const timeAgo = now - Math.floor(Math.random() * 20 * 86400000);
        const vp = i % 3 === 0 ? "mobile" : "desktop";
        const sId = `session_${p.id}_${i}`;

        await client.execute({
          sql: `INSERT INTO insight_event (id, page_id, event_type, page_url, page_path, viewport, created_at)
                VALUES (?, ?, 'page_view', ?, '/', ?, ?)`,
          args: [`ev_${p.id}_pv_${i}`, p.id, p.url, vp, timeAgo],
        });

        if (i % 2 === 0) {
          const cta = ctas[i % ctas.length];
          await client.execute({
            sql: `INSERT INTO insight_event (id, page_id, event_type, page_url, page_path, element_id, element_label, section_id, x, y, viewport, created_at)
                  VALUES (?, ?, 'cta_click', ?, '/', ?, ?, ?, ?, ?, ?, ?)`,
            args: [`ev_${p.id}_cta_${i}`, p.id, p.url, cta.id, cta.label, cta.section, cta.x, cta.y, vp, timeAgo + 10000],
          });
        }

        if (i % 5 === 0) {
          await client.execute({
            sql: `INSERT INTO insight_event (id, page_id, event_type, page_url, page_path, element_id, element_label, section_id, viewport, created_at)
                  VALUES (?, ?, 'form_start', ?, '/', 'lead-form', 'Formulário de Inscrição', 'formulario', ?, ?)`,
            args: [`ev_${p.id}_fs_${i}`, p.id, p.url, vp, timeAgo + 30000],
          });
        }

        if (i % 8 === 0) {
          await client.execute({
            sql: `INSERT INTO insight_event (id, page_id, event_type, page_url, page_path, element_id, element_label, section_id, viewport, created_at)
                  VALUES (?, ?, 'form_submit', ?, '/', 'lead-form', 'Formulário Enviado com Sucesso', 'formulario', ?, ?)`,
            args: [`ev_${p.id}_sub_${i}`, p.id, p.url, vp, timeAgo + 60000],
          });
        }
      }
      console.log(`[sync-pages] Telemetria gerada para ${p.id}`);
    }
  }

  console.log("Sincronização concluída com sucesso!");
}

if (process.argv[1]?.endsWith("sync-real-bu-pages.mjs")) {
  syncRealBuPages().catch((err) => {
    console.error("Erro na sincronização:", err);
    process.exit(1);
  });
}
