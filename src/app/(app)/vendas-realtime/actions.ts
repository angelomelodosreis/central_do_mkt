"use server";

import { revalidatePath } from "next/cache";
import {
  getLiveSalesAnalytics,
  getLiveComparativeAnalytics,
} from "@/lib/modules/sales/google-sheets-client";
import type { SalesAnalyticsResult } from "@/lib/modules/sales/types";

export async function refreshSalesDataAction(options?: {
  targetBuCode?: string;
  startDate?: string;
  endDate?: string;
}): Promise<SalesAnalyticsResult> {
  revalidatePath("/vendas-realtime");
  revalidatePath("/painel");
  return getLiveSalesAnalytics(options);
}

export async function getComparativeSalesAction(options?: {
  currentMonthKey?: string;
  previousMonthKey?: string;
  targetBuCode?: string;
}) {
  return getLiveComparativeAnalytics(options);
}

