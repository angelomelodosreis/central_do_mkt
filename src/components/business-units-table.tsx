import { asc } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { getDb } from "@/lib/db/client";
import { businessUnit } from "@/lib/db/schema";

/**
 * Tabela de referência das Business Units, lida direto do banco.
 *
 * É isso que torna a página de documentação de BUs sempre correta: não há texto
 * colado que possa ficar desatualizado — cadastrar uma BU nova na Administração
 * já a faz aparecer aqui e no Gerador de Nomes.
 */
export async function BusinessUnitsTable() {
  const db = await getDb();
  const units = await db
    .select({
      slug: businessUnit.slug,
      label: businessUnit.label,
      description: businessUnit.description,
      isActive: businessUnit.isActive,
    })
    .from(businessUnit)
    .orderBy(asc(businessUnit.sortOrder), asc(businessUnit.label));

  const activeCount = units.filter((unit) => unit.isActive).length;

  return (
    <div>
      <p className="text-sm text-slate-600">
        {activeCount} {activeCount === 1 ? "BU ativa" : "BUs ativas"}
        {units.length !== activeCount
          ? ` · ${units.length - activeCount} inativa(s)`
          : ""}
        . O valor da coluna <strong>Slug</strong> é o que entra na nomenclatura.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-2.5 font-semibold text-slate-900">BU</th>
              <th className="px-4 py-2.5 font-semibold text-slate-900">
                Slug (usar na nomenclatura)
              </th>
              <th className="px-4 py-2.5 font-semibold text-slate-900">
                Situação
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {units.map((unit) => (
              <tr key={unit.slug} className={unit.isActive ? "" : "bg-slate-50/60"}>
                <td className="px-4 py-2.5 text-slate-800">
                  {unit.label}
                  {unit.description ? (
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {unit.description}
                    </span>
                  ) : null}
                </td>
                <td className="px-4 py-2.5">
                  <code className="font-mono text-xs text-slate-700">
                    {unit.slug}
                  </code>
                </td>
                <td className="px-4 py-2.5">
                  {unit.isActive ? (
                    <Badge tone="success">Ativa</Badge>
                  ) : (
                    <Badge tone="neutral">Inativa</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
