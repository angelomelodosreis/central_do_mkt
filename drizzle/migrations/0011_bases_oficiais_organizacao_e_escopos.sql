-- Bases oficiais de negócio, estrutura organizacional em três níveis,
-- cargo global, squad como entidade própria e escopos de responsabilidade.
--
-- A ordem importa: todo backfill acontece ANTES do DROP correspondente, para
-- que nenhuma informação existente seja perdida ao mudar o formato.

-- ---------------------------------------------------------------------------
-- 1. Divisões de negócio
-- ---------------------------------------------------------------------------
CREATE TABLE `business_division` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `is_active` integer DEFAULT true NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_division_slug_unique` ON `business_division` (`slug`);--> statement-breakpoint
CREATE INDEX `business_division_is_active_idx` ON `business_division` (`is_active`);--> statement-breakpoint

INSERT INTO `business_division` (id, slug, name, description, sort_order, created_by, created_at, updated_at) VALUES
  ('div_especialidades', 'especialidades', 'MedCof Especialidades', 'Preparação para títulos e provas de especialidade.', 10, 'migration_0011', unixepoch(), unixepoch()),
  ('div_formacao_medica', 'formacao_medica', 'MedCof Formação Médica', 'Da graduação à residência.', 20, 'migration_0011', unixepoch(), unixepoch()),
  ('div_revalidacao', 'revalidacao', 'MedCof Revalidação', 'Revalidação de diploma e habilitação no exterior.', 30, 'migration_0011', unixepoch(), unixepoch());
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 2. BU passa a apontar para a divisão
--
-- A regra vira DADO aqui, uma vez. Como condicional no frontend, ela precisaria
-- ser repetida em cada tela que agrupa BUs — e divergir na primeira vez que uma
-- BU mudasse de divisão.
-- ---------------------------------------------------------------------------
ALTER TABLE `business_unit` ADD `division_id` text;--> statement-breakpoint
CREATE INDEX `business_unit_division_idx` ON `business_unit` (`division_id`);--> statement-breakpoint

UPDATE `business_unit` SET `division_id` = 'div_revalidacao' WHERE `slug` IN ('revalida', 'usa');--> statement-breakpoint
UPDATE `business_unit` SET `division_id` = 'div_formacao_medica' WHERE `slug` IN ('enamed', 'internato', 'residencia');--> statement-breakpoint
-- "Todas as demais pertencem a Especialidades" é a regra informada, então o
-- resto recebe Especialidades em vez de ficar nulo.
UPDATE `business_unit` SET `division_id` = 'div_especialidades' WHERE `division_id` IS NULL;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 3. Base oficial de Produtos
--
-- `business_unit_id` fica NULO: o mapeamento produto → BU ainda não foi
-- informado, e preenchê-lo por semelhança produziria dado errado com cara de
-- dado certo. Só os produtos cujo identificador é IDÊNTICO ao de uma BU são
-- associados — isso é leitura de dado existente, não palpite.
-- ---------------------------------------------------------------------------
CREATE TABLE `product` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `business_unit_id` text REFERENCES business_unit(id) ON DELETE set null,
  `is_active` integer DEFAULT true NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_slug_unique` ON `product` (`slug`);--> statement-breakpoint
CREATE INDEX `product_business_unit_idx` ON `product` (`business_unit_id`);--> statement-breakpoint
CREATE INDEX `product_is_active_idx` ON `product` (`is_active`);--> statement-breakpoint

