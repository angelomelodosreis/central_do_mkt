import {
  sqliteTable,
  text,
  integer,
  index,
  unique,
} from "drizzle-orm/sqlite-core";

import { businessUnit } from "./business-units.schema";

/**
 * Persona de uma Business Unit.
 *
 * A estrutura é deliberadamente fixa: o objetivo é poder comparar personas de
 * BUs diferentes lado a lado, e isso só funciona se todas responderem às mesmas
 * perguntas. O espaço para o que não cabe nesses campos é o `notes`, no fim.
 *
 * Os valores são texto livre (e não listas fechadas) porque o que padroniza a
 * leitura é a pergunta, não a resposta: "faixa etária" significa a mesma coisa
 * em toda persona, mesmo que uma diga "25 a 30" e outra "recém-formados".
 */
export const persona = sqliteTable(
  "persona",
  {
    id: text("id").primaryKey(),
    businessUnitId: text("business_unit_id")
      .notNull()
      .references(() => businessUnit.id, { onDelete: "restrict" }),
    /** Único dentro da BU, não globalmente: duas BUs podem ter "o residente". */
    slug: text("slug").notNull(),
    /** Nome curto pelo qual o time se refere a ela. Ex.: "Dra. Marina". */
    name: text("name").notNull(),
    /** Uma frase que resume quem é. Aparece na listagem. */
    headline: text("headline"),

    // Perfil demográfico ------------------------------------------------------
    ageRange: text("age_range"),
    gender: text("gender"),
    location: text("location"),
    income: text("income"),
    education: text("education"),

    // Carreira ----------------------------------------------------------------
    careerStage: text("career_stage"),
    currentRole: text("current_role"),
    workplace: text("workplace"),
    careerGoal: text("career_goal"),

    /** Interesses e canais onde ela está, uma entrada por item. */
    interests: text("interests", { mode: "json" }).$type<string[]>(),
    channels: text("channels", { mode: "json" }).$type<string[]>(),

    /** Parte livre, no mesmo editor visual da documentação. */
    notes: text("notes"),

    /** Cópia normalizada (sem acento, minúscula) para a busca. */
    searchText: text("search_text"),

    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [
    unique("persona_slug_unique").on(table.businessUnitId, table.slug),
    index("persona_business_unit_idx").on(table.businessUnitId),
  ],
);

/**
 * Uma dor da persona e o que oferecemos para ela.
 *
 * `solution` é opcional de propósito: mapear uma dor para a qual ainda não temos
 * resposta é informação valiosa, não um cadastro pela metade. É o que permite
 * listar as dores descobertas que ainda estão sem produto.
 */
export const personaPain = sqliteTable(
  "persona_pain",
  {
    id: text("id").primaryKey(),
    personaId: text("persona_id")
      .notNull()
      .references(() => persona.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    pain: text("pain").notNull(),
    /** `null` = dor mapeada, solução ainda por construir. */
    solution: text("solution"),
  },
  (table) => [index("persona_pain_persona_idx").on(table.personaId)],
);

export type Persona = typeof persona.$inferSelect;
export type PersonaPain = typeof personaPain.$inferSelect;
export type PersonaWithPains = Persona & { pains: PersonaPain[] };
