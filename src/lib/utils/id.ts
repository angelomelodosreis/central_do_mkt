/**
 * Gera um identificador único com prefixo legível (ex.: `log_a1b2c3...`).
 *
 * Usa `crypto.randomUUID()`, disponível tanto no runtime dos Cloudflare Workers
 * quanto no Node.js — não precisamos de dependência externa para isso.
 */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}