INSERT INTO `product` (id, slug, name, sort_order, created_by, created_at, updated_at)
SELECT id, slug, name, sort_order, 'migration_0011', unixepoch(), unixepoch()
FROM (SELECT
  column1 AS id, column2 AS slug, column3 AS name, column4 AS sort_order
  FROM (VALUES
  ('prd_anest_us', 'anest_us', 'Anest US', 10),
  ('prd_antibioticoterapia_na_pratica', 'antibioticoterapia_na_pratica', 'Antibioticoterapia na Prática', 20),
  ('prd_aprova', 'aprova', 'Aprova', 30),
  ('prd_caaep', 'caaep', 'CAAEP', 40),
  ('prd_cbc', 'cbc', 'CBC', 50),
  ('prd_cirurgia_hands_on', 'cirurgia_hands_on', 'Cirurgia Hands On', 60),
  ('prd_cofcards', 'cofcards', 'CofCards', 70),
  ('prd_cofquest', 'cofquest', 'CofQuest', 80),
  ('prd_completao_rplus', 'completao_rplus', 'Completão R+', 90),
  ('prd_concursus', 'concursus', 'Concursus', 100),
  ('prd_cosmiatria', 'cosmiatria', 'Cosmiatria', 110),
  ('prd_dermatoscopia', 'dermatoscopia', 'Dermatoscopia', 120),
  ('prd_ecg_sem_segredo', 'ecg_sem_segredo', 'ECG sem Segredo', 130),
  ('prd_enamed', 'enamed', 'Enamed', 140),
  ('prd_extensivo_performance_r1', 'extensivo_performance_r1', 'Extensivo Performance R1', 150),
  ('prd_extensivo_r1_maio', 'extensivo_r1_maio', 'Extensivo R1 Maio', 160),
  ('prd_extensivo_rplus_maio', 'extensivo_rplus_maio', 'Extensivo R+ Maio', 170),
  ('prd_extensivo_ted_2027', 'extensivo_ted_2027', 'Extensivo TED 2027', 180),
  ('prd_extensivo_ted_2028', 'extensivo_ted_2028', 'Extensivo TED 2028', 190),
  ('prd_hands_on_especificos', 'hands_on_especificos', 'Hands On Específicos', 200),
  ('prd_hands_on_tradicional', 'hands_on_tradicional', 'Hands On Tradicional', 210),
  ('prd_hiit_enamed', 'hiit_enamed', 'HIIT Enamed', 220),
  ('prd_hiit_target_r1', 'hiit_target_r1', 'HIIT Target R1', 230),
  ('prd_hiit_target_rplus', 'hiit_target_rplus', 'HIIT Target R+', 240),
  ('prd_hiit_ted_2afase', 'hiit_ted_2afase', 'HIIT TED 2ª Fase', 250),
  ('prd_imersao_enamed', 'imersao_enamed', 'Imersão Enamed', 260),
  ('prd_intensivo_hiit_r1', 'intensivo_hiit_r1', 'Intensivo HIIT R1', 270),
  ('prd_intensivo_hiit_rplus', 'intensivo_hiit_rplus', 'Intensivo HIIT R+', 280),
  ('prd_internato', 'internato', 'Internato', 290),
  ('prd_livros_ebooks', 'livros_ebooks', 'Livros E-books', 300),
  ('prd_mentoria', 'mentoria', 'Mentoria', 310),
  ('prd_oftalmo_pno', 'oftalmo_pno', 'Oftalmo PNO', 320),
  ('prd_pro_tisbu', 'pro_tisbu', 'Pro TISBU', 330),
  ('prd_ps_life_hacks', 'ps_life_hacks', 'PS Life Hacks', 340),
  ('prd_radio_cbr', 'radio_cbr', 'Radio CBR', 350),
  ('prd_radiologia_descomplicada', 'radiologia_descomplicada', 'Radiologia Descomplicada', 360),
  ('prd_raiox_da_banca', 'raiox_da_banca', 'Raio-X da Banca', 370),
  ('prd_recursos_individuais', 'recursos_individuais', 'Recursos Individuais', 380),
  ('prd_residencia', 'residencia', 'Residência', 390),
  ('prd_revalida', 'revalida', 'Revalida', 400),
  ('prd_revalida_hands_on', 'revalida_hands_on', 'Revalida Hands On', 410),
  ('prd_revisao_vespera_2afase', 'revisao_vespera_2afase', 'Revisão Véspera 2ª Fase', 420),
  ('prd_revisoes_vespera_rplus', 'revisoes_vespera_rplus', 'Revisões Véspera R+', 430),
  ('prd_simulado_tendencias', 'simulado_tendencias', 'Simulado Tendências', 440),
  ('prd_situacoes_clinicas_ps', 'situacoes_clinicas_ps', 'Situações Clínicas PS', 450),
  ('prd_tea', 'tea', 'TEA', 460),
  ('prd_tea_seriado', 'tea_seriado', 'TEA Seriado', 470),
  ('prd_tec', 'tec', 'TEC', 480),
  ('prd_tecm', 'tecm', 'TECM', 490),
  ('prd_ted', 'ted', 'TED', 500),
  ('prd_teem', 'teem', 'TEEM', 510),
  ('prd_tego', 'tego', 'TEGO', 520),
  ('prd_tego_hands_on', 'tego_hands_on', 'TEGO Hands On', 530),
  ('prd_teme', 'teme', 'TEME', 540),
  ('prd_teme_hands_on', 'teme_hands_on', 'TEME Hands On', 550),
  ('prd_temi', 'temi', 'TEMI', 560),
  ('prd_temi_hands_on', 'temi_hands_on', 'TEMI Hands On', 570),
  ('prd_teot_tepot', 'teot_tepot', 'TEOT TEPOT', 580),
  ('prd_teot_tepot_hands_on', 'teot_tepot_hands_on', 'TEOT TEPOT Hands On', 590),
  ('prd_tep', 'tep', 'TEP', 600),
  ('prd_tpi', 'tpi', 'TPI', 610),
  ('prd_tsa', 'tsa', 'TSA', 620),
  ('prd_usa_usmle', 'usa_usmle', 'USA USMLE', 630),
  ('prd_ventilacao_mecanica', 'ventilacao_mecanica', 'Ventilação Mecânica', 640)
  ));
