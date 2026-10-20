"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ChevronDown, AlertCircle, Sparkles, Award } from "lucide-react";

import { createPersona, updatePersona } from "./actions";
import { INITIAL_PERSONA_STATE, type PersonaFormState } from "./form-state";
import { PersonaAvatarPicker } from "@/components/personas/persona-avatar-picker";
import { PersonaCombobox, type ComboboxOption } from "@/components/personas/persona-combobox";
import { PersonaTagsInput } from "@/components/personas/persona-tags-input";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Button } from "@/components/ui/button";

export type PersonaFormPain = { pain: string; solution: string };

export type PersonaFormValues = {
  personaId?: string;
  name: string;
  headline: string;
  avatar?: string | null;
  quote?: string | null;
  targetExam?: string | null;
  attempt?: string | null;
  studyRoutine?: string | null;
  owner?: string | null;
  status?: string | null;
  tags?: string[] | null;
  ageRange: string;
  gender: string;
  location: string;
  income: string;
  education: string;
  careerStage: string;
  specialtyTitle?: string | null;
  currentRole: string;
  workplace: string;
  careerGoal: string;
  interests: string;
  channels: string;
  notes: string;
  pains: PersonaFormPain[];
};

// 25 Provas agrupadas com tags de busca
const EXAM_OPTIONS: ComboboxOption[] = [
  // Residência
  { group: "Residência", value: "R1 — acesso direto (ENAMED)", label: "R1 — acesso direto (ENAMED)", tags: "enamed acesso direto primeiro ano r1" },
  { group: "Residência", value: "R3 — programa com pré-requisito", label: "R3 — programa com pré-requisito", tags: "pre requisito r3" },
  { group: "Residência", value: "R+ — subespecialidade (ENARE)", label: "R+ — subespecialidade (ENARE)", tags: "enare r mais subespecialidade" },
  { group: "Residência", value: "Residência Médica (mentoria)", label: "Residência Médica (mentoria)", tags: "residencia medica mentoria acompanhamento" },
  // Revalidação
  { group: "Revalidação", value: "Revalida — 1ª fase", label: "Revalida — 1ª fase", tags: "revalida inep primeira fase objetiva estrangeiro" },
  { group: "Revalidação", value: "Revalida — 2ª fase", label: "Revalida — 2ª fase", tags: "revalida inep segunda fase pratica estrangeiro" },
  // Título de especialista
  { group: "Título de especialista", value: "TSA — Anestesiologia", label: "TSA — Anestesiologia", tags: "tsa anestesiologia sba anest" },
  { group: "Título de especialista", value: "TEC — Cardiologia", label: "TEC — Cardiologia", tags: "tec cardiologia sbc cardio" },
  { group: "Título de especialista", value: "CBC — Cirurgia", label: "CBC — Cirurgia", tags: "cbc colegio brasileiro cirurgioes cirurgia geral" },
  { group: "Título de especialista", value: "TECM — Clínica Médica", label: "TECM — Clínica Médica", tags: "tecm clinica medica sbcm" },
  { group: "Título de especialista", value: "TED — Dermatologia", label: "TED — Dermatologia", tags: "ted dermatologia sbd derma" },
  { group: "Título de especialista", value: "TEEM — Endocrinologia", label: "TEEM — Endocrinologia", tags: "teem endocrinologia metabologia sbem endocrino" },
  { group: "Título de especialista", value: "EndócrinoPED — Endocrinologia Pediátrica", label: "EndócrinoPED — Endocrinologia Pediátrica", tags: "endocrinoped endocrino pediatrica infantil" },
  { group: "Título de especialista", value: "TEGO — Ginecologia e Obstetrícia", label: "TEGO — Ginecologia e Obstetrícia", tags: "tego ginecologia obstetricia febrasgo go" },
  { group: "Título de especialista", value: "TEME — Medicina de Emergência", label: "TEME — Medicina de Emergência", tags: "teme medicina emergencia abramede" },
  { group: "Título de especialista", value: "TEMI — Medicina Intensiva", label: "TEMI — Medicina Intensiva", tags: "temi medicina intensiva amib" },
  { group: "Título de especialista", value: "CBO — Oftalmologia", label: "CBO — Oftalmologia", tags: "cbo pno prova nacional oftalmologia oftalmo" },
  { group: "Título de especialista", value: "Ortopedia", label: "Ortopedia", tags: "ortopedia traumatologia teot tepot sbot" },
  { group: "Título de especialista", value: "TEP — Pediatria", label: "TEP — Pediatria", tags: "tep pediatria sbp" },
  { group: "Título de especialista", value: "CBR — Radiologia", label: "CBR — Radiologia", tags: "cbr colegio brasileiro radiologia radio" },
  { group: "Título de especialista", value: "TISBU — Urologia", label: "TISBU — Urologia", tags: "tisbu urologia sbu" },
  // Concursos
  { group: "Concursos", value: "ConcurSUS — concurso público / SUS", label: "ConcurSUS — concurso público / SUS", tags: "concursus concurso publico sus prefeitura estado" },
  // Internacional
  { group: "Internacional", value: "USMLE Step 1", label: "USMLE Step 1", tags: "usmle step 1 usa estados unidos" },
  { group: "Internacional", value: "USMLE Step 2 CK", label: "USMLE Step 2 CK", tags: "usmle step 2 ck usa estados unidos" },
  // Outras
  { group: "Outras", value: "Nenhuma — já titulado", label: "Nenhuma — já titulado", tags: "nenhuma ja titulado especialista" },
];

