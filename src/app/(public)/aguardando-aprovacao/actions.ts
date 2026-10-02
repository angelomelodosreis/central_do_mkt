"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/session";
import { submitBuRequests } from "@/lib/modules/access/bu-requests";

export async function requestBuAccessAction(
  businessUnitIds: string[],
  note?: string,
): Promise<{ success: boolean; message: string }> {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { success: false, message: "Você precisa estar autenticado." };
  }

  if (businessUnitIds.length === 0) {
    return {
      success: false,
      message: "Selecione pelo menos uma Business Unit.",
    };
  }

  try {
    const result = await submitBuRequests(
      currentUser.id,
      businessUnitIds,
      note,
    );

    revalidatePath("/aguardando-aprovacao");
    revalidatePath("/perfil");
    revalidatePath("/admin/usuarios");

    return {
      success: true,
      message: `${result.count} Business Unit(s) solicitada(s) com sucesso. Aguarde a validação do administrador.`,
    };
  } catch (error) {
    console.error("Erro ao solicitar BUs:", error);
    return {
      success: false,
      message: "Ocorreu um erro ao registrar sua solicitação. Tente novamente.",
    };
  }
}
