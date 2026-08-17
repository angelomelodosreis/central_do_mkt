/**
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas — constantes precisam morar em um módulo comum.
 */
export type BusinessUnitFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_BU_STATE: BusinessUnitFormState = { status: "idle" };
