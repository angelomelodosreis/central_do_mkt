import { Radio, ShieldAlert } from "lucide-react";
import type { SaleTransaction } from "@/lib/modules/sales/types";

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  approved: {
    label: "Aprovado",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "Pendente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cancelled: {
    label: "Cancelado",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  refunded: {
    label: "Estornado",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

const METHOD_LABELS: Record<string, string> = {
  pix: "PIX",
  credit_card: "Cartão",
  boleto: "Boleto",
  other: "Outro",
};

export function LiveTransactionsTable({
  transactions,
  isLive,
}: {
  transactions: SaleTransaction[];
  isLive: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="relative flex size-3">
            <span
              className={`absolute inline-flex size-full animate-ping rounded-full ${
                isLive ? "bg-emerald-400" : "bg-amber-400"
              } opacity-75`}
            />
            <span
              className={`relative inline-flex size-3 rounded-full ${
                isLive ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </div>
          <h3 className="font-display text-base font-bold text-slate-900">
            Monitor de Vendas em Tempo Real (Feed Ao Vivo)
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Radio className="size-3.5 text-brand-600" />
          <span>Últimas {transactions.length} transações registradas</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-6 py-3">Horário / Data</th>
              <th className="px-6 py-3">Produto</th>
              <th className="px-6 py-3">Business Unit</th>
              <th className="px-6 py-3">Valor</th>
              <th className="px-6 py-3">Pagamento</th>
              <th className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  Nenhuma transação recente encontrada.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const dateObj = new Date(tx.date);
                const hora = dateObj.toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                const data = dateObj.toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                });
                const badge =
                  STATUS_BADGES[tx.status] || STATUS_BADGES.approved;

                return (
                  <tr key={tx.id} className="transition hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span className="font-bold text-slate-800">{hora}</span>
                      <span className="ml-1 text-[11px] text-slate-400">
                        ({data})
                      </span>
                    </td>
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {tx.product}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {tx.businessUnitLabel}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-bold text-slate-900">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(tx.amount)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-slate-600">
                      {METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
