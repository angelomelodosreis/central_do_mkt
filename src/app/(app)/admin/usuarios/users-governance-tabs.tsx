"use client";

import { useState, type ReactNode } from "react";
import { Users, Grid3X3 } from "lucide-react";

import { GovernanceMatrix } from "./governance-matrix";
import { UsersPanel } from "./users-panel";
import type { GovernanceMatrixData } from "@/lib/modules/access/cascade";
import { cn } from "@/lib/utils/cn";

export function UsersGovernanceTabs({
  matrixData,
  people,
  units,
}: {
  matrixData: GovernanceMatrixData;
  people: Parameters<typeof UsersPanel>[0]["people"];
  units: Parameters<typeof UsersPanel>[0]["units"];
}) {
  const [activeTab, setActiveTab] = useState<"matriz" | "lista">("matriz");

  return (
    <div className="space-y-6">
      {/* Seletor de Visão Principal */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab("matriz")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all",
            activeTab === "matriz"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
          )}
        >
          <Grid3X3 className="size-4" />
          <span>Matriz de Governança · Quem Controla o Quê</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lista")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-all",
            activeTab === "lista"
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
          )}
        >
          <Users className="size-4" />
          <span>Lista de Usuários ({people.length})</span>
        </button>
      </div>

      {/* Conteúdo da Aba */}
      {activeTab === "matriz" ? (
        <GovernanceMatrix data={matrixData} />
      ) : (
        <UsersPanel people={people} units={units} />
      )}
    </div>
  );
}
