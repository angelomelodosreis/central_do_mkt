"use client";

import { useState } from "react";

import {
  approveUser,
  changeUserRole,
  reactivateUser,
  suspendUser,
} from "./actions";
import { RoleBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { USER_ROLES, type UserRole, type UserStatus } from "@/lib/db/schema";
import { ROLE_LABELS } from "@/components/ui/badge";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  createdAt: string;
};

export function UserRow({
  user,
  isSelf,
}: {
  user: AdminUserRow;
  isSelf: boolean;
}) {
  const [isConfirmingSuspend, setIsConfirmingSuspend] = useState(false);

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{user.name}</span>
            {isSelf ? (
              <span className="text-xs text-slate-400">(você)</span>
            ) : null}
          </p>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StatusBadge status={user.status} />
            <RoleBadge role={user.role} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user.status === "pending" ? (
            <form action={approveUser}>
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" size="sm">
                Aprovar acesso
              </Button>
            </form>
          ) : null}

          {/* Trocar o papel só faz sentido para quem já tem acesso. */}
          {user.status === "active" && !isSelf ? (
            <form action={changeUserRole} className="flex items-center gap-2">
              <input type="hidden" name="userId" value={user.id} />
              <Select
                name="role"
                defaultValue={user.role}
                aria-label={`Papel de ${user.name}`}
                className="h-8 w-auto py-1 text-xs"
              >
                {USER_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="secondary">
                Salvar papel
              </Button>
            </form>
          ) : null}

          {user.status === "suspended" ? (
            <form action={reactivateUser}>
              <input type="hidden" name="userId" value={user.id} />
              <Button type="submit" size="sm" variant="secondary">
                Reativar
              </Button>
            </form>
          ) : null}

          {user.status !== "suspended" && !isSelf ? (
            isConfirmingSuspend ? (
              <form action={suspendUser} className="flex items-center gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <span className="text-xs text-slate-600">Confirmar?</span>
                <Button type="submit" size="sm" variant="danger">
                  Sim, suspender
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsConfirmingSuspend(false)}
                >
                  Não
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => setIsConfirmingSuspend(true)}
              >
                Suspender
              </Button>
            )
          ) : null}
        </div>
      </div>
    </li>
  );
}
