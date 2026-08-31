import { asc, eq } from "drizzle-orm";

import {
  OFFICIAL_BASES,
  type BaseKey,
  type BaseOption,
  type BaseOptions,
} from "./registry";
import { getDb } from "@/lib/db/client";
import {
  businessDivision,
  businessUnit,
  product,
  type BusinessDivision,
  type Product,
} from "@/lib/db/schema";

export type DivisionRow = BusinessDivision & {
  businessUnitCount: number;
};

export type BusinessUnitRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  divisionId: string | null;
  divisionName: string | null;
  divisionSlug: string | null;
  productCount: number;
};

export type ProductRow = Product & {
  businessUnitLabel: string | null;
  businessUnitSlug: string | null;
  divisionName: string | null;
};

/** As divisões, com quantas BUs cada uma reúne. */
export async function listDivisions(): Promise<DivisionRow[]> {
  const db = await getDb();
  const [divisions, units] = await Promise.all([
    db
      .select()
      .from(businessDivision)
      .orderBy(asc(businessDivision.sortOrder), asc(businessDivision.name)),
    db
      .select({ divisionId: businessUnit.divisionId })
      .from(businessUnit)
      .where(eq(businessUnit.isActive, true)),
  ]);

  const contagem = new Map<string, number>();
  for (const unidade of units) {
    if (unidade.divisionId) {
      contagem.set(
        unidade.divisionId,
        (contagem.get(unidade.divisionId) ?? 0) + 1,
      );
    }
  }

  return divisions.map((division) => ({
    ...division,
    businessUnitCount: contagem.get(division.id) ?? 0,
  }));
}

/** As BUs, com a divisão resolvida e quantos produtos cada uma tem. */
export async function listBusinessUnits({
  includeInactive = true,
}: { includeInactive?: boolean } = {}): Promise<BusinessUnitRow[]> {
  const db = await getDb();

  const [units, products] = await Promise.all([
    db
      .select({
        id: businessUnit.id,
        slug: businessUnit.slug,
        label: businessUnit.label,
        description: businessUnit.description,
        isActive: businessUnit.isActive,
        sortOrder: businessUnit.sortOrder,
        divisionId: businessUnit.divisionId,
        divisionName: businessDivision.name,
        divisionSlug: businessDivision.slug,
      })
      .from(businessUnit)
      .leftJoin(
        businessDivision,
        eq(businessUnit.divisionId, businessDivision.id),
      )
      .where(includeInactive ? undefined : eq(businessUnit.isActive, true))
      .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label)),
    db
      .select({ businessUnitId: product.businessUnitId })
      .from(product)
      .where(eq(product.isActive, true)),
  ]);

  const contagem = new Map<string, number>();
  for (const item of products) {
    if (item.businessUnitId) {
      contagem.set(
        item.businessUnitId,
        (contagem.get(item.businessUnitId) ?? 0) + 1,
      );
    }
  }

  return units.map((unit) => ({
    ...unit,
    productCount: contagem.get(unit.id) ?? 0,
  }));
}

/** Os produtos, com BU e divisão resolvidas. */
export async function listProducts({
  includeInactive = true,
}: { includeInactive?: boolean } = {}): Promise<ProductRow[]> {
  const db = await getDb();

  return db
    .select({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      businessUnitId: product.businessUnitId,
      isActive: product.isActive,
      sortOrder: product.sortOrder,
      createdBy: product.createdBy,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      businessUnitLabel: businessUnit.label,
      businessUnitSlug: businessUnit.slug,
      divisionName: businessDivision.name,
    })
    .from(product)
    .leftJoin(businessUnit, eq(product.businessUnitId, businessUnit.id))
    .leftJoin(
      businessDivision,
      eq(businessUnit.divisionId, businessDivision.id),
    )
    .where(includeInactive ? undefined : eq(product.isActive, true))
    .orderBy(asc(product.sortOrder), asc(product.name));
}

/**
 * Todas as bases oficiais, no formato de opção, numa consulta só por base.
 *
 * O Gerador de Nomes carrega as três de uma vez em vez de sob demanda: são
 * poucas centenas de linhas no total, e carregar sob demanda tornaria o filtro
 * hierárquico uma ida ao servidor a cada escolha de divisão.
 */
export async function loadBaseOptions(): Promise<BaseOptions> {
  const [divisions, units, products] = await Promise.all([
    listDivisions(),
    listBusinessUnits({ includeInactive: false }),
    listProducts({ includeInactive: false }),
  ]);

  return {
    business_division: divisions
      .filter((division) => division.isActive)
      .map((division): BaseOption => ({
        value: division.slug,
        label: division.name,
        parentValue: null,
      })),
    business_unit: units.map((unit): BaseOption => ({
      value: unit.slug,
      label: unit.label,
      parentValue: unit.divisionSlug,
      hint: unit.divisionName ?? undefined,
    })),
    product: products.map((item): BaseOption => ({
      value: item.slug,
      label: item.name,
      parentValue: item.businessUnitSlug,
      // Produto sem BU continua utilizável: o mapeamento ainda está sendo
      // preenchido, e travá-lo até lá deixaria o gerador sem produtos.
      hint: item.businessUnitLabel ?? "sem BU definida",
    })),
  };
}

/** Quantas opções cada base tem — usado nos avisos da administração. */
export function countBaseOptions(
  options: BaseOptions,
): Record<BaseKey, number> {
  return Object.fromEntries(
    (Object.keys(OFFICIAL_BASES) as BaseKey[]).map((key) => [
      key,
      options[key].length,
    ]),
  ) as Record<BaseKey, number>;
}
