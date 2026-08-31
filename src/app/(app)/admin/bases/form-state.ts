/**
 * Fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas.
 */
export type BaseFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_BASE_STATE: BaseFormState = { status: "idle" };
