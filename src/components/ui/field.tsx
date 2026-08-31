import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const CONTROL_CLASSES =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "placeholder:text-slate-500 hover:border-slate-400 " +
  // `outline-none` junto do anel: sem isso o navegador desenha o contorno dele
  // por cima do nosso, e o campo em foco fica com duas bordas.
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 disabled:hover:border-slate-300";

export function Field({
  label,
  hint,
  htmlFor,
  required,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-800"
      >
        {label}
        {required ? <span className="ml-0.5 text-brand-600">*</span> : null}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL_CLASSES, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(CONTROL_CLASSES, "font-mono text-[13px]", className)}
      {...props}
    />
  );
}

/**
 * Larguras dos controles de formulário.
 *
 * Existe porque as telas vinham escolhendo `w-36`, `w-40`, `w-44`, `w-48`,
 * `w-52` e `w-56` a olho — seis larguras para o mesmo tipo de campo, lado a
 * lado, sem nenhuma delas significar coisa alguma. A escala amarra a largura ao
 * CONTEÚDO esperado, que é a única razão legítima para um campo ser mais
 * estreito que o outro.
 */
export const FIELD_WIDTHS = {
  /** Números curtos, siglas, um caractere. Ex.: separador, ano. */
  xs: "w-24",
  /** Valores de uma palavra. Ex.: mês, tipo. */
  sm: "w-36",
  /** Rótulos de duas ou três palavras. Ex.: "Todas as situações", papel. */
  md: "w-48",
  /** Nomes próprios e rótulos longos. Ex.: pessoa, unidade, BU. */
  lg: "w-56",
  /** Ocupa o espaço disponível. */
  full: "min-w-0 flex-1",
} as const;

export type FieldWidth = keyof typeof FIELD_WIDTHS;

/**
 * O dropdown vive em `ui/select.tsx`, com desenho próprio.
 *
 * Não há `Select` nativo aqui de propósito: o `<select>` do navegador é
 * desenhado pelo sistema operacional e a lista aberta ignorava a tipografia e
 * as cores da ferramenta. Deixar os dois disponíveis faria a interface voltar a
 * divergir no primeiro campo em que alguém pegasse o mais fácil.
 */
