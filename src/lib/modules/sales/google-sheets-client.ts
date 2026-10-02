import type { SaleTransaction, SalesAnalyticsResult } from "./types";
import { calculateSalesAnalytics } from "./calculations";

export const DEFAULT_SHEET_ID = "1pCErQiwZ6CnMDqBm34lyFjzDhnomTlSHltgnF1IJRdw";
export const DEFAULT_GID = "1830309116";
export const DEFAULT_LIVE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRRHbUHQxiRh3LiC8tKGpAPkhBRfcxkKucIYCXFuxmCRP9oX9LCxXTeQOhPt0eqAvF4kXNXvQATwvFJ/pub?output=csv";

/**
 * 23 BUs oficiais da MedCof para mapeamento correto de vendas.
 */
const BU_CATALOG: Array<{ code: string; label: string; slug: string }> = [
  { code: "MEDCOF_ANESTESIOLOGIA", label: "Anestesiologia", slug: "anestesiologia" },
  { code: "MEDCOF_CARDIOLOGIA", label: "Cardiologia", slug: "cardiologia" },
  { code: "MEDCOF_CIRURGIA", label: "Cirurgia Geral", slug: "cirurgia" },
  { code: "MEDCOF_CLINICA_MEDICA", label: "Clínica Médica", slug: "clinica-medica" },
  { code: "MEDCOF_CONCURSUS", label: "Concursus", slug: "concursus" },
  { code: "MEDCOF_DERMATOLOGIA", label: "Dermatologia", slug: "dermatologia" },
  { code: "MEDCOF_ENAMED", label: "Enamed", slug: "enamed" },
  { code: "MEDCOF_ENDOCRINOLOGIA", label: "Endocrinologia", slug: "endocrinologia" },
  { code: "MEDCOF_ENDOCRINOLOGIA_PEDIATRICA", label: "Endocrinologia Pediátrica", slug: "endocrinologia-pediatrica" },
  { code: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA", label: "Ginecologia e Obstetrícia", slug: "ginecologia-e-obstetricia" },
  { code: "MEDCOF_INTERNATO", label: "Internato", slug: "internato" },
  { code: "MEDCOF_LIFEHACKS", label: "Lifehacks / PS", slug: "lifehacks" },
  { code: "MEDCOF_MEDICINA_DE_EMERGENCIA", label: "Medicina de Emergência", slug: "medicina-de-emergencia" },
  { code: "MEDCOF_MEDICINA_INTENSIVA", label: "Medicina Intensiva", slug: "medicina-intensiva" },
  { code: "MEDCOF_OFTALMOLOGIA", label: "Oftalmologia", slug: "oftalmologia" },
  { code: "MEDCOF_ORTOPEDIA", label: "Ortopedia", slug: "ortopedia" },
  { code: "MEDCOF_OTORRINOLARINGOLOGIA", label: "Otorrinolaringologia", slug: "otorrinolaringologia" },
  { code: "MEDCOF_PEDIATRIA", label: "Pediatria", slug: "pediatria" },
  { code: "MEDCOF_RADIOLOGIA", label: "Radiologia", slug: "radiologia" },
  { code: "MEDCOF_RESIDENCIA", label: "Residência Médica", slug: "residencia" },
  { code: "MEDCOF_REVALIDA", label: "Revalida", slug: "revalida" },
  { code: "MEDCOF_UROLOGIA", label: "Urologia", slug: "uro" },
  { code: "MEDCOF_USA", label: "MedCof USA", slug: "usa" },
];

function resolveBuFromText(text: string): { code: string; label: string } {
  const prod = (text || "").toUpperCase();
  if (prod.includes("CLÍNICA") || prod.includes("CLINICA")) return { code: "MEDCOF_CLINICA_MEDICA", label: "Clínica Médica" };
  if (prod.includes("CIRURGIA")) return { code: "MEDCOF_CIRURGIA", label: "Cirurgia Geral" };
  if (prod.includes("R+ GO") || prod.includes("GINECO") || prod.includes("OBSTETR")) return { code: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA", label: "Ginecologia e Obstetrícia" };
  if (prod.includes("CARDIO")) return { code: "MEDCOF_CARDIOLOGIA", label: "Cardiologia" };
  if (prod.includes("PEDIAT")) return { code: "MEDCOF_PEDIATRIA", label: "Pediatria" };
  if (prod.includes("DERMATO")) return { code: "MEDCOF_DERMATOLOGIA", label: "Dermatologia" };
  if (prod.includes("ANESTESIO")) return { code: "MEDCOF_ANESTESIOLOGIA", label: "Anestesiologia" };
  if (prod.includes("REVALIDA")) return { code: "MEDCOF_REVALIDA", label: "Revalida" };
  if (prod.includes("ENDOCRINO")) return { code: "MEDCOF_ENDOCRINOLOGIA", label: "Endocrinologia" };
  if (prod.includes("OFTALMO")) return { code: "MEDCOF_OFTALMOLOGIA", label: "Oftalmologia" };
  if (prod.includes("ORTOPE")) return { code: "MEDCOF_ORTOPEDIA", label: "Ortopedia" };
  if (prod.includes("OTORRINO")) return { code: "MEDCOF_OTORRINOLARINGOLOGIA", label: "Otorrinolaringologia" };
  if (prod.includes("RADIO")) return { code: "MEDCOF_RADIOLOGIA", label: "Radiologia" };
  if (prod.includes("UROLOG")) return { code: "MEDCOF_UROLOGIA", label: "Urologia" };
  if (prod.includes("USA") || prod.includes("USMLE")) return { code: "MEDCOF_USA", label: "MedCof USA" };
  if (prod.includes("CONCURSO") || prod.includes("CONCURSUS")) return { code: "MEDCOF_CONCURSUS", label: "Concursus" };
  if (prod.includes("ENAMED")) return { code: "MEDCOF_ENAMED", label: "Enamed" };
  if (prod.includes("LIFEHACKS") || prod.includes("PRONTO SOCORRO") || prod.includes("PS")) return { code: "MEDCOF_LIFEHACKS", label: "Lifehacks / PS" };
  if (prod.includes("INTERNATO")) return { code: "MEDCOF_INTERNATO", label: "Internato" };
  if (prod.includes("EMERGÊNCIA") || prod.includes("EMERGENCIA")) return { code: "MEDCOF_MEDICINA_DE_EMERGENCIA", label: "Medicina de Emergência" };
  if (prod.includes("INTENSIVA") || prod.includes("CTI") || prod.includes("UTI")) return { code: "MEDCOF_MEDICINA_INTENSIVA", label: "Medicina Intensiva" };

  return { code: "MEDCOF_RESIDENCIA", label: "Residência Médica" };
}

function parseCurrency(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  // Converte "6921,66", "10497", "R$ 11.350,20"
  const clean = String(val)
    .replace(/[R$\s"]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function parseBrazilianDate(rawDate: string): { iso: string; timestamp: number } {
  if (!rawDate) {
    const d = new Date();
    return { iso: d.toISOString(), timestamp: d.getTime() };
  }
  // Se for "DD/MM/AAAA"
  const brMatch = rawDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (brMatch) {
    const dia = parseInt(brMatch[1], 10);
    const mes = parseInt(brMatch[2], 10) - 1;
    const ano = parseInt(brMatch[3], 10);
    const d = new Date(ano, mes, dia, 12, 0, 0);
    return { iso: d.toISOString(), timestamp: d.getTime() };
  }
  const d = new Date(rawDate);
  const valid = isNaN(d.getTime()) ? new Date() : d;
  return { iso: valid.toISOString(), timestamp: valid.getTime() };
}

/**
 * Faz a busca da planilha Google Sheets em Real-Time via CSV export ou GViz.
 */
export async function fetchGoogleSheetsSalesData(
  sheetId = DEFAULT_SHEET_ID,
  gid = DEFAULT_GID,
  customCsvUrl?: string,
): Promise<{
  success: boolean;
  transactions: SaleTransaction[];
  sourceType: "google_sheets_live" | "google_sheets_gviz" | "sample_fallback";
}> {
  const envUrl = process.env.GOOGLE_SHEETS_SALES_CSV_URL;
  const urls = [
    customCsvUrl,
    envUrl,
    DEFAULT_LIVE_CSV_URL,
    `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/pub?gid=${gid}&single=true&output=csv`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/pub?output=csv`,
  ].filter((u): u is string => Boolean(u && u.trim()));

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        next: { revalidate: 30 }, // Cache revalidado a cada 30 segundos
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CentralDoMkt/1.0",
        },
      });

      if (response.ok) {
        const text = await response.text();
        // Confere se o retorno é CSV válido e não página HTML de login
        if (text && !text.includes("<!DOCTYPE html") && text.includes(",")) {
          const parsed = parseCsvSalesData(text);
          if (parsed.length > 0) {
            return {
              success: true,
              transactions: parsed,
              sourceType: "google_sheets_live",
            };
          }
        }
      }
    } catch {
      // continua para a próxima tentativa ou fallback
    }
  }

  // Fallback com base de dados de demonstração rica e estruturada para as 23 BUs da MedCof
  return {
    success: false,
    transactions: generateRealisticSalesDataset(),
    sourceType: "sample_fallback",
  };
}

/**
 * Parser de CSV flexível para planilhas brasileiras de vendas
 */
function parseCsvSalesData(csvContent: string): SaleTransaction[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  // Parse do cabeçalho
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());

  // Procura índices das colunas reais da planilha MedCof:
  // id_venda,dt_venda,plano,produto,nome_aluno,email_aluno,telefone_aluno,valor_pago
  const idIdx = headers.findIndex((h) => h.includes("id_venda") || h.includes("id"));
  const dateIdx = headers.findIndex((h) => h.includes("dt_venda") || h.includes("data") || h.includes("date"));
  const productIdx = headers.findIndex((h) => h.includes("produto") || h.includes("product") || h.includes("curso"));
  const planoIdx = headers.findIndex((h) => h.includes("plano"));
  const studentIdx = headers.findIndex((h) => h.includes("nome_aluno") || h.includes("aluno") || h.includes("cliente"));
  const emailIdx = headers.findIndex((h) => h.includes("email"));
  const amountIdx = headers.findIndex((h) => h.includes("valor_pago") || h.includes("valor") || h.includes("preço") || h.includes("total"));
  const methodIdx = headers.findIndex((h) => h.includes("forma") || h.includes("pagamento") || h.includes("metodo"));
  const statusIdx = headers.findIndex((h) => h.includes("status") || h.includes("situacao"));

  const transactions: SaleTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const rawId = idIdx >= 0 && cols[idIdx] ? cols[idIdx] : `sale_${i}`;
    const rawDate = dateIdx >= 0 ? cols[dateIdx] : "";
    const rawProduct = productIdx >= 0 && cols[productIdx] ? cols[productIdx] : planoIdx >= 0 ? cols[planoIdx] : "Extensivo MedCof";
    const rawPlano = planoIdx >= 0 ? cols[planoIdx] : "";
    const rawBuyer = studentIdx >= 0 ? cols[studentIdx] : undefined;
    const rawEmail = emailIdx >= 0 ? cols[emailIdx] : undefined;
    const rawAmount = amountIdx >= 0 ? cols[amountIdx] : "1000";
    const rawMethod = methodIdx >= 0 ? cols[methodIdx].toLowerCase() : "credit_card";
    const rawStatus = statusIdx >= 0 ? cols[statusIdx].toLowerCase() : "approved";

    const buInfo = resolveBuFromText(rawProduct + " " + rawPlano);
    const amount = parseCurrency(rawAmount);
    if (amount <= 0) continue;

    const { iso, timestamp } = parseBrazilianDate(rawDate);

    let paymentMethod: SaleTransaction["paymentMethod"] = "credit_card";
    if (rawMethod.includes("pix")) paymentMethod = "pix";
    else if (rawMethod.includes("bol")) paymentMethod = "boleto";

    let status: SaleTransaction["status"] = "approved";
    if (rawStatus.includes("pend") || rawStatus.includes("aguard")) status = "pending";
    else if (rawStatus.includes("canc") || rawStatus.includes("recus")) status = "cancelled";
    else if (rawStatus.includes("estorn") || rawStatus.includes("reemb")) status = "refunded";

    transactions.push({
      id: rawId,
      date: iso,
      timestamp,
      product: rawProduct,
      businessUnitCode: buInfo.code,
      businessUnitLabel: buInfo.label,
      amount,
      quantity: 1,
      paymentMethod,
      status,
      buyerName: rawBuyer,
      buyerEmail: rawEmail,
      utmSource: "google_sheets_live",
    });
  }

  return transactions;
}


function parseCsvLine(line: string): string[] {
  const result: string[] = [];
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

/**
 * Gera dados de vendas realistas e consistentes para as 23 BUs da MedCof
 * cobrindo os últimos 30 dias para análise completa de derivadas e tickets.
 */
function generateRealisticSalesDataset(): SaleTransaction[] {
  const list: SaleTransaction[] = [];
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // Produtos e tickets típicos MedCof
  const products = [
    { name: "Extensivo R1 Anual", price: 4980, buIndex: 19 },
    { name: "Curso Especialidades R+", price: 3890, buIndex: 1 },
    { name: "Revalida Intensivo", price: 2970, buIndex: 20 },
    { name: "Sprint Final Cirurgia", price: 1890, buIndex: 2 },
    { name: "QBank Prime + Flashcards", price: 980, buIndex: 3 },
    { name: "Imersão Cardiologia", price: 2490, buIndex: 1 },
    { name: "Preparatório Anestesiologia", price: 3200, buIndex: 0 },
    { name: "Mentoria EUA - USMLE", price: 5900, buIndex: 22 },
  ];

  const paymentMethods: SaleTransaction["paymentMethod"][] = [
    "pix",
    "pix",
    "pix",
    "credit_card",
    "credit_card",
    "boleto",
  ];

  // Gera vendas progressivas ao longo de 30 dias com ritmo acelerado
  for (let day = 30; day >= 0; day--) {
    const dayTimestamp = now - day * DAY_MS;
    // Curva de crescimento com picos de campanha (derivada positiva)
    const baseDailySales = Math.floor(12 + (30 - day) * 1.5 + Math.sin(day) * 6);

    for (let s = 0; s < baseDailySales; s++) {
      const prod = products[Math.floor(Math.random() * products.length)];
      const bu = BU_CATALOG[prod.buIndex % BU_CATALOG.length];
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const statusRand = Math.random();
      const status: SaleTransaction["status"] =
        statusRand > 0.12 ? "approved" : statusRand > 0.04 ? "pending" : "cancelled";

      // Variação suave de ticket com descontos/lotes
      const discount = Math.random() > 0.7 ? 0.9 : 1.0;
      const amount = Math.round(prod.price * discount);

      // Espalha as vendas ao longo do dia
      const saleTime = dayTimestamp + Math.floor(Math.random() * DAY_MS);

      list.push({
        id: `tx_${day}_${s}`,
        date: new Date(saleTime).toISOString(),
        timestamp: saleTime,
        product: prod.name,
        businessUnitCode: bu.code,
        businessUnitLabel: bu.label,
        amount,
        quantity: 1,
        paymentMethod: method,
        status,
        utmSource: Math.random() > 0.5 ? "instagram_ads" : "google_search",
        utmCampaign: "campanha_turma_2026",
      });
    }
  }

  return list;
}

/**
 * Função de alto nível para carregar as métricas de vendas calculadas em Real-Time
 */
export async function getLiveSalesAnalytics(options: {
  targetBuCode?: string;
  startDate?: string;
  endDate?: string;
} = {}): Promise<SalesAnalyticsResult> {
  const { transactions, sourceType } = await fetchGoogleSheetsSalesData();
  return calculateSalesAnalytics(transactions, {
    ...options,
    dataSourceType: sourceType,
  });
}
