-- Resultados: o realizado de cada BU, lançado à mão.
--
-- As metas guardam o compromisso; até agora o realizado morava fora da
-- plataforma de propósito. A decisão mudou porque o dashboard de fora não
-- existe de fato — e comparar BUs só funciona com meta e realizado no mesmo
-- lugar. Enquanto não há integração, o lançamento é semanal e manual.
--
-- Só há colunas para DADOS-BASE. Ticket médio, conversão, CPL e CAC são conta
-- feita na leitura: coluna própria criaria a chance de o ticket médio não
-- bater com faturamento ÷ vendas.

CREATE TABLE `weekly_result` (
  `id` text PRIMARY KEY NOT NULL,
  `business_unit_id` text NOT NULL REFERENCES `business_unit`(`id`) ON DELETE cascade,
  `week_start` integer NOT NULL,
  `revenue` real,
  `sales` integer,
  `leads` integer,
  `media_spend` real,
  `note` text,
  `created_by` text,
  `updated_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `weekly_result_unique` ON `weekly_result` (`business_unit_id`, `week_start`);
--> statement-breakpoint
CREATE INDEX `weekly_result_week_idx` ON `weekly_result` (`week_start`);
--> statement-breakpoint

-- O resultado atribuído a uma iniciativa: um lançamento, um jantar, um
-- congresso. Não se soma ao semanal — o semanal é o total da BU, isto é a
-- fatia que se credita a uma ação.
CREATE TABLE `initiative_result` (
  `id` text PRIMARY KEY NOT NULL,
  `timeline_item_id` text NOT NULL REFERENCES `timeline_item`(`id`) ON DELETE cascade,
  `revenue` real,
  `sales` integer,
  `leads` integer,
  `media_spend` real,
  `attendance` integer,
  `note` text,
  `created_by` text,
  `updated_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `initiative_result_unique` ON `initiative_result` (`timeline_item_id`);
--> statement-breakpoint

-- O Panorama é um módulo novo na matriz de permissões.
--
-- Ver o Panorama é ver o número de TODAS as BUs no seu escopo de uma vez, que
-- é mais do que ver o planejamento de uma. Por isso membro e editor entram sem
-- ele: quem produz não precisa do consolidado, e o consolidado é justamente a
-- informação que se restringe. Ajustável em Administração › Permissões.
INSERT OR IGNORE INTO role_permission (id, role, module_key, can_view, can_edit, updated_at) VALUES
  ('perm_admin_panorama',  'admin',  'panorama', 1, 1, unixepoch()),
  ('perm_leader_panorama', 'leader', 'panorama', 1, 1, unixepoch()),
  ('perm_editor_panorama', 'editor', 'panorama', 0, 0, unixepoch()),
  ('perm_member_panorama', 'member', 'panorama', 0, 0, unixepoch());