--> statement-breakpoint

UPDATE `product` SET `business_unit_id` = (
  SELECT bu.id FROM `business_unit` bu WHERE bu.slug = `product`.slug
) WHERE EXISTS (SELECT 1 FROM `business_unit` bu WHERE bu.slug = `product`.slug);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 4. Estrutura organizacional em três níveis
--
-- Os três níveis moram na mesma tabela: a pergunta que o sistema faz é sempre
-- "o que está abaixo disto?", e três tabelas obrigariam a escrevê-la três vezes.
-- ---------------------------------------------------------------------------
ALTER TABLE `team` RENAME COLUMN `parent_team_id` TO `parent_org_unit_id`;--> statement-breakpoint
ALTER TABLE `team` ADD `kind` text DEFAULT 'team' NOT NULL;--> statement-breakpoint
CREATE INDEX `team_kind_idx` ON `team` (`kind`);--> statement-breakpoint

INSERT INTO `team` (id, slug, name, description, kind, is_active, sort_order, parent_org_unit_id, created_by, created_at, updated_at) VALUES
  ('team_marketing', 'marketing', 'Marketing', 'Setor de marketing.', 'sector', true, 0, NULL, 'migration_0011', unixepoch(), unixepoch()),
  ('team_copy', 'copy', 'Copy', NULL, 'team', true, 20, 'team_conteudo', 'migration_0011', unixepoch(), unixepoch()),
  ('team_videomakers', 'videomakers', 'Videomakers', NULL, 'team', true, 30, 'team_conteudo', 'migration_0011', unixepoch(), unixepoch()),
  ('team_social_media', 'social-media', 'Social Media', NULL, 'team', true, 40, 'team_conteudo', 'migration_0011', unixepoch(), unixepoch()),
  ('team_comunicacao', 'comunicacao', 'Comunicação', NULL, 'team', true, 50, 'team_conteudo', 'migration_0011', unixepoch(), unixepoch()),
  ('team_marketing_produto', 'marketing-de-produto', 'Marketing de Produto', NULL, 'team', true, 10, 'team_planejamento', 'migration_0011', unixepoch(), unixepoch()),
  ('team_midia_aquisicao', 'midia-e-aquisicao', 'Mídia e Aquisição', NULL, 'team', true, 20, 'team_planejamento', 'migration_0011', unixepoch(), unixepoch()),
  ('team_desenvolvimento', 'desenvolvimento', 'Desenvolvimento', NULL, 'team', true, 30, 'team_planejamento', 'migration_0011', unixepoch(), unixepoch());
