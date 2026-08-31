"use client";

import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import type { AttachmentKind, AttachmentOwnerType } from "@/lib/db/schema";
import {
  deleteAttachment,
  linkAttachment,
  uploadAttachment,
  INITIAL_ATTACHMENT_STATE,
  type AttachmentFormState,
} from "@/lib/modules/files/actions";
import {
  describeEmbed,
  embedKindForMime,
  EMBED_KIND_LABELS,
  formatBytes,
  type EmbedKind,
} from "@/lib/modules/files/embed";
import { cn } from "@/lib/utils/cn";

export type AttachmentItem = {
  id: string;
  kind: AttachmentKind;
  title: string;
  url: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  authorName: string | null;
};

/**
 * Arquivos de um registro: upload nosso e link do Google Drive, na mesma lista.
 *
 * Os dois convivem porque resolvem casos diferentes: o PDF de uma pesquisa
 * fechada é para guardar, e a planilha que a equipe edita toda semana é para
 * apontar — copiá-la criaria uma segunda versão que envelhece sozinha.
 *
 * A visualização é embutida, e não uma aba nova, porque ler o material é a
 * atividade principal da tela, não um desvio dela.
 */
export function AttachmentPanel({
  ownerType,
  ownerId,
  items,
  canEdit,
  revalidatePath,
  title = "Arquivos",
  description,
}: {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  items: AttachmentItem[];
  canEdit: boolean;
  /** Caminho a revalidar depois de anexar/remover. */
  revalidatePath: string;
  title?: string;
  description?: string;
}) {
  const [mode, setMode] = useState<"none" | "upload" | "link">("none");
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader
        title={items.length > 0 ? `${title} (${items.length})` : title}
        description={description}
        action={
          canEdit && mode === "none" ? (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setMode("upload")}
              >
                Subir arquivo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode("link")}>
                Link do Drive
              </Button>
            </div>
          ) : null
        }
      />
      <CardBody className="px-0 py-0">
        {mode !== "none" ? (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            {mode === "upload" ? (
              <UploadForm
                ownerType={ownerType}
                ownerId={ownerId}
                revalidatePath={revalidatePath}
                onDone={() => setMode("none")}
              />
            ) : (
              <LinkForm
                ownerType={ownerType}
                ownerId={ownerId}
                revalidatePath={revalidatePath}
                onDone={() => setMode("none")}
              />
            )}
          </div>
        ) : null}

        {items.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">
            Nenhum arquivo por aqui.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => (
              <AttachmentRow
                key={item.id}
                item={item}
                canEdit={canEdit}
                revalidatePath={revalidatePath}
                isOpen={openId === item.id}
                onToggle={() =>
                  setOpenId((current) => (current === item.id ? null : item.id))
                }
              />
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function AttachmentRow({
  item,
  canEdit,
  revalidatePath,
  isOpen,
  onToggle,
}: {
  item: AttachmentItem;
  canEdit: boolean;
  revalidatePath: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  // Para link, o tipo sai da URL; para upload, do MIME. A visualização
  // embutida de um upload aponta para a nossa rota, que confere o acesso.
  const embed =
    item.kind === "link" && item.url
      ? describeEmbed(item.url)
      : {
          kind: embedKindForMime(item.mimeType) as EmbedKind,
          embedUrl: podeEmbutirUpload(item.mimeType)
            ? `/api/arquivos/${item.id}`
            : null,
          openUrl: `/api/arquivos/${item.id}`,
        };

  const kindLabel = embed ? EMBED_KIND_LABELS[embed.kind] : "Link";
  /** O binário é servido pela nossa rota (e não por um serviço de fora). */
  const proprio = item.kind === "upload";

  return (
    <li>
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{item.title}</span>
            <Badge tone="neutral">{kindLabel}</Badge>
            {item.kind === "link" ? (
              <span className="text-xs text-slate-500">não copiado</span>
            ) : (
              <span className="text-xs text-slate-500">
                {formatBytes(item.sizeBytes)}
              </span>
            )}
          </p>
          {item.authorName ? (
            <p className="mt-0.5 text-xs text-slate-500">
              enviado por {item.authorName}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 gap-1.5">
          {embed?.embedUrl ? (
            <Button
              size="sm"
              variant={isOpen ? "primary" : "secondary"}
              onClick={onToggle}
            >
              {isOpen ? "Fechar" : "Visualizar"}
            </Button>
          ) : null}
          <a
            href={embed?.openUrl ?? "#"}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Abrir
          </a>
          {canEdit ? (
            <form action={deleteAttachment}>
              <input type="hidden" name="attachmentId" value={item.id} />
              <input
                type="hidden"
                name="revalidatePath"
                value={revalidatePath}
              />
              <Button type="submit" size="sm" variant="ghost">
                Remover
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      {isOpen && embed?.embedUrl ? (
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-3">
          {embed.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={embed.embedUrl}
              alt={item.title}
              className="mx-auto max-h-[70vh] rounded-lg"
            />
          ) : (
            <iframe
              src={embed.embedUrl}
              title={item.title}
              // Alto de propósito: um visualizador de documento em 300px de
              // altura obriga a rolar dentro de um quadro que rola dentro da
              // página, que é a pior forma de ler qualquer coisa.
              className="h-[70vh] w-full rounded-lg border border-slate-200 bg-white"
              /**
               * O confinamento depende da origem do conteúdo:
               *
               * - ARQUIVO NOSSO (`/api/arquivos/...`): sem atributo `sandbox`.
               *   O Chrome recusa carregar PDF em quadro sandboxed
               *   (`ERR_BLOCKED_BY_CLIENT`) e o visualizador ficava em branco.
               *   Quem confina é o cabeçalho `Content-Security-Policy: sandbox`
               *   da nossa própria resposta — mesma proteção, no lugar certo.
               * - LINK EXTERNO (Drive): não controlamos os cabeçalhos deles,
               *   então o atributo é a única trava disponível. `allow-scripts`
               *   é necessário para o visualizador do Google funcionar, e
               *   `allow-same-origin` fica de fora justamente para o quadro não
               *   alcançar a nossa sessão.
               */
              sandbox={
                proprio ? undefined : "allow-scripts allow-popups allow-forms"
              }
              referrerPolicy="no-referrer"
            />
          )}
        </div>
      ) : null}
    </li>
  );
}

/**
 * Só PDF e imagem são exibidos embutidos.
 *
 * Planilha e documento do Office não têm visualizador nativo no navegador: o
 * `iframe` baixaria o arquivo ou mostraria um quadro branco. Para esses, o
 * caminho é abrir — ou manter no Drive e vincular.
 */
function podeEmbutirUpload(mimeType: string | null): boolean {
  const kind = embedKindForMime(mimeType);
  return kind === "pdf" || kind === "image";
}

function UploadForm({
  ownerType,
  ownerId,
  revalidatePath,
  onDone,
}: {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  revalidatePath: string;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    AttachmentFormState,
    FormData
  >(uploadAttachment, INITIAL_ATTACHMENT_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ownerType" value={ownerType} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <input type="hidden" name="revalidatePath" value={revalidatePath} />

      <Message state={state} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Arquivo" htmlFor="file" required>
          <input
            id="file"
            name="file"
            type="file"
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-slate-700"
          />
        </Field>
        <Field
          label="Nome"
          htmlFor="titulo-anexo"
          hint="Opcional. Em branco, usamos o nome do arquivo."
        >
          <Input id="titulo-anexo" name="title" maxLength={120} />
        </Field>
      </div>

      <p className="text-xs text-slate-500">
        Até 25 MB. Para algo maior, mantenha no Drive e use “Link do Drive”.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Enviando…" : "Anexar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function LinkForm({
  ownerType,
  ownerId,
  revalidatePath,
  onDone,
}: {
  ownerType: AttachmentOwnerType;
  ownerId: string;
  revalidatePath: string;
  onDone: () => void;
}) {
  const [state, formAction, isPending] = useActionState<
    AttachmentFormState,
    FormData
  >(linkAttachment, INITIAL_ATTACHMENT_STATE);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ownerType" value={ownerType} />
      <input type="hidden" name="ownerId" value={ownerId} />
      <input type="hidden" name="revalidatePath" value={revalidatePath} />

      <Message state={state} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Endereço"
          htmlFor="url-anexo"
          required
          hint="Cole o link do Google Docs, Sheets, Slides, Drive ou de um PDF."
        >
          <Input
            id="url-anexo"
            name="url"
            type="url"
            required
            placeholder="https://docs.google.com/document/d/…"
          />
        </Field>
        <Field label="Nome" htmlFor="titulo-link" hint="Como aparece na lista.">
          <Input id="titulo-link" name="title" maxLength={120} />
        </Field>
      </div>

      <p className="text-xs text-slate-500">
        O arquivo continua no Drive: nada é copiado. Quem abrir precisa ter
        acesso a ele lá — confira o compartilhamento antes de vincular.
      </p>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "Vinculando…" : "Vincular"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Message({ state }: { state: AttachmentFormState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        state.status === "error"
          ? "border-danger-200 bg-danger-50 text-danger-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {state.message}
    </p>
  );
}
