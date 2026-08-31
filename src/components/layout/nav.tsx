"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "./logo";
import { NavIcon, type NavIconKey } from "./nav-icons";
import { SignOutButton } from "./sign-out-button";
import { cn } from "@/lib/utils/cn";

export type NavItem = {
  href: string;
  label: string;
  description: string;
  icon: NavIconKey;
  /**
   * Número exibido junto ao item — hoje, a fila de tarefas.
   *
   * No menu recolhido ele vira um ponto: o número não caberia legível em 40px,
   * mas a informação "tem coisa aqui" é o que mais importa.
   */
  badge?: number;
};

/** Onde a preferência de menu recolhido fica guardada, por navegador. */
const COLLAPSE_KEY = "cm:nav-recolhido";

/**
 * Navegação lateral (vira menu retrátil no celular).
 *
 * Os itens recebidos já vêm filtrados por permissão no servidor — esconder um
 * item aqui é conveniência visual, não segurança: cada página revalida o acesso
 * por conta própria.
 */
export function Nav({
  items,
  user,
}: {
  items: NavItem[];
  user: {
    name: string;
    email: string;
    roleLabel: string;
    /** Cargo no organograma, quando definido. Diferente do papel de acesso. */
    jobTitle: string | null;
  };
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // A preferência é lida depois da montagem para não divergir do HTML que veio
  // do servidor (que não conhece o armazenamento do navegador).
  useEffect(() => {
    setIsCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setIsCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function links(collapsed: boolean) {
    return (
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  // A pílula arredondada é a mesma forma do item ativo na área
                  // do aluno — é o que amarra as duas interfaces.
                  "flex items-center gap-3 rounded-full py-2.5 text-sm transition-colors",
                  collapsed ? "justify-center px-2.5" : "px-3.5",
                  isActive
                    ? "bg-brand-600 font-medium text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <span className="relative shrink-0">
                  <NavIcon name={item.icon} className="size-5" />
                  {collapsed && item.badge ? (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute -right-1 -top-0.5 size-2 rounded-full ring-2",
                        isActive
                          ? "bg-white ring-brand-600"
                          : "bg-brand-500 ring-white",
                      )}
                    />
                  ) : null}
                </span>
                {collapsed ? (
                  <span className="sr-only">
                    {item.label}
                    {item.badge ? ` (${item.badge})` : ""}
                  </span>
                ) : (
                  <>
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                    {item.badge ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-brand-50 text-brand-700",
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  const userBlock = (
    <div className="border-t border-slate-200 pt-4">
      <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
      <p className="truncate text-xs text-slate-500">{user.email}</p>
      <p className="mt-1 text-xs text-slate-400">
        {user.jobTitle ? `${user.jobTitle} · ` : ""}
        {user.roleLabel}
      </p>
      <SignOutButton className="mt-3" />
    </div>
  );

  return (
    <>
      {/* Barra superior — apenas no celular */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo href="/painel" />
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label="Abrir menu de navegação"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <span aria-hidden className="block text-lg leading-none">
            {isOpen ? "✕" : "☰"}
          </span>
        </button>
      </header>

      {isOpen ? (
        <nav className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
          {links(false)}
          <div className="mt-4">{userBlock}</div>
        </nav>
      ) : null}

      {/* Barra lateral — desktop. Flutua como um cartão, em vez de ser uma
          coluna colada na borda: é o mesmo desenho dos painéis da área do
          aluno, e dá respiro entre menu e conteúdo. */}
      <nav
        className={cn(
          "hidden shrink-0 p-4 pr-0 lg:block",
          isCollapsed ? "w-24" : "w-72",
        )}
      >
        <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] flex-col rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div
            className={cn(
              "flex items-center gap-2",
              isCollapsed ? "justify-center" : "justify-between",
            )}
          >
            <Logo href="/painel" compact={isCollapsed} className="min-w-0" />
            {isCollapsed ? null : (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Recolher menu"
                title="Recolher menu"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <ChevronsIcon direction="left" />
              </button>
            )}
          </div>

          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expandir menu"
              title="Expandir menu"
              className="mt-3 flex justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ChevronsIcon direction="right" />
            </button>
          ) : null}

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
            {links(isCollapsed)}
          </div>

          {isCollapsed ? (
            // Recolhido, o bloco do usuário não cabe — mas sair não pode
            // depender de expandir o menu antes.
            <div className="mt-4 flex justify-center border-t border-slate-200 pt-3">
              <SignOutButton
                compact
                title={`Sair (${user.name})`}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              />
            </div>
          ) : (
            <div className="mt-4">{userBlock}</div>
          )}
        </div>
      </nav>
    </>
  );
}

function ChevronsIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden
    >
      {direction === "left" ? (
        <>
          <path d="M11 6l-6 6 6 6" />
          <path d="M19 6l-6 6 6 6" />
        </>
      ) : (
        <>
          <path d="M13 6l6 6-6 6" />
          <path d="M5 6l6 6-6 6" />
        </>
      )}
    </svg>
  );
}
