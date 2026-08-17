"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import type { DomainFormState } from "./form-state";
import { requireAdmin } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { allowedDomain } from "@/lib/db/schema";
import { writeAuditLog } from "@/lib/modules/audit/log";
import { newId } from "@/lib/utils/id";

/** Formato de domínio: rótulos separados por ponto, com TLD de 2+ letras. */
const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Autoriza um novo domínio de e-mail a se cadastrar na plataforma. */
export async function createAllowedDomain(
  _previousState: DomainFormState,
  formData: FormData,
): Promise<DomainFormState> {
  const admin = await requireAdmin();

  // Aceita tanto "@medcof.com.br" quanto "medcof.com.br".
  const domain = String(formData.get("domain") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  if (!domain) {
    return { status: "error", message: "Informe o domínio." };
  }

  if (!DOMAIN_PATTERN.test(domain)) {
    return {
      status: "error",
      message:
        "Domínio inválido. Escreva apenas o que vem depois do @, por exemplo: medcof.com.br",
    };
  }

  const db = await getDb();

  const existing = await db
    .select({ id: allowedDomain.id, isActive: allowedDomain.isActive })
    .from(allowedDomain)
    .where(eq(allowedDomain.domain, domain))
    .get();

  if (existing) {
    return {
      status: "error",
      message: existing.isActive
        ? `O domínio @${domain} já está autorizado.`
        : `O domínio @${domain} já está cadastrado, mas está desativado. Use o botão Reativar na lista.`,
    };
  }

  const id = newId("dom");

  await db.insert(allowedDomain).values({
    id,
    domain,
    isActive: true,
    createdBy: admin.id,
    createdAt: new Date(),
  });

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "allowed_domain.create",
    entityType: "allowed_domain",
    entityId: id,
    summary: `Autorizou o domínio @${domain}`,
    afterData: { domain, isActive: true },
  });

  revalidatePath("/admin/dominios");
  revalidatePath("/login");

  return {
    status: "success",
    message: `Domínio @${domain} autorizado. Quem tiver e-mail nesse domínio já pode solicitar acesso.`,
  };
}

/**
 * Ativa ou desativa um domínio.
 *
 * Desativar é uma ação de peso: além de bloquear novos cadastros, revoga na
 * hora o acesso de todos os usuários que já usam esse domínio, porque
 * `getCurrentUser()` revalida o domínio a cada request.
 */
export async function toggleAllowedDomain(formData: FormData): Promise<void> {
  const admin = await requireAdmin();

  const id = String(formData.get("domainId") ?? "");
  if (!id) return;

  const db = await getDb();
  const before = await db
    .select()
    .from(allowedDomain)
    .where(eq(allowedDomain.id, id))
    .get();

  if (!before) return;

  // Trava de segurança: não deixamos o admin desativar o próprio domínio e se
  // trancar fora da plataforma.
  if (before.isActive && before.domain === admin.emailDomain) return;

  const nextIsActive = !before.isActive;

  await db
    .update(allowedDomain)
    .set({ isActive: nextIsActive })
    .where(eq(allowedDomain.id, id));

  await writeAuditLog({
    actorUserId: admin.id,
    actorEmail: admin.email,
    action: "allowed_domain.toggle",
    entityType: "allowed_domain",
    entityId: id,
    summary: nextIsActive
      ? `Reativou o domínio @${before.domain}`
      : `Desativou o domínio @${before.domain} (revoga o acesso de quem usa esse domínio)`,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: nextIsActive },
  });

  revalidatePath("/admin/dominios");
  revalidatePath("/login");
}
