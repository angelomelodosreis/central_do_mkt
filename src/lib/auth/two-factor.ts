import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";

import { getAuth } from "./auth";
import { getDb } from "@/lib/db/client";
import { session, twoFactor, user } from "@/lib/db/schema";

/**
 * ── SEGUNDO FATOR ──────────────────────────────────────────────────────────
 *
 * O login é o do Google. Isto é o que vem depois dele: um código de seis
 * dígitos, gerado num app autenticador, exigido uma vez por sessão.
 *
 * A exigência mora aqui e não no plugin do better-auth porque a interceptação
 * de login do plugin só cobre login por senha. Como a nossa entrada é OAuth, a
 * sessão nasce completa e é o `requireUser()` que segura a pessoa na porta até
 * ela confirmar o código.
 *
 * Vale para TODO MUNDO, sem exceção por papel. Um segundo fator que só o
 * administrador usa protege o administrador, não a ferramenta — e quem tem
 * acesso ao planejamento de uma BU já tem acesso a informação que não deveria
 * vazar.
 */

/** Erros seguidos que a conta suporta antes de travar. */
const MAX_TENTATIVAS = 10;

/** Quanto tempo a conta fica travada depois disso. */
const BLOQUEIO_MS = 15 * 60 * 1000;

export type EstadoDoSegundoFator = {
  /** A pessoa registrou um app e confirmou um código pelo menos uma vez. */
  cadastrado: boolean;
  /** Esta sessão já confirmou um código. */
  confirmado: boolean;
  /** Até quando as tentativas estão bloqueadas, se estiverem. */
  bloqueadoAte: Date | null;
};

/**
 * O estado do segundo fator para uma pessoa nesta sessão.
 *
 * As duas perguntas são independentes de propósito: "tem app cadastrado?" é
 * sobre a pessoa e dura para sempre; "esta sessão confirmou?" é sobre o
 * navegador em que ela está e dura o que a sessão durar. Um cookie roubado
 * responde sim à primeira e não à segunda, que é exatamente o ataque de que
 * isto protege.
 */
export async function lerEstadoDoSegundoFator(
  userId: string,
  sessionId: string,
): Promise<EstadoDoSegundoFator> {
  const db = await getDb();

  const [fator, sessao] = await Promise.all([
    db
      .select({
        verified: twoFactor.verified,
        lockedUntil: twoFactor.lockedUntil,
      })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))
      .get(),
    db
      .select({ verifiedAt: session.twoFactorVerifiedAt })
      .from(session)
      .where(eq(session.id, sessionId))
      .get(),
  ]);

  const bloqueio = fator?.lockedUntil ?? null;

  return {
    cadastrado: fator?.verified === true,
    confirmado: sessao?.verifiedAt != null,
    bloqueadoAte: bloqueio && bloqueio.getTime() > Date.now() ? bloqueio : null,
  };
}

/**
 * Marca como confirmada a sessão em que a pessoa está AGORA.
 *
 * A sessão é lida do cookie e não do que veio na requisição, e a razão é uma
 * sutileza cara de descobrir: na PRIMEIRA confirmação o better-auth troca a
 * sessão — cria uma nova, apaga a atual — e ainda assim devolve o token da que
 * acabou de apagar. Gravar nele não escreveria em linha nenhuma, e a pessoa
 * voltaria para a tela de verificação em looping.
 *
 * O cookie, por outro lado, já foi reescrito pelo plugin `nextCookies()` dentro
 * desta mesma requisição, e no Next uma leitura de `cookies()` enxerga o que
 * foi escrito antes dela. É a única fonte que aponta para a sessão certa nos
 * dois casos — com troca e sem.
 */
export async function marcarSessaoConfirmada(): Promise<void> {
  const auth = await getAuth();
  const nomeDoCookie = (await auth.$context).authCookies.sessionToken.name;

  const assinado = (await cookies()).get(nomeDoCookie)?.value;
  if (!assinado) return;

  // O cookie é `<token>.<assinatura>`, e a assinatura é base64 — que não tem
  // ponto. O primeiro pedaço é sempre o token inteiro.
  const token = assinado.split(".")[0];
  if (!token) return;

  const db = await getDb();
  await db
    .update(session)
    .set({ twoFactorVerifiedAt: new Date() })
    .where(eq(session.token, token));
}

