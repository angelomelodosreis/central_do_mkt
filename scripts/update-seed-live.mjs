import fs from "node:fs";
import path from "node:path";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
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
  return parseFloat(s) || 0;
}

function parseBrazilianDate(rawDate) {
  if (!rawDate) return { iso: "", timestamp: 0, isValid: false };
  const m = rawDate.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{1,2}))?/);
  if (m) {
    const dia = parseInt(m[1], 10);
    const mes = parseInt(m[2], 10) - 1;
    let ano = parseInt(m[3], 10);
    if (ano < 100) ano += 2000;
    const hora = m[4] ? parseInt(m[4], 10) : 12;
    const min = m[5] ? parseInt(m[5], 10) : 0;
    const d = new Date(ano, mes, dia, hora, min);
    const iso = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}T${String(hora).padStart(2, "0")}:${String(min).padStart(2, "0")}:00.000Z`;
    return { iso, timestamp: d.getTime(), isValid: true };
  }
  return { iso: "", timestamp: 0, isValid: false };
}

const seedPath = "src/lib/modules/sales/sales-seed-data.json";
const seedData = JSON.parse(fs.readFileSync(seedPath, "utf8"));
console.log("Current seed length:", seedData.length);

const liveUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRRHbUHQxiRh3LiC8tKGpAPkhBRfcxkKucIYCXFuxmCRP9oX9LCxXTeQOhPt0eqAvF4kXNXvQATwvFJ/pub?output=csv";
console.log("Fetching live sheet...");
const res = await fetch(liveUrl);
const text = await res.text();
const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
console.log("Live lines:", lines.length);

const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase());
const idIdx = headers.findIndex(h => h.includes("id_venda") || h.includes("id"));
const dateIdx = headers.findIndex(h => h.includes("dt_venda") || h.includes("data"));
const productIdx = headers.findIndex(h => h.includes("produto") || h.includes("curso"));
const planoIdx = headers.findIndex(h => h.includes("plano"));
const studentIdx = headers.findIndex(h => h.includes("nome_aluno") || h.includes("aluno"));
const emailIdx = headers.findIndex(h => h.includes("email"));
const amountIdx = headers.findIndex(h => h.includes("valor_pago") || h.includes("valor"));

const txMap = new Map();
for (const t of seedData) {
  txMap.set(t.id, t);
}

let added = 0;
for (let i = 1; i < lines.length; i++) {
  const cols = parseCsvLine(lines[i]);
  if (cols.length < 2) continue;
  const rawId = idIdx >= 0 && cols[idIdx] ? cols[idIdx] : `sale_${i}`;
  const rawDate = dateIdx >= 0 ? cols[dateIdx] : "";
  const rawProduct = productIdx >= 0 && cols[productIdx] ? cols[productIdx] : planoIdx >= 0 ? cols[planoIdx] : "Extensivo MedCof";
  const rawBuyer = studentIdx >= 0 ? cols[studentIdx] : undefined;
  const rawEmail = emailIdx >= 0 ? cols[emailIdx] : undefined;
  const rawAmount = amountIdx >= 0 ? cols[amountIdx] : "1000";

  const { iso, timestamp } = parseBrazilianDate(rawDate);
  const amount = parseCurrency(rawAmount);
  if (amount <= 0 || !iso) continue;

  const existing = txMap.get(rawId);
  const finalBuCode = existing?.businessUnitCode || "MEDCOF_RESIDENCIA";
  const finalBuLabel = existing?.businessUnitLabel || "Residência Médica";

  txMap.set(rawId, {
    id: rawId,
    date: iso,
    timestamp,
    product: rawProduct,
    businessUnitCode: finalBuCode,
    businessUnitLabel: finalBuLabel,
    amount,
    quantity: 1,
    paymentMethod: existing?.paymentMethod || "credit_card",
    status: existing?.status || "approved",
    buyerName: rawBuyer,
    buyerEmail: rawEmail,
    utmSource: "google_sheets_live",
  });
  if (!existing) added++;
}

console.log(`New transactions added: ${added}, total merged: ${txMap.size}`);
const merged = Array.from(txMap.values());
const octDays = [...new Set(merged.filter(t => t.date.startsWith("2026-10")).map(t => t.date.slice(0, 10)))].sort();
console.log("October days present after merge:", octDays);

fs.writeFileSync(seedPath, JSON.stringify(merged, null, 2), "utf8");
console.log("Successfully updated sales-seed-data.json with live transactions up to today!");