--> statement-breakpoint

-- Conteúdo e Planejamento deixam de ser times e passam a ser subsetores: é o
-- que são de fato, cada um com times abaixo.
UPDATE `team` SET `kind` = 'subsector', `parent_org_unit_id` = 'team_marketing', `sort_order` = 10 WHERE `id` = 'team_conteudo';--> statement-breakpoint
UPDATE `team` SET `kind` = 'subsector', `parent_org_unit_id` = 'team_marketing', `sort_order` = 20 WHERE `id` = 'team_planejamento';--> statement-breakpoint
-- Quem sobrou sem nível continua como time.
UPDATE `team` SET `kind` = 'team' WHERE `kind` IS NULL OR `kind` = '';--> statement-breakpoint

-- Quem estava no antigo time "Planejamento" passa para Marketing de Produto:
-- pessoa pertence a um TIME, e Planejamento virou o subsetor acima dele.
UPDATE `team_member` SET `team_id` = 'team_marketing_produto' WHERE `team_id` = 'team_planejamento';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 5. Cargo vira catálogo global e volta a morar na pessoa
--
-- Cargo por time estava errado: os cargos reais já carregam a área no nome
-- ("Supervisor de Design"), e cargo acompanha a pessoa — quem participa de três
-- frentes não tem três cargos.
-- ---------------------------------------------------------------------------
ALTER TABLE `user` ADD `job_title_id` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_super_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `user_job_title_idx` ON `user` (`job_title_id`);--> statement-breakpoint

-- O cargo de cada pessoa vem do vínculo principal, ou do primeiro que existir.
UPDATE `user` SET `job_title_id` = (
  SELECT tm.job_title_id FROM `team_member` tm
  WHERE tm.user_id = `user`.id AND tm.job_title_id IS NOT NULL
  ORDER BY tm.is_primary DESC, tm.created_at ASC LIMIT 1
);
--> statement-breakpoint

