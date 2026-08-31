import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? (
        <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * Título de uma seção DENTRO de um cartão.
 *
 * Existe porque as telas vinham escrevendo `<h3>` à mão, e cada uma escolhia o
 * seu: seis combinações diferentes de tamanho, peso, cor e caixa alta para o
 * mesmo nível de informação. A hierarquia deixava de ser hierarquia — virava
 * decoração, e o olho não conseguia mais usar o tamanho do texto para saber
 * onde estava.
 *
 * A escada da ferramenta, de cima para baixo:
 *   PageHeader   → o assunto da tela
 *   CardHeader   → o assunto do cartão
 *   SectionTitle → uma divisão dentro do cartão   ← aqui
 *   texto        → o conteúdo
 */
export function SectionTitle({
  children,
  count,
  action,
  className,
}: {
  children: ReactNode;
  /** Número ao lado do título, quando a seção é uma lista. */
  count?: number;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {children}
        {typeof count === "number" ? (
          <span className="ml-1.5 font-normal tabular-nums text-slate-500">
            {count}
          </span>
        ) : null}
      </h3>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
