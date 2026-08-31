import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { getAttachmentForUser } from "@/lib/modules/files/queries";
import { etagFor, readLocalFile } from "@/lib/modules/files/storage";

/**
 * Entrega um arquivo enviado, conferindo o acesso antes.
 *
 * Todo download passa por aqui, e não pelo endereço do provedor, por um motivo:
 * o anexo herda a permissão do registro dono, e é aqui que essa herança é
 * verificada. Servir os arquivos de `public/` daria a qualquer pessoa com o
 * endereço acesso a material interno de uma BU.
 *
 * No driver local o binário é lido do disco. No Vercel Blob respondemos com um
 * redirecionamento para o endereço do provedor — que é aleatório e não
 * adivinhável, mas público para quem o tiver: quando a Vercel oferecer blobs
 * privados de forma estável, é este ponto único que muda.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.status !== "active") {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const found = await getAttachmentForUser(attachmentId, currentUser);
  // 404 e não 403: dizer "existe, mas você não pode" já revela a existência do
  // arquivo, e com ela o nome do documento a que ele pertence.
  if (!found) return new NextResponse("Não encontrado", { status: 404 });

  if (found.kind === "link") {
    if (!found.url) return new NextResponse("Não encontrado", { status: 404 });
    return NextResponse.redirect(found.url);
  }

  if (found.storageProvider === "vercel_blob" && found.url) {
    return NextResponse.redirect(found.url);
  }

  if (!found.storageKey) {
    return new NextResponse("Não encontrado", { status: 404 });
  }

  const bytes = await readLocalFile(found.storageKey);
  if (!bytes) return new NextResponse("Não encontrado", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": found.mimeType ?? "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      // `inline` para PDF e imagem abrirem embutidos em vez de baixar. O nome
      // vai entre aspas porque títulos têm espaço.
      "Content-Disposition": `inline; filename="${encodeURIComponent(found.title)}"`,
      ETag: etagFor(found.storageKey, found.sizeBytes),
      // Privado: é conteúdo com controle de acesso, e um cache compartilhado
      // entregaria o arquivo de uma BU para quem passasse depois.
      "Cache-Control": "private, max-age=300",
      /**
       * O arquivo é confinado pelo CABEÇALHO, e não pelo atributo `sandbox` do
       * `iframe`.
       *
       * A diferença é prática: com `sandbox` no `iframe`, o Chrome recusa
       * carregar o PDF (`ERR_BLOCKED_BY_CLIENT`) porque o visualizador interno
       * dele não roda em quadro sandboxed — o quadro ficava em branco. Já o
       * `Content-Security-Policy: sandbox` na resposta dá origem opaca ao
       * próprio documento e bloqueia script nele, o que é o que interessa: um
       * PDF ou SVG enviado por alguém não executa nada com a nossa origem, nem
       * embutido nem aberto em aba própria.
       */
      "Content-Security-Policy": "sandbox",
      // O tipo é o que gravamos no upload; impedir a adivinhação evita que um
      // arquivo declarado como texto seja tratado como HTML pelo navegador.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