CREATE TABLE `job_title_novo` (
  `id` text PRIMARY KEY NOT NULL,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `suggested_team_id` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `is_active` integer DEFAULT true NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint

-- Catálogo informado, com `sort_order` refletindo senioridade — é o que faz o
-- organograma ler de cima para baixo em vez de em ordem alfabética.
INSERT INTO `job_title_novo` (id, slug, name, suggested_team_id, sort_order, created_by, created_at, updated_at) VALUES
  ('job_diretora_marketing', 'diretora-de-marketing', 'Diretora de Marketing', 'team_marketing', 10, 'migration_0011', unixepoch(), unixepoch()),
  ('job_gerente_conteudo', 'gerente-de-conteudo', 'Gerente de Conteúdo', 'team_conteudo', 20, 'migration_0011', unixepoch(), unixepoch()),
  ('job_plan_gerente', 'gerente-de-planejamento-de-marketing', 'Gerente de Planejamento de Marketing', 'team_planejamento', 20, 'migration_0011', unixepoch(), unixepoch()),
  ('job_plan_coordenador', 'coordenador', 'Coordenador', NULL, 30, 'migration_0011', unixepoch(), unixepoch()),
  ('job_coord_comunicacao', 'coordenadora-de-comunicacao', 'Coordenadora de Comunicação', 'team_comunicacao', 30, 'migration_0011', unixepoch(), unixepoch()),
  ('job_coord_branding', 'coordenadora-de-branding', 'Coordenadora de Branding', 'team_conteudo', 30, 'migration_0011', unixepoch(), unixepoch()),
  ('job_510194003cb346dab27e1336a3963592', 'supervisor-de-design', 'Supervisor de Design', 'team_4f7cb9296db54679be02c2ca9e1c489d', 40, 'migration_0011', unixepoch(), unixepoch()),
  ('job_plan_analista', 'analista-de-planejamento-de-marketing', 'Analista de Planejamento de Marketing', 'team_marketing_produto', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_analista_midia', 'analista-de-midia-de-performance', 'Analista de Mídia de Performance', 'team_midia_aquisicao', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_designer', 'designer', 'Designer', 'team_4f7cb9296db54679be02c2ca9e1c489d', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_copywriter', 'copywriter', 'Copywriter', 'team_copy', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_videomaker', 'videomaker', 'Videomaker', 'team_videomakers', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_social_media', 'social-media', 'Social Media', 'team_social_media', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_plan_desenvolvedor', 'desenvolvedor', 'Desenvolvedor', 'team_desenvolvimento', 50, 'migration_0011', unixepoch(), unixepoch()),
  ('job_plan_assistente', 'assistente-de-planejamento-de-marketing', 'Assistente de Planejamento de Marketing', 'team_marketing_produto', 60, 'migration_0011', unixepoch(), unixepoch()),
  ('job_plan_estagiario', 'estagiario', 'Estagiário', NULL, 70, 'migration_0011', unixepoch(), unixepoch());
--> statement-breakpoint

-- Cargos antigos que não têm equivalente no catálogo informado são preservados,
-- não apagados: alguém pode estar usando-os. Entram inativos, para não poluir o
-- seletor sem sumir do histórico.
INSERT OR IGNORE INTO `job_title_novo` (id, slug, name, suggested_team_id, sort_order, is_active, created_by, created_at, updated_at)
SELECT antigo.id, antigo.slug || '-' || substr(antigo.team_id, 1, 8), antigo.name, antigo.team_id, 900, false, 'migration_0011', unixepoch(), unixepoch()
FROM `job_title` antigo
WHERE antigo.id NOT IN (SELECT id FROM `job_title_novo`);
--> statement-breakpoint

DROP TABLE `job_title`;--> statement-breakpoint
ALTER TABLE `job_title_novo` RENAME TO `job_title`;--> statement-breakpoint
CREATE UNIQUE INDEX `job_title_slug_unique` ON `job_title` (`slug`);--> statement-breakpoint
CREATE INDEX `job_title_is_active_idx` ON `job_title` (`is_active`);--> statement-breakpoint
CREATE INDEX `job_title_team_idx` ON `job_title` (`suggested_team_id`);--> statement-breakpoint

-- Um cargo apontando para uma linha que não sobreviveu vira nulo em vez de
-- referência quebrada.
UPDATE `user` SET `job_title_id` = NULL WHERE `job_title_id` IS NOT NULL
  AND `job_title_id` NOT IN (SELECT id FROM `job_title`);--> statement-breakpoint

-- Agora que o cargo está na pessoa, sai do vínculo.
ALTER TABLE `team_member` DROP COLUMN `job_title_id`;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 6. Squad como entidade própria
--
-- Squad não é time: reúne, em torno de uma BU, gente de vários times mais
-- coordenadores e diretores médicos, que não pertencem ao marketing. Nasce da
-- BU, uma por BU, mas tem situação própria — "BU sem equipe montada" é um
-- estado real, e sem a tabela ele ficava indistinguível de "não sei".
-- ---------------------------------------------------------------------------
CREATE TABLE `squad` (
  `id` text PRIMARY KEY NOT NULL,
  `business_unit_id` text NOT NULL REFERENCES business_unit(id) ON DELETE cascade,
  `slug` text NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `is_active` integer DEFAULT true NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `squad_slug_unique` ON `squad` (`slug`);--> statement-breakpoint
CREATE INDEX `squad_business_unit_idx` ON `squad` (`business_unit_id`);--> statement-breakpoint

INSERT INTO `squad` (id, business_unit_id, slug, name, is_active, created_by, created_at, updated_at)
SELECT 'sqd_' || bu.slug, bu.id, bu.slug, 'Squad ' || bu.label, bu.is_active, 'migration_0011', unixepoch(), unixepoch()
FROM `business_unit` bu;
--> statement-breakpoint

CREATE TABLE `squad_member` (
  `id` text PRIMARY KEY NOT NULL,
  `squad_id` text NOT NULL REFERENCES squad(id) ON DELETE cascade,
  `user_id` text NOT NULL,
  `is_lead` integer DEFAULT false NOT NULL,
  `created_by` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `squad_member_unique` ON `squad_member` (`squad_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `squad_member_user_idx` ON `squad_member` (`user_id`);--> statement-breakpoint
CREATE INDEX `squad_member_squad_idx` ON `squad_member` (`squad_id`);--> statement-breakpoint

INSERT INTO `squad_member` (id, squad_id, user_id, is_lead, created_by, created_at)
SELECT 'sqm_' || bum.id, s.id, bum.user_id, bum.is_lead, bum.created_by, bum.created_at
FROM `business_unit_member` bum
JOIN `squad` s ON s.business_unit_id = bum.business_unit_id;
--> statement-breakpoint

DROP TABLE `business_unit_member`;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 7. Escopos de responsabilidade
--
-- O papel diz o que a pessoa pode fazer; isto diz sobre o quê. Sem a segunda
-- metade, dois gerentes com o mesmo cargo teriam obrigatoriamente o mesmo
-- alcance — que é justamente o que não acontece.
-- ---------------------------------------------------------------------------
CREATE TABLE `access_grant` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `scope_type` text NOT NULL,
  `scope_id` text,
  `note` text,
  `granted_by` text,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_grant_unique` ON `access_grant` (`user_id`,`scope_type`,`scope_id`);--> statement-breakpoint
CREATE INDEX `access_grant_user_idx` ON `access_grant` (`user_id`);--> statement-breakpoint
CREATE INDEX `access_grant_scope_idx` ON `access_grant` (`scope_type`,`scope_id`);--> statement-breakpoint

-- Preserva EXATAMENTE o alcance que já existia: até aqui, admin e líder viam
-- todas as BUs por regra fixa em código. Isso vira dado, um registro por
-- pessoa, e passa a ser revogável individualmente.
UPDATE `user` SET `is_super_admin` = true WHERE `role` = 'admin';--> statement-breakpoint

INSERT OR IGNORE INTO `access_grant` (id, user_id, scope_type, scope_id, note, granted_by, created_at)
SELECT 'agr_org_' || u.id, u.id, 'organization', NULL,
       'Convertido do alcance que o papel dava por padrão até a migração 0011.',
       'migration_0011', unixepoch()
FROM `user` u WHERE u.role IN ('admin', 'leader');
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 8. Gerador de Nomes: bases oficiais em vez de um tipo por base
-- ---------------------------------------------------------------------------
ALTER TABLE `naming_template_field` ADD `source_key` text;--> statement-breakpoint
UPDATE `naming_template_field` SET `field_type` = 'official_base', `source_key` = 'business_unit' WHERE `field_type` = 'business_unit';--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- 9. Documentação: "Convenções" vira "Bases e Regras de Negócio"
--
-- A seção deixa de ser só texto: passa a exibir as bases oficiais ao vivo, do
-- mesmo banco que alimenta o Gerador de Nomes.
-- ---------------------------------------------------------------------------
UPDATE `documentation_category`
   SET `name` = 'Bases e Regras de Negócio',
       `slug` = 'bases-e-regras-de-negocio',
       `description` = 'As bases oficiais do sistema — divisões, BUs e produtos — e as regras que o time segue.'
 WHERE `id` = 'cat_convencoes';
--> statement-breakpoint

INSERT OR IGNORE INTO `documentation_page` (id, category_id, slug, title, summary, page_type, content_format, visibility, scope, sort_order, created_by, created_at, updated_at) VALUES
  ('page_divisoes', 'cat_convencoes', 'divisoes-de-negocio', 'Divisões de Negócio', 'As três divisões da MedCof e as BUs de cada uma.', 'divisions_reference', 'markdown', 'all_active_users', 'general', 5, 'migration_0011', unixepoch(), unixepoch()),
  ('page_produtos', 'cat_convencoes', 'produtos', 'Produtos', 'A base oficial de produtos e a BU de cada um.', 'products_reference', 'markdown', 'all_active_users', 'general', 15, 'migration_0011', unixepoch(), unixepoch());
