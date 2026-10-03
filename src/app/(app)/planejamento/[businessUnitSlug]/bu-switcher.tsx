"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function BuSwitcher({
  currentSlug,
  units,
}: {
  currentSlug: string;
  units: Array<{ slug: string; label: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  if (units.length <= 1) return null;

  function handleChange(newSlug: string) {
    if (!newSlug || newSlug === currentSlug) return;
    // Tenta preservar a sub-rota atual (ex: /metas, /calendario, /diagnostico)
    const subRoute = pathname.replace(`/planejamento/${currentSlug}`, "");
    router.push(`/planejamento/${newSlug}${subRoute}`);
  }

  return (
    <div className="relative inline-flex items-center">
      <select
        value={currentSlug}
        onChange={(e) => handleChange(e.target.value)}
        aria-label="Trocar de Business Unit"
        title="Alternar rapidamente entre Business Units"
        className="appearance-none rounded-xl border border-slate-200 bg-white pl-2.5 pr-7 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:border-brand-300 focus:border-brand-500 focus:outline-none cursor-pointer"
      >
        {units.map((u) => (
          <option key={u.slug} value={u.slug}>
            {u.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-slate-400" />
    </div>
  );
}
