"use client";

import { useMemo, useRef, useState, type ReactNode } from "react";

import { deleteUser, resetTwoFactor, saveUserFile } from "./actions";
import { approveUser, reactivateUser, suspendUser } from "../actions";
import { Avatar } from "@/components/org/person-card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, Row } from "@/components/ui/card";
import {
  Select,
  type SelectGroup,
  type SelectOption,
} from "@/components/ui/select";
import {
  ORG_UNIT_KIND_PLURALS,
  USER_ROLES,
  USER_ROLE_LABELS,
  type OrgUnitKind,
  type ScopeType,
  type UserRole,
  type UserStatus,
} from "@/lib/db/schema";
import type { ResolvedGrant } from "@/lib/modules/access/explain";
import { formatDate } from "@/lib/utils/format";

export type OrgUnitOption = {
  id: string;
  name: string;
  kind: OrgUnitKind;
  /** "Marketing › Conteúdo › Design" */
  path: string;
  /** A área no topo da árvore desta unidade. Uma área é a própria área. */
  areaId: string;
};

export type UserFileData = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole;
  isSuperAdmin: boolean;
  /** Se a pessoa já registrou o aplicativo autenticador. */
  twoFactorEnabled: boolean;
  jobTitleId: string | null;
  createdAt: string;
  teams: Array<{ teamId: string }>;
  squads: Array<{ squadId: string }>;
  grants: ResolvedGrant[];
  requestedBUs?: Array<{
    businessUnitId: string;
    label: string;
    code: string | null;
    note: string | null;
  }>;
};

const DESCRICAO_DO_PAPEL: Record<UserRole, string> = {
  admin: "Configura a ferramenta: permissões, domínios, bases e auditoria.",
  leader: "Define os parâmetros que o time usa e delega tarefas.",
  editor: "Produz: documentação, personas, calendário e planejamento.",
  member: "Consulta e executa as próprias tarefas.",
};

/** O tipo, em uma palavra, para caber na pastilha ao lado do nome. */
const ESCOPO_CURTO: Record<ScopeType, string> = {
  organization: "tudo",
  org_unit: "time",
  division: "divisão",
  business_unit: "BU",
  squad: "squad",
};

const TIPOS_DE_ESCOPO: Array<{ value: ScopeType; label: string }> = [
  { value: "org_unit", label: "Time, subárea ou área" },
  { value: "division", label: "Divisão de negócio" },
  { value: "business_unit", label: "Business Unit" },
  { value: "squad", label: "Squad" },
  { value: "organization", label: "Toda a organização" },
];

/** "org_unit:tmb_123" — como um escopo viaja entre o rascunho e o servidor. */
function chaveDoEscopo(scopeType: string, scopeId: string | null): string {
  return `${scopeType}:${scopeId ?? ""}`;
}

type Rascunho = {
  jobTitleId: string;
  role: UserRole;
  isSuperAdmin: boolean;
  teamIds: string[];
  squadIds: string[];
  escopos: string[];
};

/** Compara ignorando a ordem — marcar A e depois B é o mesmo que B e depois A. */
function mesmaCoisa(a: Rascunho, b: Rascunho): boolean {
  const normalizar = (r: Rascunho) =>
    JSON.stringify({
      ...r,
      teamIds: [...r.teamIds].sort(),
      squadIds: [...r.squadIds].sort(),
      escopos: [...r.escopos].sort(),
    });
  return normalizar(a) === normalizar(b);
}

/**
 * A ficha de uma pessoa: um cartão, cinco linhas, um botão de salvar.
 *
 * Cada atributo tinha o próprio "Salvar", e trocar cargo, papel, time e squad
 * de alguém eram quatro gravações em sequência — quatro recarregamentos, e
 * nenhuma chance de desistir no meio. Agora a tela inteira é um rascunho: as
 * pastilhas mudam na hora, nada vai para o banco antes do "Salvar", e
 * "Descartar" devolve tudo ao que o servidor mandou.
 */
