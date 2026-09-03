import { PageHeader } from "@/components/ui/card";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";

/**
 * Carregamento da área de tarefas.
 *
 * Existe porque a página é `force-dynamic` e consulta quatro listas: entre o
 * clique no menu e o conteúdo havia um intervalo em que a tela anterior
 * continuava inteira, e o clique parecia não ter funcionado.
 */
export default function TasksLoading() {
  return (
    <>
      <PageHeader title="Tarefas" description="Carregando a sua fila…" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-10 w-80 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
        <SkeletonList rows={4} />
      </div>
    </>
  );
}
