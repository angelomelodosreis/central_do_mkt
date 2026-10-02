import { PageHeaderSkeleton, MetricGridSkeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function ResultadosLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeaderSkeleton />
      <MetricGridSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton rows={5} />
        <CardSkeleton rows={5} />
      </div>
    </div>
  );
}
