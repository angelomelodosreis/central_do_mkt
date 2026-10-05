-- Migration 0028: Notificações de usuário para menções em threads e follow-ups
CREATE TABLE IF NOT EXISTS `user_notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
	`actor_id` text,
	`actor_name` text NOT NULL,
	`type` text DEFAULT 'mention' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`link` text,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_notification_user_idx` ON `user_notification` (`user_id`, `is_read`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_notification_created_idx` ON `user_notification` (`created_at`);
