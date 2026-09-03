import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { CampoDeCodigo } from "./code-input";
import { CartaoDeVerificacao } from "./shell";
import { CodigoDeTeste } from "./test-code";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { getAuth } from "@/lib/auth/auth";
import { requireUserForTwoFactor } from "@/lib/auth/session";
import { isTestLoginEnabled } from "@/lib/auth/test-login";
import { segredoBrutoDaUri } from "@/lib/auth/totp-qr";

export const metadata: Metadata = { title: "Verificação" };
export const dynamic = "force-dynamic";

export default async function VerificacaoPage() {
  const currentUser = await requireUserForTwoFactor();

  if (!currentUser.segundoFator.cadastrado) redirect("/verificacao/cadastrar");
  if (currentUser.segundoFator.confirmado) redirect("/painel");

  const bloqueadoAte = currentUser.segundoFator.bloqueadoAte;

  return (
    <CartaoDeVerificacao
      titulo="Confirme que é você"
      descricao={
        <>
          Abra o aplicativo autenticador e digite o código de seis dígitos da{" "}
          <span className="font-medium text-slate-700">
            Central do Marketing
          </span>
          .
        </>
      }
      rodape={
        <div className="space-y-3">
          <p>
            Perdeu o celular? Use um dos códigos de recuperação que você guardou
            no cadastro. Sem eles, um administrador precisa redefinir a
            verificação.
          </p>
          <SignOutButton className="mx-auto" />
        </div>
      }
    >
      {bloqueadoAte ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-800"
        >
          Tentativas demais. Espere até{" "}
          {bloqueadoAte.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          para tentar de novo.
        </p>
      ) : null}

      <CampoDeCodigo bloqueado={bloqueadoAte !== null} />

      <CodigoDoModoDeTeste />
    </CartaoDeVerificacao>
  );
}

/**
 * O código válido agora, na tela — SÓ no modo de teste local.
 *
 * Existe para a "Parte 0" do README continuar de pé: dá para conhecer a
 * plataforma na própria máquina sem instalar aplicativo autenticador nenhum.
 * Em produção nada disto é renderizado, porque `isTestLoginEnabled()` só
 * devolve verdadeiro com NODE_ENV "development" — o build elimina o caminho.
 */
async function CodigoDoModoDeTeste() {
  if (!(await isTestLoginEnabled())) return null;

  const auth = await getAuth();
  const cabecalhos = await headers();

  const { totpURI } = await auth.api.getTOTPURI({
    body: {},
    headers: cabecalhos,
  });
  const segredo = segredoBrutoDaUri(totpURI);
  if (!segredo) return null;

  const { code } = await auth.api.generateTOTP({ body: { secret: segredo } });

  return <CodigoDeTeste codigo={code} />;
}
