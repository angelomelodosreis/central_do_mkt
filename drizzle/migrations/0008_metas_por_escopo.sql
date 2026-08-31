-- Metas deixam de ser planilha mensal e passam a ser definição por escopo.
--
-- A tabela antiga guardava uma célula por (métrica, mês) com `target` E `actual`.
-- O acompanhamento saiu da plataforma — vive num dashboard — e a granularidade
-- mensal saiu com ele: o que se registra aqui é o compromisso do ciclo e de cada
-- semestre. Não há como migrar o conteúdo antigo para o novo formato (uma meta
-- de março não é um objetivo de semestre), então a tabela é recriada.
--
-- Escrita à mão porque o `drizzle-kit generate` exige responder, num prompt
-- interativo, se cada coluna que desapareceu foi renomeada — e nenhuma foi.
DROP TABLE `strategy_goal`;
--> statement-breakpoint
CREATE TABLE `strategy_goal` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`scope` text NOT NULL,
	`objective` text NOT NULL,
	`rationale` text,
	`fronts` text,
	`non_goals` text,
	`success_signal` text,
	`risks` text,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `strategy_cycle`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_goal_scope_unique` ON `strategy_goal` (`cycle_id`,`scope`);
--> statement-breakpoint
CREATE INDEX `strategy_goal_cycle_idx` ON `strategy_goal` (`cycle_id`);
--> statement-breakpoint
CREATE TABLE `strategy_goal_target` (
	`id` text PRIMARY KEY NOT NULL,
	`goal_id` text NOT NULL,
	`metric` text NOT NULL,
	`target` real NOT NULL,
	`note` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`goal_id`) REFERENCES `strategy_goal`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_goal_target_unique` ON `strategy_goal_target` (`goal_id`,`metric`);
--> statement-breakpoint
CREATE INDEX `strategy_goal_target_goal_idx` ON `strategy_goal_target` (`goal_id`);
