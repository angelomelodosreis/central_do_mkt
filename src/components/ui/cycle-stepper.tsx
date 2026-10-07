"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export type CycleStepKey = "diagnostico" | "metas" | "revisoes";

export function CycleStepper({
  activeStep,
  onSelectStep,
}: {
  activeStep: CycleStepKey;
  onSelectStep?: (step: CycleStepKey) => void;
}) {
  const steps: { key: CycleStepKey; number: number; label: string }[] = [
    { key: "diagnostico", number: 1, label: "Diagnóstico" },
    { key: "metas", number: 2, label: "Objetivo e Metas" },
    { key: "revisoes", number: 3, label: "Revisões" },
  ];

  return (
    <nav
      aria-label="Etapas do Ciclo Estratégico"
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/90 bg-white p-1 shadow-2xs"
    >
      {steps.map((step) => {
        const isActive = activeStep === step.key;

        return (
          <button
            key={step.key}
            type="button"
            onClick={() => onSelectStep?.(step.key)}
            className={cn(
              "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-150 cursor-pointer",
              isActive
                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
            )}
          >
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full text-[11px] font-bold transition",
                isActive
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {step.number}
            </span>
            <span className={cn(isActive && "font-bold text-rose-900")}>
              {step.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
