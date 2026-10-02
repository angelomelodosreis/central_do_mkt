"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, User } from "lucide-react";

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
      <ul className="space-y-1.5">
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
                  "flex items-center gap-3 rounded-2xl py-3 text-sm transition-all duration-200",
                  collapsed ? "justify-center px-2" : "px-3.5",
                  isActive
                    ? "bg-brand-600 font-medium text-white shadow-[0_8px_20px_rgba(226,38,60,0.35)]"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
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
                          : "bg-brand-500 ring-slate-900",
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
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-brand-500/20 text-brand-300",
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
    <div className="border-t border-white/10 pt-3 text-slate-300">
      <Link
        href="/perfil"
        onClick={() => setIsOpen(false)}
        className="group -mx-1 flex items-center justify-between rounded-xl p-2 transition hover:bg-white/10"
        title="Ver e editar meu perfil"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white group-hover:text-brand-300">
            {user.name}
          </p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {user.jobTitle ? `${user.jobTitle} · ` : ""}
            {user.roleLabel}
          </p>
        </div>
        <span className="shrink-0 text-xs text-slate-400 group-hover:text-white">
          →
        </span>
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/10 pt-2 text-xs">
        <Link
          href="/perfil"
          onClick={() => setIsOpen(false)}
          className="text-xs font-medium text-brand-400 hover:text-brand-300 hover:underline"
        >
          Meu Perfil
        </Link>
        <SignOutButton className="text-xs text-slate-400 hover:text-white" />
      </div>
    </div>
  );

  return (
    <>
      {/* Barra superior — apenas no celular */}
      <header className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm lg:hidden">
        <Logo href="/painel" />
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-label="Abrir menu de navegação"
          className="rounded-xl p-2 text-slate-700 hover:bg-slate-100"
        >
          <span aria-hidden className="block text-lg leading-none">
            {isOpen ? "✕" : "☰"}
          </span>
        </button>
      </header>

      {isOpen ? (
        <nav className="mt-2 rounded-2xl bg-[#140f17] p-4 text-white shadow-xl lg:hidden">
          {links(false)}
          <div className="mt-4">{userBlock}</div>
        </nav>
      ) : null}

      {/* Barra lateral — desktop no estilo cápsula elegante */}
      <nav
        className={cn(
          "hidden shrink-0 transition-all duration-300 lg:block",
          isCollapsed ? "w-20" : "w-64",
        )}
      >
        <div className="sticky top-4 flex max-h-[calc(100vh-3.5rem)] flex-col rounded-[2rem] bg-gradient-to-b from-[#181119] via-[#1a141f] to-[#120d15] p-3 text-white shadow-[0_20px_40px_-15px_rgba(0,0,0,0.25)] ring-1 ring-white/10">
          <div
            className={cn(
              "flex items-center gap-2 pb-2 pt-1",
              isCollapsed ? "justify-center" : "justify-between px-1",
            )}
          >
            <Logo
              href="/painel"
              compact={isCollapsed}
              className="min-w-0 brightness-110"
            />
            {isCollapsed ? null : (
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Recolher menu"
                title="Recolher menu"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
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
              className="mt-2 flex justify-center rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronsIcon direction="right" />
            </button>
          ) : null}

          {/* Botão de Busca Rápida / Command Palette */}
          {isCollapsed ? (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
                )
              }
              title="Buscar páginas ou BUs (Ctrl+K)"
              className="mt-3 flex justify-center rounded-xl border border-white/10 bg-white/5 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Search className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                window.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "k", ctrlKey: true }),
                )
              }
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <span className="flex items-center gap-2">
                <Search className="size-3.5 text-slate-400" />
                <span>Buscar…</span>
              </span>
              <kbd className="rounded border border-white/20 bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                Ctrl K
              </kbd>
            </button>
          )}

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-0.5">
            {links(isCollapsed)}
          </div>

          {isCollapsed ? (
            // Recolhido, o bloco do usuário não cabe — mas sair não pode
            // depender de expandir o menu antes.
            <div className="mt-3 flex flex-col items-center gap-1.5 border-t border-white/10 pt-3">
              <Link
                href="/perfil"
                title={`Meu Perfil (${user.name})`}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <User className="size-4" />
              </Link>
              <SignOutButton
                compact
                title={`Sair (${user.name})`}
                className="rounded-xl p-2 text-slate-400 hover:bg-white/10 hover:text-white"
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
