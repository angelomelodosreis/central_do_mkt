-- Papel novo (Editor) e módulo novo (Parâmetros).
--
-- A escada de papéis passa a ser: Membro consulta, Editor produz conteúdo,
-- Líder define os parâmetros, Administrador governa os acessos. A matriz abaixo
-- é só o ponto de partida — ela é editável na tela Administração > Permissões.

-- Editor: edita conteúdo, consulta o gerador, nada de parâmetros nem administração.
-- (No Planejamento a permissão é necessária mas não suficiente: a edição de cada
--  BU continua restrita a quem responde por ela.)
INSERT OR IGNORE INTO `role_permission` (id, role, module_key, can_view, can_edit, updated_at) VALUES
  ('perm_editor_name_generator', 'editor', 'name_generator', 1, 0, unixepoch()),
  ('perm_editor_documentation',  'editor', 'documentation',  1, 1, unixepoch()),
  ('perm_editor_personas',       'editor', 'personas',       1, 1, unixepoch()),
  ('perm_editor_strategy',       'editor', 'strategy',       1, 1, unixepoch()),
  ('perm_editor_parameters',     'editor', 'parameters',     0, 0, unixepoch()),
  ('perm_editor_admin',          'editor', 'admin',          0, 0, unixepoch());
--> statement-breakpoint
-- Parâmetros: administrador e líder configuram; editor e membro não entram.
-- Business Units seguem fora daqui, exclusivas de administrador — é o que fecha
-- o caminho de alguém se nomear responsável pelo planejamento de uma BU.
INSERT OR IGNORE INTO `role_permission` (id, role, module_key, can_view, can_edit, updated_at) VALUES
  ('perm_admin_parameters',  'admin',  'parameters', 1, 1, unixepoch()),
  ('perm_leader_parameters', 'leader', 'parameters', 1, 1, unixepoch()),
  ('perm_member_parameters', 'member', 'parameters', 0, 0, unixepoch());
