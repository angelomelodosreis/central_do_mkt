import type { SaleTransaction, SalesAnalyticsResult } from "./types";
import { calculateSalesAnalytics } from "./calculations";

export const DEFAULT_SHEET_ID = "1pCErQiwZ6CnMDqBm34lyFjzDhnomTlSHltgnF1IJRdw";
export const DEFAULT_GID = "1830309116";

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
  const clean = (text || "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");
  const found = BU_CATALOG.find(
    (b) =>
      clean.includes(b.code) ||
      clean.includes(b.slug.toUpperCase()) ||
      clean.includes(b.label.toUpperCase().replace(/\s+/g, "_")),
  );
  if (found) return { code: found.code, label: found.label };

  // Fallback para Cardiologia ou Cirurgia
  return { code: "MEDCOF_RESIDENCIA", label: "Residência Médica" };
}

function parseCurrency(val: string | number): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  // Converte "R$ 3.450,00" ou "3450.00"
  const clean = String(val)
    .replace(/[R$\s]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
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
              sourceType: url.includes("gviz")
                ? "google_sheets_gviz"
                : "google_sheets_live",
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

  // Procura índices das colunas
  const dateIdx = headers.findIndex((h) => h.includes("data") || h.includes("date") || h.includes("criado"));
  const amountIdx = headers.findIndex((h) => h.includes("valor") || h.includes("preço") || h.includes("amount") || h.includes("faturamento") || h.includes("total"));
  const productIdx = headers.findIndex((h) => h.includes("produto") || h.includes("product") || h.includes("curso"));
  const buIdx = headers.findIndex((h) => h.includes("bu") || h.includes("business unit") || h.includes("especialidade"));
  const methodIdx = headers.findIndex((h) => h.includes("forma") || h.includes("pagamento") || h.includes("metodo") || h.includes("payment"));
  const statusIdx = headers.findIndex((h) => h.includes("status") || h.includes("situacao") || h.includes("estado"));

  const transactions: SaleTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 2) continue;

    const rawDate = dateIdx >= 0 ? cols[dateIdx] : new Date().toISOString();
    const rawAmount = amountIdx >= 0 ? cols[amountIdx] : "1000";
    const rawProduct = productIdx >= 0 ? cols[productIdx] : "Curso Extensivo MedCof";
    const rawBu = buIdx >= 0 ? cols[buIdx] : rawProduct;
    const rawMethod = methodIdx >= 0 ? cols[methodIdx].toLowerCase() : "pix";
    const rawStatus = statusIdx >= 0 ? cols[statusIdx].toLowerCase() : "approved";

    const buInfo = resolveBuFromText(rawBu);
    const amount = parseCurrency(rawAmount);
    if (amount <= 0) continue;

    let paymentMethod: SaleTransaction["paymentMethod"] = "other";
    if (rawMethod.includes("pix")) paymentMethod = "pix";
    else if (rawMethod.includes("cart") || rawMethod.includes("cred")) paymentMethod = "credit_card";
    else if (rawMethod.includes("bol")) paymentMethod = "boleto";

    let status: SaleTransaction["status"] = "approved";
    if (rawStatus.includes("pend") || rawStatus.includes("aguard")) status = "pending";
    else if (rawStatus.includes("canc") || rawStatus.includes("recus")) status = "cancelled";
    else if (rawStatus.includes("estorn") || rawStatus.includes("reemb")) status = "refunded";

    const dateObj = new Date(rawDate);
    const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

    transactions.push({
      id: `sale_${i}_${validDate.getTime()}`,
      date: validDate.toISOString(),
      timestamp: validDate.getTime(),
      product: rawProduct || "Extensivo MedCof 2026",
      businessUnitCode: buInfo.code,
      businessUnitLabel: buInfo.label,
      amount,
      quantity: 1,
      paymentMethod,
      status,
      utmSource: "google_ads",
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
