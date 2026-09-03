"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";

import { getAuth } from "@/lib/auth/auth";
import { requireUserForTwoFactor } from "@/lib/auth/session";
import {
  cabecalhosComSessaoAtual,
  ligarFatorSemTrocarSessao,
  marcarSessaoConfirmada,
  limparTentativas,
  registrarTentativaErrada,
} from "@/lib/auth/two-factor";
import { writeAuditLog } from "@/lib/modules/audit/log";

/**
 * As ações do segundo fator.
 *
 * Todas passam por `requireUserForTwoFactor()`, e não por `requireUser()`: são
 * exatamente as ações que resolvem a pendência que o `requireUser()` bloqueia.
 */

export type ResultadoDaVerificacao = {
  erro?: string;
  /** Códigos de recuperação, mostrados UMA vez, logo após o cadastro. */
  codigos?: string[];
};

/** Só dígitos, no máximo os que cabem num código. */
function limparCodigo(valor: unknown): string {
  return String(valor ?? "")
    .replace(/\D/g, "")
    .slice(0, 6);
}

/**
 * Cria o segredo e devolve a URI para o app autenticador.
 *
 * Chamada por um botão, e não durante a montagem da tela: gerar o segredo a
 * cada carregamento trocaria a chave debaixo de quem já leu o QR e foi buscar
 * o celular.
 */
export async function iniciarCadastro(): Promise<void> {
  const currentUser = await requireUserForTwoFactor();
  if (currentUser.segundoFator.cadastrado) redirect("/verificacao");

  const auth = await getAuth();
  await auth.api.enableTwoFactor({
    body: {},
    headers: await headers(),
  });

  await ligarFatorSemTrocarSessao(currentUser.id);

  redirect("/verificacao/cadastrar");
}

/**
 * Confirma o primeiro código e conclui o cadastro.
 *
 * O código é exigido antes de o cadastro valer — sem isso, quem lê o QR com um
 * app que não guardou a entrada ficaria trancado para fora com um segredo que
 * não existe em lugar nenhum.
 */
export async function confirmarCadastro(
  _estado: ResultadoDaVerificacao,
  formData: FormData,
): Promise<ResultadoDaVerificacao> {
  const currentUser = await requireUserForTwoFactor();
  const codigo = limparCodigo(formData.get("codigo"));

  if (codigo.length !== 6) {
    return { erro: "Digite os seis dígitos que aparecem no aplicativo." };
  }

  const auth = await getAuth();
  const cabecalhos = await headers();

  try {
    await auth.api.verifyTOTP({
      body: { code: codigo },
      headers: cabecalhos,
    });
  } catch (erro) {
    if (erro instanceof APIError) {
      return {
        erro:
          "Código incorreto. Confira se o aplicativo está mostrando o código " +
          "da Central do Marketing e se o relógio do celular está certo.",
      };
    }
    throw erro;
  }

  await marcarSessaoConfirmada();

  // Os códigos de recuperação nascem só agora, depois de o app estar provado.
  // Gerados antes, seriam entregues a quem talvez nunca tenha concluído o
  // cadastro — e são eles que substituem o celular perdido.
  const { backupCodes } = await auth.api.generateBackupCodes({
    body: {},
    headers: await cabecalhosComSessaoAtual(cabecalhos),
  });

  await writeAuditLog({
    actorUserId: currentUser.id,
    actorEmail: currentUser.email,
    action: "user.two_factor_enabled",
    entityType: "user",
    entityId: currentUser.id,
    summary: `${currentUser.name} cadastrou o aplicativo autenticador`,
  });

  return { codigos: backupCodes };
}

/**
 * Confirma esta sessão com um código do aplicativo, ou com um código de
 * recuperação.
 *
 * Os dois entram pelo mesmo campo. Separar em duas telas obrigaria a pessoa a
 * saber, antes de digitar, qual dos dois ela tem na mão — e quem está usando
 * um código de recuperação já está num dia ruim.
 */
export async function confirmarSessaoAtual(
  _estado: ResultadoDaVerificacao,
  formData: FormData,
): Promise<ResultadoDaVerificacao> {
  const currentUser = await requireUserForTwoFactor();

  if (currentUser.segundoFator.bloqueadoAte) {
    return {
      erro:
        "Tentativas demais. Espere quinze minutos e tente de novo, ou peça a " +
        "um administrador para redefinir a verificação.",
    };
  }

  const bruto = String(formData.get("codigo") ?? "").trim();
  const auth = await getAuth();
  const cabecalhos = await headers();

  // Seis dígitos é o código do aplicativo; qualquer outra coisa é tratada como
  // código de recuperação, que tem letras.
  const digitos = limparCodigo(bruto);
  const ehDoAplicativo = /^\d{6}$/.test(bruto);

  if (!ehDoAplicativo && bruto.length < 6) {
    return { erro: "Digite o código de seis dígitos do aplicativo." };
  }

  try {
    if (ehDoAplicativo) {
      await auth.api.verifyTOTP({
        body: { code: digitos },
        headers: cabecalhos,
      });
    } else {
      await auth.api.verifyBackupCode({
        body: { code: bruto },
        headers: cabecalhos,
      });
    }
  } catch (erro) {
    if (erro instanceof APIError) {
      await registrarTentativaErrada(currentUser.id);
      return {
        erro: ehDoAplicativo
          ? "Código incorreto. Ele muda a cada trinta segundos — confira o aplicativo de novo."
          : "Código de recuperação inválido ou já usado.",
      };
    }
    throw erro;
  }

  await limparTentativas(currentUser.id);
  await marcarSessaoConfirmada();

  if (!ehDoAplicativo) {
    await writeAuditLog({
      actorUserId: currentUser.id,
      actorEmail: currentUser.email,
      action: "user.two_factor_backup_used",
      entityType: "user",
      entityId: currentUser.id,
      summary: `${currentUser.name} entrou com um código de recuperação`,
    });
  }

  redirect("/painel");
}
