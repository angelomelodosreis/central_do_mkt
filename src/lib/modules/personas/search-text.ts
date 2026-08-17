import {
  normalizeForSearch,
  parseRichDoc,
  richDocToPlainText,
} from "@/lib/modules/documentation/rich-text";

/** O que uma persona tem de texto, para efeito de busca. */
export type PersonaSearchInput = {
  name: string;
  headline?: string | null;
  ageRange?: string | null;
  gender?: string | null;
  location?: string | null;
  income?: string | null;
  education?: string | null;
  careerStage?: string | null;
  currentRole?: string | null;
  workplace?: string | null;
  careerGoal?: string | null;
  interests?: string[] | null;
  channels?: string[] | null;
  notes?: string | null;
  pains: { pain: string; solution: string | null }[];
};

/**
 * Junta tudo que é texto de uma persona num campo só, já normalizado.
 *
 * Vive fora das actions para que o "desfazer" da auditoria possa recalcular o
 * mesmo valor depois de restaurar uma persona — sem isso, a busca continuaria
 * apontando para o estado que acabou de ser revertido.
 */
export function buildPersonaSearchText(input: PersonaSearchInput): string | null {
  const parts = [
    input.name,
    input.headline,
    input.ageRange,
    input.gender,
    input.location,
    input.income,
    input.education,
    input.careerStage,
    input.currentRole,
    input.workplace,
    input.careerGoal,
    ...(input.interests ?? []),
    ...(input.channels ?? []),
    ...input.pains.flatMap((entry) => [entry.pain, entry.solution ?? ""]),
    richDocToPlainText(parseRichDoc(input.notes ?? null)),
  ];

  const joined = parts.filter(Boolean).join("\n");
  return normalizeForSearch(joined).trim() || null;
}
