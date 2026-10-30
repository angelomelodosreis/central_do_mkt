-- Migration 0036: Liberar visualização do Panorama para membros e editores
-- Permite que membros do time de marketing e editores acompanhem o Panorama Executivo.

UPDATE `role_permission` SET `can_view` = 1, `updated_at` = unixepoch() WHERE `module_key` = 'panorama' AND `role` IN ('member', 'editor');
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permission` (`id`, `role`, `module_key`, `can_view`, `can_edit`, `updated_at`)
VALUES
  ('perm_editor_panorama', 'editor', 'panorama', 1, 0, unixepoch()),
  ('perm_member_panorama', 'member', 'panorama', 1, 0, unixepoch());