// Onde ela trabalha
const WORKPLACE_OPTIONS: ComboboxOption[] = [
  { value: "Hospital público", label: "Hospital público", tags: "sus estadual municipal federal publico" },
  { value: "Hospital privado", label: "Hospital privado", tags: "particular rede privada convenio" },
  { value: "Pronto-socorro / UPA", label: "Pronto-socorro / UPA", tags: "ps pronto socorro upa emergencia urgencia plantao" },
  { value: "UBS / atenção primária", label: "UBS / atenção primária", tags: "ubs posto de saude esf aps atencao primaria" },
  { value: "Ambulatório de especialidade", label: "Ambulatório de especialidade", tags: "ambulatorio especialidade consulta" },
  { value: "Consultório próprio", label: "Consultório próprio", tags: "consultorio clinica propria autonomo" },
  { value: "Telemedicina", label: "Telemedicina", tags: "telemedicina online remoto teleatendimento" },
  { value: "Academia / pesquisa / docência", label: "Academia / pesquisa / docência", tags: "universidade professor preceptor mestrado doutorado pesquisa docencia" },
  { value: "Ainda não atua", label: "Ainda não atua", tags: "estudante internato sem vinculo nao atua" },
  { value: "Varia", label: "Varia", tags: "varia depende multiplos vinculos" },
];

const CAREER_STAGES = [
  "Estudante",
  "Internato",
  "Recém-formado (R0)",
  "Residente",
  "Sem título",
  "Titulado",
  "Formado fora do Brasil",
];

const SPECIALTY_TITLES_SUGGESTIONS = [
  { sigla: "TEGO", label: "TEGO — Ginecologia e Obstetrícia" },
  { sigla: "TEC", label: "TEC — Cardiologia" },
  { sigla: "TED", label: "TED — Dermatologia" },
  { sigla: "TSA", label: "TSA — Anestesiologia" },
  { sigla: "CBC", label: "CBC — Cirurgia Geral" },
  { sigla: "TECM", label: "TECM — Clínica Médica" },
  { sigla: "TEEM", label: "TEEM — Endocrinologia" },
  { sigla: "EndócrinoPED", label: "EndócrinoPED — Endocrinologia Pediátrica" },
  { sigla: "TEME", label: "TEME — Medicina de Emergência" },
  { sigla: "TEMI", label: "TEMI — Medicina Intensiva" },
  { sigla: "CBO", label: "CBO — Oftalmologia" },
  { sigla: "TEOT", label: "TEOT — Ortopedia e Traumatologia" },
  { sigla: "TEP", label: "TEP — Pediatria" },
  { sigla: "CBR", label: "CBR — Radiologia" },
  { sigla: "TISBU", label: "TISBU — Urologia" },
  { sigla: "RQE", label: "RQE — Especialista Registrado" },
];

const ATTEMPT_OPTIONS = ["Primeira", "Retentativa", "Não se aplica"];

const ROUTINE_OPTIONS = [
  "Internato / faculdade",
  "Plantonista",
  "Ambulatório / consultório",
  "Residência em tempo integral",
  "Estuda em tempo integral",
  "Pós-graduação + trabalho",
  "Docência / preceptoria",
  "Variada",
];

