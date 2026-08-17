"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@/lib/auth/auth-client";
import { cn } from "@/lib/utils/cn";

export function SignOutButton({
  className,
  /** Só o ícone, para quando o menu está recolhido. */
  compact = false,
  title,
}: {
  className?: string;
  compact?: boolean;
  title?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isLoading}
      title={title ?? (compact ? "Sair" : undefined)}
      aria-label={compact ? "Sair" : undefined}
      className={cn(
        "transition-colors disabled:opacity-50",
        compact
          ? "flex items-center justify-center"
          : "text-left text-sm font-medium text-slate-600 hover:text-slate-900",
        className,
      )}
    >
      {compact ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
          aria-hidden
        >
          <path d="M15 17l5-5-5-5" />
          <path d="M20 12H9" />
          <path d="M12 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6" />
        </svg>
      ) : isLoading ? (
        "Saindo…"
      ) : (
        "Sair"
      )}
    </button>
  );
}
