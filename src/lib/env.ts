/**
 * Acesso às variáveis de ambiente do servidor.
 *
 * Na Vercel as variáveis vêm do painel do projeto (Settings → Environment
 * Variables) e são injetadas em `process.env`. Em desenvolvimento vêm do
 * arquivo `.env.local`, que nunca é comitado.
 *
 * ── Por que funções e não constantes ──────────────────────────────────────
 * Uma constante de escopo de módulo é avaliada durante o `next build`, quando
 * as variáveis de runtime podem não estar disponíveis (o build da Vercel roda
 * antes de a função ser invocada). Lendo dentro de funções, a validação só
 * dispara no primeiro request que realmente precisa do valor — o build nunca
 * quebra por variável ausente, e um erro de configuração aparece com nome
 * explícito em vez de um `undefined` silencioso lá adiante.
 */

/** Lê uma variável obrigatória. Lança se estiver ausente ou vazia. */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Variável de ambiente ${name} não está definida. ` +
        `Em desenvolvimento, defina em .env.local; na Vercel, em ` +
        `Settings → Environment Variables. Ver .env.example.`,
    );
  }
  return value;
}

/** Lê uma variável opcional. */
function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

/**
 * URL do banco libSQL/Turso.
 *
 * Em desenvolvimento aceita um arquivo local (`file:./.data/local.db`), o que
 * permite rodar o projeto inteiro sem criar conta em serviço nenhum. Em
 * produção é a URL `libsql://...` do Turso.
 */
export function databaseUrl(): string {
  return required("TURSO_DATABASE_URL");
}

/**
 * Token de acesso do Turso.
 *
 * Opcional de propósito: bancos em arquivo local não usam token. É obrigatório
 * apenas para URLs remotas, e essa checagem fica em `src/lib/db/client.ts`,
 * onde a URL já é conhecida.
 */
export function databaseAuthToken(): string | undefined {
  return optional("TURSO_AUTH_TOKEN");
}

/** Segredo usado para assinar as sessões do better-auth. */
export function betterAuthSecret(): string {
  return required("BETTER_AUTH_SECRET");
}

/**
 * URL base da aplicação, usada pelo better-auth para montar o redirect do
 * OAuth. Precisa bater exatamente com a origem pela qual o usuário acessa.
 *
 * Na Vercel, prefira definir `BETTER_AUTH_URL` com o domínio final. Como
 * fallback usamos `VERCEL_PROJECT_PRODUCTION_URL`, que a própria Vercel injeta
 * e aponta para o domínio de produção do projeto — assim um deploy novo não
 * quebra o login por esquecimento de configuração.
 */
export function betterAuthUrl(): string {
  const explicit = optional("BETTER_AUTH_URL");
  if (explicit) return explicit;

  const vercelUrl = optional("VERCEL_PROJECT_PRODUCTION_URL");
  if (vercelUrl) return `https://${vercelUrl}`;

  return required("BETTER_AUTH_URL"); // lança com a mensagem padrão
}

/**
 * Credenciais do OAuth Client do Google.
 *
 * Opcionais de propósito, e não `required()`: a plataforma é feita para rodar
 * sem o Google configurado (ver o modo de teste local em
 * `src/lib/auth/test-login.ts` e a "Parte 0" do README). Exigir aqui faria o
 * `next build` falhar em quem só quer conhecer o projeto, e o efeito prático da
 * ausência é o mesmo: o login pelo Google não completa.
 */
export function googleClientId(): string {
  return optional("GOOGLE_CLIENT_ID") ?? "";
}

export function googleClientSecret(): string {
  return optional("GOOGLE_CLIENT_SECRET") ?? "";
}

/** Diz se o login pelo Google está configurado. */
export function isGoogleConfigured(): boolean {
  return googleClientId() !== "" && googleClientSecret() !== "";
}

/**
 * Se o login de teste local está ligado. Ver as travas em
 * `src/lib/auth/test-login.ts` — esta é apenas a segunda delas.
 */
export function allowTestLogin(): boolean {
  return optional("ALLOW_TEST_LOGIN") === "true";
}
