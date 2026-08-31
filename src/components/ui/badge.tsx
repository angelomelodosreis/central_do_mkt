import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import {
  USER_ROLE_LABELS,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";

type Tone = "neutral" | "success" | "warning" | "danger" | "brand";

const TONES: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-danger-50 text-danger-700 ring-danger-200",
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
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
