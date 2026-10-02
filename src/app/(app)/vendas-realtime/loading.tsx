import { PageHeaderSkeleton, MetricGridSkeleton, ChartSkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function VendasRealtimeLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeaderSkeleton />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-36 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* Grid com 4 KPIs: Faturamento, Velocidade dV/dt, Ticket Médio, Aceleração */}
      <MetricGridSkeleton count={4} />

      {/* Gráfico dV/dt */}
      <ChartSkeleton height="h-72" />

      {/* Feed ao vivo de transações */}
      <TableSkeleton cols={5} rows={8} />
    </div>
  );
}
