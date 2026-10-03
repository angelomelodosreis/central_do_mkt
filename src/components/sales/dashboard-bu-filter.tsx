"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Building2, Filter, X, Check } from "lucide-react";

export interface DashboardBuUnit {
  id: string;
  label: string;
  slug: string;
  divisionName?: string | null;
}

export function DashboardBuFilter({
  accessibleUnits,
  activeBuCode,
  isMaster,
}: {
  accessibleUnits: DashboardBuUnit[];
  activeBuCode?: string | null;
  isMaster: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function handleSelectBu(newBu: string) {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (!newBu || newBu === "all") {
        params.delete("bu");
      } else {
        params.set("bu", newBu);
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  // Se o usuário só tem acesso a 1 BU
  if (accessibleUnits.length === 1 && !isMaster) {
    const singleUnit = accessibleUnits[0];
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-2xs text-xs">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Building2 className="size-3.5" />
          </span>
          <span className="text-slate-500">Seu escopo exclusivo de liderança:</span>
          <strong className="text-slate-900 font-semibold">{singleUnit.label}</strong>
          {singleUnit.divisionName && (
            <span className="text-slate-400">({singleUnit.divisionName})</span>
          )}
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
          Dados filtrados para sua Business Unit
        </span>
      </div>
    );
  }

  // Se tem 0 BUs e não é master
  if (accessibleUnits.length === 0 && !isMaster) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-900">
        Você ainda não foi vinculado a uma Business Unit. Fale com um administrador para obter acesso às métricas da sua unidade.
      </div>
    );
  }

  const selectedUnit = accessibleUnits.find(
    (u) => u.id === activeBuCode || u.slug === activeBuCode,
  );

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <Filter className="size-3.5 text-slate-400" />
          <span>Filtrar por Business Unit:</span>
        </div>

        {/* Seletor dropdown nativo e responsivo com estilo MedCof */}
        <div className="relative">
          <select
            value={activeBuCode || ""}
            onChange={(e) => handleSelectBu(e.target.value)}
            disabled={isPending}
            className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 pr-8 text-xs font-medium text-slate-800 shadow-2xs hover:border-slate-300 focus:border-brand-500 focus:bg-white focus:outline-none transition cursor-pointer"
          >
            <option value="">
              {isMaster
                ? `Todas as 23 BUs (Visão Consolidada)`
                : `Todas as minhas BUs (${accessibleUnits.length} unidades)`}
            </option>
            {accessibleUnits.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} {u.divisionName ? `· ${u.divisionName}` : ""}
              </option>
            ))}
          </select>
        </div>

        {activeBuCode && (
          <button
            type="button"
            onClick={() => handleSelectBu("")}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition"
            title="Limpar filtro e ver todas as BUs acessíveis"
          >
            <X className="size-3 text-slate-400" />
            <span>Ver todas</span>
          </button>
        )}
      </div>

      {/* Badge de status do escopo ativo */}
      <div className="flex items-center gap-2 text-xs">
        {isPending ? (
          <span className="flex items-center gap-1.5 text-blue-600 font-medium animate-pulse">
            <span className="size-1.5 rounded-full bg-blue-600 animate-ping" />
            Atualizando métricas...
          </span>
        ) : selectedUnit ? (
          <span className="flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-200/70">
            <span className="size-1.5 rounded-full bg-blue-600" />
            Filtrado: {selectedUnit.label}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            {isMaster
              ? "Consolidado Geral (23 BUs)"
              : `Consolidado (${accessibleUnits.length} BUs do seu escopo)`}
          </span>
        )}
      </div>
    </div>
  );
}
