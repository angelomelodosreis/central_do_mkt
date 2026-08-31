import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader, SectionTitle } from "@/components/ui/card";
import type { AccessSummary } from "@/lib/modules/access/explain";
import { cn } from "@/lib/utils/cn";

/**
 * O que tudo isso significa junto.
 *
 * Existe por causa da pergunta que toda tela de permissão deveria responder e
 * quase nenhuma responde: "por que essa pessoa vê isso?". Com papel num cartão,
 * escopos noutro e herança implícita no meio, a resposta só existia na cabeça de
 * quem configurou — e sumia quando essa pessoa saía de férias.
 */
export function AccessSummaryCard({ summary }: { summary: AccessSummary }) {
  return (
    <Card className="border-brand-200 bg-brand-50/40">
      <CardHeader
        title="Resumo de acesso"
        description="O resultado de papel + escopo, em português."
      />
      <CardBody className="space-y-4">
        <div>
          <SectionTitle>Alcance</SectionTitle>
          <ul className="space-y-1.5">
            {summary.reachLines.map((linha) => (
              <li
                key={linha}
                className="flex gap-2 text-sm leading-relaxed text-slate-700"
              >
                <span aria-hidden className="text-brand-500">
                  •
                </span>
                <span>{linha}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Business Units que enxerga:{" "}
            <strong className="text-slate-700">
              {summary.businessUnitCount === "todas"
                ? "todas"
                : summary.businessUnitCount}
            </strong>
          </p>
        </div>

        <div>
          <SectionTitle>O que o papel permite</SectionTitle>
          <ul className="flex flex-wrap gap-1.5">
            {summary.modules.map((modulo) => (
              <li key={modulo.key}>
                <Badge
                  tone={
                    modulo.canEdit
                      ? "brand"
                      : modulo.canView
                        ? "neutral"
                        : "neutral"
                  }
                  className={cn(!modulo.canView && "opacity-40 line-through")}
                >
                  {modulo.label}
                  {modulo.canEdit ? " · edita" : modulo.canView ? " · vê" : ""}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Isto vem da matriz papel × módulo, editável em Permissões. Executar
            as próprias tarefas não depende dela — senão quem recebe trabalho
            ficaria sem como dar andamento.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
