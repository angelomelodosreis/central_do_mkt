import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

const defaultUrl = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
const defaultToken = process.env.TURSO_AUTH_TOKEN;
const isLocal = defaultUrl.startsWith("file:");

export async function syncRealBuPages(dbClient = null) {
  const client = dbClient || createClient(isLocal ? { url: defaultUrl } : { url: defaultUrl, authToken: defaultToken });
  console.log("[sync-pages] Sincronizando páginas das BUs rigorosamente com os projetos reais do Desktop...");

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
  }

  console.log("[sync-pages] Sincronização de páginas reais concluída (sem geração de dados falsos)!");
}

if (process.argv[1]?.endsWith("sync-real-bu-pages.mjs")) {
  syncRealBuPages().catch((err) => {
    console.error("Erro na sincronização:", err);
    process.exit(1);
  });
}
