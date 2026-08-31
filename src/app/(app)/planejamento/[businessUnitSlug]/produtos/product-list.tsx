"use client";

import { useActionState, useEffect, useState } from "react";

import {
  createProduct,
  toggleProduct,
  updateProduct,
} from "../../actions";
import {
  INITIAL_STRATEGY_STATE,
  type StrategyFormState,
} from "../../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
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
    <div className="space-y-6">
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

      <CadenceGroup
        title="Produtos contínuos"
        description="Correm ao longo do ciclo inteiro. Ex.: Extensivo, Semi-extensivo."
        products={continuos}
        canEdit={canEdit}
        businessUnitId={businessUnitId}
      />

      <CadenceGroup
        title="Produtos pontuais"
        description="Acontecem em janelas. Ex.: Boot Camp, Revisão, Hands On."
        products={pontuais}
        canEdit={canEdit}
        businessUnitId={businessUnitId}
      />
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
    <Card>
      <CardHeader
        title={`${title} (${products.length})`}
        description={description}
      />
      <CardBody className="px-0 py-0">
        {products.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-400">
            Nenhum produto nesta cadência.
          </p>
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
      </CardBody>
    </Card>
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

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${
        product.isActive ? "" : "bg-slate-50/60"
      }`}
    >
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{product.name}</span>
          {product.family ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              {product.family}
            </span>
          ) : null}
          {product.isActive ? null : <Badge tone="neutral">Inativo</Badge>}
        </p>
        <p className="mt-0.5 text-xs text-slate-400">
          {product.janelas === 0
            ? "Nenhuma data no calendário do ciclo atual"
            : `${product.janelas} ${
                product.janelas === 1 ? "data" : "datas"
              } no calendário do ciclo atual`}
        </p>
      </div>

      {canEdit ? (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
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
              Object.entries(PRODUCT_CADENCE_LABELS) as [ProductCadence, string][]
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

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
