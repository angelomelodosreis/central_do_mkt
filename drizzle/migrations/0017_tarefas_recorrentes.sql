-- Tarefas recorrentes.
--
-- O molde não é uma tarefa: é a regra que produz tarefas. Cada ocorrência
-- vira uma linha em `task`, com dono, situação e histórico próprios, porque a
-- pergunta que o time faz é "fiz a desta semana?" — e uma linha só que muda
-- de estado toda semana não responde isso nem deixa rastro de quando falhou.

CREATE TABLE `task_recurrence` (
  `id` text PRIMARY KEY NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `priority` text DEFAULT 'normal' NOT NULL,
  `assignee_id` text,
  `assigned_team_id` text REFERENCES `team`(`id`) ON DELETE cascade,
  `business_unit_id` text REFERENCES `business_unit`(`id`) ON DELETE set null,
  `frequency` text NOT NULL,
  `weekday` integer DEFAULT 1 NOT NULL,
  `day_of_month` integer DEFAULT 1 NOT NULL,
  `due_in_days` integer DEFAULT 0 NOT NULL,
  `is_active` integer DEFAULT 1 NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `task_recurrence_active_idx` ON `task_recurrence` (`is_active`);
--> statement-breakpoint
CREATE INDEX `task_recurrence_assignee_idx` ON `task_recurrence` (`assignee_id`);
--> statement-breakpoint

-- A ligação da tarefa gerada com o molde. A chave única sobre o par é o que
-- impede a mesma ocorrência nascer duas vezes: sem ela, duas abas abertas na
-- sexta gerariam duas tarefas idênticas.
--
-- Em SQLite, um índice único ignora linhas em que qualquer coluna é NULL — o
-- que aqui é exatamente o desejado: toda tarefa avulsa tem as duas colunas
-- vazias e nenhuma delas colide com outra.
ALTER TABLE `task` ADD COLUMN `recurrence_id` text;
--> statement-breakpoint
ALTER TABLE `task` ADD COLUMN `occurrence_date` integer;
--> statement-breakpoint
CREATE UNIQUE INDEX `task_occurrence_unique` ON `task` (`recurrence_id`, `occurrence_date`);
