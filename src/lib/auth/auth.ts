import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { count, eq, like, not } from "drizzle-orm";

import {
  betterAuthSecret,
  betterAuthUrl,
  googleClientId,
  googleClientSecret,
} from "@/lib/env";
import { getDb, schema } from "@/lib/db/client";
import { allowedDomain, user } from "@/lib/db/schema";
import { TEST_USER_ID_PREFIX } from "./test-login";

/**
 * Mensagem exibida a quem tenta entrar com um e-mail de domínio não autorizado.
 * O texto vaza o mínimo possível: não confirma se o domínio existe no sistema.
 */
export const UNAUTHORIZED_DOMAIN_MESSAGE =
  "Este e-mail não pertence a um domínio autorizado da MedCof. " +
  "Entre com seu e-mail corporativo ou fale com o administrador da Central do Marketing.";

/**
 * Extrai o domínio de um e-mail, normalizado em minúsculas.
 * Retorna string vazia se o e-mail for malformado.
 */
export function extractEmailDomain(email: string): string {
  const parts = email.trim().toLowerCase().split("@");
  return parts.length === 2 ? parts[1] : "";
}

type AuthInstance = ReturnType<typeof buildAuth>;

// A conexão e as variáveis de ambiente são estáveis dentro de um mesmo
// container serverless, então a instância pode ser reaproveitada entre
// requests. Continua sendo criada de forma preguiçosa (e não em escopo de
// módulo) para que a leitura das variáveis obrigatórias aconteça no primeiro
// request, e não durante o `next build`.
let cachedAuth: AuthInstance | null = null;

export async function getAuth(): Promise<AuthInstance> {
  if (cachedAuth) return cachedAuth;

  const db = await getDb();
  cachedAuth = buildAuth(db);
  return cachedAuth;
}

function buildAuth(db: Awaited<ReturnType<typeof getDb>>) {
  return betterAuth({
    baseURL: betterAuthUrl(),
    secret: betterAuthSecret(),

    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
      usePlural: false,
    }),

    // Só login social. Não há senha nesta plataforma — nada de credencial
    // própria para vazar, e a política de senha fica com o Google Workspace.
    emailAndPassword: { enabled: false },

    socialProviders: {
      google: {
        clientId: googleClientId(),
        clientSecret: googleClientSecret(),
        // Não usamos o parâmetro `hd` do Google: ele aceita apenas um domínio,
        // e precisamos de uma lista configurável (tabela `allowed_domain`).
      },
    },

    session: {
      // Sessões ficam no banco (não em JWT), então suspender um usuário
      // derruba o acesso dele na hora.
      expiresIn: 60 * 60 * 24 * 7, // 7 dias
      updateAge: 60 * 60 * 24, // renova se usado depois de 1 dia
    },

    user: {
      // Campos nossos, além dos que o better-auth já gerencia.
      // `input: false` é a peça de segurança crítica: impede que esses campos
      // sejam definidos por dados vindos do cliente — só o servidor os altera.
      additionalFields: {
        emailDomain: { type: "string", required: false, input: false },
        status: {
          type: "string",
          required: false,
          defaultValue: "pending",
          input: false,
        },
        role: {
          type: "string",
          required: false,
          defaultValue: "member",
          input: false,
        },
        approvedBy: { type: "string", required: false, input: false },
        approvedAt: { type: "date", required: false, input: false },
      },
    },

    databaseHooks: {
      user: {
        create: {
          /**
           * Portão de entrada da plataforma. Roda antes de qualquer linha ser
           * gravada, no primeiro login de um e-mail.
           *
           * 1. Rejeita domínios fora da lista de autorizados.
           * 2. Marca o cadastro como `pending` (aguardando aprovação manual).
           * 3. Se este for o primeiro usuário do sistema, promove a admin ativo
           *    — assim ninguém precisa rodar SQL na mão para criar o primeiro
           *    administrador.
           */
          before: async (newUser) => {
            const email = String(newUser.email ?? "").toLowerCase();
            const domain = extractEmailDomain(email);

            if (!domain) {
              throw new APIError("BAD_REQUEST", {
                message: UNAUTHORIZED_DOMAIN_MESSAGE,
              });
            }

            const domainRow = await db
              .select({ isActive: allowedDomain.isActive })
              .from(allowedDomain)
              .where(eq(allowedDomain.domain, domain))
              .get();

            if (!domainRow || !domainRow.isActive) {
              // Aborta a criação: nenhuma linha de usuário, conta ou sessão é
              // gravada para um domínio não autorizado.
              throw new APIError("FORBIDDEN", {
                message: UNAUTHORIZED_DOMAIN_MESSAGE,
              });
            }

            // Contas fictícias do modo de teste local (prefixo `usr_teste_`)
            // são ignoradas nesta contagem. Sem isso, quem explorasse a
            // plataforma em modo de teste antes de configurar o Google acabaria
            // com o primeiro login real caindo como "pendente", sem ninguém
            // para aprová-lo.
            const [{ total }] = await db
              .select({ total: count() })
              .from(user)
              .where(not(like(user.id, `${TEST_USER_ID_PREFIX}%`)));
            const isFirstUser = total === 0;

            return {
              data: {
                ...newUser,
                email,
                emailDomain: domain,
                status: isFirstUser ? "active" : "pending",
                role: isFirstUser ? "admin" : "member",
                approvedAt: isFirstUser ? new Date() : null,
              },
            };
          },
        },
      },
    },

    // Deve ser o último plugin: cuida da escrita dos cookies em server actions.
    plugins: [nextCookies()],
  });
}