/**
 * Liga o fator no usuário ANTES da primeira confirmação.
 *
 * Parece prematuro, e é o oposto: é o que impede a tela de cadastro de se
 * perder no meio. O better-auth, ao confirmar o primeiro código de alguém cujo
 * `twoFactorEnabled` ainda é falso, TROCA a sessão — cria uma nova e apaga a
 * atual. No Next isso é fatal para uma server action: o redesenho da rota que
 * vem junto da resposta ainda lê o cookie ANTIGO, não encontra mais a sessão e
 * manda a pessoa para o login. Os códigos de recuperação, que só existem
 * naquela resposta, morriam ali.
 *
 * A troca não protege de nada aqui: a sessão não nasceu neste momento, ela veio
 * do login do Google, que já a criou do zero. O que continua valendo como sinal
 * de cadastro concluído é `two_factor.verified`, e não este campo — é ele que
 * `lerEstadoDoSegundoFator` lê.
 */
export async function ligarFatorSemTrocarSessao(userId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(user)
    .set({ twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(user.id, userId));
}

/**
 * Os cabeçalhos da requisição com o cookie de sessão ATUALIZADO.
 *
 * Depois de uma confirmação que trocou a sessão, o `headers()` da requisição
 * ainda carrega o cookie antigo — e o cookie antigo aponta para uma sessão que
 * o better-auth acabou de apagar. Qualquer chamada seguinte feita com ele
 * responde "não autorizado", e foi exatamente assim que a geração dos códigos
 * de recuperação quebrou na primeira versão desta tela.
 */
export async function cabecalhosComSessaoAtual(
  base: Headers,
): Promise<Headers> {
  const atualizados = new Headers(base);
  atualizados.set("cookie", (await cookies()).toString());
  return atualizados;
}

/** Conta um código errado e trava a conta quando o limite estoura. */
export async function registrarTentativaErrada(userId: string): Promise<void> {
  const db = await getDb();

  const linha = await db
    .update(twoFactor)
    .set({
      failedVerificationCount: sql`${twoFactor.failedVerificationCount} + 1`,
    })
    .where(eq(twoFactor.userId, userId))
    .returning({ erros: twoFactor.failedVerificationCount })
    .get();

  if (linha && linha.erros >= MAX_TENTATIVAS) {
    await db
      .update(twoFactor)
      .set({ lockedUntil: new Date(Date.now() + BLOQUEIO_MS) })
      .where(eq(twoFactor.userId, userId));
  }
}

/** Zera a contagem depois de um acerto — ela conta erros SEGUIDOS. */
export async function limparTentativas(userId: string): Promise<void> {
  const db = await getDb();
  await db
    .update(twoFactor)
    .set({ failedVerificationCount: 0, lockedUntil: null })
    .where(eq(twoFactor.userId, userId));
}

/**
 * Apaga o cadastro do segundo fator de alguém e derruba as sessões dela.
 *
 * É o que um administrador faz quando a pessoa perde o celular e não tem mais
 * os códigos de recuperação. Derrubar as sessões é parte da operação: sem
 * isso, uma sessão já confirmada continuaria valendo, e o reset seria uma
 * forma silenciosa de manter acesso.
 */
export async function resetarSegundoFator(userId: string): Promise<void> {
  const db = await getDb();

  await db.delete(twoFactor).where(eq(twoFactor.userId, userId));
  await db
    .update(user)
    .set({ twoFactorEnabled: false, updatedAt: new Date() })
    .where(eq(user.id, userId));
  await db.delete(session).where(eq(session.userId, userId));
}

/**
 * Diz se alguém já tem app cadastrado — para a tela de administração listar
 * quem ainda não cadastrou.
 */
export async function listarQuemJaCadastrou(): Promise<Set<string>> {
  const db = await getDb();
  const linhas = await db
    .select({ userId: twoFactor.userId, verified: twoFactor.verified })
    .from(twoFactor);

  return new Set(
    linhas.filter((linha) => linha.verified).map((linha) => linha.userId),
  );
}
