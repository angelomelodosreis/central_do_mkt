/**
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas — constantes precisam morar em um módulo comum.
 */
export type DomainFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_DOMAIN_STATE: DomainFormState = { status: "idle" };
