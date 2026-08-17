import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O cliente do libSQL carrega binários nativos (pacote `libsql`). Sem
  // declarar aqui, o bundler tenta empacotá-los e o build quebra — ou pior,
  // passa e falha só em runtime, ao abrir a conexão.
  serverExternalPackages: ["@libsql/client", "libsql"],

  // Não gerar AGENTS.md/CLAUDE.md automaticamente na raiz do projeto.
  agentRules: false,
};

export default nextConfig;
