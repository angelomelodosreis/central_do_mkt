import { PersonCard, type PersonCardData } from "./person-card";
import { EmptyState } from "@/components/ui/card";

export type SquadPerson = PersonCardData & {
  /** Senioridade do cargo — é o que ordena o bloco de cima para baixo. */
  jobTitleOrder?: number;
};

/**
 * O squad de uma BU, agrupado por time.
 *
 * Agrupar por time é o que torna a visualização útil: o squad de Dermatologia
 * não é uma lista de nomes, é "quem do Planejamento, quem do Design e quem do
 * Copy atende esta BU". Uma lista alfabética esconderia exatamente isso.
 *
 * Quem não tem time aparece num bloco próprio no fim, e não é omitido: pessoa
 * vinculada à BU sem time é um cadastro pela metade que alguém precisa ver para
 * corrigir.
 */
export function SquadView({
  people,
  emptyTitle = "Nenhuma pessoa neste squad",
  emptyDescription,
}: {
  people: SquadPerson[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (people.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const blocos = agruparPorTime(people);
  const semTime = people.filter((person) => person.positions.length === 0);

  return (
    <div className="space-y-5">
      {blocos.map((bloco) => (
        <section key={bloco.teamId}>
          <h3 className="mb-2 flex flex-wrap items-baseline gap-2">
            <span className="font-display text-sm font-semibold text-slate-900">
              {bloco.teamName}
            </span>
            <span className="text-xs text-slate-500">
              {bloco.people.length === 1
                ? "1 pessoa"
                : `${bloco.people.length} pessoas`}
            </span>
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {bloco.people.map((person) => (
              <PersonCard
                key={`${bloco.teamId}-${person.userId}`}
                person={person}
                hideTeamId={bloco.teamId}
              />
            ))}
          </div>
        </section>
      ))}

      {semTime.length > 0 ? (
        <section>
          <h3 className="mb-2 font-display text-sm font-semibold text-amber-800">
            Fora da estrutura organizacional
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {semTime.map((person) => (
              <PersonCard key={person.userId} person={person} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

type Bloco = { teamId: string; teamName: string; people: SquadPerson[] };

/**
 * Uma pessoa em dois times aparece nos DOIS blocos.
 *
 * É intencional e é a razão de o agrupamento existir: a designer que atende
 * Dermatologia pelo Design e também coordena Social precisa aparecer nas duas
 * frentes. Escolher um time por pessoa daria um organograma mais limpo e menos
 * verdadeiro.
 */
function agruparPorTime(people: SquadPerson[]): Bloco[] {
  const mapa = new Map<string, Bloco>();

  for (const person of people) {
    for (const position of person.positions) {
      const bloco = mapa.get(position.teamId) ?? {
        teamId: position.teamId,
        teamName: position.teamName,
        people: [],
      };
      bloco.people.push(person);
      mapa.set(position.teamId, bloco);
    }
  }

  for (const bloco of mapa.values()) {
    bloco.people.sort(
      (a, b) =>
        Number(b.isLead) - Number(a.isLead) ||
        (a.jobTitleOrder ?? 999) - (b.jobTitleOrder ?? 999) ||
        a.name.localeCompare(b.name, "pt-BR"),
    );
  }

  return [...mapa.values()].sort((a, b) =>
    a.teamName.localeCompare(b.teamName, "pt-BR"),
  );
}
