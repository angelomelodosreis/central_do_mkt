import type { Config } from "drizzle-kit";

// Usamos o drizzle-kit APENAS para gerar SQL de migration (`npm run db:generate`).
// A aplicação das migrations é feita pelo wrangler (`npm run db:migrate:local`),
// porque o drizzle-kit não sabe falar com o binding do D1.
export default {
  schema: "./src/lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
  driver: "d1-http",
  verbose: true,
  strict: true,
} satisfies Config;
