/**
 * Fica fora de `actions.ts` porque um arquivo `"use server"` só pode exportar
 * funções assíncronas.
 */
export type PersonaFormState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export const INITIAL_PERSONA_STATE: PersonaFormState = { status: "idle" };
