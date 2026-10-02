-- Migration 0025: Metas 2.0 (tabela de múltiplas metas por BU) e Diagnóstico da BU para os 5 Pilares
-- Alinhado à metodologia da planilha oficial do Google Sheets (Metas 2.0 e Diagnóstico 2.0).

ALTER TABLE `strategy_round` ADD COLUMN `business_market_diagnosis` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `client_brand_diagnosis` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `portfolio_offer_diagnosis` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `funnel_conversion_diagnosis` text;
--> statement-breakpoint
ALTER TABLE `strategy_round` ADD COLUMN `context_capacity_diagnosis` text;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `strategy_kpi_goal` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL REFERENCES `business_unit`(`id`) ON DELETE CASCADE,
	`cycle_id` text NOT NULL REFERENCES `strategy_cycle`(`id`) ON DELETE CASCADE,
	`title` text NOT NULL,
	`diagnosis_baseline` text,
	`primary_kpi_name` text,
	`primary_kpi_target` text,
	`secondary_kpi_name` text,
	`secondary_kpi_target` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `strategy_kpi_goal_bu_idx` ON `strategy_kpi_goal` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `strategy_kpi_goal_cycle_idx` ON `strategy_kpi_goal` (`cycle_id`);
