/**
 * Estado dos formulários de documentação.
 *
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas — constantes precisam morar em um módulo comum.
 */
export type DocFormState = {
  status: "idle" | "error";
  message?: string;
};

export const INITIAL_DOC_FORM_STATE: DocFormState = { status: "idle" };
