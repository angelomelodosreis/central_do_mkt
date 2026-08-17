import type { Metadata } from "next";
import Link from "next/link";

import { AuditEntryRow } from "./audit-entry-row";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/session";
import { listAuditLog } from "@/lib/modules/audit/log";

export const metadata: Metadata = { title: "Auditoria" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ busca?: string; pagina?: string }>;
}) {
  await requireAdmin();
  const { busca, pagina } = await searchParams;

  const page = Math.max(1, Number(pagina) || 1);
  const entries = await listAuditLog({
    search: busca,
    limit: PAGE_SIZE + 1,
    offset: (page - 1) * PAGE_SIZE,
  });

  const hasNextPage = entries.length > PAGE_SIZE;
  const visible = entries.slice(0, PAGE_SIZE);

  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (busca) params.set("busca", busca);
    if (target > 1) params.set("pagina", String(target));
    const query = params.toString();
    return query ? `/admin/auditoria?${query}` : "/admin/auditoria";
  }

  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Registro de tudo que acontece na plataforma. Ações destrutivas podem ser desfeitas aqui."
      />

      <Card>
        <CardHeader
          title="Histórico de ações"
          description="Do mais recente para o mais antigo."
          action={
            <form className="flex items-end gap-2">
              <Input
                name="busca"
                defaultValue={busca ?? ""}
                placeholder="Buscar por ação ou pessoa"
                className="h-9 w-56"
                aria-label="Buscar na auditoria"
              />
              <Button type="submit" size="sm" variant="secondary">
                Buscar
              </Button>
            </form>
          }
        />
        <CardBody className="px-0 py-0">
          {visible.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">
              {busca
                ? "Nenhum registro encontrado para essa busca."
                : "Nenhuma ação registrada ainda."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((entry) => (
                <AuditEntryRow
                  key={entry.id}
                  entry={{
                    id: entry.id,
                    action: entry.action,
                    summary: entry.summary,
                    actorEmail: entry.actorEmail,
                    createdAt: entry.createdAt.toISOString(),
                    isUndoable: entry.isUndoable,
                    isUndone: Boolean(entry.undoneAt),
                    beforeData: entry.beforeData
                      ? JSON.stringify(entry.beforeData, null, 2)
                      : null,
                    afterData: entry.afterData
                      ? JSON.stringify(entry.afterData, null, 2)
                      : null,
                  }}
                />
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {(page > 1 || hasNextPage) && (
        <div className="mt-4 flex items-center justify-between text-sm">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="font-medium text-brand-600 hover:underline"
            >
              ← Página anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-500">Página {page}</span>
          {hasNextPage ? (
            <Link
              href={pageHref(page + 1)}
              className="font-medium text-brand-600 hover:underline"
            >
              Próxima página →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </>
  );
}
