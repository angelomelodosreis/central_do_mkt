-- Reestruturação: Planejamento passa a ser o módulo guarda-chuva da BU.
--
-- Três mudanças estruturais em uma migração porque são inseparáveis:
--
-- 1. ORGANOGRAMA (team, job_title, user.team_id/job_title_id) — sem time e
--    cargo não há como endereçar tarefa a "time de Design" nem saber quem é
--    coordenador.
-- 2. ESCOPO POR BU (business_unit_member) — o dono único de BU sai de cena;
--    é o vínculo pessoa × BU que recorta o que cada analista vê.
-- 3. CONTEÚDO DA BU (documentation_page.scope/business_unit_id, strategy_goal,
--    task, attachment) — o que o analista produz dentro da BU, incluindo a
--    escolha entre documento interno e biblioteca geral.

CREATE TABLE `business_unit_member` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL,
	`user_id` text NOT NULL,
	`is_lead` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_unit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `business_unit_member_user_idx` ON `business_unit_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `business_unit_member_unit_idx` ON `business_unit_member` (`business_unit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `business_unit_member_unique` ON `business_unit_member` (`business_unit_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `job_title` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `job_title_team_idx` ON `job_title` (`team_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `job_title_slug_unique` ON `job_title` (`team_id`,`slug`);--> statement-breakpoint
CREATE TABLE `team` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_slug_unique` ON `team` (`slug`);--> statement-breakpoint
CREATE INDEX `team_is_active_idx` ON `team` (`is_active`);--> statement-breakpoint
CREATE TABLE `strategy_goal` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`metric` text NOT NULL,
	`month` text NOT NULL,
	`product_id` text,
	`target` real,
	`actual` real,
	`note` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `strategy_cycle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `strategy_product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `strategy_goal_cycle_idx` ON `strategy_goal` (`cycle_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_goal_unique` ON `strategy_goal` (`cycle_id`,`metric`,`month`,`product_id`);--> statement-breakpoint
CREATE TABLE `task` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`due_date` integer,
	`assignee_id` text,
	`assigned_team_id` text,
	`business_unit_id` text,
	`blocked_reason` text,
	`created_by` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`assigned_team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_unit`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `task_assignee_idx` ON `task` (`assignee_id`);--> statement-breakpoint
CREATE INDEX `task_assigned_team_idx` ON `task` (`assigned_team_id`);--> statement-breakpoint
CREATE INDEX `task_status_idx` ON `task` (`status`);--> statement-breakpoint
CREATE INDEX `task_business_unit_idx` ON `task` (`business_unit_id`);--> statement-breakpoint
CREATE TABLE `attachment` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_type` text NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`url` text,
	`storage_provider` text,
	`storage_key` text,
	`mime_type` text,
	`size_bytes` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attachment_owner_idx` ON `attachment` (`owner_type`,`owner_id`);--> statement-breakpoint
ALTER TABLE `user` ADD `team_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `job_title_id` text;--> statement-breakpoint
CREATE INDEX `user_team_idx` ON `user` (`team_id`);--> statement-breakpoint
ALTER TABLE `documentation_page` ADD `business_unit_id` text REFERENCES business_unit(id);--> statement-breakpoint
ALTER TABLE `documentation_page` ADD `scope` text DEFAULT 'general' NOT NULL;--> statement-breakpoint
CREATE INDEX `documentation_page_business_unit_idx` ON `documentation_page` (`business_unit_id`);--> statement-breakpoint
CREATE INDEX `documentation_page_scope_idx` ON `documentation_page` (`scope`);--> statement-breakpoint
-- Quem respondia por cada BU vira o primeiro membro dela, marcado como
-- responsável. Roda ANTES do DROP da coluna: depois, a informação não existe
-- mais em lugar nenhum e o vínculo teria de ser refeito à mão, BU por BU.
INSERT OR IGNORE INTO `business_unit_member` (id, business_unit_id, user_id, is_lead, created_by, created_at)
  SELECT
    'bum_' || `id`,
    `id`,
    `strategy_owner_id`,
    1,
    'migration_0007',
    unixepoch()
  FROM `business_unit`
  WHERE `strategy_owner_id` IS NOT NULL;
--> statement-breakpoint
ALTER TABLE `business_unit` DROP COLUMN `strategy_owner_id`;

--> statement-breakpoint
-- Tarefas: todo mundo vê a sua fila; quem DELEGA para outras pessoas é
-- administrador e líder. Editor e membro criam tarefa apenas para si — isso é
-- tratado como posse, não como permissão de módulo, e por isso não aparece
-- aqui como can_edit.
INSERT OR IGNORE INTO `role_permission` (id, role, module_key, can_view, can_edit, updated_at) VALUES
  ('perm_admin_tasks',  'admin',  'tasks', 1, 1, unixepoch()),
  ('perm_leader_tasks', 'leader', 'tasks', 1, 1, unixepoch()),
  ('perm_editor_tasks', 'editor', 'tasks', 1, 0, unixepoch()),
  ('perm_member_tasks', 'member', 'tasks', 1, 0, unixepoch());
--> statement-breakpoint
-- O time de Planejamento e seus cargos, que já existem de fato. Os demais
-- times (Design, Copy, Social) são cadastrados na interface, em
-- Administração > Organização.
INSERT OR IGNORE INTO `team` (id, slug, name, description, is_active, sort_order, created_by, created_at, updated_at) VALUES
  ('team_planejamento', 'planejamento', 'Planejamento', 'Estratégia, calendário e planejamento anual das Business Units.', 1, 0, 'migration_0007', unixepoch(), unixepoch());
--> statement-breakpoint
INSERT OR IGNORE INTO `job_title` (id, team_id, slug, name, sort_order, is_active, created_at, updated_at) VALUES
  ('job_plan_gerente',       'team_planejamento', 'gerente',       'Gerente',        0, 1, unixepoch(), unixepoch()),
  ('job_plan_coordenador',   'team_planejamento', 'coordenador',   'Coordenador(a)', 1, 1, unixepoch(), unixepoch()),
  ('job_plan_analista',      'team_planejamento', 'analista',      'Analista',       2, 1, unixepoch(), unixepoch()),
  ('job_plan_assistente',    'team_planejamento', 'assistente',    'Assistente',     3, 1, unixepoch(), unixepoch()),
  ('job_plan_estagiario',    'team_planejamento', 'estagiario',    'Estagiário(a)',  4, 1, unixepoch(), unixepoch()),
  ('job_plan_desenvolvedor', 'team_planejamento', 'desenvolvedor', 'Desenvolvedor(a)', 5, 1, unixepoch(), unixepoch());
