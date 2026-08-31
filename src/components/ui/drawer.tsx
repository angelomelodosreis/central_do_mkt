"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { Button } from "./button";
import { cn } from "@/lib/utils/cn";

/**
 * Painel lateral sobreposto.
 *
 * Existe para as ações que precisam de um formulário inteiro sem tirar a pessoa
 * de onde ela está: criar uma tarefa olhando a fila, editar alguém olhando o
 * organograma, montar um modelo olhando a lista de modelos. Antes, esses
 * formulários ficavam expostos no topo da tela — ocupando espaço permanente
 * para uma ação ocasional, e repetidos em cada aba.
 *
 * Fecha por Esc, por clique fora e pelo botão. Os três porque cada pessoa tenta
 * um deles primeiro, e um painel que não fecha do jeito esperado parece travado.
 */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg";
}) {
  const painel = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(event: KeyboardEvent) {
      // `defaultPrevented` respeita quem já tratou o Esc — o dropdown aberto
      // dentro do painel fecha a própria lista sem fechar o painel junto.
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    }

    document.addEventListener("keydown", onKey);

    // Trava a rolagem do fundo: sem isso, rolar dentro do painel "vaza" para a
    // página atrás quando a lista chega ao fim.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // O foco entra no painel para quem usa teclado ou leitor de tela não
    // continuar navegando a página de trás, que está visualmente coberta.
    painel.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowAnterior;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]"
      />
      <aside
        ref={painel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-slate-200 bg-white shadow-2xl outline-none",
          width === "lg" ? "max-w-2xl" : "max-w-md",
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            ) : null}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {footer ? (
          <footer className="border-t border-slate-200 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </aside>
    </>
  );
}
