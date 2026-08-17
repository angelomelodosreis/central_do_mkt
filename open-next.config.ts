import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Configuração mínima: sem cache incremental (ISR) — todas as rotas autenticadas
// são dinâmicas, então não há nada para cachear. Se no futuro houver páginas
// públicas estáticas, adicione aqui um incrementalCache com R2.
export default defineCloudflareConfig();
