import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  listBusinessUnits,
  listDivisions,
  listProducts,
} from "@/lib/modules/bases/queries";

/**
 * As bases oficiais, lidas direto do banco, para a Documentação.
 *
 * É isto que torna a seção "Bases e Regras de Negócio" sempre correta: não há
 * texto colado que possa ficar desatualizado. Cadastrar uma BU na Administração
 * já a faz aparecer aqui, no Gerador de Nomes e no Planejamento — que é a
 * definição de base oficial.
 *
 * São de LEITURA. Quem pode editar vê um atalho para a administração; quem não
 * pode não vê atalho nenhum, em vez de ver um botão que o servidor recusa.
 */

function Tabela({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="whitespace-nowrap px-3 py-2 font-medium text-slate-600"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

function AtalhoAdmin({ href, children }: { href: string; children: string }) {
  return (
    <p className="mt-3 text-xs text-slate-500">
      <Link href={href} className="font-medium text-brand-600 hover:underline">
        {children}
      </Link>
    </p>
  );
}

export async function DivisionsTable({ canEdit }: { canEdit: boolean }) {
  const divisions = await listDivisions();
  const units = await listBusinessUnits({ includeInactive: false });

  return (
    <div>
      <p className="text-sm text-slate-600">
        A estrutura de negócio tem três níveis:{" "}
        <strong>Divisão → Business Unit → Produto</strong>. Toda BU pertence a
        uma divisão, e é por ela que se agrupa o negócio.
      </p>

      <Tabela headers={["Divisão", "Identificador", "Business Units"]}>
        {divisions.map((division) => (
          <tr
            key={division.id}
            className={division.isActive ? "" : "bg-slate-50"}
          >
            <td className="px-3 py-2 font-medium text-slate-900">
              {division.name}
              {division.isActive ? null : (
                <Badge className="ml-2">Inativa</Badge>
              )}
            </td>
            <td className="px-3 py-2">
              <code className="font-mono text-xs text-slate-600">
                {division.slug}
              </code>
            </td>
            <td className="px-3 py-2 text-slate-600">
              {units
                .filter((unit) => unit.divisionId === division.id)
                .map((unit) => unit.label)
                .join(", ") || "—"}
            </td>
          </tr>
        ))}
      </Tabela>

      {canEdit ? (
        <AtalhoAdmin href="/admin/bases/divisoes">
          Administrar divisões
        </AtalhoAdmin>
      ) : null}
    </div>
  );
}

export async function BusinessUnitsTable({
  canEdit = false,
}: {
  canEdit?: boolean;
}) {
  const units = await listBusinessUnits();
  const activeCount = units.filter((unit) => unit.isActive).length;

  return (
    <div>
      <p className="text-sm text-slate-600">
        {activeCount} {activeCount === 1 ? "BU ativa" : "BUs ativas"}
        {units.length !== activeCount
          ? ` · ${units.length - activeCount} inativa(s)`
          : ""}
        . O valor da coluna <strong>Identificador</strong> é o que entra na
        nomenclatura.
      </p>

      <Tabela
        headers={["Business Unit", "Identificador", "Divisão", "Produtos"]}
      >
        {units.map((unit) => (
          <tr key={unit.id} className={unit.isActive ? "" : "bg-slate-50"}>
            <td className="px-3 py-2 font-medium text-slate-900">
              {unit.label}
              {unit.isActive ? null : <Badge className="ml-2">Inativa</Badge>}
            </td>
            <td className="px-3 py-2">
              <code className="font-mono text-xs text-slate-600">
                {unit.slug}
              </code>
            </td>
            <td className="px-3 py-2 text-slate-600">
              {unit.divisionName ?? (
                <span className="text-amber-700">sem divisão</span>
              )}
            </td>
            <td className="px-3 py-2 tabular-nums text-slate-600">
              {unit.productCount || "—"}
            </td>
          </tr>
        ))}
      </Tabela>

      {canEdit ? (
        <AtalhoAdmin href="/admin/bases/business-units">
          Administrar Business Units
        </AtalhoAdmin>
      ) : null}
    </div>
  );
}

export async function ProductsTable({ canEdit }: { canEdit: boolean }) {
  const products = await listProducts({ includeInactive: false });
  const semBu = products.filter((item) => !item.businessUnitId).length;

  return (
    <div>
      <p className="text-sm text-slate-600">
        {products.length} produtos ativos. O <strong>identificador</strong> é a
        chave estável — é ele que aparece em planilhas e nomes gerados; o nome é
        apenas a etiqueta de exibição.
      </p>

      {semBu > 0 ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {semBu}{" "}
          {semBu === 1 ? "produto ainda não tem" : "produtos ainda não têm"} BU
          definida. O mapeamento está sendo preenchido pela administração.
        </p>
      ) : null}

      <Tabela
        headers={["Produto", "Identificador", "Business Unit", "Divisão"]}
      >
        {products.map((item) => (
          <tr key={item.id}>
            <td className="px-3 py-2 font-medium text-slate-900">
              {item.name}
            </td>
            <td className="px-3 py-2">
              <code className="font-mono text-xs text-slate-600">
                {item.slug}
              </code>
            </td>
            <td className="px-3 py-2 text-slate-600">
              {item.businessUnitLabel ?? (
                <span className="text-amber-700">a definir</span>
              )}
            </td>
            <td className="px-3 py-2 text-slate-600">
              {item.divisionName ?? "—"}
            </td>
          </tr>
        ))}
      </Tabela>

      {canEdit ? (
        <AtalhoAdmin href="/admin/bases/produtos">
          Administrar produtos
        </AtalhoAdmin>
      ) : null}
    </div>
  );
}
