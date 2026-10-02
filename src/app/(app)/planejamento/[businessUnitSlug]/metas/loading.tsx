import { PageHeaderSkeleton, TableSkeleton, CardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function MetasLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeaderSkeleton />

      {/* Metas 2.0 Tabela Executiva Skeleton */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <TableSkeleton cols={5} rows={4} />
      </div>

      {/* Alocação Semestral */}
      <div className="pt-6 border-t border-slate-200 space-y-4">
        <Skeleton className="h-5 w-60" />
        <div className="grid gap-4 md:grid-cols-2">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      </div>
    </div>
  );
}
