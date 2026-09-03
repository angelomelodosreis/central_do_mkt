import qrcode from "qrcode-generator";

/**
 * Desenha o QR do cadastro como SVG, no próprio HTML.
 *
 * Sem imagem e sem serviço externo de propósito: a URI do TOTP CONTÉM o
 * segredo, e mandá-la para um gerador de QR de terceiro seria entregar a chave
 * do segundo fator para quem hospeda o gerador. Aqui ela nunca sai do
 * servidor — o que chega ao navegador já é o desenho pronto.
 */
export function desenharQrCode(conteudo: string): string {
  // Tipo 0 = escolhe automaticamente o menor tamanho que couber. Correção "M"
  // tolera cerca de 15% de sujeira, que é o padrão dos apps autenticadores.
  const qr = qrcode(0, "M");
  qr.addData(conteudo);
  qr.make();

  return qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
}

/**
 * O segredo como ele aparece na URI: em base32.
 *
 * Serve para quem não consegue ler o QR — em computador sem câmera, ou com o
 * app autenticador no mesmo aparelho — e digita a chave à mão. É esta forma
 * que os aplicativos esperam.
 */
export function segredoDaUri(uri: string): string | null {
  try {
    return new URL(uri).searchParams.get("secret");
  } catch {
    return null;
  }
}

const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/**
 * O segredo de volta ao texto original, desfazendo o base32 da URI.
 *
 * Existe por causa de uma assimetria do better-auth que custa caro descobrir:
 * ele GUARDA o segredo como texto puro e o PUBLICA na URI em base32. Quem
 * pegar o parâmetro `secret` da URI e devolvê-lo a uma função que espera o
 * segredo guardado calcula códigos que nunca vão bater.
 *
 * Usado só pelo auxílio do modo de teste local, que mostra o código na tela.
 */
export function segredoBrutoDaUri(uri: string): string | null {
  const base32 = segredoDaUri(uri);
  if (!base32) return null;

  let acumulador = 0;
  let bits = 0;
  const bytes: number[] = [];

  for (const caractere of base32.replace(/=+$/, "").toUpperCase()) {
    const valor = ALFABETO_BASE32.indexOf(caractere);
    if (valor < 0) return null;

    acumulador = (acumulador << 5) | valor;
    bits += 5;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulador >> bits) & 0xff);
    }
  }

  return new TextDecoder().decode(Uint8Array.from(bytes));
}

/** Quebra o segredo em grupos de quatro, que é o que se consegue digitar. */
export function formatarSegredo(segredo: string): string {
  return segredo.replace(/(.{4})/g, "$1 ").trim();
}
