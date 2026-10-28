/**
 * Extrai o ID de 11 caracteres de um vídeo do YouTube a partir de qualquer formato de link:
 * - https://youtu.be/1QQZoc-l9jA
 * - https://www.youtube.com/watch?v=1QQZoc-l9jA&feature=share
 * - https://www.youtube.com/embed/1QQZoc-l9jA
 * - https://www.youtube.com/v/1QQZoc-l9jA
 * - ou o próprio ID direto "1QQZoc-l9jA"
 */
export function extractYoutubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const str = input.trim();
  if (!str) return null;

  // Se já for o ID puro (11 caracteres alfanuméricos com hífen ou sublinhado)
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // youtu.be/<id>
  const shortMatch = str.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/i);
  if (shortMatch) return shortMatch[1];

  // youtube.com/watch?v=<id>
  const watchMatch = str.match(/[?&]v=([a-zA-Z0-9_-]{11})/i);
  if (watchMatch) return watchMatch[1];

  // youtube.com/embed/<id>
  const embedMatch = str.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/i);
  if (embedMatch) return embedMatch[1];

  // youtube.com/v/<id>
  const vMatch = str.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/i);
  if (vMatch) return vMatch[1];

  return null;
}

/**
 * Normaliza a URL de vídeo para garantir protocolo http/https válido.
 */
export function normalizeVideoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Se for apenas ID do youtube
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://youtu.be/${trimmed}`;
  }
  return `https://${trimmed}`;
}
