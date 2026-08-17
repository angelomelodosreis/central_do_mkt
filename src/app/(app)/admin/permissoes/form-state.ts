/**
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas — constantes precisam morar em um módulo comum.
 */
export type PermissionFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_PERMISSION_STATE: PermissionFormState = { status: "idle" };
