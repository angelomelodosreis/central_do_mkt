"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createProduct,
  setProductBusinessUnit,
  toggleProduct,
  updateProduct,
} from "../actions";
import { INITIAL_BASE_STATE } from "../form-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, FIELD_WIDTHS } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { PillTabs } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

type UnitRef = { id: string; label: string; divisionName: string | null };

type ProductCard = {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  businessUnitId: string | null;
  businessUnitLabel: string | null;
  divisionName: string | null;
};

type Filtro = "todos" | "sem_bu" | "com_bu" | "inativos";

/**
 * A base de produtos, com a associação à BU feita na própria linha.
 *
 * A tela é desenhada em torno da pendência que ela existe para resolver: o
 * mapeamento produto → BU ainda não foi informado, então "Sem BU" é a primeira
 * aba e o seletor fica em cada linha. Preencher 60 associações abrindo um
 * formulário por produto seria uma tarde de trabalho; assim é uma sessão só.
 */
export function ProductsPanel({
  products,
  units,
}: {
  products: ProductCard[];
  units: UnitRef[];
}) {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState<ProductCard | null>(null);

  const semBu = products.filter(
    (item) => item.isActive && !item.businessUnitId,
  ).length;

  const visiveis = useMemo(() => {
    return products.filter((item) => {
      if (filtro === "sem_bu" && (item.businessUnitId || !item.isActive)) {
        return false;
      }
      if (filtro === "com_bu" && !item.businessUnitId) return false;
      if (filtro === "inativos" && item.isActive) return false;
      if (filtro === "todos" && !item.isActive) return false;
      return matchesSearch(
        busca,
        item.name,
        item.slug,
        item.businessUnitLabel,
        item.divisionName,
      );
    });
  }, [products, filtro, busca]);

  return (
    <div className="space-y-5">
      {semBu > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {semBu}{" "}
            {semBu === 1 ? "produto ainda não tem" : "produtos ainda não têm"}{" "}
            BU definida.
          </p>
          <p className="mt-0.5">
            O mapeamento não foi cadastrado por não ter sido informado — nada
            foi deduzido. Defina a BU na própria linha; o produto já funciona
            sem ela.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <PillTabs<Filtro>
          value={filtro}
          onChange={setFiltro}
          items={[
            {
              value: "todos",
              label: "Ativos",
              count: products.filter((item) => item.isActive).length,
            },
            {
              value: "sem_bu",
              label: "Sem BU",
              count: semBu,
              alert: semBu > 0,
            },
            {
              value: "com_bu",
              label: "Com BU",
              count: products.filter((item) => item.businessUnitId).length,
            },
            {
              value: "inativos",
              label: "Inativos",
              count: products.filter((item) => !item.isActive).length,
            },
          ]}
        />
        <div className="min-w-48 flex-1">
          <Input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Buscar produto…"
            aria-label="Buscar produto"
          />
        </div>
        <Button variant="primary" onClick={() => setCriando(true)}>
          + Novo produto
        </Button>
      </div>

      <Card>
        <CardBody className="px-0 py-0">
          {visiveis.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              {busca
                ? `Nenhum produto encontrado para “${busca}”.`
                : "Nada nesta lista."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visiveis.map((item) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 px-5 py-2.5",
                    !item.isActive && "bg-slate-50/60",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {item.name}
                      </span>
                      {item.isActive ? null : <Badge>Inativo</Badge>}
                      {item.isActive && !item.businessUnitId ? (
                        <Badge tone="warning">Sem BU</Badge>
                      ) : null}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <code className="font-mono">{item.slug}</code>
                      {item.divisionName ? (
                        <span>· {item.divisionName}</span>
                      ) : null}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <form
                      action={setProductBusinessUnit}
                      className="flex items-center gap-1.5"
                    >
                      <input type="hidden" name="productId" value={item.id} />
                      <div className={FIELD_WIDTHS.lg}>
                        <Select
                          name="businessUnitId"
                          size="sm"
                          defaultValue={item.businessUnitId ?? ""}
                          placeholder="Definir BU…"
                          ariaLabel={`Business Unit de ${item.name}`}
                          options={[
                            { value: "", label: "Sem BU" },
                            ...units.map((unit) => ({
                              value: unit.id,
                              label: unit.label,
                              hint: unit.divisionName ?? undefined,
                            })),
                          ]}
                        />
                      </div>
                      <Button type="submit" size="sm" variant="secondary">
                        Salvar
                      </Button>
                    </form>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditando(item)}
                    >
                      Editar
                    </Button>

                    <form action={toggleProduct}>
                      <input type="hidden" name="productId" value={item.id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant={item.isActive ? "danger" : "secondary"}
                      >
                        {item.isActive ? "Desativar" : "Reativar"}
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <NewProductDrawer
        open={criando}
        onClose={() => setCriando(false)}
        units={units}
      />
      <EditProductDrawer product={editando} onClose={() => setEditando(null)} />
    </div>
  );
}

function NewProductDrawer({
  open,
  onClose,
  units,
}: {
  open: boolean;
  onClose: () => void;
  units: UnitRef[];
}) {
  const [state, formAction, isPending] = useActionState(
    createProduct,
    INITIAL_BASE_STATE,
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Novo produto"
      description="O identificador é a chave estável; o nome é só a etiqueta."
    >
      <form action={formAction} className="space-y-4">
        {state.message ? (
          <p
            role="status"
            className={cn(
              "rounded-lg border px-3 py-2 text-sm",
              state.status === "error"
                ? "border-danger-200 bg-danger-50 text-danger-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
            )}
          >
            {state.message}
          </p>
        ) : null}

        <Field label="Nome" htmlFor="product-name" required>
          <Input
            id="product-name"
            name="name"
            required
            maxLength={100}
            placeholder="Ex.: Extensivo R+ Maio"
          />
        </Field>

        <Field
          label="Identificador"
          htmlFor="product-slug"
          hint="Opcional — sai do nome quando em branco. Não muda depois."
        >
          <Input
            id="product-slug"
            name="slug"
            maxLength={80}
            placeholder="extensivo_rplus_maio"
            className="font-mono"
          />
        </Field>

        <Field label="Business Unit" htmlFor="product-unit">
          <Select
            id="product-unit"
            name="businessUnitId"
            defaultValue=""
            options={[
              { value: "", label: "Definir depois" },
              ...units.map((unit) => ({
                value: unit.id,
                label: unit.label,
                hint: unit.divisionName ?? undefined,
              })),
            ]}
          />
        </Field>

        <Field label="Descrição" htmlFor="product-description">
          <Input id="product-description" name="description" maxLength={200} />
        </Field>

        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? "Cadastrando…" : "Cadastrar produto"}
        </Button>
      </form>
    </Drawer>
  );
}

function EditProductDrawer({
  product,
  onClose,
}: {
  product: ProductCard | null;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={product !== null}
      onClose={onClose}
      title={product ? `Editar ${product.name}` : ""}
      description="O identificador não muda: ele já circulou fora da ferramenta."
    >
      {product ? (
        <form action={updateProduct} className="space-y-4" onSubmit={onClose}>
          <input type="hidden" name="productId" value={product.id} />

          <Field label="Nome" htmlFor="edit-product-name" required>
            <Input
              id="edit-product-name"
              name="name"
              required
              maxLength={100}
              defaultValue={product.name}
            />
          </Field>

          <Field label="Descrição" htmlFor="edit-product-description">
            <Input
              id="edit-product-description"
              name="description"
              maxLength={200}
            />
          </Field>

          <p className="text-xs text-slate-500">
            Identificador:{" "}
            <code className="font-mono text-slate-700">{product.slug}</code>
          </p>

          <div className="flex gap-2">
            <Button type="submit" variant="primary">
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}
    </Drawer>
  );
}
