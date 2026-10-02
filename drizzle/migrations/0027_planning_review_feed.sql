-- Migration 0027: Feed e Tabela de Revisão de Planejamento e Acompanhamento por BU
-- Suporte ao fluxo Slack Canvas / Feed com acompanhamentos, prazos de follow-up e thread de comentários

CREATE TABLE IF NOT EXISTS `planning_review_item` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL REFERENCES `business_unit`(`id`) ON DELETE CASCADE,
	`coordinator_name` text DEFAULT 'Ingrid Silva' NOT NULL,
	`coordinator_email` text,
	`meeting_date` integer NOT NULL,
	`follow_up_date` integer NOT NULL,
	`details` text NOT NULL,
	`assignee_name` text NOT NULL,
	`assignee_email` text,
	`assignee_avatar` text,
	`status` text DEFAULT 'novo' NOT NULL,
	`priority` text DEFAULT 'normal',
	`tags` text,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `planning_review_item_bu_idx` ON `planning_review_item` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `planning_review_item_date_idx` ON `planning_review_item` (`meeting_date`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `planning_review_item_status_idx` ON `planning_review_item` (`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `planning_review_comment` (
	`id` text PRIMARY KEY NOT NULL,
	`review_item_id` text NOT NULL REFERENCES `planning_review_item`(`id`) ON DELETE CASCADE,
	`author_name` text NOT NULL,
	`author_email` text,
	`author_avatar` text,
	`author_role` text,
	`content` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `planning_review_comment_item_idx` ON `planning_review_comment` (`review_item_id`);
