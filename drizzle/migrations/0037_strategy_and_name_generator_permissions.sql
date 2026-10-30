-- Migration 0037: Permissão de edição de estratégia para membros e garantia de modelos do gerador de nomes
-- 1. Permite que membros do marketing preencham diagnósticos, metas e revisões do ciclo no seu escopo de BU
UPDATE `role_permission` SET `can_edit` = 1, `updated_at` = unixepoch() WHERE `module_key` = 'strategy' AND `role` = 'member';
--> statement-breakpoint
INSERT OR IGNORE INTO `role_permission` (`id`, `role`, `module_key`, `can_view`, `can_edit`, `updated_at`)
VALUES
  ('perm_member_strategy', 'member', 'strategy', 1, 1, unixepoch());
--> statement-breakpoint

-- 2. Garantir modelos oficiais no Gerador de Nomes (Meta Ads, ActiveCampaign Lista, ActiveCampaign Tag, Link com UTMs)
INSERT OR IGNORE INTO `naming_template` (`id`, `slug`, `name`, `description`, `block_separator`, `is_active`, `sort_order`, `created_at`, `updated_at`) VALUES
  ('tpl_campanha_meta', 'campanha-meta-ads', 'Campanha do Meta Ads', 'Campanhas de tráfego pago no Meta Ads (Facebook e Instagram).', '-', 1, 5, unixepoch(), unixepoch()),
  ('tpl_lista_ac', 'lista-activecampaign', 'Lista do ActiveCampaign', 'Listas de contatos no ActiveCampaign, separadas por BU e por tipo de público.', '-', 1, 10, unixepoch(), unixepoch()),
  ('tpl_tag_ac',   'tag-activecampaign',   'Tag do ActiveCampaign',   'Tags aplicadas a contatos no ActiveCampaign, com o mês e o ano de referência.', '-', 1, 20, unixepoch(), unixepoch()),
  ('tpl_utm_link', 'utm-link',             'Link com UTMs de Rastreamento', 'Parâmetros de rastreamento para links de campanhas, newsletters e bio.', '_', 1, 30, unixepoch(), unixepoch());
--> statement-breakpoint

-- 3. Garantir campos de cada modelo
INSERT OR IGNORE INTO `naming_template_field` (`id`, `template_id`, `position`, `field_type`, `label`, `hint`, `placeholder`, `is_required`, `options`, `source_key`) VALUES
  ('fld_lista_bu', 'tpl_lista_ac', 0, 'official_base', 'Business Unit', 'A BU responsável pela lista.', NULL, 1, NULL, 'business_unit'),
  ('fld_lista_tipo', 'tpl_lista_ac', 1, 'select', 'Tipo de lista', 'Lead para potenciais clientes, aluno para matriculados.', NULL, 1, '[{"value":"lead","label":"Lead"},{"value":"aluno","label":"Aluno"}]', NULL),
  ('fld_lista_nome', 'tpl_lista_ac', 2, 'text', 'Nome da lista', 'Escreva normalmente, com espaços e acentos. A padronização é automática.', 'Ex.: Black Friday Novembro', 1, NULL, NULL),
  ('fld_tag_bu', 'tpl_tag_ac', 0, 'official_base', 'Business Unit', 'A BU responsável pela tag.', NULL, 1, NULL, 'business_unit'),
  ('fld_tag_nome', 'tpl_tag_ac', 1, 'text', 'Nome da tag', 'Escreva normalmente, com espaços e acentos. A padronização é automática.', 'Ex.: Interesse Extensivo', 1, NULL, NULL),
  ('fld_tag_mes', 'tpl_tag_ac', 2, 'month_year', 'Mês e ano', 'Mês e ano de referência da tag.', NULL, 1, NULL, NULL),
  ('fld_meta_bu', 'tpl_campanha_meta', 0, 'official_base', 'Business Unit', 'A BU da campanha.', NULL, 1, NULL, 'business_unit'),
  ('fld_meta_obj', 'tpl_campanha_meta', 1, 'select', 'Objetivo', 'Objetivo no Gerenciador de Anúncios.', NULL, 1, '[{"value":"conversao","label":"Conversão / Vendas"},{"value":"leads","label":"Captação de Leads"},{"value":"trafego","label":"Tráfego"},{"value":"alcance","label":"Reconhecimento / Alcance"}]', NULL),
  ('fld_meta_nome', 'tpl_campanha_meta', 2, 'text', 'Nome da campanha', 'Nome ou tema do lançamento.', 'Ex.: Extensivo R1 Turma 2', 1, NULL, NULL),
  ('fld_meta_mes', 'tpl_campanha_meta', 3, 'month_year', 'Mês e ano', 'Período da veiculação.', NULL, 1, NULL, NULL),
  ('fld_utm_bu', 'tpl_utm_link', 0, 'official_base', 'Business Unit', 'A BU divulgada.', NULL, 1, NULL, 'business_unit'),
  ('fld_utm_source', 'tpl_utm_link', 1, 'select', 'Origem (utm_source)', 'Onde o link será clicado.', NULL, 1, '[{"value":"instagram","label":"Instagram"},{"value":"meta_ads","label":"Meta Ads"},{"value":"google_ads","label":"Google Ads"},{"value":"youtube","label":"YouTube"},{"value":"email","label":"E-mail Marketing"},{"value":"whatsapp","label":"WhatsApp"}]', NULL),
  ('fld_utm_medium', 'tpl_utm_link', 2, 'select', 'Mídia (utm_medium)', 'Formato do canal.', NULL, 1, '[{"value":"cpc","label":"Pago (CPC)"},{"value":"stories","label":"Stories Organico"},{"value":"bio","label":"Link na Bio"},{"value":"newsletter","label":"Newsletter"},{"value":"direct","label":"Mensagem Direta"}]', NULL),
  ('fld_utm_campaign', 'tpl_utm_link', 3, 'text', 'Campanha (utm_campaign)', 'Nome da ação ou promoção.', 'Ex.: lancamento_intensivo_2026', 1, NULL, NULL);
