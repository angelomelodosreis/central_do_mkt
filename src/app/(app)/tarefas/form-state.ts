/**
 * Fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas.
 */
export type TaskFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_TASK_STATE: TaskFormState = { status: "idle" };
