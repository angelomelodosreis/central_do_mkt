CREATE TABLE IF NOT EXISTS `bu_access_request` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`business_unit_id` text NOT NULL,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` integer NOT NULL,
	`reviewed_at` integer,
	`reviewed_by` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bu_access_request_user_idx` ON `bu_access_request` (`user_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bu_access_request_bu_idx` ON `bu_access_request` (`business_unit_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `bu_access_request_status_idx` ON `bu_access_request` (`status`);
--> statement-breakpoint
ALTER TABLE `business_unit` ADD COLUMN `code` text;
--> statement-breakpoint

-- Atualização dos códigos oficiais MEDCOF_* e nomenclaturas oficiais
UPDATE `business_unit` SET `code` = 'MEDCOF_ANESTESIOLOGIA', `label` = 'Anestesiologia' WHERE `slug` = 'anestesiologia' OR `id` = 'bu_anestesiologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_CARDIOLOGIA', `label` = 'Cardiologia' WHERE `slug` = 'cardiologia' OR `id` = 'bu_cardiologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_CIRURGIA', `label` = 'Cirurgia' WHERE `slug` = 'cirurgia' OR `id` = 'bu_cirurgia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_CLINICA_MEDICA', `label` = 'Clínica Médica' WHERE `slug` = 'clinica_medica' OR `id` = 'bu_clinica_medica';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_CONCURSUS', `label` = 'Concursus' WHERE `slug` = 'concursus' OR `id` = 'bu_concursus';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_DERMATOLOGIA', `label` = 'Dermatologia' WHERE `slug` = 'dermatologia' OR `id` = 'bu_dermatologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_ENAMED', `label` = 'Enamed' WHERE `slug` = 'enamed' OR `id` = 'bu_enamed';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_ENDOCRINOLOGIA', `label` = 'Endocrinologia' WHERE `slug` = 'endocrinologia' OR `id` = 'bu_endocrinologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_ENDOCRINOLOGIA_PEDIATRICA', `label` = 'Endocrinologia Pediátrica' WHERE `slug` = 'endocrinologia_pediatrica' OR `id` = 'bu_endocrinologia_pediatrica';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_GINECOLOGIA_E_OBSTETRICIA', `label` = 'Ginecologia e Obstetrícia' WHERE `slug` = 'ginecologia_e_obstetricia' OR `id` = 'bu_ginecologia_e_obstetricia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_INTERNATO', `label` = 'Internato' WHERE `slug` = 'internato' OR `id` = 'bu_internato';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_LIFEHACKS', `label` = 'Lifehacks' WHERE `slug` = 'ps' OR `slug` = 'lifehacks' OR `id` = 'bu_lifehacks';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_MEDICINA_DE_EMERGENCIA', `label` = 'Medicina de Emergência' WHERE `slug` = 'medicina_de_emergencia' OR `id` = 'bu_medicina_de_emergencia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_MEDICINA_INTENSIVA', `label` = 'Medicina Intensiva' WHERE `slug` = 'medicina_intensiva' OR `id` = 'bu_medicina_intensiva';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_OFTALMOLOGIA', `label` = 'Oftalmologia' WHERE `slug` = 'oftalmologia' OR `id` = 'bu_oftalmologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_ORTOPEDIA', `label` = 'Ortopedia' WHERE `slug` = 'ortopedia' OR `id` = 'bu_ortopedia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_PEDIATRIA', `label` = 'Pediatria' WHERE `slug` = 'pediatria' OR `id` = 'bu_pediatria';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_RADIOLOGIA', `label` = 'Radiologia' WHERE `slug` = 'radiologia' OR `id` = 'bu_radiologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_RESIDENCIA', `label` = 'Residência' WHERE `slug` = 'residencia' OR `id` = 'bu_residencia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_REVALIDA', `label` = 'Revalida' WHERE `slug` = 'revalida' OR `id` = 'bu_revalida';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_UROLOGIA', `label` = 'Urologia' WHERE `slug` = 'urologia' OR `id` = 'bu_urologia';
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_USA', `label` = 'USA' WHERE `slug` = 'usa' OR `id` = 'bu_usa';
--> statement-breakpoint

-- Inserir Otorrinolaringologia se não existir
INSERT OR IGNORE INTO `business_unit` (`id`, `slug`, `code`, `label`, `description`, `division_id`, `is_active`, `sort_order`, `created_at`, `updated_at`)
VALUES ('bu_otorrinolaringologia', 'otorrinolaringologia', 'MEDCOF_OTORRINOLARINGOLOGIA', 'Otorrinolaringologia', NULL, 'div_especialidades', 1, 165, unixepoch(), unixepoch());
--> statement-breakpoint
UPDATE `business_unit` SET `code` = 'MEDCOF_OTORRINOLARINGOLOGIA', `label` = 'Otorrinolaringologia' WHERE `slug` = 'otorrinolaringologia' OR `id` = 'bu_otorrinolaringologia';
--> statement-breakpoint

-- Assegurar squads para todas as BUs ativas
INSERT OR IGNORE INTO `squad` (`id`, `business_unit_id`, `slug`, `name`, `is_active`, `created_at`, `updated_at`)
SELECT 'sqd_' || `slug`, `id`, `slug`, 'Squad ' || `label`, 1, unixepoch(), unixepoch()
FROM `business_unit`
WHERE `id` NOT IN (SELECT `business_unit_id` FROM `squad`);
