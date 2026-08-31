/**
 * Fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas.
 */
export type OrgFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_ORG_STATE: OrgFormState = { status: "idle" };
