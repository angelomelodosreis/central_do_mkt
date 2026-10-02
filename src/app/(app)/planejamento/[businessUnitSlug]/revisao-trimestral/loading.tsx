import { PageHeaderSkeleton, CardSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function RevisaoTrimestralLoading() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeaderSkeleton />

      {/* Banner de Cadência Trimestral */}
      <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-4 space-y-2">
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>

      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-8 w-36 rounded-lg" />
      </div>

      <CardSkeleton rows={4} />
    </div>
  );
}
