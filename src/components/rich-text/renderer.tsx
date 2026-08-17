import { Fragment, type ReactNode } from "react";

import type { RichDoc, RichNode } from "@/lib/modules/documentation/rich-text";

/**
 * Renderiza o documento estruturado do editor visual.
 *
 * O documento é percorrido nó a nó e transformado em elementos React. Não há
 * `dangerouslySetInnerHTML` em lugar nenhum: um nó de tipo desconhecido é
 * ignorado, e texto é sempre texto — nunca marcação. É isso que substitui, com
 * a mesma garantia, a decisão antiga de renderizar Markdown sem `rehype-raw`.
 */
export function RichTextContent({ doc }: { doc: RichDoc }) {
  return <div className="prose-doc">{renderNodes(doc.content)}</div>;
}

function renderNodes(nodes: RichNode[] | undefined): ReactNode {
  if (!nodes?.length) return null;
  return nodes.map((node, index) => (
    <Fragment key={index}>{renderNode(node)}</Fragment>
  ));
}

function renderNode(node: RichNode): ReactNode {
  switch (node.type) {
    case "text":
      return applyMarks(node);

    case "paragraph":
      return <p>{renderNodes(node.content)}</p>;

    case "heading": {
      // O editor oferece três níveis, mas eles descem um degrau no HTML: o
      // `<h1>` da tela já é o título da página, e um segundo `<h1>` dentro do
      // corpo quebraria a estrutura do documento para leitores de tela. O
      // tamanho visual de cada nível vem do CSS, não da tag.
      const level = Number(node.attrs?.level ?? 1);
      const Tag = level === 3 ? "h4" : level === 2 ? "h3" : "h2";
      return <Tag>{renderNodes(node.content)}</Tag>;
    }

    case "bulletList":
      return <ul>{renderNodes(node.content)}</ul>;

    case "orderedList": {
      // `type` guarda o marcador escolhido (número, letra ou romano).
      const marker = node.attrs?.type;
      return (
        <ol type={marker === "a" || marker === "i" ? marker : undefined}>
          {renderNodes(node.content)}
        </ol>
      );
    }

    case "listItem":
      return <li>{renderNodes(node.content)}</li>;

    case "blockquote":
      return <blockquote>{renderNodes(node.content)}</blockquote>;

    case "codeBlock":
      return (
        <pre>
          <code>{renderNodes(node.content)}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "table":
      // Mesma rolagem própria que as tabelas do Markdown têm, para não estourar
      // a largura no celular.
      return (
        <div className="table-scroll">
          <table>
            <tbody>{renderNodes(node.content)}</tbody>
          </table>
        </div>
      );

    case "tableRow":
      return <tr>{renderNodes(node.content)}</tr>;

    case "tableHeader":
      return (
        <th colSpan={spanOf(node, "colspan")} rowSpan={spanOf(node, "rowspan")}>
          {renderNodes(node.content)}
        </th>
      );

    case "tableCell":
      return (
        <td colSpan={spanOf(node, "colspan")} rowSpan={spanOf(node, "rowspan")}>
          {renderNodes(node.content)}
        </td>
      );

    default:
      // Nó que o editor atual não conhece: renderiza o conteúdo interno, se
      // houver, em vez de sumir com o texto da pessoa.
      return renderNodes(node.content);
  }
}

function spanOf(node: RichNode, key: string): number | undefined {
  const value = Number(node.attrs?.[key]);
  return Number.isFinite(value) && value > 1 ? value : undefined;
}

/** Aplica negrito, itálico, código e link a um nó de texto. */
function applyMarks(node: RichNode): ReactNode {
  let element: ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        // Link com endereço recusado vira texto puro — melhor um link inerte do
        // que um `javascript:` clicável.
        element = href ? (
          <a
            href={href}
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
          >
            {element}
          </a>
        ) : (
          element
        );
        break;
      }
      default:
        break;
    }
  }

  return element;
}

/**
 * Segunda barreira contra `javascript:` e afins.
 *
 * O editor já restringe os protocolos na hora de criar o link, mas o conteúdo
 * gravado é apenas JSON no banco — validar de novo aqui garante que um valor
 * inserido por fora do editor não vire um link executável.
 */
function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const href = value.trim();
  if (!href) return null;

  // Relativos são nossos, sempre seguros.
  if (href.startsWith("/") || href.startsWith("#")) return href;

  return /^(https?:\/\/|mailto:)/i.test(href) ? href : null;
}
