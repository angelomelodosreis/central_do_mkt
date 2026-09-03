import type { Metadata } from "next";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { CadastroDoAplicativo } from "./enrollment";
import { iniciarCadastro } from "../actions";
import { CartaoDeVerificacao } from "../shell";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAuth } from "@/lib/auth/auth";
import { requireUserForTwoFactor } from "@/lib/auth/session";
import { isTestLoginEnabled } from "@/lib/auth/test-login";
import {
  desenharQrCode,
  formatarSegredo,
  segredoBrutoDaUri,
  segredoDaUri,
} from "@/lib/auth/totp-qr";
import { getDb } from "@/lib/db/client";
import { twoFactor } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Cadastrar aplicativo" };
export const dynamic = "force-dynamic";

/**
 * Cadastro do segundo fator: convite, QR, confirmação e códigos de recuperação.
 *
 * ── Por que esta página não redireciona quando o cadastro termina ──────────
 * Toda server action faz o Next redesenhar a rota em que ela rodou. Os códigos
 * de recuperação só existem na resposta da ação que confirmou o cadastro, e
 * vivem no estado do componente de cliente — um `redirect()` aqui levaria a
 * pessoa embora antes de ela ver os códigos, e eles não são recuperáveis
 * depois. Por isso a tela concluída é um estado desta mesma página, e o
 * componente renderizado é sempre o mesmo: trocá-lo desmontaria o estado que
 * guarda os códigos.
 */
export default async function CadastrarPage() {
  const currentUser = await requireUserForTwoFactor();
  const concluido = currentUser.segundoFator.cadastrado;

  const db = await getDb();
  const jaTemSegredo = await db
    .select({ id: twoFactor.id })
    .from(twoFactor)
    .where(eq(twoFactor.userId, currentUser.id))
    .get();

  if (!jaTemSegredo && !concluido) return <Convite />;

  const auth = await getAuth();

  // Concluído, o QR não é mais desenhado: quem já cadastrou não precisa dele, e
  // mostrá-lo de novo seria expor o segredo sem motivo.
  const { totpURI } = concluido
    ? { totpURI: "" }
    : await auth.api.getTOTPURI({ body: {}, headers: await headers() });

  // Duas leituras do mesmo segredo, e a diferença importa: o aplicativo espera
  // a forma em base32 que está na URI; o gerador de código do modo de teste
  // espera o texto original.
  const paraDigitar = totpURI ? segredoDaUri(totpURI) : null;
  const bruto = totpURI ? segredoBrutoDaUri(totpURI) : null;

  const codigoDeTeste =
    bruto && (await isTestLoginEnabled())
      ? (await auth.api.generateTOTP({ body: { secret: bruto } })).code
      : undefined;

  return (
    <CartaoDeVerificacao rodape={<SignOutButton className="mx-auto" />}>
      <CadastroDoAplicativo
        concluido={concluido}
        qrCode={totpURI ? desenharQrCode(totpURI) : ""}
        segredo={paraDigitar ? formatarSegredo(paraDigitar) : ""}
        codigoDeTeste={codigoDeTeste}
      />
    </CartaoDeVerificacao>
  );
}

/** O primeiro passo: o que vai acontecer, e o botão que começa. */
function Convite() {
  return (
    <CartaoDeVerificacao
      titulo="Mais um passo para entrar"
      descricao="A partir de agora a Central do Marketing pede, além do login do Google, um código de seis dígitos gerado no seu celular."
      rodape={<SignOutButton className="mx-auto" />}
    >
      <div className="space-y-6">
        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Você vai precisar de um aplicativo autenticador. Se ainda não tiver
            um, instale o Google Authenticator, o Authy ou o Microsoft
            Authenticator — todos são gratuitos. Quem usa 1Password ou Bitwarden
            já tem essa função no próprio gerenciador.
          </p>
          <p>
            O cadastro é uma vez só. Depois dele, o código é pedido a cada nova
            sessão — na prática, cerca de uma vez por semana.
          </p>
        </div>

        <form action={iniciarCadastro}>
          <SubmitButton
            variant="primary"
            className="w-full"
            pendingLabel="Gerando…"
          >
            Começar
          </SubmitButton>
        </form>
      </div>
    </CartaoDeVerificacao>
  );
}
