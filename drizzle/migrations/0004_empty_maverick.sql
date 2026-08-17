CREATE TABLE `persona` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`headline` text,
	`age_range` text,
	`gender` text,
	`location` text,
	`income` text,
	`education` text,
	`career_stage` text,
	`current_role` text,
	`workplace` text,
	`career_goal` text,
	`interests` text,
	`channels` text,
	`notes` text,
	`search_text` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_unit`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `persona_business_unit_idx` ON `persona` (`business_unit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `persona_slug_unique` ON `persona` (`business_unit_id`,`slug`);--> statement-breakpoint
CREATE TABLE `persona_pain` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`position` integer NOT NULL,
	`pain` text NOT NULL,
	`solution` text,
	FOREIGN KEY (`persona_id`) REFERENCES `persona`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `persona_pain_persona_idx` ON `persona_pain` (`persona_id`);--> statement-breakpoint
-- Permissões do módulo novo. Sem estas linhas ninguém enxerga Personas, nem o
-- admin — a matriz papel × módulo é a fonte de verdade, e ela é editável depois
-- em Administração > Permissões.
INSERT OR IGNORE INTO `role_permission` (id, role, module_key, can_view, can_edit, updated_at) VALUES
  ('perm_admin_personas',  'admin',  'personas', 1, 1, unixepoch()),
  ('perm_leader_personas', 'leader', 'personas', 1, 1, unixepoch()),
  ('perm_member_personas', 'member', 'personas', 1, 0, unixepoch());
