import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Acesso suspenso" };
export const dynamic = "force-dynamic";

export default async function SuspendedAccessPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.status === "active") redirect("/painel");
  if (currentUser.status === "pending") redirect("/aguardando-aprovacao");

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div
            aria-hidden
            className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger-50 text-2xl"
          >
            🔒
          </div>

          <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
            Acesso suspenso
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            O acesso da conta{" "}
            <span className="font-medium text-slate-900">
              {currentUser.email}
            </span>{" "}
            está suspenso no momento.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Se você acredita que isso é um erro, fale com o administrador da
            Central do Marketing.
          </p>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <SignOutButton className="mx-auto" />
          </div>
        </div>
      </div>
    </main>
  );
}
