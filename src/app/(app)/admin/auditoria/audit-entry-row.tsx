"use client";

import { useState } from "react";

import { undoAuditAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format";

export type AuditEntryView = {
  id: string;
  action: string;
  summary: string;
  actorEmail: string | null;
  createdAt: string;
  isUndoable: boolean;
  isUndone: boolean;
  beforeData: string | null;
  afterData: string | null;
};

export function AuditEntryRow({ entry }: { entry: AuditEntryView }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const hasDetails = Boolean(entry.beforeData || entry.afterData);

  return (
    <li className="px-5 py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-800">{entry.summary}</p>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{entry.actorEmail ?? "sistema"}</span>
            <span aria-hidden>·</span>
            <span>{formatDateTime(new Date(entry.createdAt))}</span>
            <span aria-hidden>·</span>
            <code className="font-mono text-[11px] text-slate-400">
              {entry.action}
            </code>
            {entry.isUndone ? <Badge tone="neutral">Desfeita</Badge> : null}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {hasDetails ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setShowDetails((value) => !value)}
            >
              {showDetails ? "Ocultar detalhes" : "Detalhes"}
            </Button>
          ) : null}

          {entry.isUndoable && !entry.isUndone ? (
            isConfirming ? (
              <form
                action={undoAuditAction}
                className="flex items-center gap-2"
              >
                <input type="hidden" name="logId" value={entry.id} />
                <span className="text-xs text-slate-600">Desfazer?</span>
                <Button type="submit" size="sm">
                  Sim
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsConfirming(false)}
                >
                  Não
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setIsConfirming(true)}
              >
                Desfazer
              </Button>
            )
          ) : null}
        </div>
      </div>

      {showDetails ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {entry.beforeData ? (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Antes</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
                {entry.beforeData}
              </pre>
            </div>
          ) : null}
          {entry.afterData ? (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-600">Depois</p>
              <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-100">
                {entry.afterData}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
