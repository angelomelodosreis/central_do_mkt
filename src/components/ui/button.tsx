import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

/**
 * A ação principal é a única preenchida com o vermelho da marca. A destrutiva
 * usa contorno e um marsala mais escuro: com a marca em vermelho, a cor sozinha
 * não distingue mais "confirmar" de "apagar" — a diferença precisa estar também
 * no preenchimento.
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600 disabled:hover:bg-brand-600",
  secondary:
    "border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-brand-600",
  /**
   * A ação terciária ganhou contorno no hover.
   *
   * Sem ele, um `ghost` ao lado de um `secondary` parecia texto solto — dava
   * para clicar, mas não parecia clicável até o mouse passar por cima. Em linhas
   * com três ações lado a lado, era o botão que as pessoas não achavam.
   */
  ghost:
    "border border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-brand-600",
  danger:
    "border border-danger-200 bg-white text-danger-700 shadow-sm hover:border-danger-600 hover:bg-danger-50 focus-visible:outline-danger-700",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-2.5 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl font-medium transition-colors",
    // Foco visível pelo teclado: não existia nenhum estilo de foco, então quem
    // navega por Tab não tinha como saber onde estava.
    "focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={classes(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  );
}
