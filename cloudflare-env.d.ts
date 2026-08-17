/// <reference types="@cloudflare/workers-types" />

// Bindings e variáveis de ambiente disponíveis no runtime do Cloudflare Workers.
// Os bindings vêm do wrangler.jsonc; as variáveis vêm de .dev.vars (local) ou
// dos secrets do Worker (produção).
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    /**
     * "true" libera o login de teste local (sem Google). Só tem efeito em
     * desenvolvimento — ver src/lib/auth/test-login.ts.
     */
    ALLOW_TEST_LOGIN?: string;
  }
}

export {};
