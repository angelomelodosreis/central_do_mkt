"use client";

import { Download } from "lucide-react";
import type { DayByDayPoint, BuComparisonStat } from "@/lib/modules/sales/types";

export function ExportSalesButton({
  series,
  buStats,
  currentLabel,
  previousLabel,
}: {
  series: DayByDayPoint[];
  buStats: BuComparisonStat[];
  currentLabel: string;
  previousLabel: string;
}) {
  function handleExportCsv() {
    let csv = `Relatorio Comparativo de Vendas MedCof - ${currentLabel} vs ${previousLabel}\r\n\r\n`;

    // 1. Tabela Dia a Dia
    csv += `Dia,${currentLabel} Receita,${currentLabel} Acumulado,${previousLabel} Receita,${previousLabel} Acumulado,${currentLabel} Vendas,${previousLabel} Vendas\r\n`;
    for (const row of series) {
      const curRev = row.currentRevenue !== null ? `"${row.currentRevenue.toFixed(2).replace(".", ",")}"` : `""`;
      const curCum = row.currentCumulativeRevenue !== null ? `"${row.currentCumulativeRevenue.toFixed(2).replace(".", ",")}"` : `""`;
      const prevRev = row.previousRevenue !== null ? `"${row.previousRevenue.toFixed(2).replace(".", ",")}"` : `""`;
      const prevCum = row.previousCumulativeRevenue !== null ? `"${row.previousCumulativeRevenue.toFixed(2).replace(".", ",")}"` : `""`;
      const curSales = row.currentSales !== null ? row.currentSales : "";
      const prevSales = row.previousSales !== null ? row.previousSales : "";

      csv += `${row.day},${curRev},${curCum},${prevRev},${prevCum},${curSales},${prevSales}\r\n`;
    }

    csv += `\r\n\r\nDesempenho por Business Unit\r\n`;
    csv += `Business Unit,${currentLabel} Receita,${previousLabel} Receita,Variacao R$,Crescimento %,Vendas Atual,Vendas Anterior,Ticket Medio Atual\r\n`;
    for (const b of buStats) {
      csv += `"${b.buLabel}","${b.currentRevenue.toFixed(2).replace(".", ",")}","${b.previousRevenue.toFixed(2).replace(".", ",")}","${b.revenueDelta.toFixed(2).replace(".", ",")}",${b.revenueGrowthPercent.toFixed(1).replace(".", ",")},${b.currentSales},${b.previousSales},"${b.currentAvgTicket.toFixed(2).replace(".", ",")}"\r\n`;
    }

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `medcof_vendas_comparativo_${currentLabel.replace(/[\/\s]/g, "_")}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <button
      type="button"
      onClick={handleExportCsv}
      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900"
      title="Exportar dados comparativos para CSV / Excel"
    >
      <Download className="size-3.5 text-slate-500" />
      <span>Exportar CSV</span>
    </button>
  );
}
