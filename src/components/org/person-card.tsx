import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABELS, type UserRole } from "@/lib/db/schema";
import type { Position } from "@/lib/modules/org/people";
import { cn } from "@/lib/utils/cn";

export type PersonCardData = {
  userId: string;
  name: string;
  email?: string;
  role?: UserRole;
  /** Cargo da pessoa — um só, e da pessoa, não do vínculo com o time. */
  jobTitleName?: string | null;
  positions: Position[];
  /** Responde pelo agrupamento em que o cartão está sendo exibido. */
  isLead?: boolean;
};

/**
 * Iniciais como avatar.
 *
 * A plataforma tem a foto do Google em `user.image`, mas ela falha em silêncio
 * quando a pessoa troca a foto ou revoga o acesso — e um quadrado quebrado no
 * meio do organograma é pior que uma inicial. As iniciais sempre existem.
 */
function initials(name: string): string {
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

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        toneFor(name),
        size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs",
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
      <Avatar name={person.name} size={compact ? "sm" : "md"} />
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
                className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
              >
                {position.teamName}
              </span>
            ))}
          </span>
        ) : null}

        {person.positions.length === 0 ? (
          <span className="mt-0.5 block text-xs text-slate-400">
            fora da estrutura
          </span>
        ) : null}
      </span>
      {person.role && showRole && !compact ? (
        <span className="shrink-0 text-[11px] text-slate-400">
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
