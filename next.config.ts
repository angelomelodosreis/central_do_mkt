import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Este app roda no runtime Node.js compat dos Cloudflare Workers (via OpenNext).
  // Nunca use `export const runtime = "edge"` — não é suportado pelo adapter.
  //
  // Não marque `better-auth` em `serverExternalPackages`: se marcado, ele é
  // resolvido a partir do node_modules copiado para o bundle, e a variante
  // `workerd` de `@better-auth/core/instrumentation` não é copiada — o build
  // para a Cloudflare quebra.
  //
  // Não gerar AGENTS.md/CLAUDE.md automaticamente na raiz do projeto.
  agentRules: false,
};

export default nextConfig;

// Conecta os bindings do Cloudflare (D1, KV, R2) ao `next dev` local, para que
// `getCloudflareContext()` funcione sem precisar rodar `wrangler dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