const CHANNEL_OPTIONS = [
  "Instagram",
  "Comunidade WhatsApp",
  "YouTube",
  "E-mail",
  "TikTok",
  "Telegram",
  "Congressos",
];

const AGE_RANGES = ["Até 25", "26–30", "31–35", "36+", "Variada"];
const GENDER_OPTIONS = ["Mulheres", "Homens", "Equilibrado"];
const LOCATION_OPTIONS = ["Capitais", "Interior", "Nacional", "Fora do Brasil"];
const INCOME_OPTIONS = [
  "Sem renda própria",
  "Até 5 mil",
  "5 a 15 mil",
  "Acima de 15 mil",
  "Variada",
];

const OWNER_OPTIONS = [
  "Heloiza Goes",
  "Analista de Planejamento",
  "Coordenação da BU",
  "Sem responsável",
];

export function PersonaForm({
  businessUnitId,
  businessUnitLabel,
  values,
  mode,
  cancelHref,
}: {
  businessUnitId: string;
  businessUnitLabel: string;
  values: PersonaFormValues;
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const action = mode === "create" ? createPersona : updatePersona;
  const [state, formAction, isPending] = useActionState<PersonaFormState, FormData>(
    action,
    INITIAL_PERSONA_STATE,
  );

  // Estados dos seletores em chips
  const [status, setStatus] = useState(values.status || "active");
  const [careerStage, setCareerStage] = useState(values.careerStage || "Recém-formado (R0)");
  const [specialtyTitle, setSpecialtyTitle] = useState(values.specialtyTitle || "");
  const [attempt, setAttempt] = useState(values.attempt || "Primeira");
  const [studyRoutine, setStudyRoutine] = useState(values.studyRoutine || "Plantonista");
  const [ageRange, setAgeRange] = useState(values.ageRange || "26–30");
  const [gender, setGender] = useState(values.gender || "Mulheres");
  const [location, setLocation] = useState(values.location || "Capitais");
  const [income, setIncome] = useState(values.income || "5 a 15 mil");

  // Multi-select de canais
  const [selectedChannels, setSelectedChannels] = useState<string[]>(() => {
    if (!values.channels) return ["Instagram", "Comunidade WhatsApp"];
    return values.channels
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
  });

  // Dores adicionais
  const [pains, setPains] = useState<PersonaFormPain[]>(() => {
    if (values.pains && values.pains.length > 0) return values.pains;
    return [{ pain: "", solution: "" }];
  });

  function toggleChannel(ch: string) {
    setSelectedChannels((prev) =>
      prev.includes(ch) ? prev.filter((item) => item !== ch) : [...prev, ch],
    );
  }

  function updatePain(index: number, patch: Partial<PersonaFormPain>) {
    setPains((current) => {
      const copy = [...current];
      while (copy.length <= index) {
        copy.push({ pain: "", solution: "" });
      }
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {values.personaId ? <input type="hidden" name="personaId" value={values.personaId} /> : null}
      <input type="hidden" name="businessUnitId" value={businessUnitId} />

      {/* Hidden inputs para sincronizar chips */}
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="careerStage" value={careerStage} />
      <input type="hidden" name="specialtyTitle" value={careerStage === "Titulado" ? specialtyTitle : ""} />
      <input type="hidden" name="attempt" value={attempt} />
      <input type="hidden" name="studyRoutine" value={studyRoutine} />
      <input type="hidden" name="ageRange" value={ageRange} />
      <input type="hidden" name="gender" value={gender} />
      <input type="hidden" name="location" value={location} />
      <input type="hidden" name="income" value={income} />
      <input type="hidden" name="channels" value={selectedChannels.join("\n")} />

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-800 animate-in fade-in"
        >
          <AlertCircle className="size-4 shrink-0 text-red-600" />
          <span>{state.message}</span>
        </div>
      ) : null}

      {/* ─── GOVERNANÇA COMPACTA (BARRA SUPERIOR) ────────────────────────── */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 items-center">
          {/* Responsável */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
            <label htmlFor="owner-select" className="text-xs font-semibold text-slate-500 shrink-0">
              Responsável:
            </label>
            <div className="relative flex-1">
              <select
                id="owner-select"
                name="owner"
                defaultValue={values.owner || "Heloiza Goes"}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 pr-7 text-xs font-medium text-slate-800 transition focus:border-red-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {OWNER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-2 size-3.5 text-slate-400" />
            </div>
          </div>

          {/* Status em Chips */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Status:</span>
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {[
                { id: "active", label: "Ativa" },
                { id: "in_review", label: "Em revisão" },
                { id: "archived", label: "Arquivada" },
              ].map((s) => {
                const isActive = status === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatus(s.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? "bg-[#e2263c] text-white shadow-2xs font-semibold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags Livres */}
          <div className="md:col-span-1">
            <PersonaTagsInput
              name="tags"
              defaultTags={values.tags ?? []}
              placeholder="Adicionar tags da persona..."
            />
          </div>
        </div>
      </div>

      {/* ─── GRID DE 3 COLUNAS COMPACTAS ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4.5 sm:gap-5 items-start">
        {/* ── COLUNA 1: O QUE SÓ ELA TEM ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              O que só ela tem
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Campos essenciais de escrita que distinguem esta persona das outras.
            </p>
          </div>

          {/* Avatar Picker com upload de foto */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">
              Ilustração ou Foto <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <PersonaAvatarPicker initialValue={values.avatar} />
          </div>

          {/* Nome */}
          <div className="space-y-1">
            <label htmlFor="name" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Nome <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">como o time a chama</span>
            </label>
            <input
              id="name"
              name="name"
              defaultValue={values.name}
              placeholder="Ex.: Dra. Marina, a plantonista"
              maxLength={60}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Uma frase dela (Quote) */}
          <div className="space-y-1">
            <label htmlFor="quote" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Uma frase dela <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">insumo de copy</span>
            </label>
            <input
              id="quote"
              name="quote"
              defaultValue={values.quote ?? ""}
              placeholder="Ex.: Eu sei a teoria, mas erro questão na hora da prova"
              maxLength={120}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
            />
            <p className="text-[11px] text-slate-500 leading-tight pt-0.5">
              <span className="text-amber-700 font-medium">Evite:</span> busca preparação de qualidade ·{" "}
              <span className="text-emerald-700 font-medium">Prefira:</span> algo que ela escreveria num comentário.
            </p>
          </div>

          {/* Dor Principal */}
          <div className="space-y-1">
            <label htmlFor="main-pain" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Dor principal <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">motivação de compra</span>
            </label>
            <textarea
              id="main-pain"
              name="pain"
              value={pains[0]?.pain || ""}
              onChange={(e) => updatePain(0, { pain: e.target.value })}
              rows={2}
              maxLength={160}
              placeholder="Ex.: Chega do plantão às 7h e não consegue manter a rotina de questões"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition resize-none"
            />
            <p className="text-[11px] text-slate-500 leading-tight pt-0.5">
              <span className="text-amber-700 font-medium">Evite:</span> falta de tempo ·{" "}
              <span className="text-emerald-700 font-medium">Prefira:</span> estuda em blocos de 20 min entre atendimentos.
            </p>
          </div>

          {/* O que oferecemos para a dor principal */}
          <div className="space-y-1">
            <label htmlFor="main-solution" className="text-xs font-semibold text-slate-700">
              O que oferecemos para esta dor <span className="font-normal text-slate-400">(opcional)</span>
            </label>
            <input
              id="main-solution"
              name="solution"
              value={pains[0]?.solution || ""}
              onChange={(e) => updatePain(0, { solution: e.target.value })}
              placeholder="Ex.: App com modo offline e simulados rápidos de 15 questões"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
            />
          </div>

          {/* Interesses */}
          <div className="space-y-1">
            <label htmlFor="interests" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Interesses de conteúdo <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">pauta de marketing</span>
            </label>
            <textarea
              id="interests"
              name="interests"
              defaultValue={values.interests}
              rows={2}
              placeholder="Ex.: Acompanha caso clínico comentado, ouve podcast no deslocamento, salva resumo de prova antiga"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition resize-none"
            />
          </div>

          {/* Extras: Dores 2 e 3 */}
          <details className="border-t border-slate-100 pt-3 group">
            <summary className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400 group-open:rotate-90 transition-transform">▸</span>
                Mais duas dores secundárias
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                {pains.length > 1 && (pains[1]?.pain || pains[2]?.pain) ? "preenchidas" : "opcional"}
              </span>
            </summary>
            <div className="space-y-3.5 pt-3">
              {/* Dor 2 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 space-y-2">
                <span className="text-xs font-semibold text-slate-600 block">Dor 2</span>
                <input
                  name="pain"
                  value={pains[1]?.pain || ""}
                  onChange={(e) => updatePain(1, { pain: e.target.value })}
                  placeholder="Ex.: Compra material e não termina nenhum"
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
                <input
                  name="solution"
                  value={pains[1]?.solution || ""}
                  onChange={(e) => updatePain(1, { solution: e.target.value })}
                  placeholder="Solução para Dor 2 (opcional)"
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              {/* Dor 3 */}
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 space-y-2">
                <span className="text-xs font-semibold text-slate-600 block">Dor 3</span>
                <input
                  name="pain"
                  value={pains[2]?.pain || ""}
                  onChange={(e) => updatePain(2, { pain: e.target.value })}
                  placeholder="Ex.: Não sabe se o que estuda é o que a banca cobra"
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
                <input
                  name="solution"
                  value={pains[2]?.solution || ""}
                  onChange={(e) => updatePain(2, { solution: e.target.value })}
                  placeholder="Solução para Dor 3 (opcional)"
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>
            </div>
          </details>
        </section>

        {/* ── COLUNA 2: ONDE ELA ESTÁ NA JORNADA ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Onde ela está na jornada
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Eixos de segmentação e momento acadêmico no ecossistema MedCof.
            </p>
          </div>

          {/* Prova-Alvo Combobox */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Prova-alvo <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">25 provas agrupadas</span>
            </label>
            <PersonaCombobox
              name="targetExam"
              options={EXAM_OPTIONS}
              initialValue={values.targetExam ?? ""}
              placeholder="Selecione a prova-alvo…"
              searchPlaceholder="Buscar prova… (ex.: enare, revalida, título)"
              required
            />
          </div>

          {/* Momento de carreira (Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Momento de carreira <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CAREER_STAGES.map((st) => {
                const isSelected = careerStage === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setCareerStage(st)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qual título essa pessoa tem? (Aparece quando "Titulado" está selecionado) */}
          {careerStage === "Titulado" && (
            <div className="rounded-xl border border-rose-200/90 bg-rose-50/50 p-3.5 sm:p-4 space-y-3 transition-all animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="specialty-title-input"
                  className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <Award className="size-4 text-[#e2263c]" />
                  <span>
                    Qual título essa pessoa tem? <span className="text-red-500">*</span>
                  </span>
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  Selecione uma sigla ou digite
                </span>
              </div>

              <div>
                <input
                  id="specialty-title-input"
                  type="text"
                  value={specialtyTitle}
                  onChange={(e) => setSpecialtyTitle(e.target.value)}
                  placeholder="Ex.: TEGO — Ginecologia e Obstetrícia, TEC, TED, TSA..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#e2263c] focus:outline-none focus:ring-1 focus:ring-[#e2263c] shadow-2xs"
                />
              </div>

              {/* Sugestões de títulos médicos */}
              <div className="space-y-1 pt-0.5">
                <span className="text-[10px] text-slate-500 font-medium block">
                  Títulos frequentes das especialidades:
                </span>
                <div className="flex flex-wrap gap-1">
                  {SPECIALTY_TITLES_SUGGESTIONS.map((t) => {
                    const isCurrent =
                      specialtyTitle === t.label ||
                      specialtyTitle.toLowerCase() === t.sigla.toLowerCase();
                    return (
                      <button
                        key={t.sigla}
                        type="button"
                        onClick={() => setSpecialtyTitle(t.label)}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium border transition cursor-pointer ${
                          isCurrent
                            ? "bg-[#e2263c] border-[#e2263c] text-white font-semibold shadow-2xs"
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                        title={t.label}
                      >
                        {t.sigla}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tentativa (Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">Tentativa</label>
            <div className="flex flex-wrap gap-1.5">
              {ATTEMPT_OPTIONS.map((att) => {
                const isSelected = attempt === att;
                return (
                  <button
                    key={att}
                    type="button"
                    onClick={() => setAttempt(att)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {att}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rotina de estudo */}
          <div className="space-y-1">
            <label htmlFor="study-routine" className="text-xs font-semibold text-slate-700 block">
              Rotina de estudo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="study-routine"
                value={studyRoutine}
                onChange={(e) => setStudyRoutine(e.target.value)}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition"
              >
                {ROUTINE_OPTIONS.map((rot) => (
                  <option key={rot} value={rot}>
                    {rot}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-2.5 size-4 text-slate-400" />
            </div>
          </div>

          {/* Canais Principais (Multi-select Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Canais principais <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">onde consome de verdade</span>
            </label>
            <p className="text-[11px] text-slate-500 leading-tight">
              Marque os canais onde ela realmente abre, lê até o fim, comenta ou responde.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {CHANNEL_OPTIONS.map((ch) => {
                const isSelected = selectedChannels.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {isSelected ? "✓ " : ""}{ch}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── COLUNA 3: QUEM ELA É ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4.5 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Quem ela é
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Campos demográficos copiados direto para a segmentação de tráfego.
            </p>
          </div>

          {/* Faixa Etária (Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Faixa etária <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AGE_RANGES.map((ar) => {
                const isSelected = ageRange === ar;
                return (
                  <button
                    key={ar}
                    type="button"
                    onClick={() => setAgeRange(ar)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {ar}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gênero (Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Gênero <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GENDER_OPTIONS.map((gen) => {
                const isSelected = gender === gen;
                return (
                  <button
                    key={gen}
                    type="button"
                    onClick={() => setGender(gen)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {gen}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Localização (Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Localização <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LOCATION_OPTIONS.map((loc) => {
                const isSelected = location === loc;
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setLocation(loc)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Renda (Chips) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 block">
              Renda <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {INCOME_OPTIONS.map((inc) => {
                const isSelected = income === inc;
                return (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setIncome(inc)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer ${
                      isSelected
                        ? "bg-[#e2263c] border-[#e2263c] text-white shadow-2xs font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {inc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Onde ela trabalha Combobox */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Onde ela trabalha <span className="text-red-500">*</span></span>
              <span className="text-[10px] text-slate-400 font-normal">local de atuação</span>
            </label>
            <PersonaCombobox
              name="workplace"
              options={WORKPLACE_OPTIONS}
              initialValue={values.workplace ?? ""}
              placeholder="Selecione local de atuação…"
              searchPlaceholder="Buscar local… (ex.: upa, posto, hospital)"
              required
            />
          </div>

          {/* Extras: Anotações livres e outros campos */}
          <details className="border-t border-slate-100 pt-3 group">
            <summary className="text-xs font-semibold text-slate-700 hover:text-slate-900 cursor-pointer list-none flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="text-slate-400 group-open:rotate-90 transition-transform">▸</span>
                Anotações livres e outros campos
              </span>
              <span className="text-[11px] text-slate-400 font-normal">opcional</span>
            </summary>
            <div className="space-y-3 pt-3">
              <div className="space-y-1">
                <label htmlFor="headline" className="text-xs font-semibold text-slate-600 block">
                  Resumo / Headline
                </label>
                <input
                  id="headline"
                  name="headline"
                  defaultValue={values.headline}
                  placeholder="Ex.: Recém-formada decidindo a residência"
                  maxLength={120}
                  className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label htmlFor="currentRole" className="text-xs font-semibold text-slate-600 block">
                    Cargo / Ocupação
                  </label>
                  <input
                    id="currentRole"
                    name="currentRole"
                    defaultValue={values.currentRole}
                    placeholder="Ex.: Plantonista"
                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="careerGoal" className="text-xs font-semibold text-slate-600 block">
                    Objetivo
                  </label>
                  <input
                    id="careerGoal"
                    name="careerGoal"
                    defaultValue={values.careerGoal}
                    placeholder="Ex.: Aprovação em Dermato"
                    className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Anotações livres
                </label>
                <RichTextEditor
                  name="notes"
                  initialDoc={values.notes}
                  placeholder="Citações de entrevistas, links, contexto extra..."
                />
              </div>
            </div>
          </details>
        </section>
      </div>

      {/* ─── FOOTER COM AÇÕES ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending ? "Salvando…" : mode === "create" ? "Cadastrar persona" : "Salvar alterações"}
          </Button>
          <Link
            href={cancelHref}
            className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition"
          >
            Cancelar
          </Link>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Sparkles className="size-3.5 text-slate-400" />
          <span>Formulário compacto MedCof · 3 colunas ágeis</span>
        </div>
      </div>
    </form>
  );
}
