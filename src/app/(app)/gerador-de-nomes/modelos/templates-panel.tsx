"use client";

import { useActionState, useState } from "react";

import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  toggleTemplate,
} from "./actions";
import { INITIAL_TEMPLATE_STATE } from "./form-state";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input } from "@/components/ui/field";
import { cn } from "@/lib/utils/cn";

type TemplateRow = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  fieldCount: number;
  optionalCount: number;
  format: string | null;
};

/**
 * Os modelos existentes primeiro; a criação é uma ação.
 *
 * A tela abria com um formulário grande de "novo modelo" no topo, antes da
 * lista — colocando quem só queria conferir ou editar em modo de criação sem
 * ter pedido. Agora o construtor só aparece depois do CTA.
 */
export function TemplatesPanel({ templates }: { templates: TemplateRow[] }) {
  const [criando, setCriando] = useState(false);
  const [excluindo, setExcluindo] = useState<string | null>(null);

  const ativos = templates.filter((template) => template.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {ativos} de {templates.length}{" "}
          {templates.length === 1 ? "modelo ativo" : "modelos ativos"}.
        </p>
        <Button onClick={() => setCriando(true)}>+ Criar novo modelo</Button>
      </div>

      <Card>
        <CardBody className="px-0 py-0">
          {templates.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-400">
              Nenhum modelo cadastrado ainda.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {templates.map((template) => (
                <li
                  key={template.id}
                  className={cn(
                    "px-5 py-4",
                    !template.isActive && "bg-slate-50/60",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {template.name}
                        </span>
                        {template.isActive ? (
                          <Badge tone="success">Ativo</Badge>
                        ) : (
                          <Badge tone="neutral">Inativo</Badge>
                        )}
                        {template.fieldCount === 0 ? (
                          <Badge tone="warning">Sem blocos</Badge>
                        ) : null}
                      </p>

                      {template.description ? (
                        <p className="mt-0.5 text-sm text-slate-500">
                          {template.description}
                        </p>
                      ) : null}

                      <code className="mt-1.5 block break-all font-mono text-xs text-slate-500">
                        {template.format ??
                          "defina os blocos para ver o formato"}
                      </code>

                      {template.optionalCount > 0 ? (
                        <p className="mt-1 text-xs text-slate-400">
                          {template.optionalCount}{" "}
                          {template.optionalCount === 1
                            ? "bloco opcional"
                            : "blocos opcionais"}{" "}
                          — não aparecem no formato acima
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <ButtonLink
                        href={`/gerador-de-nomes/modelos/${template.id}`}
                        size="sm"
                        variant="secondary"
                      >
                        Editar blocos
                      </ButtonLink>
                      <form action={duplicateTemplate}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <Button type="submit" size="sm" variant="ghost">
                          Duplicar
                        </Button>
                      </form>
                      <form action={toggleTemplate}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          // Ativar um modelo sem blocos deixaria o gerador com
                          // um formulário vazio. O servidor também recusa.
                          disabled={
                            !template.isActive && template.fieldCount === 0
                          }
                          title={
                            !template.isActive && template.fieldCount === 0
                              ? "Defina ao menos um bloco antes de ativar"
                              : undefined
                          }
                        >
                          {template.isActive ? "Desativar" : "Ativar"}
                        </Button>
                      </form>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setExcluindo(template.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </div>

                  {/* A confirmação abre na própria linha, e não num diálogo:
                      assim o nome do modelo que vai sumir continua à vista
                      enquanto se decide. */}
                  {excluindo === template.id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2.5">
                      <p className="min-w-0 flex-1 text-sm text-danger-900">
                        Excluir <strong>{template.name}</strong> e os{" "}
                        {template.fieldCount}{" "}
                        {template.fieldCount === 1 ? "bloco" : "blocos"} dele?
                        Os nomes já gerados pelo time não são afetados. Dá para
                        desfazer em Administração › Auditoria.
                      </p>
                      <form action={deleteTemplate}>
                        <input
                          type="hidden"
                          name="templateId"
                          value={template.id}
                        />
                        <Button type="submit" size="sm" variant="danger">
                          Excluir
                        </Button>
                      </form>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setExcluindo(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <NewTemplateDrawer open={criando} onClose={() => setCriando(false)} />
    </div>
  );
}

function NewTemplateDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    createTemplate,
    INITIAL_TEMPLATE_STATE,
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Novo modelo"
      description="Comece pelo nome. Os blocos vêm no passo seguinte, no construtor."
    >
      <form action={formAction} className="space-y-4">
        {state.status === "error" && state.message ? (
          <p
            role="alert"
            className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger-800"
          >
            {state.message}
          </p>
        ) : null}

        <Field
          label="Nome do modelo"
          htmlFor="template-name"
          required
          hint="Como aparece na escolha do gerador."
        >
          <Input
            id="template-name"
            name="name"
            placeholder="Ex.: Campanha do Meta Ads"
            maxLength={80}
            required
          />
        </Field>

        <Field
          label="Descrição"
          htmlFor="template-description"
          hint="Explica quando usar este modelo. Opcional, mas é o que evita alguém escolher o modelo errado."
        >
          <Input
            id="template-description"
            name="description"
            placeholder="Ex.: Campanhas de tráfego pago no Meta."
            maxLength={200}
          />
        </Field>

        <Button type="submit" disabled={isPending}>
          {isPending ? "Criando…" : "Criar e montar os blocos"}
        </Button>
      </form>
    </Drawer>
  );
}
