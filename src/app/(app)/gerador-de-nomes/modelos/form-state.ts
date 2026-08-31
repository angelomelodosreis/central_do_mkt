/**
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas — constantes precisam morar em um módulo comum.
 */
export type TemplateFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_TEMPLATE_STATE: TemplateFormState = { status: "idle" };
