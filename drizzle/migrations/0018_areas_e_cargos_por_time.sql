-- A plataforma deixa de ser só do Marketing.
--
-- O nível de topo da estrutura passa a se chamar ÁREA. Era o que o "setor" já
-- era na prática — o que muda é que Comercial, Novos Negócios e Corpo Docente
-- entram como irmãs de Marketing, e não penduradas nele. "Setor do Marketing"
-- e "área da empresa" são coisas diferentes, e agora é a segunda que existe.
--
-- O nível do meio vira SUBÁREA e continua opcional: Marketing usa (Conteúdo,
-- Planejamento), Corpo Docente provavelmente não vai usar. Estrutura que
-- obriga três níveis obriga alguém a inventar o do meio.

UPDATE `team` SET `kind` = 'area' WHERE `kind` = 'sector';
--> statement-breakpoint
UPDATE `team` SET `kind` = 'subarea' WHERE `kind` = 'subsector';
--> statement-breakpoint

-- As três áreas novas, sem times dentro: quem conhece cada área é quem vai
-- montá-la em Administração › Organização. Criar times chutados aqui daria
-- trabalho de apagar.
INSERT OR IGNORE INTO `team` (`id`, `slug`, `name`, `description`, `kind`, `parent_org_unit_id`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
  ('team_comercial',      'comercial',      'Comercial',      NULL, 'area', NULL, 1, 100, unixepoch(), unixepoch()),
  ('team_novos_negocios', 'novos-negocios', 'Novos Negócios', NULL, 'area', NULL, 1, 100, unixepoch(), unixepoch()),
  ('team_corpo_docente',  'corpo-docente',  'Corpo Docente',  NULL, 'area', NULL, 1, 100, unixepoch(), unixepoch());
--> statement-breakpoint

-- Em que times cada cargo existe.
--
-- Muitos-para-muitos porque os dois casos reais existem: "Supervisor de
-- Design" é de um time só, e "Coordenador Médico" vale para todos os times do
-- Corpo Docente. Uma coluna `team_id` resolveria o primeiro e obrigaria a
-- cadastrar o segundo doze vezes.
--
-- Cargo SEM nenhuma linha aqui vale em qualquer time. É o estado em que todos
-- os cargos existentes ficam — nada muda para quem já usa a ferramenta — e é
-- o que um cargo transversal deve continuar sendo.
CREATE TABLE `job_title_team` (
  `id` text PRIMARY KEY NOT NULL,
  `job_title_id` text NOT NULL REFERENCES `job_title`(`id`) ON DELETE cascade,
  `team_id` text NOT NULL REFERENCES `team`(`id`) ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `job_title_team_unique` ON `job_title_team` (`job_title_id`, `team_id`);
--> statement-breakpoint
CREATE INDEX `job_title_team_job_idx` ON `job_title_team` (`job_title_id`);
--> statement-breakpoint
CREATE INDEX `job_title_team_team_idx` ON `job_title_team` (`team_id`);
--> statement-breakpoint

-- O time sugerido que já existia vira o primeiro vínculo real. Quem cadastrou
-- "costuma ser de Copy" estava dizendo exatamente isto; a diferença é que
-- agora a informação restringe em vez de só agrupar.
INSERT OR IGNORE INTO `job_title_team` (`id`, `job_title_id`, `team_id`)
SELECT 'jtt_' || `id`, `id`, `suggested_team_id`
FROM `job_title`
WHERE `suggested_team_id` IS NOT NULL;
