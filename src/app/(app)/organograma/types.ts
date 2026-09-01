import type { OrgUnitKind, UserRole } from "@/lib/db/schema";
import type { Position } from "@/lib/modules/org/people";

/**
 * O organograma inteiro num objeto só.
 *
 * Carregado de uma vez, e não por visualização: as três visões olham os mesmos
 * dados de ângulos diferentes, e recarregar a cada troca de aba faria alternar
 * entre elas parecer lento sem necessidade. São dezenas de pessoas, não
 * milhares.
 */
export type OrgSnapshot = {
  people: OrgPerson[];
  units: OrgUnit[];
  squads: OrgSquad[];
  jobTitles: Array<{ id: string; name: string; sortOrder: number }>;
};

export type OrgPerson = {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  /** Cargo — um só, e da pessoa. */
  jobTitleId: string | null;
  jobTitleName: string | null;
  jobTitleOrder: number;
  positions: Position[];
  /** Ids dos squads de que participa. */
  squadIds: string[];
  /** Squads em que a pessoa é a responsável. */
  leadOfSquadIds: string[];
  /**
   * Id do vínculo, por squad.
   *
   * Vem junto porque toda edição de vínculo é endereçada pelo id da LINHA em
   * `squad_member`, não pelo par pessoa+squad — sem este mapa, cada botão de
   * "sair do squad" precisaria de uma consulta própria para descobrir qual
   * linha alterar.
   */
  squadMembershipIds: Record<string, string>;
};

/** Uma unidade organizacional: setor, subsetor ou time. */
export type OrgUnit = {
  id: string;
  name: string;
  description: string | null;
  kind: OrgUnitKind;
  parentOrgUnitId: string | null;
  isActive: boolean;
};

export type OrgSquad = {
  id: string;
  businessUnitId: string;
  label: string;
  divisionName: string | null;
  isActive: boolean;
};

export const ORG_VIEWS = ["squads", "times", "marketing"] as const;
export type OrgView = (typeof ORG_VIEWS)[number];

export const ORG_VIEW_LABELS: Record<OrgView, string> = {
  squads: "Squads por BU",
  times: "Setores, subsetores e times",
  marketing: "Marketing inteiro",
};

export const ORG_VIEW_DESCRIPTIONS: Record<OrgView, string> = {
  squads:
    "Quem atende cada Business Unit. Squad não é time: reúne gente de vários times — inclusive de fora do marketing.",
  times:
    "Cada setor, subsetor e time com quem responde por ele e a equipe, na ordem de senioridade dos cargos.",
  marketing:
    "Setor → subsetor → time, de cima para baixo, seguindo a hierarquia cadastrada.",
};

/**
 * A instrução de arrastar, só para quem pode arrastar.
 *
 * Separada da descrição porque ficava junto dela e aparecia para todo mundo —
 * a mesma frase mandava arrastar e avisava que a tela era só leitura.
 */
export const ORG_VIEW_EDIT_HINTS: Partial<Record<OrgView, string>> = {
  squads: "Arraste alguém de um squad para outro.",
  times: "Arraste alguém de um time para outro.",
};
