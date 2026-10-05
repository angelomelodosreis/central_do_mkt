import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O cliente do libSQL carrega binários nativos (pacote `libsql`). Sem
  // declarar aqui, o bundler tenta empacotá-los e o build quebra — ou pior,
  // passa e falha só em runtime, ao abrir a conexão.
  serverExternalPackages: ["@libsql/client", "libsql"],

  // Não gerar AGENTS.md/CLAUDE.md automaticamente na raiz do projeto.
  agentRules: false,

  // Garante que o arquivo de dados consolidado de vendas seja empacotado nas funções da Vercel
  outputFileTracingIncludes: {
    "/**": ["./src/lib/modules/sales/sales-seed-data.json"],
  },

  /**
   * Endereços antigos que mudaram de lugar na reestruturação.
   *
   * Personas deixou de ser um módulo solto e virou uma área da Business Unit.
   * Quem tem um link salvo (ou colado num alinhamento entre setores) continua
   * chegando ao lugar certo em vez de num "não encontrado" — o custo de manter
   * três linhas aqui é muito menor que o de um link morto circulando no time.
   */
  async redirects() {
    return [
      {
        source: "/personas",
        destination: "/planejamento",
        permanent: false,
      },
      {
        source: "/personas/nova",
        destination: "/planejamento",
        permanent: false,
      },
      {
        source: "/personas/:businessUnitSlug/:personaSlug",
        destination: "/planejamento/:businessUnitSlug/personas/:personaSlug",
        permanent: false,
      },
      {
        source: "/personas/:businessUnitSlug/:personaSlug/editar",
        destination:
          "/planejamento/:businessUnitSlug/personas/:personaSlug/editar",
        permanent: false,
      },
      // Parâmetros tinha uma única área e ela foi para dentro do Gerador de
      // Nomes. Os redirecionamentos existem porque esses endereços estão em
      // favoritos e em links colados em conversas.
      {
        source: "/parametros",
        destination: "/gerador-de-nomes/modelos",
        permanent: false,
      },
      {
        source: "/parametros/nomenclaturas",
        destination: "/gerador-de-nomes/modelos",
        permanent: false,
      },
      {
        source: "/parametros/nomenclaturas/:templateId",
        destination: "/gerador-de-nomes/modelos/:templateId",
        permanent: false,
      },
      // As BUs saíram para junto das outras bases oficiais.
      {
        source: "/admin/business-units",
        destination: "/admin/bases/business-units",
        permanent: false,
      },
      {
        source: "/usuarios",
        destination: "/admin/usuarios",
        permanent: false,
      },
      {
        source: "/estrategia",
        destination: "/planejamento",
        permanent: false,
      },
      {
        source: "/estrategia/:path*",
        destination: "/planejamento/:path*",
        permanent: false,
      },
      {
        source: "/bus",
        destination: "/admin/bases/business-units",
        permanent: false,
      },
      {
        source: "/lista-de-bus",
        destination: "/admin/bases/business-units",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
