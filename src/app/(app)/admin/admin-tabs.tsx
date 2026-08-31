"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils/cn";

/**
 * A ordem segue o que se administra com mais frequência, não a hierarquia dos
 * conceitos: pessoas mudam toda semana, a estrutura organizacional de vez em
 * quando, as bases oficiais raramente.
 */
const TABS = [
  { href: "/admin/usuarios", label: "Usuários e acessos" },
  { href: "/admin/organizacao", label: "Organização" },
  { href: "/admin/squads", label: "Squads" },
  { href: "/admin/bases", label: "Bases oficiais" },
  { href: "/admin/dominios", label: "Domínios de e-mail" },
  { href: "/admin/permissoes", label: "Permissões" },
  { href: "/admin/auditoria", label: "Auditoria" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="flex min-w-max gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
