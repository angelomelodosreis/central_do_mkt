"use client";

import { Fragment, useActionState } from "react";

import { updateRolePermissions } from "./actions";
import { INITIAL_PERMISSION_STATE } from "./form-state";
import { ROLE_LABELS } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MODULE_KEYS, MODULE_LABELS, USER_ROLES } from "@/lib/db/schema";

type CurrentPermissions = Record<
  string,
  { canView: boolean; canEdit: boolean } | undefined
>;

export function PermissionMatrixForm({
  current,
}: {
  current: CurrentPermissions;
}) {
  const [state, formAction, isPending] = useActionState(
    updateRolePermissions,
    INITIAL_PERMISSION_STATE,
  );

  return (
    <form action={formAction} className="space-y-5">
      {state.message ? (
        <div
          role="status"
          className={
            state.status === "success"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              : "rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-900">
                Módulo
              </th>
              {USER_ROLES.map((role) => (
                <th
                  key={role}
                  className="border-b border-slate-200 px-3 py-2 text-center font-semibold text-slate-900"
                  colSpan={2}
                >
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
            <tr>
              <th className="border-b border-slate-200" />
              {USER_ROLES.map((role) => (
                <Fragment key={role}>
                  <th className="border-b border-slate-200 px-3 py-1.5 text-center text-xs font-medium text-slate-500">
                    Ver
                  </th>
                  <th className="border-b border-slate-200 px-3 py-1.5 text-center text-xs font-medium text-slate-500">
                    Editar
                  </th>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MODULE_KEYS.map((moduleKey) => (
              <tr key={moduleKey}>
                <td className="px-3 py-3 font-medium text-slate-800">
                  {MODULE_LABELS[moduleKey]}
                </td>
                {USER_ROLES.map((role) => {
                  const key = `${role}:${moduleKey}`;
                  const value = current[key];
                  // A permissão de administração do papel admin fica travada,
                  // para ninguém se trancar fora da plataforma por engano.
                  const isLocked = role === "admin" && moduleKey === "admin";

                  return (
                    <Fragment key={key}>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          name={`${key}:view`}
                          defaultChecked={isLocked || (value?.canView ?? false)}
                          disabled={isLocked}
                          aria-label={`${ROLE_LABELS[role]} pode ver ${MODULE_LABELS[moduleKey]}`}
                          className="size-4 rounded border-slate-300 text-brand-600 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          name={`${key}:edit`}
                          defaultChecked={isLocked || (value?.canEdit ?? false)}
                          disabled={isLocked}
                          aria-label={`${ROLE_LABELS[role]} pode editar ${MODULE_LABELS[moduleKey]}`}
                          className="size-4 rounded border-slate-300 text-brand-600 disabled:opacity-50"
                        />
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-5">
        <p className="text-xs text-slate-500">
          O acesso do Administrador ao módulo de Administração fica travado de
          propósito — sem ele, ninguém conseguiria voltar a conceder permissões.
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Salvando…" : "Salvar permissões"}
        </Button>
      </div>
    </form>
  );
}
