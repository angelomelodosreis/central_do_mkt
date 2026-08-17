import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * MODO DE TESTE LOCAL
 *
 * Permite entrar na plataforma sem passar pelo Google, para explorar as telas
 * antes de configurar as credenciais reais.
 *
 * ── Por que isso é seguro ──────────────────────────────────────────────────
 * São DUAS travas, e as duas precisam estar satisfeitas:
 *
 *   1. `process.env.NODE_ENV` precisa ser "development".
 *   2. A variável `ALLOW_TEST_LOGIN` precisa ser exatamente "true" no arquivo
 *      `.dev.vars`, que nunca é comitado nem enviado ao servidor.
 *
 * A trava 1 é resolvida no momento do build: o compilador substitui
 * `process.env.NODE_ENV` por "production" e elimina o resto da função como
 * código morto. Verificado no pacote gerado por `npm run cf:build`, onde esta
 * função compila para literalmente `async function c(){ return !1 }` — a
 * leitura de `ALLOW_TEST_LOGIN` nem chega a existir no código publicado.
 *
 * Consequências práticas em produção:
 *   - o painel de login de teste nunca é renderizado;
 *   - a ação `signInAsTestAccount` recusa e redireciona para /login;
 *   - definir `ALLOW_TEST_LOGIN="true"` no servidor não tem efeito nenhum.
 *
 * O que continua no pacote publicado é apenas o objeto `TEST_ACCOUNTS` abaixo
 * (nomes e e-mails fictícios), que é dado inerte, sem caminho de execução.
 */

/**
 * Prefixo dos ids das contas fictícias.
 *
 * Serve para o resto do sistema conseguir distingui-las de contas reais — em
 * especial na regra que promove o primeiro usuário a administrador
 * (`src/lib/auth/auth.ts`), que precisa ignorá-las.
 */
export const TEST_USER_ID_PREFIX = "usr_teste_";

/** Contas fictícias disponíveis, para testar cada nível de acesso. */
export const TEST_ACCOUNTS = {
  admin: {
    id: "usr_teste_admin",
    name: "Administrador de Teste",
    email: "admin.teste@grupomedcof.com.br",
    role: "admin" as const,
    label: "Administrador",
    description: "Vê tudo, aprova cadastros, gerencia permissões e auditoria.",
  },
  leader: {
    id: "usr_teste_lider",
    name: "Líder de Teste",
    email: "lider.teste@grupomedcof.com.br",
    role: "leader" as const,
    label: "Líder",
    description: "Edita conteúdo e define os parâmetros. Sem acesso a acessos.",
  },
  editor: {
    id: "usr_teste_editor",
    name: "Editor de Teste",
    email: "editor.teste@grupomedcof.com.br",
    role: "editor" as const,
    label: "Editor",
    description:
      "Cria e edita documentação, personas e o calendário da BU que responde.",
  },
  member: {
    id: "usr_teste_membro",
    name: "Membro de Teste",
    email: "membro.teste@grupomedcof.com.br",
    role: "member" as const,
    label: "Membro",
    description: "Só consulta: gerador, documentação, personas e calendário."
  },
} as const;

export type TestAccountKey = keyof typeof TEST_ACCOUNTS;

export function isTestAccountKey(value: unknown): value is TestAccountKey {
  return typeof value === "string" && value in TEST_ACCOUNTS;
}

/**
 * Diz se o login de teste está liberado. Chamado tanto pela tela de login
 * (para decidir se mostra os botões) quanto pela ação que cria a sessão.
 */
export async function isTestLoginEnabled(): Promise<boolean> {
  // Trava 1: só em desenvolvimento. Some do pacote de produção no build.
  if (process.env.NODE_ENV !== "development") return false;

  // Trava 2: precisa estar ligado explicitamente no .dev.vars.
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.ALLOW_TEST_LOGIN === "true";
  } catch {
    return false;
  }
}
