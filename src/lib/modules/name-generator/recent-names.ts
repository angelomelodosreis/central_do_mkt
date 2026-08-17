/**
 * Lista de nomes gerados recentemente.
 *
 * Fica APENAS no navegador da pessoa, em `sessionStorage`:
 *   - sobrevive a recarregar a página;
 *   - some ao fechar a aba ou ao sair da plataforma;
 *   - nunca vai para o banco nem para a trilha de auditoria.
 *
 * A ferramenta é auxiliar na padronização, não um registro do que foi criado —
 * por isso não existe histórico permanente.
 */

const STORAGE_KEY = "central-do-marketing:nomes-recentes";

/** Quantos nomes mantemos à mão. Além disso vira ruído. */
const MAX_ITEMS = 15;

export type RecentName = {
  name: string;
  /** Modelo usado, para a pessoa se situar. Ex.: "Tag do ActiveCampaign" */
  templateName: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

export function readRecentNames(): RecentName[] {
  if (!isBrowser()) return [];

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is RecentName =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as RecentName).name === "string" &&
          typeof (item as RecentName).templateName === "string",
      )
      .slice(0, MAX_ITEMS);
  } catch {
    // Dado corrompido não deve quebrar a tela.
    return [];
  }
}

/**
 * Adiciona um nome ao topo da lista, sem repetir.
 * Retorna a lista já atualizada, para o componente usar direto.
 */
export function addRecentName(entry: RecentName): RecentName[] {
  const current = readRecentNames().filter((item) => item.name !== entry.name);
  const updated = [entry, ...current].slice(0, MAX_ITEMS);

  if (isBrowser()) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Sem espaço ou modo restrito: a lista simplesmente não persiste.
    }
  }

  return updated;
}

export function clearRecentNames(): void {
  if (!isBrowser()) return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignorado de propósito.
  }
}
