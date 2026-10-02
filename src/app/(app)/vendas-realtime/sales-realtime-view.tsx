"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { SalesKpiCards } from "@/components/sales/sales-kpi-cards";
import { SalesVelocityChart } from "@/components/sales/sales-velocity-chart";
import { TicketTrendChart } from "@/components/sales/ticket-trend-chart";
import { BuSalesBreakdown } from "@/components/sales/bu-sales-breakdown";
import { PaymentMixChart } from "@/components/sales/payment-mix-chart";
import { LiveTransactionsTable } from "@/components/sales/live-transactions-table";
import { refreshSalesDataAction } from "./actions";
import type { SalesAnalyticsResult } from "@/lib/modules/sales/types";

export function SalesRealtimeView({
  initialData,
  userAccessibleBus,
  isMaster,
}: {
  initialData: SalesAnalyticsResult;
  userAccessibleBus: Array<{ id: string; label: string; code?: string | null; slug?: string }>;
  isMaster: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [selectedBu, setSelectedBu] = useState<string>("ALL");
  const [period, setPeriod] = useState<"7d" | "14d" | "30d" | "all">("30d");
  const [isPending, startTransition] = useTransition();

  // Filtragem local conforme período selecionado
  const filteredDailySeries = data.dailySeries.slice(
    period === "7d" ? -7 : period === "14d" ? -14 : period === "30d" ? -30 : 0,
  );

  function handleRefresh() {
    startTransition(async () => {
      try {
        const updated = await refreshSalesDataAction({
          targetBuCode: selectedBu === "ALL" ? undefined : selectedBu,
        });
        setData(updated);
        toast.success("Dados de vendas sincronizados com sucesso!");
      } catch (e) {
        toast.error("Erro ao sincronizar com a planilha.");
      }
    });
  }

  function handleBuChange(buCode: string) {
    setSelectedBu(buCode);
    startTransition(async () => {
      const updated = await refreshSalesDataAction({
        targetBuCode: buCode === "ALL" ? undefined : buCode,
      });
      setData(updated);
    });
  }

  return (
    <div className="space-y-6">
      {/* Barra de Controles & Conexão com Google Sheets */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`size-2.5 rounded-full ${
                data.dataSource.isLive
                  ? "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                  : "bg-brand-500 shadow-[0_0_8px_#3b82f6]"
              }`}
            />
            <span className="text-xs font-semibold text-slate-800">
              {data.dataSource.isLive
                ? "Google Sheets Conectado em Real-Time"
                : "Base MedCof Ativa (23 BUs)"}
            </span>
          </div>

          <a
            href={data.dataSource.sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium text-brand-600 hover:text-brand-800 hover:underline"
            title="Abrir planilha no Google Docs"
          >
            <span>Planilha Google</span>
            <ExternalLink className="size-3" />
          </a>
        </div>

        {/* Filtros por BU e Período */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de BU */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="size-3.5 text-slate-400" />
            <select
              value={selectedBu}
              onChange={(e) => handleBuChange(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-brand-500 focus:outline-none"
            >
              <option value="ALL">
                {isMaster ? "Todas as 23 BUs (Acesso Total)" : "Todas as minhas BUs autorizadas"}
              </option>
              {userAccessibleBus.map((bu) => (
                <option key={bu.id} value={bu.code || bu.id}>
                  {bu.label}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Período */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100/60 p-0.5 text-xs">
            {(
              [
                { key: "7d", label: "7 dias" },
                { key: "14d", label: "14 dias" },
                { key: "30d", label: "30 dias" },
                { key: "all", label: "Tudo" },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-lg px-2.5 py-1 font-medium transition ${
                  period === p.key
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Botão de Atualização Manual */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 text-slate-500 ${isPending ? "animate-spin" : ""}`}
            />
            <span>{isPending ? "Atualizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>

      {/* Alerta Informativo de Integração */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs text-blue-900">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <div className="space-y-1">
            <p className="font-semibold">
              Inteligência de Vendas em Real-Time MedCof
            </p>
            <p className="text-blue-800/90 leading-relaxed">
              Métricas matemáticas derivadas (dV/dt e dR/dt), aceleração e ticket médio ponderado calculados automaticamente.
              Para que novas vendas digitadas na sua planilha apareçam diretamente sem precisar de login Google, basta em{" "}
              <strong>Arquivo &rarr; Compartilhar &rarr; Publicar na Web (.csv)</strong> marcar &quot;Republicar automaticamente&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* 1. KPIs Principais */}
      <SalesKpiCards summary={data.summary} />

      {/* 2. Gráfico Principal de Faturamento & Derivada */}
      <SalesVelocityChart data={filteredDailySeries} />

      {/* 3. Grid com Tendência de Ticket Médio, Top BUs e Mix de Pagamento */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TicketTrendChart data={filteredDailySeries} />
        <PaymentMixChart data={data.paymentMix} />
      </div>

      {/* 4. Ranking de Business Units */}
      <BuSalesBreakdown data={data.buBreakdown} />

      {/* 5. Tabela ao Vivo de Transações Recentes */}
      <LiveTransactionsTable
        transactions={data.recentTransactions}
        isLive={data.dataSource.isLive}
      />
    </div>
  );
}
