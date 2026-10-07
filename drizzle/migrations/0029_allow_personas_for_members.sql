-- Migration 0029: Liberar criacao e edicao de personas para membros e assistentes/analistas
-- Garante que membros do time possam criar e editar personas nas BUs que acessam.

UPDATE `role_permission` SET `can_edit` = 1, `updated_at` = unixepoch() WHERE `module_key` = 'personas' AND `role` IN ('member', 'editor');
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permission` (`id`, `role`, `module_key`, `can_view`, `can_edit`, `updated_at`)
VALUES ('perm_member_personas', 'member', 'personas', 1, 1, unixepoch());
