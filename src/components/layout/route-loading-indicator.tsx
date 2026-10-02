"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function RouteLoadingIndicator() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Quando o pathname ou searchParams mudam, a rota completou o carregamento
    setIsLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleAnchorClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        !target.getAttribute("target") &&
        !e.ctrlKey &&
        !e.metaKey &&
        href !== pathname
      ) {
        setIsLoading(true);
      }
    }

    document.addEventListener("click", handleAnchorClick);
    return () => document.removeEventListener("click", handleAnchorClick);
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div
      role="progressbar"
      aria-label="Carregando página"
      className="fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden bg-slate-100/50"
    >
      <div className="h-full w-full bg-gradient-to-r from-brand-600 via-indigo-500 to-brand-400 animate-pulse" />
    </div>
  );
}
