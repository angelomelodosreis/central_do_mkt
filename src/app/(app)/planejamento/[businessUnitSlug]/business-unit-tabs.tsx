"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

export type WorkspaceTab = {
  href: string;
  label: string;
  /** Contagem mostrada ao lado do rótulo, quando faz sentido. */
  count?: number;
};

/**
 * Sub-navegação da Business Unit.
 *
 * É cliente só por causa do estado ativo: `usePathname` é o que permite marcar
 * a aba certa sem passar o caminho de página em página.
 *
 * O item mais específico ganha: `/planejamento/x/personas` também começa com
 * `/planejamento/x`, e comparar por prefixo puro deixaria "Visão geral" aceso
 * em todas as abas.
 */
export function BusinessUnitTabs({
  tabs,
  baseHref,
}: {
  tabs: WorkspaceTab[];
  baseHref: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === baseHref) return pathname === baseHref;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="Áreas da Business Unit"
      // Rolagem horizontal em vez de quebra de linha: no celular, seis abas
      // empilhadas empurrariam o conteúdo para baixo da dobra.
      className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max min-w-full gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "border-brand-500 font-medium text-brand-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                )}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {tab.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