export function UserFile({
  person,
  jobTitles,
  orgUnits,
  divisions,
  businessUnits,
  squads,
  isSelf,
}: {
  person: UserFileData;
  jobTitles: Array<{ id: string; name: string; teamIds: string[] }>;
  orgUnits: OrgUnitOption[];
  divisions: Array<{ id: string; name: string }>;
  businessUnits: Array<{ id: string; label: string }>;
  squads: Array<{ id: string; label: string }>;
  isSelf: boolean;
}) {
  const doServidor = useMemo<Rascunho>(
    () => ({
      jobTitleId: person.jobTitleId ?? "",
      role: person.role,
      isSuperAdmin: person.isSuperAdmin,
      teamIds: person.teams.map((time) => time.teamId),
      squadIds: person.squads.map((squad) => squad.squadId),
      escopos: person.grants.map((grant) =>
        chaveDoEscopo(grant.scopeType, grant.scopeId),
      ),
    }),
    [person],
  );

  const [rascunho, setRascunho] = useState(doServidor);

  /**
   * Reata com o servidor quando ele manda dado novo.
   *
   * Depois de salvar, o Next revalida e a página chega com os valores gravados.
   * Sem isto o rascunho continuaria sendo o da renderização anterior e a tela
   * diria "não salvo" logo depois de ter salvado.
   */
  const ultimoDoServidor = useRef(doServidor);
  if (ultimoDoServidor.current !== doServidor) {
    ultimoDoServidor.current = doServidor;
    if (!mesmaCoisa(rascunho, doServidor)) setRascunho(doServidor);
  }

  const alterado = !mesmaCoisa(rascunho, doServidor);

  function mudar(parte: Partial<Rascunho>) {
    setRascunho((atual) => ({ ...atual, ...parte }));
  }

  /** Marca ou desmarca um item de uma das listas, sempre sobre o estado atual. */
  function alternar(campo: "teamIds" | "squadIds" | "escopos", valor: string) {
    setRascunho((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(valor)
        ? atual[campo].filter((item) => item !== valor)
        : [...atual[campo], valor],
    }));
  }

  const nomeDoTime = new Map(orgUnits.map((unidade) => [unidade.id, unidade]));
  const nomeDoSquad = new Map(squads.map((squad) => [squad.id, squad.label]));

  /**
   * A cascata Área → Time → Cargo.
   *
   * A área não é um atributo da pessoa: é o filtro que faz o seletor de time
   * mostrar só o que interessa. Guardá-la separado seria uma terceira fonte
   * para uma informação que a árvore já tem — a área de alguém é a área dos
   * times dela.
   *
   * Começa na área do primeiro time da pessoa, e não em branco: abrir a ficha
   * de quem já está no Design com o filtro zerado obrigaria a escolher
   * "Marketing" para ver o time que já está ali na tela.
   */
  const areas = orgUnits.filter((unidade) => unidade.kind === "area");
  const areaInicial =
    nomeDoTime.get(rascunho.teamIds[0] ?? "")?.areaId ?? areas[0]?.id ?? "";
  const [areaFiltro, setAreaFiltro] = useState(areaInicial);

  const timesDaArea = orgUnits.filter(
    (unidade) => unidade.areaId === areaFiltro,
  );

  /**
   * Os cargos que existem nos times da pessoa.
   *
   * Cargo sem nenhum time vinculado vale em qualquer um — é o padrão, e é o
   * que "Estagiário" deve continuar sendo. Pessoa sem time nenhum vê a lista
   * inteira, porque filtrar por um vínculo que não existe esconderia tudo.
   */
  const cargosDisponiveis =
    rascunho.teamIds.length === 0
      ? jobTitles
      : jobTitles.filter(
          (title) =>
            title.teamIds.length === 0 ||
            title.teamIds.some((id) => rascunho.teamIds.includes(id)),
        );

  // Um cargo que deixou de valer nos times atuais continua visível enquanto
  // for o cargo da pessoa: sumir com ele faria o seletor mentir sobre o que
  // está gravado.
  const cargoAtualForaDaLista =
    rascunho.jobTitleId &&
    !cargosDisponiveis.some((title) => title.id === rascunho.jobTitleId)
      ? jobTitles.find((title) => title.id === rascunho.jobTitleId)
      : null;

  return (
    <form action={saveUserFile}>
      <input type="hidden" name="userId" value={person.id} />
      <input type="hidden" name="jobTitleId" value={rascunho.jobTitleId} />
      <input type="hidden" name="role" value={rascunho.role} />
      <input
        type="hidden"
        name="isSuperAdmin"
        value={rascunho.isSuperAdmin ? "1" : "0"}
      />
      {rascunho.teamIds.map((id) => (
        <input key={id} type="hidden" name="teamIds" value={id} />
      ))}
      {rascunho.squadIds.map((id) => (
        <input key={id} type="hidden" name="squadIds" value={id} />
      ))}
      {rascunho.escopos.map((chave) => (
        <input key={chave} type="hidden" name="escopos" value={chave} />
      ))}

      <Card>
        <Cabecalho person={person} isSelf={isSelf} alterado={alterado} />

        <Row
          label="Cargo"
          hint={
            rascunho.teamIds.length > 0
              ? "Só os cargos que existem nos times acima."
              : undefined
          }
        >
          <div className="max-w-sm">
            <Select
              value={rascunho.jobTitleId}
              onValueChange={(valor) => mudar({ jobTitleId: valor })}
              ariaLabel="Cargo"
              size="sm"
              options={[
                { value: "", label: "Sem cargo definido" },
                ...cargosDisponiveis.map((title) => ({
                  value: title.id,
                  label: title.name,
                })),
                ...(cargoAtualForaDaLista
                  ? [
                      {
                        value: cargoAtualForaDaLista.id,
                        label: cargoAtualForaDaLista.name,
                        hint: "não existe nos times atuais",
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </Row>

        <Row label="Papel no sistema">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full max-w-sm">
              <Select
                value={rascunho.role}
                onValueChange={(valor) => mudar({ role: valor as UserRole })}
                disabled={isSelf}
                ariaLabel="Papel no sistema"
                size="sm"
                options={USER_ROLES.map((role) => ({
                  value: role,
                  label: USER_ROLE_LABELS[role],
                  hint: DESCRICAO_DO_PAPEL[role],
                }))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={rascunho.isSuperAdmin}
                disabled={isSelf}
                onChange={(evento) =>
                  mudar({ isSuperAdmin: evento.target.checked })
                }
                className="size-4 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
              />
              Administra a plataforma
            </label>
          </div>
        </Row>

        <Row label="Área e time">
          <div className="space-y-2">
            <div className="w-full max-w-sm">
              <Select
                value={areaFiltro}
                onValueChange={setAreaFiltro}
                ariaLabel="Área"
                size="sm"
                placeholder="Escolha a área…"
                options={areas.map((area) => ({
                  value: area.id,
                  label: area.name,
                }))}
              />
            </div>
            <Pastilhas
              itens={rascunho.teamIds.map((id) => ({
                chave: id,
                titulo: nomeDoTime.get(id)?.name ?? "Removido da estrutura",
                detalhe: nomeDoTime.get(id)?.path,
              }))}
              aoTirar={(id) => alternar("teamIds", id)}
              seletor={
                <>
                  <Select
                    // Remontar ao trocar de área: a lista muda de conteúdo, e
                    // sem isto o índice em foco apontaria para o time errado.
                    key={areaFiltro}
                    trigger="inline"
                    placeholder="+ Adicionar time"
                    ariaLabel="Times da área"
                    values={rascunho.teamIds}
                    onToggleValue={(id) => alternar("teamIds", id)}
                    groups={agruparPorNivel(timesDaArea)}
                  />
                  {/* A área sempre está na lista — dá para pertencer direto a
                      ela, que é o caso de quem dirige a área. O aviso é para a
                      área recém-criada, em que só ela mesma aparece. */}
                  {timesDaArea.length === 1 ? (
                    <span className="text-xs text-slate-500">
                      Esta área ainda não tem times. Cadastre em Administração ›
                      Organização.
                    </span>
                  ) : null}
                </>
              }
            />
          </div>
        </Row>

        <Row label="Squads">
          <Pastilhas
            itens={rascunho.squadIds.map((id) => ({
              chave: id,
              titulo: nomeDoSquad.get(id) ?? "Squad removido",
            }))}
            aoTirar={(id) => alternar("squadIds", id)}
            seletor={
              <Select
                trigger="inline"
                placeholder="+ Adicionar"
                ariaLabel="Squads"
                values={rascunho.squadIds}
                onToggleValue={(id) => alternar("squadIds", id)}
                options={squads.map((squad) => ({
                  value: squad.id,
                  label: squad.label,
                }))}
              />
            }
          />
        </Row>

        <Row label="Escopo de responsabilidade">
          <Escopos
            escolhidos={rascunho.escopos}
            aoAlternar={(chave) => alternar("escopos", chave)}
            orgUnits={orgUnits}
            divisions={divisions}
            businessUnits={businessUnits}
            squads={squads}
          />
        </Row>

        <Row label="Verificação em duas etapas">
          <SegundoFator person={person} />
        </Row>

        <Rodape
          person={person}
          isSelf={isSelf}
          alterado={alterado}
          aoDescartar={() => setRascunho(doServidor)}
        />
      </Card>
    </form>
  );
}

/**
 * As escolhas já feitas, em pastilha, com o seletor no fim da mesma linha.
 *
 * Sem frase de estado vazio: "Fora de todos os squads" ao lado de um "+
 * Adicionar" dizia em oito palavras o que a ausência de pastilhas já diz.
 */
function Pastilhas({
  itens,
  aoTirar,
  seletor,
}: {
  itens: Array<{ chave: string; titulo: string; detalhe?: string }>;
  aoTirar: (chave: string) => void;
  seletor: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {itens.map((item) => (
        <span
          key={item.chave}
          className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-sm"
          title={item.detalhe}
        >
          <span className="truncate text-slate-900">{item.titulo}</span>
          <button
            type="button"
            onClick={() => aoTirar(item.chave)}
            aria-label={`Tirar ${item.titulo}`}
            className="rounded px-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </span>
      ))}
      {seletor}
    </div>
  );
}

/** Agrupa o seletor por nível, com o nome que as pessoas usam. */
function agruparPorNivel(unidades: OrgUnitOption[]): SelectGroup[] {
  const ordem: OrgUnitKind[] = ["team", "subarea", "area"];
  return ordem
    .map((kind) => ({
      label: ORG_UNIT_KIND_PLURALS[kind],
      options: unidades
        .filter((unidade) => unidade.kind === kind)
        .map((unidade) => ({
          value: unidade.id,
          label: unidade.name,
          hint: unidade.path,
        })),
    }))
    .filter((grupo) => grupo.options.length > 0);
}

/**
 * O escopo é de dois passos — sobre o quê, e qual — mas os dois cabem numa
 * linha, e o segundo aceita marcar vários de uma vez: quem responde por cinco
 * BUs marca as cinco sem fechar a lista.
 */
function Escopos({
  escolhidos,
  aoAlternar,
  orgUnits,
  divisions,
  businessUnits,
  squads,
}: {
  escolhidos: string[];
  aoAlternar: (chave: string) => void;
  orgUnits: OrgUnitOption[];
  divisions: Array<{ id: string; name: string }>;
  businessUnits: Array<{ id: string; label: string }>;
  squads: Array<{ id: string; label: string }>;
}) {
  const [tipo, setTipo] = useState<ScopeType>("org_unit");

  const alvos: Record<ScopeType, SelectOption[]> = {
    organization: [],
    org_unit: orgUnits.map((unidade) => ({
      value: unidade.id,
      label: unidade.name,
      hint: unidade.path,
    })),
    division: divisions.map((division) => ({
      value: division.id,
      label: division.name,
    })),
    business_unit: businessUnits.map((unit) => ({
      value: unit.id,
      label: unit.label,
    })),
    squad: squads.map((squad) => ({ value: squad.id, label: squad.label })),
  };

  const rotulos = new Map<string, string>([
    ["organization:", "Toda a organização"],
    ...(Object.keys(alvos) as ScopeType[]).flatMap((chave) =>
      alvos[chave].map(
        (option) =>
          [chaveDoEscopo(chave, option.value), option.label] as [
            string,
            string,
          ],
      ),
    ),
  ]);

  // Os do tipo escolhido, para o seletor múltiplo marcar o que já existe.
  const doTipo = escolhidos
    .filter((chave) => chave.startsWith(`${tipo}:`))
    .map((chave) => chave.slice(tipo.length + 1));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {escolhidos.map((chave) => (
        <span
          key={chave}
          className="inline-flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white py-1 pl-2.5 pr-1 text-sm"
        >
          <span className="truncate text-slate-900">
            {rotulos.get(chave) ?? "Removido"}
          </span>
          <span className="shrink-0 text-xs text-slate-500">
            {ESCOPO_CURTO[chave.split(":")[0] as ScopeType]}
          </span>
          <button
            type="button"
            onClick={() => aoAlternar(chave)}
            aria-label={`Tirar ${rotulos.get(chave) ?? chave}`}
            className="rounded px-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </span>
      ))}

      <div className="flex items-center gap-1.5">
        <div className="w-44">
          <Select
            value={tipo}
            onValueChange={(valor) => setTipo(valor as ScopeType)}
            ariaLabel="Responsável por qual tipo"
            size="sm"
            options={TIPOS_DE_ESCOPO}
          />
        </div>
        {tipo === "organization" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={escolhidos.includes("organization:")}
            onClick={() => aoAlternar("organization:")}
          >
            + Adicionar
          </Button>
        ) : (
          <Select
            // Remontar ao trocar o tipo: sem isso a lista muda de conteúdo
            // mantendo marcados ids do tipo anterior.
            key={tipo}
            trigger="inline"
            placeholder="+ Adicionar"
            ariaLabel="Sobre o quê"
            values={doTipo}
            onToggleValue={(valor) => aoAlternar(chaveDoEscopo(tipo, valor))}
            options={alvos[tipo]}
          />
        )}
      </div>
    </div>
  );
}

function Cabecalho({
  person,
  isSelf,
  alterado,
}: {
  person: UserFileData;
  isSelf: boolean;
  alterado: boolean;
}) {
  // Estes botões mandam o MESMO formulário para outro destino, então clicar num
  // deles com o rascunho aberto jogaria fora o que ainda não foi salvo — sem
  // avisar. Enquanto houver alteração pendente, eles esperam.
  const espera = alterado
    ? "Salve ou descarte as alterações primeiro"
    : undefined;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={person.name} />
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-slate-900">
            {person.name}
            <StatusBadge status={person.status} />
          </h1>
          <p className="truncate text-sm text-slate-500">{person.email}</p>
        </div>
      </div>

      {person.requestedBUs &&
        person.requestedBUs.length > 0 &&
        person.status === "pending" && (
          <div className="w-full rounded-xl border border-brand-200 bg-brand-50/60 p-3.5 text-xs text-brand-950">
            <div className="flex items-center gap-1.5 font-semibold text-brand-900">
              <span>
                ✨ BUs solicitadas no onboarding ({person.requestedBUs.length}):
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {person.requestedBUs.map((bu) => (
                <span
                  key={bu.businessUnitId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-2xs"
                >
                  <span>{bu.label}</span>
                  <code className="font-mono text-[10px] text-brand-700">
                    {bu.code ?? `MEDCOF_${bu.businessUnitId}`}
                  </code>
                </span>
              ))}
            </div>
            {person.requestedBUs[0]?.note && (
              <p className="mt-2 text-slate-600 italic">
                &ldquo;{person.requestedBUs[0].note}&rdquo;
              </p>
            )}
            <p className="mt-2 text-[11px] text-brand-700 font-medium">
              💡 Ao aprovar este cadastro, o acesso a essas{" "}
              {person.requestedBUs.length} Business Units será concedido
              automaticamente.
            </p>
          </div>
        )}

      {/* Aprovar, reativar e suspender são decisões sobre a CONTA, não
          atributos dela: valem no clique e não esperam o "Salvar". Por isso
          são `formAction` — o mesmo formulário, outro destino. */}
      <div className="flex shrink-0 flex-wrap gap-2">
        {person.status === "pending" ? (
          <Button
            type="submit"
            formAction={approveUser}
            variant="primary"
            disabled={alterado}
            title={espera}
          >
            Aprovar acesso
          </Button>
        ) : null}
        {person.status === "suspended" ? (
          <Button
            type="submit"
            formAction={reactivateUser}
            disabled={alterado}
            title={espera}
          >
            Reativar
          </Button>
        ) : null}
        {/* Ninguém se suspende: com um administrador só, isso trancaria a
            plataforma para fora dela mesma. O servidor também recusa. */}
        {person.status === "active" && !isSelf ? (
          <Button
            type="submit"
            formAction={suspendUser}
            variant="ghost"
            disabled={alterado}
            title={espera}
          >
            Suspender
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Situação do segundo fator, e o botão que o redefine.
 *
 * Fica na ficha e não numa tela própria porque a pergunta só aparece junto com
 * a pessoa: "fulano perdeu o celular". A confirmação em dois passos existe
 * porque redefinir DERRUBA as sessões dela — quem clicar sem querer tira
 * alguém do meio do trabalho.
 */
function SegundoFator({ person }: { person: UserFileData }) {
  const [confirmando, setConfirmando] = useState(false);

  if (!person.twoFactorEnabled) {
    return (
      <p className="text-sm text-slate-500">
        Ainda não cadastrou o aplicativo. Vai cadastrar no próximo acesso.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-sm text-slate-700">Aplicativo cadastrado.</p>
        {confirmando ? null : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmando(true)}
          >
            Redefinir
          </Button>
        )}
      </div>

      {confirmando ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-slate-700">
            Redefinir apaga o cadastro do aplicativo e encerra as sessões
            abertas de {person.name}. A pessoa entra pelo Google e cadastra o
            aplicativo de novo.
          </p>
          <Button
            type="submit"
            formAction={resetTwoFactor}
            size="sm"
            variant="secondary"
          >
            Redefinir
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * O pé da ficha: quando entrou, o que fazer com o que mudou, e a exclusão.
 *
 * Salvar e descartar só aparecem quando há o que salvar — um botão permanente
 * em cinza é indistinguível de um desabilitado, e some quando importa.
 */
function Rodape({
  person,
  isSelf,
  alterado,
  aoDescartar,
}: {
  person: UserFileData;
  isSelf: boolean;
  alterado: boolean;
  aoDescartar: () => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="border-t border-slate-200 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Cadastrada em {formatDate(new Date(person.createdAt))}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {alterado ? (
            <>
              <Button type="button" variant="ghost" onClick={aoDescartar}>
                Descartar
              </Button>
              <Button type="submit" variant="primary">
                Salvar alterações
              </Button>
            </>
          ) : isSelf ? null : (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmando(true)}
            >
              Excluir pessoa
            </Button>
          )}
        </div>
      </div>

      {confirmando && !alterado ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2">
          <p className="min-w-0 flex-1 text-sm text-danger-900">
            Excluir <strong>{person.name}</strong> apaga a conta, os vínculos e
            o escopo. As tarefas abertas voltam para a fila do time. Não dá para
            desfazer — suspender guarda o histórico.
          </p>
          <Button
            type="submit"
            formAction={deleteUser}
            size="sm"
            variant="danger"
          >
            Excluir
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirmando(false)}
          >
            Cancelar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
