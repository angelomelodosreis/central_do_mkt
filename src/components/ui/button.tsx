import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type Variant = "primary" | "brand" | "secondary" | "ghost" | "danger" | "dark";
type Size = "sm" | "md";

/**
 * Padrão canônico de Botões do MedCof UI Design System:
 * - `brand` / `primary`: degradê vibrante da marca MedCof (#d81d33 -> #ef344a) com relevo tátil.
 * - `dark`: degradê grafite premium (#292929 -> #3c3c3c).
 * - `secondary`: fundo branco com inner shadow e borda neutra (padrão escasso para não poluir telas).
 * - `danger`: degradê destrutivo marsala/rubi escuro (#7f0e1b -> #90202d).
 * - `ghost`: ação terciária sutil com contorno no hover.
 * - formato: rounded-full (pílula oficial MedCof UI).
 */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-linear-to-br from-btn-brand-from to-btn-brand-to text-white font-semibold shadow-2xs hover:from-btn-brand-hover-from hover:to-btn-brand-hover-to active:from-btn-brand-active active:to-btn-brand-active focus-visible:outline-btn-brand-outline disabled:opacity-50",
  brand:
    "bg-linear-to-br from-btn-brand-from to-btn-brand-to text-white font-semibold shadow-2xs hover:from-btn-brand-hover-from hover:to-btn-brand-hover-to active:from-btn-brand-active active:to-btn-brand-active focus-visible:outline-btn-brand-outline disabled:opacity-50",
  dark:
    "bg-linear-to-br from-btn-primary-from to-btn-primary-to text-white font-semibold shadow-2xs hover:from-btn-primary-hover-from hover:to-btn-primary-hover-to active:from-btn-primary-active-from active:to-btn-primary-active-to focus-visible:outline-btn-primary-outline disabled:opacity-50",
  secondary:
    "border border-slate-300 bg-white text-slate-800 shadow-100 font-medium hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-brand-500",
  ghost:
    "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-brand-500",
  danger:
    "bg-linear-to-br from-btn-destructive-from to-btn-destructive-to text-white font-semibold shadow-2xs hover:from-btn-destructive-hover-from hover:to-btn-destructive-hover-to active:from-btn-destructive-active-from active:to-btn-destructive-active-to focus-visible:outline-btn-destructive-outline disabled:opacity-50",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3.5 text-xs",
  md: "h-10 gap-2 px-5 text-sm",
};

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium transition-all cursor-pointer",
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
  variant = "secondary",
  size = "md",
  className,
  loading = false,
  disabled,
  children,
  ...props
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={classes(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className={cn("animate-spin shrink-0", size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4")} />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
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
