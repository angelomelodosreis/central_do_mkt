import fs from "node:fs";
import path from "node:path";

// Test script to fetch all 24 tabs with concurrency 6 and parse into structured JSON
const BU_SHEET_TABS = [
  { gid: "1857412165", tabName: "Rmais", defaultBuCode: "RMAIS_ESPECIALIDADES", defaultBuLabel: "R+ Especialidades" },
  { gid: "340051609", tabName: "R1", defaultBuCode: "MEDCOF_RESIDENCIA", defaultBuLabel: "Residência Médica" },
  { gid: "1564542953", tabName: "Cardio", defaultBuCode: "MEDCOF_CARDIOLOGIA", defaultBuLabel: "Cardiologia" },
  { gid: "369295249", tabName: "Derma", defaultBuCode: "MEDCOF_DERMATOLOGIA", defaultBuLabel: "Dermatologia" },
  { gid: "962697947", tabName: "Anest", defaultBuCode: "MEDCOF_ANESTESIOLOGIA", defaultBuLabel: "Anestesiologia" },
  { gid: "1719980770", tabName: "Urologia", defaultBuCode: "MEDCOF_UROLOGIA", defaultBuLabel: "Urologia" },
  { gid: "1915005489", tabName: "Ortopedia", defaultBuCode: "MEDCOF_ORTOPEDIA", defaultBuLabel: "Ortopedia" },
  { gid: "674570911", tabName: "Oftalmo", defaultBuCode: "MEDCOF_OFTALMOLOGIA", defaultBuLabel: "Oftalmologia" },
  { gid: "39256493", tabName: "Radio", defaultBuCode: "MEDCOF_RADIOLOGIA", defaultBuLabel: "Radiologia" },
  { gid: "1550831488", tabName: "Revalida", defaultBuCode: "MEDCOF_REVALIDA", defaultBuLabel: "Revalida" },
  { gid: "1044772367", tabName: "USA", defaultBuCode: "MEDCOF_USA", defaultBuLabel: "MedCof USA" },
  { gid: "794584144", tabName: "Internato", defaultBuCode: "MEDCOF_INTERNATO", defaultBuLabel: "Internato" },
  { gid: "1361534572", tabName: "Hands On", defaultBuCode: "MEDCOF_LIFEHACKS", defaultBuLabel: "Lifehacks / PS" },
  { gid: "950736743", tabName: "Aprova", defaultBuCode: "MEDCOF_CONCURSUS", defaultBuLabel: "Concursus" },
  { gid: "522629172", tabName: "CBC", defaultBuCode: "MEDCOF_CIRURGIA", defaultBuLabel: "Cirurgia Geral" },
  { gid: "1071542394", tabName: "Clinicof", defaultBuCode: "MEDCOF_CLINICA_MEDICA", defaultBuLabel: "Clínica Médica" },
  { gid: "76328389", tabName: "Endoped", defaultBuCode: "MEDCOF_ENDOCRINOLOGIA_PEDIATRICA", defaultBuLabel: "Endocrinologia Pediátrica" },
  { gid: "1507128077", tabName: "TEEM", defaultBuCode: "MEDCOF_ENDOCRINOLOGIA", defaultBuLabel: "Endocrinologia" },
  { gid: "166880579", tabName: "TEP", defaultBuCode: "MEDCOF_PEDIATRIA", defaultBuLabel: "Pediatria" },
  { gid: "592509251", tabName: "TEMI", defaultBuCode: "MEDCOF_MEDICINA_INTENSIVA", defaultBuLabel: "Medicina Intensiva" },
  { gid: "1695219284", tabName: "TEME", defaultBuCode: "MEDCOF_MEDICINA_DE_EMERGENCIA", defaultBuLabel: "Medicina de Emergência" },
  { gid: "1431486106", tabName: "R+GO", defaultBuCode: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA", defaultBuLabel: "Ginecologia e Obstetrícia" },
  { gid: "1858132363", tabName: "TEGO", defaultBuCode: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA", defaultBuLabel: "Ginecologia e Obstetrícia" },
  { gid: "2059365132", tabName: "Mentoria", defaultBuCode: "MEDCOF_RESIDENCIA", defaultBuLabel: "Residência Médica" },
];

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCurrency(val) {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const s = String(val).replace(/[R$\s"]/g, "").trim();
  if (!s) return 0;
  if (s.includes(".") && s.includes(",")) {
    const clean = s.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  if (s.includes(",")) {
    const clean = s.replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  if (s.includes(".")) {
    const parts = s.split(".");
    if (parts.length > 2 || (parts[1].length === 3 && parts[0].length <= 3)) {
      const clean = s.replace(/\./g, "");
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
  }
  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

function parseBrazilianDate(rawDate) {
  if (!rawDate || typeof rawDate !== "string") return { iso: "", timestamp: 0, isValid: false };
  const trimmed = rawDate.trim();
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (brMatch) {
    const dia = parseInt(brMatch[1], 10);
    const mes = parseInt(brMatch[2], 10) - 1;
    let ano = parseInt(brMatch[3], 10);
    if (ano < 100) ano += 2000;
    const hora = brMatch[4] !== undefined ? parseInt(brMatch[4], 10) : 12;
    const min = brMatch[5] !== undefined ? parseInt(brMatch[5], 10) : 0;
    const seg = brMatch[6] !== undefined ? parseInt(brMatch[6], 10) : 0;
    const d = new Date(ano, mes, dia, hora, min, seg);
    if (!isNaN(d.getTime())) return { iso: d.toISOString(), timestamp: d.getTime(), isValid: true };
  }
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (isoMatch) {
    const ano = parseInt(isoMatch[1], 10);
    const mes = parseInt(isoMatch[2], 10) - 1;
    const dia = parseInt(isoMatch[3], 10);
    const hora = isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : 12;
    const min = isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : 0;
    const seg = isoMatch[6] !== undefined ? parseInt(isoMatch[6], 10) : 0;
    const d = new Date(ano, mes, dia, hora, min, seg);
    if (!isNaN(d.getTime())) return { iso: d.toISOString(), timestamp: d.getTime(), isValid: true };
  }
  return { iso: "", timestamp: 0, isValid: false };
}

async function fetchTabWithRetry(tab, maxRetries = 2) {
  const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRRHbUHQxiRh3LiC8tKGpAPkhBRfcxkKucIYCXFuxmCRP9oX9LCxXTeQOhPt0eqAvF4kXNXvQATwvFJ/pub?gid=${tab.gid}&single=true&output=csv`;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(25000),
        headers: { "User-Agent": "Mozilla/5.0 CentralDoMkt/1.0" }
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.includes("<!DOCTYPE html") || !text.includes(",")) continue;
      return text;
    } catch (e) {
      if (attempt === maxRetries) console.error(`Failed ${tab.tabName}:`, e.message);
    }
  }
  return null;
}

async function generateSeed() {
  console.log("Fetching all 24 tabs with concurrency 5...");
  const queue = [...BU_SHEET_TABS];
  const allTexts = new Map();
  
  async function worker() {
    while (queue.length > 0) {
      const tab = queue.shift();
      const text = await fetchTabWithRetry(tab);
      if (text) allTexts.set(tab.gid, { tab, text });
    }
  }

  await Promise.all(Array.from({ length: 5 }, () => worker()));
  console.log(`Fetched ${allTexts.size} of ${BU_SHEET_TABS.length} tabs.`);

  const allTransactions = [];
  for (const [gid, { tab, text }] of allTexts.entries()) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) continue;
    const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
    const idIdx = headers.findIndex(h => h.includes("id_venda") || h.includes("id"));
    const dateIdx = headers.findIndex(h => h.includes("dt_venda") || h.includes("data") || h.includes("date"));
    const productIdx = headers.findIndex(h => h.includes("produto") || h.includes("product") || h.includes("curso"));
    const planoIdx = headers.findIndex(h => h.includes("plano"));
    const studentIdx = headers.findIndex(h => h.includes("nome_aluno") || h.includes("aluno") || h.includes("cliente"));
    const emailIdx = headers.findIndex(h => h.includes("email"));
    const amountIdx = headers.findIndex(h => h.includes("valor_pago") || h.includes("valor") || h.includes("preço") || h.includes("total"));
    const methodIdx = headers.findIndex(h => h.includes("forma") || h.includes("pagamento") || h.includes("metodo"));
    const statusIdx = headers.findIndex(h => h.includes("status") || h.includes("situacao"));

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 2) continue;
      const rawId = idIdx >= 0 && cols[idIdx] ? cols[idIdx] : `sale_${tab.gid}_${i}`;
      const rawDate = dateIdx >= 0 ? cols[dateIdx] : "";
      const rawProduct = productIdx >= 0 && cols[productIdx] ? cols[productIdx] : planoIdx >= 0 ? cols[planoIdx] : "Extensivo MedCof";
      const rawPlano = planoIdx >= 0 ? cols[planoIdx] : "";
      const rawAmount = amountIdx >= 0 ? cols[amountIdx] : "1000";
      const amount = parseCurrency(rawAmount);
      if (amount <= 0) continue;
      const { iso, timestamp } = parseBrazilianDate(rawDate);
      if (!timestamp) continue;

      allTransactions.push({
        id: String(rawId),
        date: iso,
        timestamp,
        amount,
        quantity: 1,
        productName: rawProduct,
        businessUnitCode: tab.defaultBuCode,
        businessUnitLabel: tab.defaultBuLabel,
        paymentMethod: "credit_card",
        status: "approved",
      });
    }
  }

  console.log(`Parsed total: ${allTransactions.length} transactions!`);
  const outputPath = path.join(process.cwd(), "src/lib/modules/sales/sales-seed-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(allTransactions));
  console.log(`Saved seed dataset to ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

generateSeed();
