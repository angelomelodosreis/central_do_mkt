-- Migration 0035: Growth Sessions & Playbooks de Treinamento
CREATE TABLE IF NOT EXISTS `growth_session` (
	`id` text PRIMARY KEY NOT NULL,
	`upload_order` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`theme` text NOT NULL,
	`date` text NOT NULL,
	`time` text,
	`presenter` text NOT NULL,
	`category` text DEFAULT 'Estratégia' NOT NULL,
	`youtube_id` text,
	`video_url` text,
	`tool_url` text,
	`summary_url` text,
	`presentation_url` text,
	`links` text,
	`description` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `growth_session_order_idx` ON `growth_session` (`upload_order`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `growth_session_category_idx` ON `growth_session` (`category`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `growth_session_presenter_idx` ON `growth_session` (`presenter`);
