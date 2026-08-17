import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renderiza Markdown das páginas de documentação.
 *
 * Segurança: o `react-markdown` NÃO interpreta HTML embutido por padrão (não
 * usamos `rehype-raw`), então conteúdo colado de fora não consegue injetar
 * script na página.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-doc">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Tabelas ganham rolagem própria para não estourar a largura no celular.
          table: ({ children }) => (
            <div className="table-scroll">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => {
            const isExternal = Boolean(href?.startsWith("http"));
            return (
              <a
                href={href}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
