-- Ferramenta de diagnóstico: rodadas, achados, realizado e o vínculo com metas.
--
-- A meta precisava apoiar-se em algo verificável — o campo "por que este é o
-- foco agora" era a conclusão de um diagnóstico que não existia. Estas tabelas
-- são esse diagnóstico.
--
-- O diagnóstico roda em RODADAS (a cada 3 a 6 meses) e não uma vez por ano: uma
-- leitura de janeiro está velha em julho, e é na virada do semestre que a meta é
-- revisada. `strategy_measurement` guarda o realizado na data da rodada — é a
-- base factual sem a qual "ficamos abaixo em captação" é opinião; o alvo não se
-- repete ali porque vive em `strategy_goal_target`.
--
-- `strategy_goal_finding` é o que fecha o ciclo: permite listar achado sem meta
-- (pauta que se decidiu ignorar) e meta sem achado (meta que ninguém sustentou).
--
-- Escrita à mão pelo mesmo motivo da 0008: o `drizzle-kit generate` só roda com
-- prompt interativo neste projeto.
CREATE TABLE `strategy_round` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`reference_date` integer NOT NULL,
	`is_open` integer DEFAULT true NOT NULL,
	`summary` text,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `strategy_cycle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_round_sequence_unique` ON `strategy_round` (`cycle_id`,`sequence`);
--> statement-breakpoint
CREATE INDEX `strategy_round_cycle_idx` ON `strategy_round` (`cycle_id`);
--> statement-breakpoint
CREATE TABLE `strategy_finding` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`lens` text NOT NULL,
	`kind` text NOT NULL,
	`statement` text NOT NULL,
	`evidence` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `strategy_round`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `strategy_finding_round_idx` ON `strategy_finding` (`round_id`);
--> statement-breakpoint
CREATE INDEX `strategy_finding_lens_idx` ON `strategy_finding` (`round_id`,`lens`);
--> statement-breakpoint
CREATE TABLE `strategy_measurement` (
	`id` text PRIMARY KEY NOT NULL,
	`round_id` text NOT NULL,
	`metric` text NOT NULL,
	`actual` real NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `strategy_round`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_measurement_unique` ON `strategy_measurement` (`round_id`,`metric`);
--> statement-breakpoint
CREATE INDEX `strategy_measurement_round_idx` ON `strategy_measurement` (`round_id`);
--> statement-breakpoint
CREATE TABLE `strategy_goal_finding` (
	`goal_id` text NOT NULL,
	`finding_id` text NOT NULL,
	PRIMARY KEY(`goal_id`, `finding_id`),
	FOREIGN KEY (`goal_id`) REFERENCES `strategy_goal`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`finding_id`) REFERENCES `strategy_finding`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `strategy_goal_finding_finding_idx` ON `strategy_goal_finding` (`finding_id`);
--> statement-breakpoint
CREATE TABLE `strategy_goal_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`round_id` text,
	`reason` text,
	`snapshot` text,
	`changed_by` text,
	`changed_at` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `strategy_goal`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`round_id`) REFERENCES `strategy_round`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `strategy_goal_revision_goal_idx` ON `strategy_goal_revision` (`goal_id`);
