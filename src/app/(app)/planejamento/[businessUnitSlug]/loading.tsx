import { PageHeaderSkeleton, TabsSkeleton, MetricGridSkeleton, CardSkeleton } from "@/components/ui/skeleton";

export default function BusinessUnitPlanningLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeaderSkeleton />
      <TabsSkeleton count={9} />
      <MetricGridSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton rows={4} />
        <CardSkeleton rows={4} />
      </div>
    </div>
  );
}
