"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { isFullAccessMaster } from "@/lib/modules/access/scope";
import { listAccessibleBusinessUnits, seesAllBusinessUnits } from "@/lib/modules/org/scope";
import { normalizeBuCode } from "@/lib/modules/sales/bu-catalog";
import {
  getLiveSalesAnalytics,
  getLiveComparativeAnalytics,
} from "@/lib/modules/sales/google-sheets-client";
import type { SalesAnalyticsResult } from "@/lib/modules/sales/types";

async function resolveScopedBuCodes(
  requestedCodes?: string | string[],
): Promise<string[] | undefined> {
  const currentUser = await requirePermission("panorama", "view");
  const isMaster =
    isFullAccessMaster({
      email: currentUser.email,
      name: currentUser.name,
    }) || seesAllBusinessUnits(currentUser);

  if (isMaster) {
    if (!requestedCodes) return undefined;
    return Array.isArray(requestedCodes) ? requestedCodes : [requestedCodes];
  }

  const accessibleUnits = await listAccessibleBusinessUnits(currentUser);
  const allowedSet = new Set<string>();
  for (const u of accessibleUnits) {
    if (u.id) allowedSet.add(u.id);
    if (u.slug) {
      allowedSet.add(u.slug.toLowerCase());
      const norm = normalizeBuCode(u.slug);
      if (norm) allowedSet.add(norm.toUpperCase());
    }
    if (u.label) {
      const norm = normalizeBuCode(u.label);
      if (norm) allowedSet.add(norm.toUpperCase());
    }
  }

  const userDefaultCodes = accessibleUnits
    .map((u) => normalizeBuCode(u.slug) || normalizeBuCode(u.label) || u.slug)
    .filter(Boolean) as string[];

  if (!requestedCodes || (Array.isArray(requestedCodes) && requestedCodes.length === 0)) {
    return userDefaultCodes.length > 0 ? userDefaultCodes : ["__NONE__"];
  }

  const requestedList = Array.isArray(requestedCodes) ? requestedCodes : [requestedCodes];
  const filtered = requestedList.filter((c) => {
    const clean = c.trim();
    const norm = normalizeBuCode(clean);
    return (
      allowedSet.has(clean) ||
      allowedSet.has(clean.toLowerCase()) ||
      (norm && allowedSet.has(norm.toUpperCase()))
    );
  });

  return filtered.length > 0
    ? filtered
    : userDefaultCodes.length > 0
      ? userDefaultCodes
      : ["__NONE__"];
}

export async function refreshSalesDataAction(options?: {
  targetBuCode?: string | string[];
  targetBuCodes?: string[];
  startDate?: string;
  endDate?: string;
}): Promise<SalesAnalyticsResult> {
  const effectiveCodes = await resolveScopedBuCodes(
    options?.targetBuCodes ?? options?.targetBuCode,
  );

  revalidatePath("/vendas-realtime");
  revalidatePath("/painel");
  revalidatePath("/panorama");

  return getLiveSalesAnalytics({
    ...options,
    targetBuCodes: effectiveCodes,
    forceRefresh: true,
  });
}

export async function getComparativeSalesAction(options?: {
  currentMonthKey?: string;
  previousMonthKey?: string;
  targetBuCode?: string | string[];
  targetBuCodes?: string[];
  startDate?: string;
  endDate?: string;
  compareStartDate?: string;
  compareEndDate?: string;
}) {
  const effectiveCodes = await resolveScopedBuCodes(
    options?.targetBuCodes ?? options?.targetBuCode,
  );

  return getLiveComparativeAnalytics({
    ...options,
    targetBuCodes: effectiveCodes,
  });
}



