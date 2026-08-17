"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createPersona, updatePersona } from "./actions";
import { INITIAL_PERSONA_STATE, type PersonaFormState } from "./form-state";
import { RichTextEditor } from "@/components/rich-text/editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export type PersonaFormBusinessUnit = { id: string; label: string };

export type PersonaFormPain = { pain: string; solution: string };

export type PersonaFormValues = {
  personaId?: string;
  businessUnitId: string;
  name: string;
  headline: string;
  ageRange: string;
  gender: string;
  location: string;
  income: string;
  education: string;
  careerStage: string;
  currentRole: string;
  workplace: string;
  careerGoal: string;
  interests: string;
  channels: string;
  notes: string;
  pains: PersonaFormPain[];
};

export function PersonaForm({
  businessUnits,
  values,
  mode,
  cancelHref,
}: {
  businessUnits: PersonaFormBusinessUnit[];
  values: PersonaFormValues;
  mode: "create" | "edit";
  cancelHref: string;
}) {
  const action = mode === "create" ? createPersona : updatePersona;
  const [state, formAction, isPending] = useActionState<
    PersonaFormState,
    FormData
  >(action, INITIAL_PERSONA_STATE);

  const [pains, setPains] = useState<PersonaFormPain[]>(
    values.pains.length > 0 ? values.pains : [{ pain: "", solution: "" }],
  );

  const openCount = pains.filter(
    (entry) => entry.pain.trim() && !entry.solution.trim(),
  ).length;

  function updatePain(index: number, patch: Partial<PersonaFormPain>) {
    setPains((current) =>
      current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {values.personaId ? (
        <input type="hidden" name="personaId" value={values.personaId} />
      ) : null}

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          {state.message}
        </div>
      ) : null}

      <Card>
        <CardHeader title="Identificação" />
        <CardBody className="space-y-5 sm:px-6 sm:py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Business Unit" htmlFor="businessUnitId" required>
              <Select
                id="businessUnitId"
                name="businessUnitId"
                defaultValue={values.businessUnitId}
                required
              >
                <option value="">Selecione…</option>
                {businessUnits.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Nome da persona"
              htmlFor="name"
              required
              hint="Como o time se refere a ela. Ex.: Dra. Marina, o residente."
            >
              <Input
                id="name"
                name="name"
                defaultValue={values.name}
                maxLength={60}
                required
              />
            </Field>
          </div>

          <Field
            label="Resumo"
            htmlFor="headline"
            hint="Uma frase que diz quem é. Aparece na listagem."
          >
            <Input
              id="headline"
              name="headline"
              defaultValue={values.headline}
              placeholder="Ex.: Recém-formada decidindo em qual residência prestar."
              maxLength={200}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Perfil demográfico"
          description="Campos iguais em toda persona — é o que permite comparar uma BU com a outra."
        />
        <CardBody className="sm:px-6 sm:py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Faixa etária"
              name="ageRange"
              value={values.ageRange}
              placeholder="Ex.: 24 a 30 anos"
            />
            <TextField
              label="Gênero"
              name="gender"
              value={values.gender}
              placeholder="Ex.: predominantemente feminino"
            />
            <TextField
              label="Localização"
              name="location"
              value={values.location}
              placeholder="Ex.: capitais do Sudeste"
            />
            <TextField
              label="Renda"
              name="income"
              value={values.income}
              placeholder="Ex.: 5 a 10 mil"
            />
            <TextField
              label="Escolaridade"
              name="education"
              value={values.education}
              placeholder="Ex.: superior completo em Medicina"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Carreira" />
        <CardBody className="sm:px-6 sm:py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              label="Momento de carreira"
              name="careerStage"
              value={values.careerStage}
              placeholder="Ex.: entre a formatura e a residência"
            />
            <TextField
              label="Cargo ou ocupação"
              name="currentRole"
              value={values.currentRole}
              placeholder="Ex.: médica plantonista"
            />
            <TextField
              label="Onde trabalha"
              name="workplace"
              value={values.workplace}
              placeholder="Ex.: hospital público, pronto-socorro"
            />
            <TextField
              label="Objetivo profissional"
              name="careerGoal"
              value={values.careerGoal}
              placeholder="Ex.: aprovação em residência de dermatologia"
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Interesses e canais" />
        <CardBody className="space-y-5 sm:px-6 sm:py-5">
          <Field
            label="Interesses"
            htmlFor="interests"
            hint="Um por linha."
          >
            <Textarea
              id="interests"
              name="interests"
              defaultValue={values.interests}
              rows={5}
              placeholder={"Estudo por questões\nRotina de plantão\nQualidade de vida"}
            />
          </Field>

          <Field
            label="Onde ela está"
            htmlFor="channels"
            hint="Um canal por linha: redes, comunidades, eventos, podcasts."
          >
            <Textarea
              id="channels"
              name="channels"
              defaultValue={values.channels}
              rows={4}
              placeholder={"Instagram\nGrupos de WhatsApp da faculdade\nCongressos"}
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Dores e o que oferecemos"
          description="A solução pode ficar em branco: dor mapeada sem resposta ainda é informação — vira pauta de produto."
          action={
            openCount > 0 ? (
              <Badge tone="warning">
                {openCount} sem solução
              </Badge>
            ) : null
          }
        />
        <CardBody className="space-y-4 sm:px-6 sm:py-5">
          {pains.map((entry, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2"
            >
              <div>
                <label
                  htmlFor={`pain-${index}`}
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Dor {index + 1}
                </label>
                <Textarea
                  id={`pain-${index}`}
                  name="pain"
                  value={entry.pain}
                  onChange={(event) =>
                    updatePain(index, { pain: event.target.value })
                  }
                  rows={3}
                  placeholder="Ex.: não consegue estudar com a carga de plantões"
                />
              </div>
              <div>
                <label
                  htmlFor={`solution-${index}`}
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  O que oferecemos{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <Textarea
                  id={`solution-${index}`}
                  name="solution"
                  value={entry.solution}
                  onChange={(event) =>
                    updatePain(index, { solution: event.target.value })
                  }
                  rows={3}
                  placeholder="Deixe em branco se ainda não temos resposta"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setPains((current) =>
                      current.length === 1
                        ? [{ pain: "", solution: "" }]
                        : current.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remover esta dor
                </Button>
              </div>
            </div>
          ))}

          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() =>
              setPains((current) => [...current, { pain: "", solution: "" }])
            }
          >
            Adicionar dor
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Anotações livres"
          description="O que não coube nos campos acima: contexto, citações de entrevista, links."
        />
        <CardBody className="sm:px-6 sm:py-5">
          <RichTextEditor
            name="notes"
            initialDoc={values.notes}
            placeholder="Escreva aqui…"
          />
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? "Salvando…"
            : mode === "create"
              ? "Cadastrar persona"
              : "Salvar alterações"}
        </Button>
        <Link
          href={cancelHref}
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  value,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} htmlFor={name}>
      <Input
        id={name}
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        maxLength={120}
      />
    </Field>
  );
}
