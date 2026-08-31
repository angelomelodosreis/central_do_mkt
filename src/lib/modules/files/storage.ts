import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageProvider } from "@/lib/db/schema";

/**
 * Onde os arquivos enviados ficam guardados.
 *
 * Dois destinos, escolhidos por ambiente e não por configuração de tela:
 *
 * - `vercel_blob` quando existe `BLOB_READ_WRITE_TOKEN`. Obrigatório em
 *   produção: o sistema de arquivos da Vercel é efêmero e somente leitura, e um
 *   upload gravado em disco lá desapareceria no próximo deploy.
 * - `local` caso contrário. É o que permite subir arquivo em desenvolvimento
 *   sem criar conta em serviço nenhum.
 *
 * As duas pontas devolvem a mesma forma (`StoredFile`), então nada acima daqui
 * precisa saber qual está em uso.
 */

/** 25 MB. Acima disso o caso é link do Drive, não cópia na plataforma. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Tipos aceitos.
 *
 * Lista de permitidos, e não de proibidos: uma lista de proibidos esquece o
 * próximo formato executável que aparecer, e o custo do erro aqui é hospedar um
 * binário que alguém do time vai baixar confiando na plataforma.
 */
export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
]);

export const ALLOWED_EXTENSIONS_LABEL =
  "PDF, imagens, planilhas, documentos, apresentações, CSV, TXT e ZIP";

export type StoredFile = {
  provider: StorageProvider;
  storageKey: string;
  /** Endereço direto no provedor. Vazio no driver local. */
  url: string | null;
  mimeType: string;
  sizeBytes: number;
  filename: string;
};

export function currentProvider(): StorageProvider {
  return process.env.BLOB_READ_WRITE_TOKEN ? "vercel_blob" : "local";
}

/** Pasta do driver local. Fora de `public/`, para nada ser servido sem checagem. */
const LOCAL_ROOT = path.join(process.cwd(), ".data", "uploads");

/**
 * Nome de arquivo seguro para usar como chave.
 *
 * O nome original vira só rótulo; a chave é gerada. Confiar no nome enviado é
 * como se abre travessia de diretório (`../../`) — e dois arquivos com o mesmo
 * nome sobrescreveriam um ao outro.
 */
function buildKey(folder: string, filename: string): string {
  const ext = path
    .extname(filename)
    .slice(0, 12)
    .replace(/[^\w.]/g, "");
  const safeFolder = folder.replace(/[^\w-]/g, "").slice(0, 40) || "geral";
  return `${safeFolder}/${randomUUID()}${ext}`;
}

export type StoreResult =
  { ok: true; file: StoredFile } | { ok: false; message: string };

/** Grava o arquivo no provedor ativo, depois de validar tipo e tamanho. */
export async function storeUpload(
  file: File,
  folder: string,
): Promise<StoreResult> {
  if (file.size === 0) {
    return { ok: false, message: "O arquivo está vazio." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      message: `O arquivo tem ${Math.round(file.size / 1024 / 1024)} MB e o limite é 25 MB. Para algo maior, use um link do Google Drive.`,
    };
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      ok: false,
      message: `Tipo de arquivo não aceito (${mimeType}). Aceitamos ${ALLOWED_EXTENSIONS_LABEL}.`,
    };
  }

  const storageKey = buildKey(folder, file.name || "arquivo");
  const bytes = Buffer.from(await file.arrayBuffer());
  const provider = currentProvider();

  if (provider === "vercel_blob") {
    const { put } = await import("@vercel/blob");
    // `addRandomSuffix` deixa o endereço impossível de adivinhar. Ainda assim,
    // toda leitura passa pela nossa rota, que confere o acesso antes de
    // redirecionar — o endereço direto é o último recurso, não o caminho normal.
    const uploaded = await put(storageKey, bytes, {
      access: "public",
      addRandomSuffix: true,
      contentType: mimeType,
    });

    return {
      ok: true,
      file: {
        provider,
        storageKey: uploaded.pathname,
        url: uploaded.url,
        mimeType,
        sizeBytes: file.size,
        filename: file.name || "arquivo",
      },
    };
  }

  const destination = path.join(LOCAL_ROOT, storageKey);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);

  return {
    ok: true,
    file: {
      provider,
      storageKey,
      url: null,
      mimeType,
      sizeBytes: file.size,
      filename: file.name || "arquivo",
    },
  };
}

/**
 * Lê um arquivo do driver local.
 *
 * A chave é validada de novo antes de tocar o disco: ela vem do banco, mas
 * "vem do banco" não é garantia suficiente para concatenar em caminho de
 * arquivo.
 */
export async function readLocalFile(
  storageKey: string,
): Promise<Buffer | null> {
  const resolved = path.resolve(LOCAL_ROOT, storageKey);
  if (!resolved.startsWith(LOCAL_ROOT + path.sep)) return null;

  try {
    return await readFile(resolved);
  } catch {
    return null;
  }
}

/**
 * Apaga o binário.
 *
 * Falha silenciosa de propósito: se o arquivo já não existe (ou o provedor
 * recusa), o registro no banco ainda deve sair. Um registro apontando para nada
 * é pior que um binário órfão.
 */
export async function deleteStored(
  provider: StorageProvider | null,
  storageKey: string | null,
  url: string | null,
): Promise<void> {
  try {
    if (provider === "vercel_blob" && url) {
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
    if (provider === "local" && storageKey) {
      const resolved = path.resolve(LOCAL_ROOT, storageKey);
      if (!resolved.startsWith(LOCAL_ROOT + path.sep)) return;
      await unlink(resolved);
    }
  } catch (error) {
    console.error("[arquivos] falha ao apagar binário", storageKey, error);
  }
}

/** ETag estável, para o navegador não rebaixar o mesmo arquivo duas vezes. */
export function etagFor(storageKey: string, sizeBytes: number | null): string {
  return `"${createHash("sha1")
    .update(`${storageKey}:${sizeBytes ?? 0}`)
    .digest("hex")}"`;
}
