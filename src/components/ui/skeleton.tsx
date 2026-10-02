import { cn } from "@/lib/utils/cn";

/**
 * Elemento base de Skeleton com animação de pulso e shimmer refinado.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-pulse rounded-md bg-slate-200/80 transition-opacity",
        className,
      )}
    />
  );
}

/** Cabeçalho padrão de página com título e descrição simulados */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** Abas horizontais em carregamento */
export function TabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="mb-6 flex gap-3 border-b border-slate-200 pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-7 w-24 rounded-lg" />
      ))}
    </div>
  );
}

/** Card de Métrica / KPI Executivo em carregamento */
export function MetricCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-7 w-32" />
      <div className="mt-2 flex items-center gap-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

/** Grade de Métricas */
export function MetricGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <MetricCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Cartão genérico com cabeçalho e corpo */
export function CardSkeleton({
  rows = 3,
  hasHeader = true,
}: {
  rows?: number;
  hasHeader?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {hasHeader && (
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn(
              "h-10 w-full rounded-lg",
              i % 2 === 0 ? "bg-slate-100" : "bg-slate-50",
            )}
          />
        ))}
      </div>
    </div>
  );
}

/** Simulação de Gráfico de Vendas / Séries Temporais */
export function ChartSkeleton({ height = "h-72" }: { height?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3.5 w-60" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-20 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </div>
      <div className={cn("flex items-end gap-2 pt-6 pb-2", height)}>
        {Array.from({ length: 16 }).map((_, i) => {
          const heights = ["h-16", "h-28", "h-40", "h-24", "h-48", "h-36", "h-56", "h-32"];
          const h = heights[i % heights.length];
          return (
            <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1">
              <Skeleton className={cn("w-full rounded-t", h)} />
              <Skeleton className="h-2 w-4" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Tabela Estruturada em Carregamento */
export function TableSkeleton({
  cols = 5,
  rows = 5,
}: {
  cols?: number;
  rows?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton
            key={i}
            className={cn("h-4", i === 0 ? "w-1/4" : "flex-1")}
          />
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton
                key={c}
                className={cn("h-3.5", c === 0 ? "w-1/4" : "flex-1")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Lista em carregamento, dentro de um cartão. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs">
      <ul className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <span className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </span>
            <Skeleton className="h-8 w-24 shrink-0 rounded-lg" />
          </li>
        ))}
      </ul>
    </div>
  );
}
