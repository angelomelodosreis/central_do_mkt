import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, ShieldCheck, Building2 } from "lucide-react";

import { Logo } from "@/components/layout/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { getUserBuRequests } from "@/lib/modules/access/bu-requests";
import { BuSelectionBoard } from "./bu-selection-board";

export const metadata: Metadata = {
  title: "Aguardando aprovação & Seleção de BUs | Central do Marketing",
};
export const dynamic = "force-dynamic";

export default async function PendingApprovalPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.status === "active") redirect("/painel");
  if (currentUser.status === "suspended") redirect("/acesso-suspenso");

  // Busca todas as BUs ativas oficiais da MedCof e as solicitações já feitas
  const [allUnits, existingRequests] = await Promise.all([
    listBusinessUnits({ includeInactive: false }),
    getUserBuRequests(currentUser.id),
  ]);

  const requestedBuIds = existingRequests.map((req) => req.businessUnitId);
  const initialNote = existingRequests[0]?.note ?? "";

  const unitsForBoard = allUnits.map((unit) => ({
    id: unit.id,
    slug: unit.slug,
    code: unit.code,
    label: unit.label,
    divisionName: unit.divisionName,
    isAlreadyRequested: requestedBuIds.includes(unit.id),
  }));

  return (
    <main className="min-h-screen bg-slate-50/60 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Cabeçalho da Página */}
        <header className="mb-8 flex flex-col items-center justify-between gap-4 border-b border-slate-200/80 pb-6 sm:flex-row">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Conectado como:</span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {currentUser.email}
            </span>
            <SignOutButton className="text-xs" />
          </div>
        </header>

        {/* Card de Status do Acesso */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-amber-200/80 bg-linear-to-r from-amber-50/70 via-amber-50/40 to-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                aria-hidden
                className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-100/80 text-amber-800 ring-4 ring-amber-50"
              >
                <Clock className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                    Cadastro em Análise de Acesso
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    Aguardando administrador
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Sua conta foi criada com sucesso! Enquanto o time
                  administrativo analisa seu cadastro, antecipe o processo
                  selecionando abaixo as <strong>Business Units (BUs)</strong>{" "}
                  em que você atuará.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-200 bg-white/80 px-4 py-2.5 shadow-2xs">
              <Building2 className="size-4 text-amber-700" />
              <div className="text-xs">
                <span className="font-semibold text-slate-800">
                  {requestedBuIds.length} de {unitsForBoard.length}
                </span>
                <span className="text-slate-500"> BUs selecionadas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Board de Seleção de BUs */}
        <section aria-labelledby="board-title">
          <BuSelectionBoard
            businessUnits={unitsForBoard}
            initialRequestedIds={requestedBuIds}
            initialNote={initialNote}
            isExistingMember={false}
          />
        </section>

        {/* Rodapé explicativo */}
        <footer className="mt-8 text-center text-xs text-slate-500">
          <p>
            Assim que a aprovação for confirmada, as Business Units marcadas
            estarão liberadas no seu menu e você terá acesso aos planejamentos e
            geradores. Dúvidas? Fale com a coordenação de Marketing MedCof.
          </p>
        </footer>
      </div>
    </main>
  );
}
