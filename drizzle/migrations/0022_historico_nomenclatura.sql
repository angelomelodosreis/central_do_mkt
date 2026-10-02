-- Histórico persistente de nomes gerados para CRM
CREATE TABLE `generated_name_history` (
  `id` text PRIMARY KEY NOT NULL,
  `template_id` text REFERENCES `naming_template`(`id`) ON DELETE set null,
  `template_name` text NOT NULL,
  `generated_name` text NOT NULL,
  `parameters` text,
  `user_id` text,
  `user_name` text,
  `user_email` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `generated_name_user_idx` ON `generated_name_history` (`user_id`);
--> statement-breakpoint
CREATE INDEX `generated_name_created_idx` ON `generated_name_history` (`created_at`);
