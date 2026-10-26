"use client";

import { useActionState, useEffect, useState } from "react";

import { createProduct, toggleProduct, updateProduct } from "../../actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Section,
} from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PRODUCT_CADENCE_LABELS, type ProductCadence } from "@/lib/db/schema";

export type ProductRow = {
  id: string;
  name: string;
  cadence: ProductCadence;
  family: string | null;
  isActive: boolean;
  /** Quantas janelas este produto ocupa no calendário do ciclo aberto. */
  janelas: number;
  details?: Record<string, string> | null;
};

/**
 * Esteira de produtos da BU.
 *
 * Os produtos existiam no banco desde o calendário (é o que colore as janelas
 * de venda), mas só podiam ser criados direto no SQL. Esta tela é o cadastro
 * que faltava.
 */
export function ProductList({
  businessUnitId,
  products,
  canEdit,
}: {
  businessUnitId: string;
  products: ProductRow[];
  canEdit: boolean;
}) {
  const [creating, setCreating] = useState(false);

  const pontuais = products.filter((p) => p.cadence === "one_time");
  const continuos = products.filter((p) => p.cadence === "ongoing");

  return (
    <div className="space-y-4">
      {canEdit ? (
        creating ? (
          <Card>
            <CardHeader
              title="Novo produto"
              description="A cadência define como ele aparece no calendário: janelas pontuais ou faixa contínua."
            />
            <CardBody>
              <ProductForm
                mode="create"
                businessUnitId={businessUnitId}
                onDone={() => setCreating(false)}
              />
            </CardBody>
          </Card>
        ) : (
          <div className="flex justify-end">
            <Button onClick={() => setCreating(true)}>Novo produto</Button>
          </div>
        )
      ) : null}

      {/* As duas cadências na mesma moldura: é uma esteira só, lida de uma
          vez, e não duas listas independentes. */}
      <Card>
        <CardBody className="px-0 py-0">
          <CadenceGroup
            title="Contínuos"
            description="Correm ao longo do ciclo inteiro. Ex.: Extensivo, Semi-extensivo."
            products={continuos}
            canEdit={canEdit}
            businessUnitId={businessUnitId}
          />
          <CadenceGroup
            title="Pontuais"
            description="Acontecem em janelas. Ex.: Boot Camp, Revisão, Hands On."
            products={pontuais}
            canEdit={canEdit}
            businessUnitId={businessUnitId}
          />
        </CardBody>
      </Card>
    </div>
  );
}

