"use client";

import { useState } from "react";

import { NameGeneratorForm, type FormTemplate } from "./name-generator-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { BaseOptions } from "@/lib/modules/bases/registry";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

/**
 * Modelos primeiro, formulário depois.
 *
 * A tela abria direto num formulário com o primeiro modelo já escolhido — e
 * quem entrava preenchia esse, sem descobrir que havia outros. Ver os modelos
 * antes torna a escolha um ato consciente, e é ela que define o resultado
 * inteiro.
 */
export type HistoryItem = {
  id: string;
  templateName: string;
  generatedName: string;
  userName: string | null;
  createdAt: string;
};

export function GeneratorWorkspace({
  templates,
  formats,
  baseOptions,
  canManage,
  history = [],
}: {
  templates: FormTemplate[];
  formats: Record<string, string>;
  baseOptions: BaseOptions;
  canManage: boolean;
  history?: HistoryItem[];
}) {
  const [escolhido, setEscolhido] = useState<string | null>(
    // Com um modelo só, escolher não é escolha — abre direto no formulário.
    templates.length === 1 ? templates[0].id : null,
  );
  const [busca, setBusca] = useState("");

  const template = templates.find((item) => item.id === escolhido);

  if (template) {
    return (
      <Card>
        <CardHeader
          title={template.name}
          description={template.description ?? undefined}
          action={
            templates.length > 1 ? (
              <Button variant="ghost" onClick={() => setEscolhido(null)}>
                Trocar de modelo
              </Button>
            ) : null
          }
        />
        <CardBody>
          <NameGeneratorForm template={template} baseOptions={baseOptions} />
        </CardBody>
      </Card>
    );
  }

  const visiveis = templates.filter((item) =>
    matchesSearch(busca, item.name, item.description, formats[item.id]),
  );

  return (
    <div className="space-y-4">
      {templates.length > 4 ? (
        <Input
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar modelo…"
          aria-label="Buscar modelo"
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {visiveis.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setEscolhido(item.id)}
            className={cn(
              "flex flex-col rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition-colors",
              "hover:border-brand-300 hover:bg-brand-50/40",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
            )}
          >
            <span className="font-display text-sm font-semibold text-slate-900">
              {item.name}
            </span>
            {item.description ? (
              <span className="mt-0.5 text-sm text-slate-500">
                {item.description}
              </span>
            ) : null}
            <code className="mt-2 block break-all font-mono text-xs text-slate-500">
              {formats[item.id]}
            </code>
            <span className="mt-2 text-xs font-medium text-brand-600">
              Usar este modelo →
            </span>
          </button>
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Nenhum modelo encontrado para “{busca}”.
        </p>
      ) : null}

      {canManage ? (
        <p className="text-xs text-slate-500">
          Precisa de um formato novo?{" "}
          <ButtonLink
            href="/gerador-de-nomes/modelos"
            variant="ghost"
            size="sm"
            className="px-1"
          >
            Gerir modelos
          </ButtonLink>
        </p>
      ) : null}

      {/* Histórico Persistente do Time (Salvo no Banco) */}
      {history.length > 0 && (
        <Card className="mt-8">
          <CardHeader
            title="Últimos Nomes Gerados pela Equipe"
            description="Histórico real sincronizado no banco de dados para evitar duplicação no CRM."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Nome Gerado</th>
                  <th className="px-4 py-2.5 font-semibold">Modelo</th>
                  <th className="px-4 py-2.5 font-semibold">Gerado Por</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <code className="font-mono font-medium text-slate-900">
                        {item.generatedName}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {item.templateName}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {item.userName ?? "Equipe MedCof"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(item.generatedName);
                        }}
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-95"
                      >
                        Copiar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
