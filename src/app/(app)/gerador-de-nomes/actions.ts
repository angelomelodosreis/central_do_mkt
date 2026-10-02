"use server";

import { requirePermission } from "@/lib/auth/session";
import { saveGeneratedName } from "@/lib/modules/name-generator/queries";

export async function recordGeneratedNameAction(input: {
  templateId?: string;
  templateName: string;
  generatedName: string;
  parameters?: Record<string, string>;
}) {
  const user = await requirePermission("name_generator", "view");
  await saveGeneratedName({
    templateId: input.templateId,
    templateName: input.templateName,
    generatedName: input.generatedName,
    parameters: input.parameters,
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
  });
  return { ok: true };
}
