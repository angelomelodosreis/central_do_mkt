/**
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas.
 */
export type StrategyFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_STRATEGY_STATE: StrategyFormState = { status: "idle" };
