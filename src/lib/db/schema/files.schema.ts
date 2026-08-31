import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * A que registro um anexo pertence.
 *
 * Uma tabela só, polimórfica, em vez de `doc_page_attachment` +
 * `task_attachment` + as próximas: o comportamento (subir, listar, visualizar,
 * remover) é idêntico em todos os casos, e duplicar a tabela duplicaria também
 * o código de upload e de exibição.
 */
export const ATTACHMENT_OWNER_TYPES = ["doc_page", "task"] as const;
export type AttachmentOwnerType = (typeof ATTACHMENT_OWNER_TYPES)[number];

/**
 * Como o arquivo chegou aqui.
 *
 * - `upload`: o binário está sob nossa guarda (disco local em dev, Vercel Blob
 *   em produção)
 * - `link`:   o arquivo continua no Google Drive; guardamos o endereço e
 *   exibimos embutido. Não há cópia, então a permissão de quem pode abrir
 *   continua sendo a do Drive — o que é o comportamento correto para material
 *   que já é gerido lá.
 */
export const ATTACHMENT_KINDS = ["upload", "link"] as const;
export type AttachmentKind = (typeof ATTACHMENT_KINDS)[number];

/**
 * Onde o binário de um `upload` está guardado.
 *
 * Dois destinos porque o sistema de arquivos da Vercel é efêmero e somente
 * leitura: em desenvolvimento gravar em disco é o caminho mais curto (nenhuma
 * credencial), em produção é obrigatório um serviço externo.
 */
export const STORAGE_PROVIDERS = ["local", "vercel_blob"] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export const attachment = sqliteTable(
  "attachment",
  {
    id: text("id").primaryKey(),
    ownerType: text("owner_type").notNull().$type<AttachmentOwnerType>(),
    ownerId: text("owner_id").notNull(),

    kind: text("kind").notNull().$type<AttachmentKind>(),
    /** Nome exibido. Para uploads começa como o nome do arquivo original. */
    title: text("title").notNull(),

    /** Endereço para abrir/embutir. Sempre preenchido para `link`. */
    url: text("url"),

    // Só para `upload` ------------------------------------------------------
    storageProvider: text("storage_provider").$type<StorageProvider>(),
    /** Caminho/chave dentro do provedor. É o que permite apagar o binário. */
    storageKey: text("storage_key"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),

    position: integer("position").notNull().default(0),
    createdBy: text("created_by"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => [index("attachment_owner_idx").on(table.ownerType, table.ownerId)],
);

export type Attachment = typeof attachment.$inferSelect;
