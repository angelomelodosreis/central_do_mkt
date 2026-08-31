"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

/** Altura máxima da lista aberta. Acima disso ela rola por dentro. */
const TETO_DA_LISTA = 320;

export type SelectOption = {
  value: string;
  label: string;
  /**
   * Como a opção aparece no botão depois de escolhida.
   *
   * Existe para listas em árvore: na lista, o rótulo vem indentado ("— — Design")
   * porque é a indentação que mostra a hierarquia; no botão, esse traço vira
   * ruído e parece erro de digitação.
   */
  triggerLabel?: string;
  /** Segunda linha, para desambiguar opções de nome parecido. */
  hint?: string;
  disabled?: boolean;
};

export type SelectGroup = {
  label: string;
  options: SelectOption[];
};

/**
 * Dropdown com desenho próprio.
 *
 * O `<select>` nativo é renderizado pelo SISTEMA OPERACIONAL: a lista aberta
 * ignora a tipografia, as cores e o arredondamento da ferramenta, e fica
 * diferente em cada máquina. Num produto em que o dropdown é o controle mais
 * usado — papel, cargo, BU, prioridade, categoria — isso é a parte da interface
 * que mais destoa do resto.
 *
 * O que o nativo dá de graça e aqui precisou ser reconstruído: navegação por
 * teclado, busca por digitação, anúncio para leitor de tela e envio em
 * formulário. É por isso que existe o `<input type="hidden">` — as server
 * actions continuam recebendo `formData.get(name)` como antes, sem saber que o
 * controle mudou.
 */
