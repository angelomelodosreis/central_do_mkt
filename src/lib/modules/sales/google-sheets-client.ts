import type { ComparativeAnalysisResult, SaleTransaction, SalesAnalyticsResult } from "./types";
import {
  calculateComparativeAnalysis,
  calculateProjections,
  calculateSalesAnalytics,
  getAvailableMonths,
  getMonthlyAggregations,
  type MonthlyAggregatePoint,
  type SalesProjections,
} from "./calculations";


export const DEFAULT_SHEET_ID = "1pCErQiwZ6CnMDqBm34lyFjzDhnomTlSHltgnF1IJRdw";
export const DEFAULT_GID = "1830309116";
export const DEFAULT_LIVE_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRRHbUHQxiRh3LiC8tKGpAPkhBRfcxkKucIYCXFuxmCRP9oX9LCxXTeQOhPt0eqAvF4kXNXvQATwvFJ/pub?output=csv";

import { BU_CATALOG, resolveBuFromText } from "./bu-catalog";
export { BU_CATALOG, resolveBuFromText } from "./bu-catalog";
export type { MedcofBuDef } from "./bu-catalog";



export function parseCurrency(val: string | number): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const s = String(val).replace(/[R$\s"]/g, "").trim();
  if (!s) return 0;

  // Se contém '.' e ',', '.' é milhar e ',' é decimal (padrão pt-BR: "1.250,50")
  if (s.includes(".") && s.includes(",")) {
    const clean = s.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // Se contém ',', trata como decimal pt-BR (ex: "1250,50")
  if (s.includes(",")) {
    const clean = s.replace(",", ".");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  // Se contém apenas '.', verificar se é milhar ("1.250", "10.000") ou decimal US ("1250.50", "98.5")
  if (s.includes(".")) {
    const parts = s.split(".");
    // Múltiplos pontos: sempre milhar (ex: "1.250.000")
    if (parts.length > 2) {
      const clean = s.replace(/\./g, "");
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    // Exato 1 ponto com 3 dígitos na parte fracionária e inteiro até 3 dígitos: milhar ("1.250", "50.000")
    if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
      const clean = s.replace(/\./g, "");
      const num = parseFloat(clean);
      return isNaN(num) ? 0 : num;
    }
    // Caso padrão: decimal US de exportação (ex: "1250.50", "980.00", "49.9")
    const num = parseFloat(s);
    return isNaN(num) ? 0 : num;
  }

  const num = parseFloat(s);
  return isNaN(num) ? 0 : num;
}

export function parseBrazilianDate(rawDate: string): {
  iso: string;
  timestamp: number;
  isValid: boolean;
} {
  if (!rawDate || typeof rawDate !== "string") {
    return { iso: "", timestamp: 0, isValid: false };
  }
  const trimmed = rawDate.trim();
  if (
    !trimmed ||
    trimmed === "-" ||
    trimmed.toLowerCase() === "n/a" ||
    trimmed.toLowerCase() === "null" ||
    trimmed.toLowerCase() === "undefined"
  ) {
    return { iso: "", timestamp: 0, isValid: false };
  }

  // 1. Formato brasileiro: DD/MM/AAAA [HH:mm[:ss]]
  const brMatch = trimmed.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  );
  if (brMatch) {
    const dia = parseInt(brMatch[1], 10);
    const mes = parseInt(brMatch[2], 10) - 1;
    let ano = parseInt(brMatch[3], 10);
    if (ano < 100) ano += 2000;
    const hora = brMatch[4] !== undefined ? parseInt(brMatch[4], 10) : 12;
    const min = brMatch[5] !== undefined ? parseInt(brMatch[5], 10) : 0;
    const seg = brMatch[6] !== undefined ? parseInt(brMatch[6], 10) : 0;
    const d = new Date(ano, mes, dia, hora, min, seg);
    if (!isNaN(d.getTime())) {
      return { iso: d.toISOString(), timestamp: d.getTime(), isValid: true };
    }
  }

  // 2. Formato ISO / SQL: YYYY-MM-DD [HH:mm[:ss]]
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/,
  );
  if (isoMatch) {
    const ano = parseInt(isoMatch[1], 10);
    const mes = parseInt(isoMatch[2], 10) - 1;
    const dia = parseInt(isoMatch[3], 10);
    const hora = isoMatch[4] !== undefined ? parseInt(isoMatch[4], 10) : 12;
    const min = isoMatch[5] !== undefined ? parseInt(isoMatch[5], 10) : 0;
    const seg = isoMatch[6] !== undefined ? parseInt(isoMatch[6], 10) : 0;
    const d = new Date(ano, mes, dia, hora, min, seg);
    if (!isNaN(d.getTime())) {
      return { iso: d.toISOString(), timestamp: d.getTime(), isValid: true };
    }
  }

  // 3. Fallback para Date parser nativo
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { iso: d.toISOString(), timestamp: d.getTime(), isValid: true };
  }

  return { iso: "", timestamp: 0, isValid: false };
}

