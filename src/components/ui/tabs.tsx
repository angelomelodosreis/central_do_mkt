"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type TabItem = {
  href: string;
  label: string;
  /** Contagem exibida ao lado do rótulo. */
  count?: number;
  /** Ponto de alerta — hoje, algo pendente de decisão do administrador. */
  alert?: boolean;
};

/**
 * Abas de navegação por rota.
 *
 * Rota e não estado local: cada aba fica endereçável, o botão voltar funciona e
 * um link para "produtos sem BU" pode ser mandado para alguém. Com estado
 * local, todo compartilhamento de tela vira "clica em tal aba".
 */
export function LinkTabs({ items }: { items: TabItem[] }) {
  const pathname = usePathname();

  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <nav className="flex min-w-max gap-1 border-b border-slate-200">
        {items.map((tab) => {
          const isActive =
            pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              {tab.label}
              {typeof tab.count === "number" && tab.count > 0 ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {tab.count}
                </span>
              ) : null}
              {tab.alert ? (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-amber-500"
                />
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Abas em pílula, para alternar visões dentro de uma mesma tela.
 *
 * Diferente de `LinkTabs` de propósito: aqui a troca não muda o endereço porque
 * não muda o assunto — é a mesma lista vista de outro jeito.
 */
export function PillTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: Array<{ value: T; label: string; count?: number; alert?: boolean }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex w-max gap-1 rounded-xl bg-slate-100 p-1">
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={value === item.value}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
              value === item.value
                ? "bg-white text-brand-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            {item.label}
            {typeof item.count === "number" && item.count > 0 ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  value === item.value
                    ? "bg-brand-50 text-brand-700"
                    : "bg-white text-slate-500",
                )}
              >
                {item.count}
              </span>
            ) : null}
            {item.alert ? (
              <span
                aria-hidden
                className="size-1.5 rounded-full bg-amber-500"
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Faixa de contagens por situação, usada no acompanhamento. */
export function StatSummary({
  items,
}: {
  items: Array<{
    label: string;
    value: number | string;
    tone?: "alert" | "neutral";
    children?: ReactNode;
  }>;
}) {
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <p className="font-display text-xl font-semibold tabular-nums text-slate-900">
            {item.value}
          </p>
          <p
            className={cn(
              "text-xs",
              item.tone === "alert"
                ? "font-medium text-amber-700"
                : "text-slate-500",
            )}
          >
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}
