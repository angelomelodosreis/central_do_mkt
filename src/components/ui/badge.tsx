import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import {
  USER_ROLE_LABELS,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";

type Tone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "brand"
  | "primary"
  | "outline";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-50 text-slate-800 border-slate-200/90",
  primary: "bg-slate-100/80 text-slate-900 border-slate-300 font-semibold",
  outline: "bg-transparent text-slate-900 border-slate-400 font-medium",
  success: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
  warning: "bg-amber-50 text-amber-900 border-amber-200 font-semibold",
  danger: "bg-rose-50 text-rose-800 border-rose-200 font-semibold",
  brand: "bg-brand-50 text-brand-900 border-brand-200 font-semibold",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-colors shadow-100 leading-tight",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_CONFIG: Record<UserStatus, { label: string; tone: Tone }> = {
  pending: { label: "Aguardando aprovação", tone: "warning" },
  active: { label: "Ativo", tone: "success" },
  suspended: { label: "Suspenso", tone: "danger" },
};

export function StatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

const ROLE_TONES: Record<UserRole, Tone> = {
  admin: "brand",
  leader: "neutral",
  editor: "neutral",
  member: "neutral",
};

/** Reexportado para as telas não precisarem conhecer o caminho do schema. */
export const ROLE_LABELS = USER_ROLE_LABELS;

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <Badge tone={ROLE_TONES[role] ?? "neutral"}>
      {USER_ROLE_LABELS[role] ?? role}
    </Badge>
  );
}
