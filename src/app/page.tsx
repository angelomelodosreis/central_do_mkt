import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/** Raiz do site: manda o visitante para o lugar certo conforme a situação dele. */
export default async function RootPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) redirect("/login");
  if (currentUser.status === "pending") redirect("/aguardando-aprovacao");
  if (currentUser.status === "suspended") redirect("/acesso-suspenso");

  redirect("/painel");
}
