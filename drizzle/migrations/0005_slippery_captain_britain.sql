CREATE TABLE `strategy_cycle` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_unit`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `strategy_cycle_business_unit_idx` ON `strategy_cycle` (`business_unit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_cycle_slug_unique` ON `strategy_cycle` (`business_unit_id`,`slug`);--> statement-breakpoint
CREATE TABLE `strategy_product` (
	`id` text PRIMARY KEY NOT NULL,
	`business_unit_id` text NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`cadence` text NOT NULL,
	`family` text,
	`details` text,
	`is_active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`business_unit_id`) REFERENCES `business_unit`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `strategy_product_business_unit_idx` ON `strategy_product` (`business_unit_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_product_slug_unique` ON `strategy_product` (`business_unit_id`,`slug`);--> statement-breakpoint
CREATE TABLE `timeline_item` (
	`id` text PRIMARY KEY NOT NULL,
	`cycle_id` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`product_id` text,
	`owner` text,
	`status` text DEFAULT 'planned' NOT NULL,
	`details` text,
	`created_by` text,
	`updated_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`cycle_id`) REFERENCES `strategy_cycle`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `strategy_product`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `timeline_item_cycle_idx` ON `timeline_item` (`cycle_id`);--> statement-breakpoint
CREATE INDEX `timeline_item_starts_at_idx` ON `timeline_item` (`starts_at`);--> statement-breakpoint
CREATE INDEX `timeline_item_product_idx` ON `timeline_item` (`product_id`);--> statement-breakpoint
ALTER TABLE `business_unit` ADD `strategy_owner_id` text;--> statement-breakpoint
-- Permissões do módulo novo. A matriz papel × módulo diz quem entra no
-- Planejamento; quem edita CADA BU é decidido por `business_unit.strategy_owner_id`
-- (mais os administradores), verificado no servidor a cada gravação.
INSERT OR IGNORE INTO `role_permission` (id, role, module_key, can_view, can_edit, updated_at) VALUES
  ('perm_admin_strategy',  'admin',  'strategy', 1, 1, unixepoch()),
  ('perm_leader_strategy', 'leader', 'strategy', 1, 1, unixepoch()),
  ('perm_member_strategy', 'member', 'strategy', 1, 0, unixepoch());