export function Select({
  name,
  options,
  groups,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Selecione…",
  disabled = false,
  required = false,
  id,
  className,
  ariaLabel,
  size = "md",
}: {
  name?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  /** Presente = controlado pelo pai. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  className?: string;
  ariaLabel?: string;
  size?: "sm" | "md";
}) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const listId = `${controlId}-lista`;

  const flat = useMemo<SelectOption[]>(
    () => (groups ? groups.flatMap((group) => group.options) : (options ?? [])),
    [groups, options],
  );

  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");

  /**
   * Re-sincroniza com o `defaultValue` quando ele muda.
   *
   * DELIBERADAMENTE diferente do `<select>` nativo, que ignora mudanças de
   * `defaultValue` depois da primeira renderização. Esse comportamento nativo é
   * exatamente o que fazia o seletor de papel continuar exibindo o papel antigo
   * depois de "Salvar papel": a gravação acontecia, o servidor revalidava e
   * mandava o valor novo, e o controle ficava preso no antigo.
   *
   * `defaultValue` só muda quando o servidor manda dado novo — que é justamente
   * quando queremos acompanhar.
   */
  const ultimoDefault = useRef(defaultValue);
  if (!isControlled && defaultValue !== ultimoDefault.current) {
    ultimoDefault.current = defaultValue;
    if (defaultValue !== internal) setInternal(defaultValue ?? "");
  }

  const selecionado = isControlled ? value : internal;
  const opcaoAtual = flat.find((option) => option.value === selecionado);

  const [aberto, setAberto] = useState(false);
  const [emFoco, setEmFoco] = useState(-1);
  const [montado, setMontado] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const buscaRef = useRef({ texto: "", quando: 0 });

  useEffect(() => setMontado(true), []);

  const escolher = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      if (!isControlled) setInternal(option.value);
      onValueChange?.(option.value);
      setAberto(false);
      triggerRef.current?.focus();
    },
    [isControlled, onValueChange],
  );

  // ── Posicionamento ───────────────────────────────────────────────────────
  // A lista vai para o `body` em posição fixa, e não dentro do próprio campo:
  // vários campos ficam em cartões com `overflow` escondido, e a lista aberta
  // era cortada na borda do cartão.
  const [caixa, setCaixa] = useState({
    top: 0,
    left: 0,
    width: 0,
    acima: false,
    maxHeight: TETO_DA_LISTA,
  });

  /**
   * Decide lado e altura da lista pelo espaço REAL disponível.
   *
   * A primeira versão estimava a altura por `nº de opções × 40px` e escolhia o
   * lado com base nisso. Opção com dica tem duas linhas, então a estimativa
   * ficava curta e a lista abria para baixo mesmo quando não caberia —
   * estourando a viewport na última pergunta de um formulário longo.
   *
   * Agora o teto vem do espaço que existe, e a lista rola por dentro quando
   * precisa. Nenhuma conta de altura de item envolvida.
   */
  const medir = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const folga = 8;
    const espacoAbaixo = window.innerHeight - rect.bottom - folga;
    const espacoAcima = rect.top - folga;

    // Fica embaixo por padrão (é o que se espera); sobe só quando embaixo há
    // menos espaço do que em cima e o de baixo é apertado.
    const acima = espacoAbaixo < 200 && espacoAcima > espacoAbaixo;
    const disponivel = acima ? espacoAcima : espacoAbaixo;

    setCaixa({
      top: acima ? rect.top - 6 : rect.bottom + 6,
      left: rect.left,
      width: rect.width,
      acima,
      maxHeight: Math.max(120, Math.min(TETO_DA_LISTA, disponivel)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!aberto) return;
    medir();

    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [aberto, medir]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return;

    function onPointerDown(event: PointerEvent) {
      const alvo = event.target as Node;
      if (triggerRef.current?.contains(alvo)) return;
      if (listaRef.current?.contains(alvo)) return;
      setAberto(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [aberto]);

  // Ao abrir, o foco começa na opção já escolhida.
  useEffect(() => {
    if (!aberto) return;
    const atual = flat.findIndex((option) => option.value === selecionado);
    setEmFoco(atual >= 0 ? atual : proximoHabilitado(flat, -1, 1));
  }, [aberto, flat, selecionado]);

  // Mantém a opção em foco visível durante a navegação por teclado.
  useEffect(() => {
    if (!aberto || emFoco < 0) return;
    listaRef.current
      ?.querySelector(`[data-indice="${emFoco}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [aberto, emFoco]);

  function onKeyDown(event: React.KeyboardEvent) {
    if (disabled) return;

    if (!aberto) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        setAberto(true);
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        /**
         * Impede o Esc de subir.
         *
         * Telas sobrepostas (o painel de pessoa do organograma) fecham no Esc
         * ouvindo no `document`. Sem parar aqui, um Esc com a lista aberta
         * fechava a lista E o painel de uma vez — a pessoa perdia o contexto por
         * ter desistido de escolher uma opção.
         */
        event.stopPropagation();
        setAberto(false);
        triggerRef.current?.focus();
        break;
      case "ArrowDown":
        event.preventDefault();
        setEmFoco((atual) => proximoHabilitado(flat, atual, 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setEmFoco((atual) => proximoHabilitado(flat, atual, -1));
        break;
      case "Home":
        event.preventDefault();
        setEmFoco(proximoHabilitado(flat, -1, 1));
        break;
      case "End":
        event.preventDefault();
        setEmFoco(proximoHabilitado(flat, flat.length, -1));
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (flat[emFoco]) escolher(flat[emFoco]);
        break;
      case "Tab":
        setAberto(false);
        break;
      default:
        // Busca por digitação: teclar "der" pula para Dermatologia. É o que o
        // nativo faz, e sem isso escolher entre 22 BUs vira rolagem.
        if (event.key.length === 1 && !event.metaKey && !event.ctrlKey) {
          const agora = Date.now();
          const busca = buscaRef.current;
          busca.texto =
            agora - busca.quando > 700 ? event.key : busca.texto + event.key;
          busca.quando = agora;

          const alvo = flat.findIndex(
            (option) =>
              !option.disabled &&
              option.label.toLowerCase().startsWith(busca.texto.toLowerCase()),
          );
          if (alvo >= 0) setEmFoco(alvo);
        }
    }
  }

  const alturaTrigger = size === "sm" ? "h-9 text-sm" : "h-10 text-sm";

  return (
    <>
      {/* O valor viaja no formulário por aqui: as server actions continuam
          lendo `formData.get(name)` sem saber que o controle mudou. */}
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selecionado}
          required={required}
        />
      ) : null}

      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        role="combobox"
        aria-expanded={aberto}
        aria-controls={aberto ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        aria-activedescendant={
          aberto && emFoco >= 0 ? `${listId}-${emFoco}` : undefined
        }
        disabled={disabled}
        onClick={() => !disabled && setAberto((atual) => !atual)}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left shadow-sm transition-colors",
          alturaTrigger,
          aberto
            ? "border-brand-500 ring-2 ring-brand-100"
            : "border-slate-300 hover:border-slate-400",
          disabled &&
            "cursor-not-allowed bg-slate-50 text-slate-500 hover:border-slate-300",
          className,
        )}
      >
        <span
          className={cn(
            "min-w-0 truncate",
            opcaoAtual ? "text-slate-900" : "text-slate-500",
          )}
        >
          {opcaoAtual
            ? (opcaoAtual.triggerLabel ?? opcaoAtual.label)
            : placeholder}
        </span>
        <Chevron aberto={aberto} />
      </button>

      {montado && aberto
        ? createPortal(
            <div
              ref={listaRef}
              id={listId}
              role="listbox"
              aria-label={ariaLabel}
              style={{
                position: "fixed",
                top: caixa.acima ? undefined : caixa.top,
                bottom: caixa.acima
                  ? window.innerHeight - caixa.top
                  : undefined,
                left: caixa.left,
                width: caixa.width,
                maxHeight: caixa.maxHeight,
                // Acima de cartões e cabeçalhos fixos, abaixo de nada.
                zIndex: 60,
              }}
              className="overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            >
              {flat.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">
                  Nenhuma opção disponível.
                </p>
              ) : groups ? (
                groups.map((group) => (
                  <div key={group.label} className="py-0.5">
                    <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {group.label}
                    </p>
                    {group.options.map((option) => (
                      <Opcao
                        key={option.value}
                        option={option}
                        indice={flat.indexOf(option)}
                        listId={listId}
                        selecionado={option.value === selecionado}
                        emFoco={flat.indexOf(option) === emFoco}
                        onEscolher={escolher}
                        onFocar={setEmFoco}
                      />
                    ))}
                  </div>
                ))
              ) : (
                flat.map((option, indice) => (
                  <Opcao
                    key={option.value}
                    option={option}
                    indice={indice}
                    listId={listId}
                    selecionado={option.value === selecionado}
                    emFoco={indice === emFoco}
                    onEscolher={escolher}
                    onFocar={setEmFoco}
                  />
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function Opcao({
  option,
  indice,
  listId,
  selecionado,
  emFoco,
  onEscolher,
  onFocar,
}: {
  option: SelectOption;
  indice: number;
  listId: string;
  selecionado: boolean;
  emFoco: boolean;
  onEscolher: (option: SelectOption) => void;
  onFocar: (indice: number) => void;
}) {
  return (
    <div
      id={`${listId}-${indice}`}
      data-indice={indice}
      role="option"
      aria-selected={selecionado}
      aria-disabled={option.disabled}
      onPointerEnter={() => !option.disabled && onFocar(indice)}
      onClick={() => onEscolher(option)}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-sm",
        option.disabled && "cursor-not-allowed text-slate-300",
        !option.disabled && emFoco && "bg-slate-100",
        !option.disabled && selecionado && "font-medium text-brand-700",
        !option.disabled && !selecionado && "text-slate-800",
      )}
    >
      <span className="min-w-0">
        <span className="block truncate">{option.label}</span>
        {option.hint ? (
          <span className="mt-0.5 block truncate text-xs text-slate-500">
            {option.hint}
          </span>
        ) : null}
      </span>
      {selecionado ? (
        <svg
          viewBox="0 0 20 20"
          className="mt-0.5 size-4 shrink-0 text-brand-600"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M4 10.5l4 4 8-9" />
        </svg>
      ) : null}
    </div>
  );
}

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={cn(
        "size-4 shrink-0 text-slate-500 transition-transform",
        aberto && "rotate-180",
      )}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 7.5l5 5 5-5" />
    </svg>
  );
}

/** Próximo índice navegável, pulando desabilitados e parando nas pontas. */
function proximoHabilitado(
  options: SelectOption[],
  atual: number,
  passo: 1 | -1,
): number {
  let indice = atual + passo;
  while (indice >= 0 && indice < options.length) {
    if (!options[indice].disabled) return indice;
    indice += passo;
  }
  return atual >= 0 && atual < options.length ? atual : -1;
}