type FetchSalesResult = {
  success: boolean;
  transactions: SaleTransaction[];
  sourceType: "google_sheets_live" | "google_sheets_gviz" | "sample_fallback";
};

export interface BuSheetTabDef {
  gid: string;
  tabName: string;
  defaultBuCode: string;
  defaultBuLabel: string;
}

/**
 * Catálogo completo de abas da planilha oficial do Google Sheets (51.600+ vendas)
 * Cobrindo integralmente as 23 Business Units da MedCof
 */
export const BU_SHEET_TABS: BuSheetTabDef[] = [
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

let memoryCachedSales: {
  timestamp: number;
  data: FetchSalesResult;
} | null = null;

const CACHE_TTL_MS = 120_000; // 2 minutos de cache em memória de processo para performance máxima

/**
 * Faz a busca da planilha Google Sheets em Real-Time consolidando todas as 23 BUs.
 */
export async function fetchGoogleSheetsSalesData(
  sheetId = DEFAULT_SHEET_ID,
  gid = DEFAULT_GID,
  customCsvUrl?: string,
  options: {
    forceRefresh?: boolean;
  } = {},
): Promise<FetchSalesResult> {
  const now = Date.now();
  if (
    memoryCachedSales &&
    now - memoryCachedSales.timestamp < CACHE_TTL_MS &&
    memoryCachedSales.data.success &&
    !customCsvUrl &&
    !options.forceRefresh
  ) {
    return memoryCachedSales.data;
  }

  // 1. Se customCsvUrl foi passado explicitamente, busca apenas aquela URL
  if (customCsvUrl) {
    try {
      const response = await fetch(customCsvUrl, {
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CentralDoMkt/1.0",
        },
      });
      if (response.ok) {
        const text = await response.text();
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
      // fallback
    }
  }

  // 2. Busca e consolida todas as abas das 23 Business Units em paralelo
  try {
    const tabPromises = BU_SHEET_TABS.map(async (tab) => {
      const url = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRRHbUHQxiRh3LiC8tKGpAPkhBRfcxkKucIYCXFuxmCRP9oX9LCxXTeQOhPt0eqAvF4kXNXvQATwvFJ/pub?gid=${tab.gid}&single=true&output=csv`;
      try {
        const res = await fetch(url, {
          cache: "no-store",
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CentralDoMkt/1.0",
          },
        });
        if (!res.ok) return [];
        const text = await res.text();
        if (!text || text.includes("<!DOCTYPE html") || !text.includes(",")) return [];
        return parseCsvSalesData(text, tab.defaultBuCode, tab.defaultBuLabel, tab.tabName);
      } catch {
        return [];
      }
    });

    const results = await Promise.all(tabPromises);
    const consolidated = results.flat();

    if (consolidated.length > 0) {
      const result: FetchSalesResult = {
        success: true,
        transactions: consolidated,
        sourceType: "google_sheets_live",
      };
      memoryCachedSales = { timestamp: now, data: result };
      return result;
    }
  } catch {
    // continua para fallback
  }

  // 3. Fallback para URL CSV padrão de uma única aba caso o paralelo falhe
  const envUrl = process.env.GOOGLE_SHEETS_SALES_CSV_URL;
  const urls = [
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
        cache: "no-store",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CentralDoMkt/1.0",
        },
      });

      if (response.ok) {
        const text = await response.text();
        if (text && !text.includes("<!DOCTYPE html") && text.includes(",")) {
          const parsed = parseCsvSalesData(text);
          if (parsed.length > 0) {
            const result: FetchSalesResult = {
              success: true,
              transactions: parsed,
              sourceType: "google_sheets_live",
            };
            memoryCachedSales = { timestamp: now, data: result };
            return result;
          }
        }
      }
    } catch {
      // continua
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
function parseCsvSalesData(
  csvContent: string,
  defaultBuCode?: string,
  defaultBuLabel?: string,
  tabName?: string,
): SaleTransaction[] {
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
    let finalBuCode = defaultBuCode || buInfo.code;
    let finalBuLabel = defaultBuLabel || buInfo.label;

    if (defaultBuCode === "RMAIS_ESPECIALIDADES" || !defaultBuCode) {
      finalBuCode = buInfo.code;
      finalBuLabel = buInfo.label;
    } else {
      if (buInfo.code !== "MEDCOF_RESIDENCIA") {
        finalBuCode = buInfo.code;
        finalBuLabel = buInfo.label;
      }
    }

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

    const uniqueId = tabName ? `${tabName.toLowerCase()}_${rawId}` : rawId;

    transactions.push({
      id: uniqueId,
      date: iso,
      timestamp,
      product: rawProduct,
      businessUnitCode: finalBuCode,
      businessUnitLabel: finalBuLabel,
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
  targetBuCode?: string | string[];
  targetBuCodes?: string[];
  startDate?: string;
  endDate?: string;
  forceRefresh?: boolean;
} = {}): Promise<SalesAnalyticsResult> {
  const { transactions, sourceType } = await fetchGoogleSheetsSalesData(
    DEFAULT_SHEET_ID,
    DEFAULT_GID,
    undefined,
    { forceRefresh: options.forceRefresh },
  );
  return calculateSalesAnalytics(transactions, {
    ...options,
    dataSourceType: sourceType,
  });
}

export async function getLiveComparativeAnalytics(options: {
  currentMonthKey?: string;
  previousMonthKey?: string;
  targetBuCode?: string | string[];
  targetBuCodes?: string[];
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
  forceRefresh?: boolean;
} = {}): Promise<{
  comparative: ComparativeAnalysisResult;
  availableMonths: Array<{ key: string; label: string; count: number }>;
}> {
  const { transactions } = await fetchGoogleSheetsSalesData(
    DEFAULT_SHEET_ID,
    DEFAULT_GID,
    undefined,
    { forceRefresh: options.forceRefresh },
  );
  const availableMonths = getAvailableMonths(transactions);
  const comparative = calculateComparativeAnalysis(transactions, options);
  return { comparative, availableMonths };
}

export async function getAllLiveTransactions(options?: {
  forceRefresh?: boolean;
}): Promise<SaleTransaction[]> {
  const { transactions } = await fetchGoogleSheetsSalesData(
    DEFAULT_SHEET_ID,
    DEFAULT_GID,
    undefined,
    { forceRefresh: options?.forceRefresh },
  );
  return transactions;
}

export async function getLiveDashboardData(options?: {
  forceRefresh?: boolean;
}): Promise<{
  liveSales: SalesAnalyticsResult;
  projections: SalesProjections;
  monthlyHistory: MonthlyAggregatePoint[];
}> {
  const { transactions, sourceType } = await fetchGoogleSheetsSalesData(
    DEFAULT_SHEET_ID,
    DEFAULT_GID,
    undefined,
    { forceRefresh: options?.forceRefresh },
  );
  const liveSales = calculateSalesAnalytics(transactions, {
    dataSourceType: sourceType,
  });
  const projections = calculateProjections(transactions);
  const monthlyHistory = getMonthlyAggregations(transactions);
  return { liveSales, projections, monthlyHistory };
}



