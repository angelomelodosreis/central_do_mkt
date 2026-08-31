-- Organograma: uma pessoa passa a pertencer a VÁRIOS times.
--
-- `user.team_id` / `user.job_title_id` eram colunas únicas, e isso não
-- representa a área: um designer atende três squads, quem coordena responde por
-- mais de uma frente. O vínculo vira tabela, e o CARGO vai com ele — cargo
-- pertence a um time, então a mesma pessoa pode ser Coordenadora num time e
-- Analista em outro.
--
-- `team.parent_team_id` entra junto porque o organograma precisa desenhar a área
-- inteira: Design, Copy e Social são times próprios que respondem a Conteúdo.
--
-- Escrita à mão (slot `--custom`) porque o `drizzle-kit generate` só resolve
-- "esta coluna que desapareceu foi renomeada?" num prompt interativo.

CREATE TABLE `team_member` (
	`id` text PRIMARY KEY NOT NULL,
	`team_id` text NOT NULL,
	`user_id` text NOT NULL,
	`job_title_id` text,
	`is_lead` integer DEFAULT false NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `team`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_member_unique` ON `team_member` (`team_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `team_member_user_idx` ON `team_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `team_member_team_idx` ON `team_member` (`team_id`);--> statement-breakpoint
ALTER TABLE `team` ADD `parent_team_id` text;--> statement-breakpoint
CREATE INDEX `team_parent_idx` ON `team` (`parent_team_id`);--> statement-breakpoint
-- O vínculo que existia nas colunas do usuário vira a primeira linha da tabela,
-- marcada como principal. Roda ANTES do DROP: depois, a informação não existe
-- mais em lugar nenhum e o organograma teria de ser remontado à mão.
INSERT OR IGNORE INTO `team_member` (id, team_id, user_id, job_title_id, is_lead, is_primary, created_by, created_at)
  SELECT
    'tmb_' || `id`,
    `team_id`,
    `id`,
    `job_title_id`,
    0,
    1,
    'migration_0010',
    unixepoch()
  FROM `user`
  WHERE `team_id` IS NOT NULL;
--> statement-breakpoint
DROP INDEX IF EXISTS `user_team_idx`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `team_id`;--> statement-breakpoint
ALTER TABLE `user` DROP COLUMN `job_title_id`;
