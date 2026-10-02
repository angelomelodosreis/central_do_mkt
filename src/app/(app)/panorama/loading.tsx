import { PageHeaderSkeleton, MetricGridSkeleton, ChartSkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function PanoramaLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeaderSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Grid com 4 KPIs Executivos */}
      <MetricGridSkeleton count={4} />

      {/* Controles de Filtro e Abas */}
      <div className="flex gap-3 border-b border-slate-200 pb-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>

      {/* Gráfico Principal de Vendas e Derivada */}
      <ChartSkeleton height="h-80" />

      {/* Grade com Decomposição e Tabela */}
      <div className="grid gap-6 lg:grid-cols-2">
        <TableSkeleton cols={4} rows={6} />
        <TableSkeleton cols={4} rows={6} />
      </div>
    </div>
  );
}
