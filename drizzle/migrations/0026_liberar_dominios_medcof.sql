-- Migration 0026: Liberar domínios corporativos oficiais da MedCof para cadastro e login social
-- Garante que @medcof.com.br, @grupomedcof.com.br e @medcof.tech estejam permanentemente cadastrados e ativos.

INSERT OR IGNORE INTO `allowed_domain` (`id`, `domain`, `is_active`, `created_by`, `created_at`) VALUES
  ('dom_grupomedcof', 'grupomedcof.com.br', 1, 'migration_0026', unixepoch()),
  ('dom_medcof',      'medcof.com.br',      1, 'migration_0026', unixepoch()),
  ('dom_medcof_tech', 'medcof.tech',        1, 'migration_0026', unixepoch());
