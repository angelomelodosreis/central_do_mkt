"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarCheck,
  Compass,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Target,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";

export type WorkspaceTab = {
  href: string;
  label: string;
  /** Contagem mostrada ao lado do rótulo, quando faz sentido. */
  count?: number;
};

function getTabIcon(label: string): LucideIcon {
  const l = label.toLowerCase();
  if (l.includes("visão geral")) return LayoutDashboard;
  if (l.includes("diagnóstico")) return Compass;
  if (l.includes("metas")) return Target;
  if (l.includes("resultados")) return TrendingUp;
  if (l.includes("acompanhamento")) return MessageSquare;
  if (l.includes("revisão trimestral")) return CalendarCheck;
  if (l.includes("calendário")) return Calendar;
  if (l.includes("personas")) return Users;
  if (l.includes("produtos") || l.includes("esteira")) return Package;
  if (l.includes("documentos")) return FileText;
  return FileText;
}

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
      // Rolagem horizontal em vez de quebra de linha: no celular, abas
      // empilhadas empurrariam o conteúdo para baixo da dobra.
      className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex w-max min-w-full gap-1 border-b border-slate-200">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const IconComponent = getTabIcon(tab.label);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold sm:text-sm transition-colors",
                  active
                    ? "border-brand-500 text-brand-700"
                    : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                )}
              >
                <IconComponent
                  className={cn(
                    "size-3.5 shrink-0 transition-colors",
                    active
                      ? "text-brand-600"
                      : "text-slate-400 group-hover:text-slate-600",
                  )}
                />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 ? (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
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
