/**
 * Reconhecimento de links do Google (e de PDFs) para exibir dentro da
 * plataforma.
 *
 * A alternativa seria abrir cada documento numa aba nova — o que tira a pessoa
 * da plataforma justamente quando ela está lendo o material da BU. Documento do
 * Google e PDF já sabem se exibir embutidos, e o Google tem endereços de
 * "preview" próprios para isso: é só traduzir o link que a pessoa colou.
 *
 * Nada aqui faz requisição: é só análise de URL. A permissão de abrir o arquivo
 * continua sendo a do Drive, com a conta do próprio leitor — não guardamos cópia
 * nem credencial de acesso a arquivo alheio.
 */

export const EMBED_KINDS = [
  "google_doc",
  "google_sheet",
  "google_slide",
  "google_drive_file",
  "pdf",
  "image",
  "other",
] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];

export const EMBED_KIND_LABELS: Record<EmbedKind, string> = {
  google_doc: "Google Docs",
  google_sheet: "Google Sheets",
  google_slide: "Google Slides",
  google_drive_file: "Google Drive",
  pdf: "PDF",
  image: "Imagem",
  other: "Link",
};

export type EmbedInfo = {
  kind: EmbedKind;
  /** Endereço para o `iframe`/`img`. `null` quando não dá para embutir. */
  embedUrl: string | null;
  /** Endereço para abrir no serviço de origem. */
  openUrl: string;
};

/**
 * Só http(s) passa.
 *
 * `javascript:` num campo de link é o caminho clássico de XSS: o valor vem do
 * usuário e vai virar `href`. A lista de permitidos fica aqui, no ponto em que a
 * URL é interpretada, para nenhuma tela precisar lembrar de validar.
 */
export function isSafeHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const GOOGLE_DOC_KINDS: Record<string, EmbedKind> = {
  document: "google_doc",
  spreadsheets: "google_sheet",
  presentation: "google_slide",
};

/**
 * Descobre o tipo do link e como embuti-lo.
 *
 * Devolve `other` com `embedUrl: null` para o que não é reconhecido — o link
 * continua clicável, apenas não é exibido embutido. Falhar assim é melhor que
 * tentar embutir um site qualquer, que quase sempre recusa `iframe` e
 * resultaria num quadro em branco sem explicação.
 */
export function describeEmbed(raw: string): EmbedInfo | null {
  if (!isSafeHttpUrl(raw)) return null;

  const url = new URL(raw);
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname;

  // Documentos do Google: .../document/d/<id>/edit → .../preview
  if (host === "docs.google.com") {
    const match = /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/.exec(
      path,
    );
    if (match) {
      const [, tipo, id] = match;
      return {
        kind: GOOGLE_DOC_KINDS[tipo] ?? "google_drive_file",
        embedUrl: `https://docs.google.com/${tipo}/d/${id}/preview`,
        openUrl: raw,
      };
    }
  }

  // Arquivos do Drive: /file/d/<id>/view → /preview
  if (host === "drive.google.com") {
    const match = /^\/file\/d\/([^/]+)/.exec(path);
    if (match) {
      return {
        kind: "google_drive_file",
        embedUrl: `https://drive.google.com/file/d/${match[1]}/preview`,
        openUrl: raw,
      };
    }
    // Pasta ou link de compartilhamento: não há visualização embutida.
    return { kind: "google_drive_file", embedUrl: null, openUrl: raw };
  }

  const pathAndQuery = path + url.search;

  if (/\.pdf($|\?)/i.test(pathAndQuery)) {
    return { kind: "pdf", embedUrl: raw, openUrl: raw };
  }

  if (/\.(png|jpe?g|gif|webp|avif|svg)($|\?)/i.test(pathAndQuery)) {
    return { kind: "image", embedUrl: raw, openUrl: raw };
  }

  return { kind: "other", embedUrl: null, openUrl: raw };
}

/** Tipo MIME → forma de exibição, para arquivos que subimos. */
export function embedKindForMime(mimeType: string | null): EmbedKind {
  if (!mimeType) return "other";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}

/** `1536` → `2 KB`. Tamanho em linguagem de gente. */
export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toLocaleString("pt-BR", {
      maximumFractionDigits: 0,
    })} KB`;
  }
  return `${(bytes / (1024 * 1024)).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })} MB`;
}
