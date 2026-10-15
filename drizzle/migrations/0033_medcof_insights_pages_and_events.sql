CREATE TABLE IF NOT EXISTS `insight_page` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`business_unit_id` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`version` text DEFAULT 'v1' NOT NULL,
	`screenshot_url_desktop` text,
	`screenshot_url_mobile` text,
	`screenshot_updated_at` integer,
	`tracked_elements` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_page_bu_idx` ON `insight_page` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_page_active_idx` ON `insight_page` (`is_active`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `insight_event` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`page_url` text NOT NULL,
	`page_path` text NOT NULL,
	`page_version` text DEFAULT 'v1' NOT NULL,
	`event_type` text NOT NULL,
	`element_id` text,
	`element_label` text,
	`section_id` text,
	`viewport` text DEFAULT 'desktop' NOT NULL,
	`x` integer,
	`y` integer,
	`scroll_percent` integer,
	`utm_source` text,
	`utm_medium` text,
	`utm_campaign` text,
	`referrer` text,
	`session_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_event_page_idx` ON `insight_event` (`page_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_event_type_idx` ON `insight_event` (`event_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_event_created_idx` ON `insight_event` (`created_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_event_page_type_idx` ON `insight_event` (`page_id`, `event_type`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `insight_event_page_vp_idx` ON `insight_event` (`page_id`, `viewport`);
