import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { GoogleSignInButton } from "./google-sign-in-button";
import { TestLoginPanel } from "./test-login-panel";
import { Logo } from "@/components/layout/logo";
import { DEFAULT_ALLOWED_DOMAINS } from "@/lib/auth/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { isTestLoginEnabled } from "@/lib/auth/test-login";
import { getDb } from "@/lib/db/client";
import { allowedDomain } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "nao-autorizado":
    "Este e-mail não pertence a um domínio autorizado da MedCof. Use seu e-mail corporativo ou fale com o administrador da Central do Marketing.",
  "sessao-expirada":
    "Sua sessão expirou por inatividade. Entre novamente para continuar.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; destino?: string }>;
}) {
  const currentUser = await getCurrentUser();
  if (currentUser) redirect("/painel");

  const { erro, destino } = await searchParams;

  const testLoginEnabled = await isTestLoginEnabled();

  const db = await getDb();
  const dbDomains = await db
    .select({ domain: allowedDomain.domain })
    .from(allowedDomain)
    .where(eq(allowedDomain.isActive, true))
    .orderBy(asc(allowedDomain.domain));

  // Garante que os domínios corporativos oficiais (@medcof.com.br, @grupomedcof.com.br, @medcof.tech)
  // sempre apareçam na lista de e-mails aceitos mesmo antes da sincronização inicial
  const allDomains = Array.from(
    new Set([...DEFAULT_ALLOWED_DOMAINS, ...dbDomains.map((d) => d.domain)]),
  )
    .sort()
    .map((domain) => ({ domain }));
  const domains = allDomains;

  // Só aceitamos destinos internos, para o parâmetro não virar um redirecionador
  // aberto que possa ser usado em phishing.
  const safeDestination =
    destino && destino.startsWith("/") && !destino.startsWith("//")
      ? destino
      : "/painel";

  const errorMessage = erro ? ERROR_MESSAGES[erro] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Entrar na plataforma
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Acesso restrito ao time de marketing da MedCof.
          </p>

          {errorMessage ? (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
            >
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-6">
            <GoogleSignInButton callbackURL={safeDestination} />
          </div>

          {testLoginEnabled ? <TestLoginPanel /> : null}

          {domains.length > 0 ? (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <p className="text-xs font-medium text-slate-600">
                E-mails aceitos
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {domains.map(({ domain }) => (
                  <li
                    key={domain}
                    className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700"
                  >
                    @{domain}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Primeiro acesso? Depois de entrar, seu cadastro fica aguardando
          aprovação de um administrador.
        </p>
      </div>
    </main>
  );
}
