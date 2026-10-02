import { PageHeaderSkeleton, MetricGridSkeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function GlobalAppLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeaderSkeleton />
      <MetricGridSkeleton count={4} />
      <CardSkeleton rows={5} />
    </div>
  );
}
