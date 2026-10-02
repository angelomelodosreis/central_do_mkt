import { PageHeaderSkeleton, MetricGridSkeleton, CardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function PainelLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeaderSkeleton />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      <MetricGridSkeleton count={4} />

      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
