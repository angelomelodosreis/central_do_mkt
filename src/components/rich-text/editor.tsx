"use client";

import { Link } from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import { Underline } from "@tiptap/extension-underline";
import { Placeholder } from "@tiptap/extensions";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Extensões do editor.
 *
 * Esta lista é também a lista do que pode existir num documento: ao colar de
 * fora, o TipTap descarta tudo que não tem extensão correspondente — um
 * `<script>` colado simplesmente não vira nó nenhum.
 */
function buildExtensions(placeholder?: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      autolink: true,
      // Sem isto, um link `javascript:` colado viraria um clique executável.
      protocols: ["http", "https", "mailto"],
      HTMLAttributes: { rel: "noopener noreferrer" },
    }),
    TableKit.configure({ table: { resizable: false } }),
    Placeholder.configure({ placeholder: placeholder ?? "" }),
  ];
}

export function RichTextEditor({
  name,
  initialDoc,
  initialHtml,
  placeholder,
  onUserInput,
}: {
  /** Campo oculto onde o JSON é gravado, para o form enviar normalmente. */
  name: string;
  /** Documento estruturado já existente. */
  initialDoc?: string | null;
  /** Alternativa para páginas antigas: HTML convertido do Markdown. */
  initialHtml?: string | null;
  placeholder?: string;
  /** Disparado na primeira digitação de verdade (não no carregamento). */
  onUserInput?: () => void;
}) {
  // Começa já com o documento inicial, e não vazio: o campo oculto precisa ter
  // conteúdo válido mesmo que a pessoa salve antes de o editor terminar de
  // montar — caso contrário um envio rápido gravaria a página em branco.
  const [value, setValue] = useState(() => initialValue(initialDoc));

  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    // O editor só existe no navegador; sem isto o Next tenta renderizá-lo no
    // servidor e reclama de incompatibilidade de hidratação.
    immediatelyRender: false,
    content: initialContent(initialDoc, initialHtml),
    editorProps: {
      attributes: {
        class: "prose-doc min-h-[18rem] px-4 py-3 focus:outline-none",
      },
    },
    // `onUpdate` não dispara ao carregar o conteúdo inicial, só em alteração de
    // verdade — por isso ele serve para saber que a pessoa começou a escrever.
    onUpdate: ({ editor }) => {
      setValue(JSON.stringify(editor.getJSON()));
      onUserInput?.();
    },
  });

  // Garante que o campo oculto já saia preenchido mesmo se a pessoa salvar sem
  // digitar nada (ex.: página criada a partir de um modelo).
  useEffect(() => {
    if (editor) setValue(JSON.stringify(editor.getJSON()));
  }, [editor]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
      <input type="hidden" name={name} value={value} />
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * Valor do campo oculto antes de o editor montar.
 *
 * Só serve para o documento estruturado: quando a origem é HTML (página antiga
 * sendo convertida), o JSON equivalente só existe depois que o editor
 * interpreta o HTML, e aí o `useEffect` preenche.
 */
function initialValue(initialDoc?: string | null): string {
  if (!initialDoc) return "";
  try {
    JSON.parse(initialDoc);
    return initialDoc;
  } catch {
    return "";
  }
}

function initialContent(
  initialDoc?: string | null,
  initialHtml?: string | null,
) {
  if (initialDoc) {
    try {
      return JSON.parse(initialDoc);
    } catch {
      // Cai para o HTML/vazio abaixo.
    }
  }
  return initialHtml || "";
}

/**
 * Estado da barra de ferramentas, derivado do editor.
 *
 * Precisa vir de `useEditorState`, e não de leituras diretas de
 * `editor.isActive(...)` no corpo do componente: desde a versão 3 o `useEditor`
 * não re-renderiza a cada transação, então aquelas leituras congelavam no
 * primeiro render e os botões nunca acendiam ou apagavam conforme o cursor
 * andava pelo texto.
 *
 * O hook compara o resultado por igualdade profunda, então a barra só
 * re-renderiza quando um destes valores muda de fato — e não a cada tecla.
 */
type ToolbarState = {
  h1: boolean;
  h2: boolean;
  h3: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  bulletList: boolean;
  /** Marcador da lista numerada sob o cursor, ou `null` fora de uma. */
  orderedMarker: string | null;
  blockquote: boolean;
  link: boolean;
  inTable: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

const EMPTY_TOOLBAR_STATE: ToolbarState = {
  h1: false,
  h2: false,
  h3: false,
  bold: false,
  italic: false,
  underline: false,
  bulletList: false,
  orderedMarker: null,
  blockquote: false,
  link: false,
  inTable: false,
  canUndo: false,
  canRedo: false,
};

function toolbarStateOf(editor: Editor | null): ToolbarState {
  if (!editor) return EMPTY_TOOLBAR_STATE;

  return {
    h1: editor.isActive("heading", { level: 1 }),
    h2: editor.isActive("heading", { level: 2 }),
    h3: editor.isActive("heading", { level: 3 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    bulletList: editor.isActive("bulletList"),
    orderedMarker: editor.isActive("orderedList")
      ? ((editor.getAttributes("orderedList").type as string) ?? "1")
      : null,
    blockquote: editor.isActive("blockquote"),
    link: editor.isActive("link"),
    inTable: editor.isActive("table"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
  };
}

function useToolbarState(editor: Editor | null): ToolbarState {
  // O tipo do hook admite `null` quando o editor pode não existir; o estado
  // vazio cobre esse instante sem espalhar verificações pela barra.
  const state = useEditorState({
    editor,
    /**
     * O `editor` que vem no instantâneo fica nulo até a primeira transação: o
     * gerenciador interno do TipTap é criado no primeiro render (quando o editor
     * ainda não existe, por causa do `immediatelyRender: false`) e a troca de
     * referência não avisa os inscritos. Cair para o `editor` recebido por
     * parâmetro evita que a barra nasça e fique presa no estado vazio.
     */
    selector: ({ editor: fromSnapshot }) =>
      toolbarStateOf(fromSnapshot ?? editor),
  });

  return state ?? EMPTY_TOOLBAR_STATE;
}

function Toolbar({ editor }: { editor: Editor | null }) {
  const state = useToolbarState(editor);

  // A decisão de mostrar o esqueleto usa o `editor` recebido, e não o estado:
  // o estado é sempre um objeto, justamente para nunca travar a barra.
  if (!editor) {
    return (
      <div className="h-12 animate-pulse border-b border-slate-200 bg-slate-50" />
    );
  }

  return (
    // `sticky` mantém a barra à vista em textos longos: sem isso, formatar um
    // trecho lá embaixo obrigava a rolar de volta até o topo.
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
      <ToolbarButton
        label="Título"
        isActive={state.h1}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <span className="text-[15px] font-bold">H1</span>
      </ToolbarButton>
      <ToolbarButton
        label="Subtítulo"
        isActive={state.h2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <span className="text-[13px] font-bold">H2</span>
      </ToolbarButton>
      <ToolbarButton
        label="Sub-subtítulo"
        isActive={state.h3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <span className="text-xs font-bold">H3</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Negrito"
        shortcut="Ctrl+B"
        isActive={state.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <strong className="text-[15px]">N</strong>
      </ToolbarButton>
      <ToolbarButton
        label="Itálico"
        shortcut="Ctrl+I"
        isActive={state.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <em className="font-serif text-[15px]">I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Sublinhado"
        shortcut="Ctrl+U"
        isActive={state.underline}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="text-[15px] underline underline-offset-2">S</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Lista com pontos"
        isActive={state.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •
      </ToolbarButton>
      <ToolbarButton
        label="Lista numerada"
        isActive={state.orderedMarker === "1"}
        onClick={() => setOrderedList(editor, "1")}
      >
        <span className="text-xs font-semibold">1.</span>
      </ToolbarButton>
      <ToolbarButton
        label="Lista alfabética"
        isActive={state.orderedMarker === "a"}
        onClick={() => setOrderedList(editor, "a")}
      >
        <span className="text-xs font-semibold">a.</span>
      </ToolbarButton>
      <ToolbarButton
        label="Lista romana"
        isActive={state.orderedMarker === "i"}
        onClick={() => setOrderedList(editor, "i")}
      >
        <span className="text-xs font-semibold">i.</span>
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Citação"
        isActive={state.blockquote}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        ❝
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        isActive={state.link}
        onClick={() => toggleLink(editor)}
      >
        🔗
      </ToolbarButton>
      <ToolbarButton
        label="Tabela"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        ▦
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Desfazer"
        shortcut="Ctrl+Z"
        disabled={!state.canUndo}
        onClick={() => editor.chain().focus().undo().run()}
      >
        ↶
      </ToolbarButton>
      <ToolbarButton
        label="Refazer"
        shortcut="Ctrl+Shift+Z"
        disabled={!state.canRedo}
        onClick={() => editor.chain().focus().redo().run()}
      >
        ↷
      </ToolbarButton>

      {state.inTable ? (
        <>
          <Divider />
          <ToolbarButton
            label="Adicionar linha"
            onClick={() => editor.chain().focus().addRowAfter().run()}
          >
            +↓
          </ToolbarButton>
          <ToolbarButton
            label="Adicionar coluna"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
          >
            +→
          </ToolbarButton>
          <ToolbarButton
            label="Remover tabela"
            onClick={() => editor.chain().focus().deleteTable().run()}
          >
            ✕▦
          </ToolbarButton>
        </>
      ) : null}
    </div>
  );
}

/**
 * Marcador de uma lista numerada: número, letra ou algarismo romano.
 *
 * Vira o atributo `type` do `<ol>`, que é como o HTML expressa isso desde
 * sempre — e por isso sobrevive ao salvar e ao reabrir sem código extra.
 */
type ListMarker = "1" | "a" | "i";

function isOrderedList(editor: Editor, marker: ListMarker): boolean {
  if (!editor.isActive("orderedList")) return false;
  const atual = editor.getAttributes("orderedList").type ?? "1";
  return atual === marker;
}

function setOrderedList(editor: Editor, marker: ListMarker) {
  const chain = editor.chain().focus();

  // Fora de uma lista numerada, primeiro vira lista; já dentro, clicar no
  // marcador atual desliga a lista, como os outros botões de alternar.
  if (!editor.isActive("orderedList")) {
    chain.toggleOrderedList().updateAttributes("orderedList", { type: marker });
  } else if (isOrderedList(editor, marker)) {
    chain.toggleOrderedList();
  } else {
    chain.updateAttributes("orderedList", { type: marker });
  }

  chain.run();
}

function toggleLink(editor: Editor) {
  if (editor.isActive("link")) {
    editor.chain().focus().unsetLink().run();
    return;
  }

  const url = window.prompt("Endereço do link (https://…)");
  if (!url) return;

  // `setLink` já recusa protocolos fora da lista permitida, mas checar aqui
  // evita mostrar um link quebrado para quem digitou algo inesperado.
  const isSafe = /^(https?:|mailto:|\/)/i.test(url.trim());
  if (!isSafe) {
    window.alert("Use um endereço começando com https://, mailto: ou /");
    return;
  }

  editor.chain().focus().setLink({ href: url.trim() }).run();
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-slate-300" />;
}

function ToolbarButton({
  label,
  shortcut,
  isActive,
  disabled,
  onClick,
  children,
}: {
  label: string;
  shortcut?: string;
  isActive?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      // Sem isto, o clique tira o foco do editor antes da ação e a seleção
      // some da tela no meio do caminho.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        // 40px de alvo no celular (32 é pequeno demais para o dedo) e o
        // tamanho compacto de volta a partir do desktop, onde há mouse.
        "flex h-10 min-w-10 items-center justify-center rounded px-2 text-sm transition-colors sm:h-8 sm:min-w-8 sm:px-1.5",
        "disabled:cursor-not-allowed disabled:opacity-30",
        isActive
          ? "bg-brand-100 text-brand-800"
          : "text-slate-600 hover:bg-slate-200",
      )}
    >
      {children}
    </button>
  );
}
