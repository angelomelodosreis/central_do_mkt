/**
 * Catálogo canônico das 23 Business Units oficiais da MedCof
 * e função de resolução semântica a partir de descrições e títulos de produtos da planilha.
 */

export interface MedcofBuDef {
  code: string;
  label: string;
  slug: string;
}

export const BU_CATALOG: MedcofBuDef[] = [
  { code: "MEDCOF_ANESTESIOLOGIA", label: "Anestesiologia", slug: "anestesiologia" },
  { code: "MEDCOF_CARDIOLOGIA", label: "Cardiologia", slug: "cardiologia" },
  { code: "MEDCOF_CIRURGIA", label: "Cirurgia Geral", slug: "cirurgia" },
  { code: "MEDCOF_CLINICA_MEDICA", label: "Clínica Médica", slug: "clinica_medica" },
  { code: "MEDCOF_CONCURSUS", label: "Concursus", slug: "concursus" },
  { code: "MEDCOF_DERMATOLOGIA", label: "Dermatologia", slug: "dermatologia" },
  { code: "MEDCOF_ENAMED", label: "Enamed", slug: "enamed" },
  { code: "MEDCOF_ENDOCRINOLOGIA", label: "Endocrinologia", slug: "endocrinologia" },
  { code: "MEDCOF_ENDOCRINOLOGIA_PEDIATRICA", label: "Endocrinologia Pediátrica", slug: "endocrinologia_pediatrica" },
  { code: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA", label: "Ginecologia e Obstetrícia", slug: "ginecologia_e_obstetricia" },
  { code: "MEDCOF_INTERNATO", label: "Internato", slug: "internato" },
  { code: "MEDCOF_LIFEHACKS", label: "Lifehacks / PS", slug: "lifehacks" },
  { code: "MEDCOF_MEDICINA_DE_EMERGENCIA", label: "Medicina de Emergência", slug: "medicina_de_emergencia" },
  { code: "MEDCOF_MEDICINA_INTENSIVA", label: "Medicina Intensiva", slug: "medicina_intensiva" },
  { code: "MEDCOF_OFTALMOLOGIA", label: "Oftalmologia", slug: "oftalmologia" },
  { code: "MEDCOF_ORTOPEDIA", label: "Ortopedia", slug: "ortopedia" },
  { code: "MEDCOF_OTORRINOLARINGOLOGIA", label: "Otorrinolaringologia", slug: "otorrinolaringologia" },
  { code: "MEDCOF_PEDIATRIA", label: "Pediatria", slug: "pediatria" },
  { code: "MEDCOF_RADIOLOGIA", label: "Radiologia", slug: "radiologia" },
  { code: "MEDCOF_RESIDENCIA", label: "Residência Médica", slug: "residencia" },
  { code: "MEDCOF_REVALIDA", label: "Revalida", slug: "revalida" },
  { code: "MEDCOF_UROLOGIA", label: "Urologia", slug: "urologia" },
  { code: "MEDCOF_USA", label: "MedCof USA", slug: "usa" },
];

export function resolveBuFromText(text: string): { code: string; label: string } {
  const prod = (text || "").toUpperCase();
  if (prod.includes("CLÍNICA") || prod.includes("CLINICA") || prod.includes(" R+ CM") || prod.includes(" 2.0 R+ CM")) return { code: "MEDCOF_CLINICA_MEDICA", label: "Clínica Médica" };
  if (prod.includes("CIRURGIA") || prod.includes(" R+ CIR") || prod.includes(" 2.0 R+ CIR") || prod.includes("ENDOSCOPIA")) return { code: "MEDCOF_CIRURGIA", label: "Cirurgia Geral" };
  if (prod.includes("R+ GO") || prod.includes("GINECO") || prod.includes("OBSTETR") || prod.includes("G.O") || prod.includes("MASTO") || prod.includes("SOGESP")) return { code: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA", label: "Ginecologia e Obstetrícia" };
  if (prod.includes("CARDIO")) return { code: "MEDCOF_CARDIOLOGIA", label: "Cardiologia" };
  if (prod.includes("PEDIAT") || prod.includes(" R+ PED") || prod.includes(" 2.0 R+ PED")) return { code: "MEDCOF_PEDIATRIA", label: "Pediatria" };
  if (prod.includes("DERMATO")) return { code: "MEDCOF_DERMATOLOGIA", label: "Dermatologia" };
  if (prod.includes("ANESTESIO")) return { code: "MEDCOF_ANESTESIOLOGIA", label: "Anestesiologia" };
  if (prod.includes("REVALIDA")) return { code: "MEDCOF_REVALIDA", label: "Revalida" };
  if (prod.includes("ENDOCRINO")) return { code: "MEDCOF_ENDOCRINOLOGIA", label: "Endocrinologia" };
  if (prod.includes("OFTALMO")) return { code: "MEDCOF_OFTALMOLOGIA", label: "Oftalmologia" };
  if (prod.includes("ORTOPE")) return { code: "MEDCOF_ORTOPEDIA", label: "Ortopedia" };
  if (prod.includes("OTORRINO")) return { code: "MEDCOF_OTORRINOLARINGOLOGIA", label: "Otorrinolaringologia" };
  if (prod.includes("RADIO")) return { code: "MEDCOF_RADIOLOGIA", label: "Radiologia" };
  if (prod.includes("UROLOG")) return { code: "MEDCOF_UROLOGIA", label: "Urologia" };
  if (prod.includes("USA") || prod.includes("USMLE")) return { code: "MEDCOF_USA", label: "MedCof USA" };
  if (prod.includes("CONCURSO") || prod.includes("CONCURSUS")) return { code: "MEDCOF_CONCURSUS", label: "Concursus" };
  if (prod.includes("ENAMED")) return { code: "MEDCOF_ENAMED", label: "Enamed" };
  if (prod.includes("INTERNATO")) return { code: "MEDCOF_INTERNATO", label: "Internato" };
  if (prod.includes("LIFEHACK") || prod.includes("PLANTÃO") || prod.includes("PLANTAO")) return { code: "MEDCOF_LIFEHACKS", label: "Lifehacks / PS" };
  if (prod.includes("EMERGÊNCIA") || prod.includes("EMERGENCIA")) return { code: "MEDCOF_MEDICINA_DE_EMERGENCIA", label: "Medicina de Emergência" };
  if (prod.includes("INTENSIVA") || prod.includes("UTI")) return { code: "MEDCOF_MEDICINA_INTENSIVA", label: "Medicina Intensiva" };
  return { code: "MEDCOF_RESIDENCIA", label: "Residência Médica" };
}

export function normalizeBuCode(input?: string | null): string | null {
  if (!input) return null;
  const clean = input.trim();
  if (!clean || clean.toUpperCase() === "ALL") return null;

  // 1. Se já for código canônico MEDCOF_*
  const upper = clean.toUpperCase();
  const directMatch = BU_CATALOG.find((bu) => bu.code === upper);
  if (directMatch) return directMatch.code;

  // 2. Se for código sem o prefixo MEDCOF_ (ex: "CLINICA_MEDICA", "CIRURGIA")
  const withMedcof = `MEDCOF_${upper}`;
  const codeMatch = BU_CATALOG.find((bu) => bu.code === withMedcof);
  if (codeMatch) return codeMatch.code;

  // 3. Normaliza string retirando prefixo "bu_", convertendo hífens em underlines e removendo acentos
  const normalizedKey = clean
    .toLowerCase()
    .replace(/^bu[_-]/i, "")
    .replace(/-/g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 4. Procura por slug exato ou slug normalizado
  const slugMatch = BU_CATALOG.find(
    (bu) =>
      bu.slug.toLowerCase().replace(/-/g, "_") === normalizedKey ||
      bu.code.toLowerCase().replace("medcof_", "") === normalizedKey,
  );
  if (slugMatch) return slugMatch.code;

  // 5. Procura por label da BU ou substring exata
  const labelMatch = BU_CATALOG.find((bu) => {
    const normLabel = bu.label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return (
      normLabel === normalizedKey ||
      normLabel.includes(normalizedKey) ||
      normalizedKey.includes(normLabel)
    );
  });
  if (labelMatch) return labelMatch.code;

  // 6. Resolução semântica para casos complexos de produtos/textos
  const semantic = resolveBuFromText(clean);
  return semantic.code;
}

export function normalizeBuCodes(input?: string | string[] | null): string[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : input.split(",");
  const codes = new Set<string>();
  for (const item of list) {
    const norm = normalizeBuCode(item);
    if (norm) codes.add(norm);
  }
  return Array.from(codes);
}

