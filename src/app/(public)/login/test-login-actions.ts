"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { betterAuthSecret } from "@/lib/env";
import { getDb } from "@/lib/db/client";
import { session, user } from "@/lib/db/schema";
import {
  isTestAccountKey,
  isTestLoginEnabled,
  TEST_ACCOUNTS,
} from "@/lib/auth/test-login";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

/** Duração da sessão de teste: 7 dias, igual à sessão real. */
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

/**
 * Assina o valor do cookie no mesmo formato que o better-auth espera:
 * `<token>.<assinatura>`, onde a assinatura é um HMAC-SHA256 em base64.
 * É por isso que a sessão criada aqui é reconhecida normalmente pelo resto
 * da aplicação — não existe caminho paralelo de autenticação.
 */
async function signSessionToken(
  token: string,
  secret: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token),
  );
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return `${token}.${base64}`;
}

/**
 * Entra na plataforma como uma conta de teste, sem passar pelo Google.
 *
 * Só funciona em desenvolvimento e com `ALLOW_TEST_LOGIN="true"` no `.env.local`
 * (ver as travas em `src/lib/auth/test-login.ts`).
 */
export async function signInAsTestAccount(formData: FormData): Promise<void> {
  if (!(await isTestLoginEnabled())) {
    // Fora de desenvolvimento a ação simplesmente não faz nada.
    redirect("/login");
  }

  const accountKey = String(formData.get("conta") ?? "");
  if (!isTestAccountKey(accountKey)) redirect("/login");

  const account = TEST_ACCOUNTS[accountKey];
  const db = await getDb();
  const now = new Date();

  // Cria (ou atualiza) o usuário de teste, já aprovado e com o papel escolhido.
  const existing = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.id, account.id))
    .get();

  if (existing) {
    await db
      .update(user)
      .set({ status: "active", role: account.role, updatedAt: now })
      .where(eq(user.id, account.id));
  } else {
    await db.insert(user).values({
      id: account.id,
      name: account.name,
      email: account.email,
      emailVerified: true,
      image: null,
      emailDomain: account.email.split("@")[1],
      status: "active",
      role: account.role,
      approvedBy: null,
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await writeAuditLog({
      actorUserId: null,
      actorEmail: null,
      action: "user.signup",
      entityType: "user",
      entityId: account.id,
      summary: `[MODO DE TESTE] Criou a conta fictícia ${account.email} como ${account.label}`,
      afterData: { email: account.email, role: account.role, status: "active" },
    });
  }

  // Cria a sessão no banco — o mesmo mecanismo do login real.
  const token = crypto.randomUUID().replace(/-/g, "") + newId("t").slice(2);
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_SECONDS * 1000);

  await db.insert(session).values({
    id: newId("ses"),
    token,
    userId: account.id,
    expiresAt,
    ipAddress: "127.0.0.1",
    userAgent: "modo-de-teste-local",
    createdAt: now,
    updatedAt: now,
  });

  const cookieStore = await cookies();
  cookieStore.set(
    "better-auth.session_token",
    await signSessionToken(token, betterAuthSecret()),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    },
  );

  redirect("/painel");
}
