"use client";

import { useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/db/schema";
import type { Position } from "@/lib/modules/org/people";
import { cn } from "@/lib/utils/cn";

export type PersonCardData = {
  userId: string;
  name: string;
  image?: string | null;
  email?: string;
  role?: UserRole;
  /** Cargo da pessoa — um só, e da pessoa, não do vínculo com o time. */
  jobTitleName?: string | null;
  positions: Position[];
  /** Responde pelo agrupamento em que o cartão está sendo exibido. */
  isLead?: boolean;
};

/**
 * Iniciais como avatar / sigla do usuário.
 *
 * Utilizado como fallback quando o usuário não tiver foto cadastrada
 * ou quando a imagem falhar ao carregar.
 */
export function initials(name: string): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Cor derivada do nome, estável.
 *
 * Serve para o olho reencontrar a mesma pessoa em visualizações diferentes do
 * organograma sem precisar ler o nome. Determinística de propósito: sortear a
 * cor faria a pessoa mudar de cor a cada carregamento.
 */
const TONES = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
];

export function toneFor(name: string): string {
  let soma = 0;
  for (const char of name) soma = (soma + char.codePointAt(0)!) % 997;
  return TONES[soma % TONES.length];
}

const AVATAR_SIZES = {
  xs: "size-5 text-[9px]",
  sm: "size-7 text-[10px]",
  md: "size-9 text-xs",
  lg: "size-12 text-sm",
  xl: "size-20 text-xl font-bold",
};

export function Avatar({
  name,
  image,
  size = "md",
  className,
}: {
  name: string;
  image?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  // Se tiver imagem e não tiver falhado, exibe a foto do perfil
  if (image && !hasError) {
    return (
      <img
        src={image}
        alt={name}
        onError={() => setHasError(true)}
        className={cn(
          "shrink-0 rounded-full object-cover shadow-2xs ring-1 ring-black/5",
          AVATAR_SIZES[size].split(" ")[0],
          className,
        )}
      />
    );
  }

  // Caso não tenha foto (ou a foto falhe), exibe as siglas/iniciais
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold select-none",
        toneFor(name),
        AVATAR_SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/**
 * Uma pessoa no organograma.
 *
 * Mostra o cargo e TODAS as unidades, e não só a principal: é a informação que
 * a visualização de squad existe para dar — quem é dessa BU e de onde ela vem.
 * `hideTeamId` esconde a unidade quando o cartão já está dentro do bloco dela,
 * para não repetir a mesma palavra em cada linha.
 */
export function PersonCard({
  person,
  hideTeamId,
  href,
  className,
  compact = false,
  showRole = false,
}: {
  person: PersonCardData;
  hideTeamId?: string;
  href?: string;
  className?: string;
  compact?: boolean;
  /**
   * O papel de acesso é escondido por padrão.
   *
   * Num cartão de organograma ele disputava a linha com o nome e o truncava —
   * e a pergunta ali é organizacional (quem é, em que time), não de permissão.
   * Onde o papel importa (Administração), ele aparece como badge próprio.
   */
  showRole?: boolean;
}) {
  const visiveis = hideTeamId
    ? person.positions.filter((position) => position.teamId !== hideTeamId)
    : person.positions;

  // O cargo aparece sempre — é o que identifica a pessoa. Antes ele dependia
  // do bloco em que o cartão estava, e sumia fora dele.
  const cargo = person.jobTitleName ?? null;

  const corpo = (
    <>
      <Avatar
        name={person.name}
        image={person.image}
        size={compact ? "sm" : "md"}
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "truncate font-medium text-slate-900",
              compact ? "text-xs" : "text-sm",
            )}
          >
            {person.name}
          </span>
          {person.isLead ? <Badge tone="brand">Responsável</Badge> : null}
        </span>

        {cargo ? (
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {cargo}
          </span>
        ) : null}

        {visiveis.length > 0 ? (
          <span className="mt-1 flex flex-wrap gap-1">
            {visiveis.map((position) => (
              <span
                key={position.teamId}
                className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600"
              >
                {position.teamName}
              </span>
            ))}
          </span>
        ) : null}

        {person.positions.length === 0 ? (
          <span className="mt-0.5 block text-xs text-slate-500">
            fora da estrutura
          </span>
        ) : null}
      </span>
      {person.role && showRole && !compact ? (
        <span className="shrink-0 text-xs text-slate-500">
          {USER_ROLE_LABELS[person.role]}
        </span>
      ) : null}
    </>
  );

  const classes = cn(
    "flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm transition-colors",
    href && "hover:border-brand-300 hover:bg-brand-50/40",
    className,
  );

  return href ? (
    <Link href={href} className={classes}>
      {corpo}
    </Link>
  ) : (
    <div className={classes}>{corpo}</div>
  );
}
