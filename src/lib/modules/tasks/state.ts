import { TASK_STATUS_LABELS, type TaskStatus } from "@/lib/db/schema";

/**
 * Como a pessoa se relaciona com UMA tarefa.
 *
 * O modelo inteiro deste módulo depende desta distinção: quem EXECUTA e quem
 * DELEGOU olham para a mesma tarefa com perguntas opostas. "Começar", "Concluir"
 * e "Travar" são respostas de quem está fazendo — oferecê-las a quem delegou é
 * convidá-lo a marcar como concluído um trabalho que ele não fez.
 *
 * As duas coisas não são exclusivas: quem cria uma tarefa para si mesmo é os
 * dois ao mesmo tempo, e nesse caso vê tudo.
 */
export type TaskRelation = {
  /** É o dono da execução. */
  isAssignee: boolean;
  /** Passou a tarefa para alguém (ou pode gerir a de outros). */
  isDelegator: boolean;
  /** A tarefa está aberta para um time seu e ainda não tem dono. */
  canClaim: boolean;
};

/**
 * Ações operacionais — de quem executa.
 *
 * Mudam o ANDAMENTO do trabalho.
 */
export const EXECUTION_ACTIONS = [
  "claim",
  "start",
  "block",
  "unblock",
  "complete",
] as const;
export type ExecutionAction = (typeof EXECUTION_ACTIONS)[number];

/**
 * Ações de gestão — de quem delegou.
 *
 * Mudam o QUE é a tarefa, para quem ela vai e se ela ainda existe.
 */
export const MANAGEMENT_ACTIONS = [
  "edit",
  "reassign",
  "reopen",
  "cancel",
  "delete",
] as const;
export type ManagementAction = (typeof MANAGEMENT_ACTIONS)[number];

export type TaskAction = ExecutionAction | ManagementAction;

export const ACTION_LABELS: Record<TaskAction, string> = {
  claim: "Assumir",
  start: "Começar",
  block: "Travar",
  unblock: "Destravar",
  complete: "Concluir",
  edit: "Editar",
  reassign: "Alterar responsável",
  reopen: "Reabrir",
  cancel: "Cancelar",
  delete: "Excluir",
};

const ENCERRADOS: TaskStatus[] = ["done", "cancelled"];

/**
 * As ações de EXECUÇÃO possíveis, dado o estado atual.
 *
 * A máquina de estados vive aqui, num lugar só, e é consultada tanto pela tela
 * quanto pelo servidor. Enquanto cada botão decidia por conta própria, existiam
 * combinações incoerentes na interface — "Começar" numa tarefa concluída,
 * "Travar" numa cancelada — que o servidor aceitava sem reclamar.
 */
export function executionActionsFor(
  status: TaskStatus,
  relation: TaskRelation,
): ExecutionAction[] {
  if (relation.canClaim) return ["claim"];
  if (!relation.isAssignee) return [];

  switch (status) {
    case "todo":
      return ["start", "complete", "block"];
    case "in_progress":
      return ["complete", "block"];
    case "blocked":
      return ["unblock", "complete"];
    case "done":
    case "cancelled":
      // Reabrir é decisão de quem delegou: significa "isto não estava pronto".
      // Quem executou já disse o que tinha a dizer ao concluir.
      return [];
  }
}

/** As ações de GESTÃO possíveis, dado o estado atual. */
export function managementActionsFor(
  status: TaskStatus,
  relation: TaskRelation,
): ManagementAction[] {
  if (!relation.isDelegator) return [];

  if (ENCERRADOS.includes(status)) {
    return ["reopen", "delete"];
  }

  return ["edit", "reassign", "cancel", "delete"];
}

/**
 * Uma transição de situação é válida?
 *
 * Chamada pelo servidor antes de gravar. A tela esconder o botão é conveniência
 * visual; é esta função que impede um POST adulterado marcar como concluída uma
 * tarefa cancelada.
 */
export function canTransition(
  from: TaskStatus,
  to: TaskStatus,
  relation: TaskRelation,
): boolean {
  if (from === to) return false;

  const execucao = executionActionsFor(from, relation);
  const gestao = managementActionsFor(from, relation);

  switch (to) {
    case "in_progress":
      return (
        execucao.includes("start") ||
        execucao.includes("unblock") ||
        // Assumir uma tarefa de unidade É começá-la: quem pega o trabalho
        // aberto passa a ser o dono e a tarefa sai de "a fazer". Sem esta
        // linha, o botão "Assumir" era recusado em silêncio — `canClaim`
        // devolve só "claim", e a transição não reconhecia essa ação.
        execucao.includes("claim")
      );
    case "blocked":
      return execucao.includes("block");
    case "done":
      return execucao.includes("complete");
    case "cancelled":
      return gestao.includes("cancel");
    case "todo":
      return gestao.includes("reopen");
  }
}

/** A tarefa passou do prazo e ainda não foi encerrada. */
export function isOverdue(
  dueDate: Date | string | null,
  status: TaskStatus,
  now: number = Date.now(),
): boolean {
  if (!dueDate || ENCERRADOS.includes(status)) return false;
  const prazo =
    typeof dueDate === "string"
      ? new Date(dueDate).getTime()
      : dueDate.getTime();
  return prazo < now;
}

export function isClosed(status: TaskStatus): boolean {
  return ENCERRADOS.includes(status);
}

export { TASK_STATUS_LABELS };