function CadenceGroup({
  title,
  description,
  products,
  canEdit,
  businessUnitId,
}: {
  title: string;
  description: string;
  products: ProductRow[];
  canEdit: boolean;
  businessUnitId: string;
}) {
  return (
    <Section
      title={title}
      description={description}
      meta={products.length}
      divider
    >
      {products.length === 0 ? (
        <EmptyState variant="inline" title="Nenhum produto nesta cadência." />
      ) : (
        <ul className="divide-y divide-slate-100">
          {products.map((product) => (
            <ProductItem
              key={product.id}
              product={product}
              canEdit={canEdit}
              businessUnitId={businessUnitId}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}

function ProductItem({
  product,
  canEdit,
  businessUnitId,
}: {
  product: ProductRow;
  canEdit: boolean;
  businessUnitId: string;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <li className="bg-slate-50 px-5 py-4">
        <ProductForm
          mode="edit"
          businessUnitId={businessUnitId}
          product={product}
          onDone={() => setIsEditing(false)}
        />
      </li>
    );
  }

  const details = product.details ?? {};
  const hasMeta =
    details.tempoAcesso ||
    details.valorBase ||
    details.entregaveis ||
    details.materiaisExtras ||
    details.historicoNotas;

  return (
    <li
      className={`px-5 py-3.5 ${
        product.isActive ? "" : "bg-slate-50/60"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{product.name}</span>
            {product.family ? (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {product.family}
              </span>
            ) : null}
            {details.tempoAcesso ? (
              <span className="rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200">
                Acesso: {details.tempoAcesso}
              </span>
            ) : null}
            {details.valorBase ? (
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                Ticket: {details.valorBase}
              </span>
            ) : null}
            {product.isActive ? null : <Badge tone="neutral">Inativo</Badge>}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {product.janelas === 0
              ? "Nenhuma data no calendário do ciclo atual"
              : `${product.janelas} ${
                  product.janelas === 1 ? "data" : "datas"
                } no calendário do ciclo atual`}
          </p>
        </div>

        {canEdit ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Editar
            </Button>
            <form action={toggleProduct}>
              <input type="hidden" name="productId" value={product.id} />
              <Button
                type="submit"
                size="sm"
                variant={product.isActive ? "ghost" : "secondary"}
              >
                {product.isActive ? "Desativar" : "Reativar"}
              </Button>
            </form>
          </div>
        ) : null}
      </div>

      {hasMeta ? (
        <div className="mt-3 space-y-1.5 rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs text-slate-600">
          {details.entregaveis ? (
            <p>
              <strong className="font-semibold text-slate-800">Entregáveis:</strong>{" "}
              {details.entregaveis}
            </p>
          ) : null}
          {details.materiaisExtras ? (
            <p>
              <strong className="font-semibold text-slate-800">Materiais Extras:</strong>{" "}
              {details.materiaisExtras}
            </p>
          ) : null}
          {details.historicoNotas ? (
            <p className="text-slate-500">
              <strong className="font-semibold text-slate-700">Histórico / Observações:</strong>{" "}
              {details.historicoNotas}
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function ProductForm({
  mode,
  businessUnitId,
  product,
  onDone,
}: {
  mode: "create" | "edit";
  businessUnitId: string;
  product?: ProductRow;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    StrategyFormState,
    FormData
  >(mode === "create" ? createProduct : updateProduct, INITIAL_STRATEGY_STATE);

  // Fecha o formulário quando a gravação deu certo, mantendo-o aberto (com a
  // mensagem) quando não deu. Em efeito, e não direto no corpo: avisar o pai
  // durante a renderização do filho é alterar estado no meio de um render.
  useEffect(() => {
    if (state.status === "success") onDone();
  }, [state, onDone]);

  const details = product?.details ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="businessUnitId" value={businessUnitId} />
      {product ? (
        <input type="hidden" name="productId" value={product.id} />
      ) : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-800"
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Nome" htmlFor={`nome-${product?.id ?? "novo"}`} required>
          <Input
            id={`nome-${product?.id ?? "novo"}`}
            name="name"
            defaultValue={product?.name ?? ""}
            maxLength={80}
            required
          />
        </Field>

        <Field
          label="Cadência"
          htmlFor={`cadencia-${product?.id ?? "novo"}`}
          required
        >
          <Select
            id={`cadencia-${product?.id ?? "novo"}`}
            name="cadence"
            defaultValue={product?.cadence ?? "one_time"}
            required
            options={(
              Object.entries(PRODUCT_CADENCE_LABELS) as [
                ProductCadence,
                string,
              ][]
            ).map(([value, label]) => ({
              value,
              label,
              hint:
                value === "ongoing"
                  ? "Corre ao longo do ciclo inteiro"
                  : "Acontece em janelas",
            }))}
          />
        </Field>

        <Field
          label="Família"
          htmlFor={`familia-${product?.id ?? "novo"}`}
          hint="Opcional. Agrupa variações do mesmo produto."
        >
          <Input
            id={`familia-${product?.id ?? "novo"}`}
            name="family"
            defaultValue={product?.family ?? ""}
            maxLength={60}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Tempo de Acesso"
          htmlFor={`tempoAcesso-${product?.id ?? "novo"}`}
          hint="Ex.: 12 meses, até a prova R3/Sub, acesso vitalício."
        >
          <Input
            id={`tempoAcesso-${product?.id ?? "novo"}`}
            name="tempoAcesso"
            defaultValue={details.tempoAcesso ?? ""}
            maxLength={60}
            placeholder="Ex.: 12 meses"
          />
        </Field>

        <Field
          label="Valor de Referência / Ticket"
          htmlFor={`valorBase-${product?.id ?? "novo"}`}
          hint="Preço base ou faixa esperada de matrícula."
        >
          <Input
            id={`valorBase-${product?.id ?? "novo"}`}
            name="valorBase"
            defaultValue={details.valorBase ?? ""}
            maxLength={60}
            placeholder="Ex.: R$ 4.890"
          />
        </Field>
      </div>

      <Field
        label="Entregáveis do Produto"
        htmlFor={`entregaveis-${product?.id ?? "novo"}`}
        hint="Cursos, banco de questões, mentorias, simulados inclusos."
      >
        <Textarea
          id={`entregaveis-${product?.id ?? "novo"}`}
          name="entregaveis"
          defaultValue={details.entregaveis ?? ""}
          rows={2}
          placeholder="Ex.: Banco com 80.000 questões comentadas, mentorias semanais, cronograma adaptativo por IA."
        />
      </Field>

      <Field
        label="Materiais Extras"
        htmlFor={`materiaisExtras-${product?.id ?? "novo"}`}
        hint="Apostilas físicas, resumos em PDF, flashcards, kits."
      >
        <Input
          id={`materiaisExtras-${product?.id ?? "novo"}`}
          name="materiaisExtras"
          defaultValue={details.materiaisExtras ?? ""}
          maxLength={120}
          placeholder="Ex.: Apostilas físicas entregues em domicílio + deck Anki"
        />
      </Field>

      <Field
        label="Histórico & Observações"
        htmlFor={`historicoNotas-${product?.id ?? "novo"}`}
        hint="Contexto histórico, mudanças de lote ou notas para o time."
      >
        <Textarea
          id={`historicoNotas-${product?.id ?? "novo"}`}
          name="historicoNotas"
          defaultValue={details.historicoNotas ?? ""}
          rows={2}
          placeholder="Ex.: Produto reformulado em 2026 com acréscimo de tutoria ao vivo e nova esteira de simulação."
        />
      </Field>

      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="primary" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
