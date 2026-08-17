import type { Metadata } from "next";
import Link from "next/link";
import { count, eq } from "drizzle-orm";

import { NavIcon, type NavIconKey } from "@/components/layout/nav-icons";
import { Card, PageHeader } from "@/components/ui/card";
import { can, requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import {
  businessUnit,
  MODULE_LABELS,
  namingTemplate,
  persona,
  user,
} from "@/lib/db/schema";

export const metadata: Metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; modulo?: string }>;
}) {
  const currentUser = await requireUser();
  const { erro, modulo } = await searchParams;

  const db = await getDb();

  const [{ total: activeBusinessUnits }] = await db
    .select({ total: count() })
    .from(businessUnit)
    .where(eq(businessUnit.isActive, true));

  const [{ total: activeTemplates }] = await db
    .select({ total: count() })
    .from(namingTemplate)
    .where(eq(namingTemplate.isActive, true));

  const [{ total: activePersonas }] = await db
    .select({ total: count() })
    .from(persona)
    .where(eq(persona.isActive, true));

  const pendingUsers =
    currentUser.role === "admin"
      ? (
          await db
            .select({ total: count() })
            .from(user)
            .where(eq(user.status, "pending"))
        )[0].total
      : 0;

  const shortcuts = [
    can(currentUser, "name_generator") && {
      href: "/gerador-de-nomes",
      title: "Gerador de Nomes",
      description:
        "Monte nomes padronizados de listas, tags e outros itens do CRM.",
      icon: "generator" as NavIconKey,
    },
    can(currentUser, "documentation") && {
      href: "/documentacao",
      title: "Documentação",
      description:
        "Processos, convenções e material de onboarding do time de marketing.",
      icon: "docs" as NavIconKey,
    },
    can(currentUser, "personas") && {
      href: "/personas",
      title: "Personas",
      description:
        "Quem é o público de cada Business Unit: perfil, dores e o que oferecemos.",
      icon: "personas" as NavIconKey,
    },
    currentUser.role === "admin" && {
      href: "/admin/usuarios",
      title: "Aprovar acessos",
      description:
        pendingUsers > 0
          ? `${pendingUsers} ${pendingUsers === 1 ? "pessoa aguardando" : "pessoas aguardando"} aprovação.`
          : "Ninguém aguardando aprovação no momento.",
      icon: "admin" as NavIconKey,
      highlight: pendingUsers > 0,
    },
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    description: string;
    icon: NavIconKey;
    highlight?: boolean;
  }>;

  const firstName = currentUser.name.split(" ")[0] || currentUser.name;
  const deniedModuleLabel =
    modulo && modulo in MODULE_LABELS
      ? MODULE_LABELS[modulo as keyof typeof MODULE_LABELS]
      : null;

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Ferramentas, processos e convenções do time de marketing da MedCof em um só lugar."
      />

      {erro === "sem-permissao" ? (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          Você não tem permissão para acessar
          {deniedModuleLabel ? ` o módulo ${deniedModuleLabel}` : " essa área"}.
          Fale com um administrador se precisar desse acesso.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100"
              >
                <NavIcon name={shortcut.icon} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-2 font-medium text-slate-900 group-hover:text-brand-700">
                  {shortcut.title}
                  {shortcut.highlight ? (
                    <span className="inline-flex size-2 rounded-full bg-amber-500" />
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {shortcut.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* `auto-fit` em vez de um número fixo de colunas: quem não é admin vê um
          card a menos, e a linha se reajusta em vez de deixar um buraco. */}
      <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))]">
        <StatCard label="Business Units ativas" value={activeBusinessUnits} />
        <StatCard label="Modelos de nomenclatura" value={activeTemplates} />
        {can(currentUser, "personas") ? (
          <StatCard label="Personas cadastradas" value={activePersonas} />
        ) : null}
        {currentUser.role === "admin" ? (
          <StatCard label="Cadastros aguardando" value={pendingUsers} />
        ) : null}
      </div>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-5 py-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
        {value}
      </p>
    </Card>
  );
}
