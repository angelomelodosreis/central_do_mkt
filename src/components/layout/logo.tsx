import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

function LogoMark({ compact }: { compact: boolean }) {
  return (
    <>
      {/*
        O símbolo oficial do Grupo MedCof, em `public/brand`. Fica sobre um
        quadrado branco com borda para manter o contorno legível tanto na barra
        lateral clara quanto no menu do celular.
      */}
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm"
      >
        <Image
          src="/brand/medcof-mark.svg"
          alt=""
          width={41}
          height={46}
          className="h-5 w-auto"
          priority
        />
      </span>
      {compact ? null : (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate font-display text-sm font-semibold text-slate-900">
            Central do Marketing
          </span>
          <span className="truncate text-xs text-slate-500">Grupo MedCof</span>
        </span>
      )}
    </>
  );
}

/**
 * Marca da plataforma.
 *
 * Nas telas autenticadas vira link para o painel — é o que todo mundo espera ao
 * clicar na marca. Nas telas públicas (login) fica sem link, porque não há para
 * onde ir.
 */
export function Logo({
  className,
  compact = false,
  href,
}: {
  className?: string;
  compact?: boolean;
  href?: string;
}) {
  const classes = cn("flex items-center gap-2.5", className);

  if (!href) {
    return (
      <span className={classes}>
        <LogoMark compact={compact} />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="Ir para o painel"
      className={cn(classes, "rounded-lg transition-opacity hover:opacity-80")}
    >
      <LogoMark compact={compact} />
    </Link>
  );
}
