-- Migration 0030: Campos compactos de persona, governanca, avatar e tags
-- Suporte ao novo layout compacto com foto/avatar, frase, prova-alvo, rotina, governanca e tags livres

ALTER TABLE `persona` ADD COLUMN `avatar` text;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `quote` text;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `target_exam` text;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `attempt` text;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `study_routine` text;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `owner` text;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `status` text DEFAULT 'active';
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `last_reviewed_at` integer;
--> statement-breakpoint
ALTER TABLE `persona` ADD COLUMN `tags` text;
