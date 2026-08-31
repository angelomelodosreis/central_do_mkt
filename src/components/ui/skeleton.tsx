import { cn } from "@/lib/utils/cn";

/**
 * Marcação de carregamento.
 *
 * Uma silhueta do conteúdo, e não um spinner centralizado: a página de tarefas
 * é uma lista de altura previsível, e a silhueta faz o conteúdo "encaixar" no
 * lugar em vez de empurrar a tela quando chega.
 *
 * `aria-hidden` porque quem usa leitor de tela já ouviu a mudança de rota — o
 * anúncio de uma dúzia de retângulos vazios só atrapalharia.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "block animate-pulse rounded-md bg-slate-200/70",
        className,
      )}
    />
  );
}

/** Uma lista em carregamento, dentro de um cartão. */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ul className="divide-y divide-slate-100">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <span className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </span>
            <Skeleton className="h-8 w-24 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}
