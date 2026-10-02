-- Migration 0024: Diagnóstico e Metas 2.0 com Revisão Trimestral
-- Suporte aos 5 pilares, síntese (desafio/oportunidade), objetivo do ciclo,
-- desdobramento de metas com embasamento + KPIs primário e secundário, e rito trimestral de 7 perguntas.

ALTER TABLE `strategy_round` ADD COLUMN `main_challenge` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `main_opportunity` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `cycle_objective` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `cycle_period` text;
--> statement-breakpoint

ALTER TABLE `strategy_goal` ADD COLUMN `diagnosis_baseline` text;
--> statement-breakpoint
ALTER TABLE `strategy_goal` ADD COLUMN `primary_kpi_name` text;
--> statement-breakpoint
ALTER TABLE `strategy_goal` ADD COLUMN `primary_kpi_target` text;
--> statement-breakpoint
ALTER TABLE `strategy_goal` ADD COLUMN `secondary_kpi_name` text;
--> statement-breakpoint
ALTER TABLE `strategy_goal` ADD COLUMN `secondary_kpi_target` text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `strategy_quarterly_review` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL REFERENCES `business_unit`(`id`) ON DELETE RESTRICT,
	`cycle_id` text REFERENCES `strategy_cycle`(`id`) ON DELETE CASCADE,
	`round_id` text REFERENCES `strategy_round`(`id`) ON DELETE SET NULL,
	`quarter` text NOT NULL,
	`review_date` integer NOT NULL,
	`diagnostic_valid` text,
	`market_changes` text,
	`new_problems` text,
	`missed_opportunities` text,
	`objective_assumptions` text,
	`needs_goal_revision` text,
	`next_quarter_focus` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `strategy_quarterly_review_bu_idx` ON `strategy_quarterly_review` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `strategy_quarterly_review_cycle_idx` ON `strategy_quarterly_review` (`cycle_id`);
