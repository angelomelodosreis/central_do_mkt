import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Um cartão: um assunto.
 *
 * Sem sombra. Sombra é para o que FLUTUA — dropdown, drawer, popover. Um
 * cartão que não sai do plano da página não projeta nada, e com dez deles numa
 * tela as dez sombras viravam um cinza sujo entre os blocos. A borda de 1px já
 * diz onde o cartão começa.
 */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-2xl border border-slate-200 bg-white", className)}
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
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-1 pt-4">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
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

/**
 * O vazio, em dois pesos.
 *
 * `page` é a tela inteira sem nada: aí o espaço grande é justo, porque não há
 * mais nada para olhar e o convite à ação é o conteúdo.
 *
 * `inline` é uma lista vazia DENTRO de uma tela que tem outras coisas — uma
 * categoria sem páginas, uma unidade sem gente. Ali o vazio não merece 150px:
 * a ferramenta tinha 44 desses, e a soma deles era a razão de tudo parecer
 * esparso e obrigar a rolar para achar o que existe.
 */
export function EmptyState({
  title,
  description,
  action,
  variant = "page",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "page" | "inline";
}) {
  if (variant === "inline") {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-5 py-3 text-sm text-slate-500">
        <span>{title}</span>
        {description ? (
          <span className="text-slate-400">— {description}</span>
        ) : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
    );
  }

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

/**
 * Um trecho nomeado DENTRO de um cartão.
 *
 * Substitui os cabeçalhos de seção que três telas vinham escrevendo à mão —
 * cada uma com a sua faixa cinza, a sua borda em cima e embaixo e o seu peso
 * de fonte. Três faixas cinzas empilhadas num cartão são mais moldura do que
 * conteúdo.
 *
 * A separação padrão é ESPAÇO. `divider` existe para o caso em que os trechos
 * são listas comparáveis e o olho precisa da régua para não se perder entre
 * elas — e nesse caso é uma régua fina só, sem fundo.
 */
export function Section({
  title,
  description,
  action,
  meta,
  divider = false,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Número ou rótulo alinhado à direita do título. */
  meta?: ReactNode;
  divider?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        divider && "border-t border-slate-100 first:border-t-0",
        className,
      )}
    >
      {title || action ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pb-1 pt-4">
          <div className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {title}
            </h3>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
          {meta ? (
            <span className="shrink-0 text-xs tabular-nums text-slate-500">
              {meta}
            </span>
          ) : null}
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Uma linha de rótulo e valor — o formato de uma ficha.
 *
 * Uma coluna diz o que é, a outra diz qual é. A régua entre linhas é opcional
 * e vem desligada: numa ficha de cinco linhas, o rótulo à esquerda já ancora o
 * olho e cinco réguas só somam ruído.
 */
export function Row({
  label,
  hint,
  divider = true,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  divider?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5 px-5 py-3 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-5",
        divider && "border-t border-slate-100",
      )}
    >
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * A faixa de filtros de uma tela.
 *
 * Fica acima de tudo e vale para a tela inteira. Repetir um seletor de BU
 * dentro de cada cartão faria a mesma pergunta quatro vezes, e as quatro
 * respostas poderiam divergir.
 */
export function Toolbar({
  children,
  onClear,
}: {
  children: ReactNode;
  /** Quando presente, mostra "Limpar filtros". */
  onClear?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          Limpar filtros
        </button>
      ) : null}
    </div>
  );
}
