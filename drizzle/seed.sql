-- ---------------------------------------------------------------------------
-- Seed da Central do Marketing
--
-- Carrega os dados de referência iniciais: domínios de e-mail autorizados,
-- as 22 Business Units, a matriz de permissões padrão e as categorias/páginas
-- iniciais da documentação.
--
-- É seguro rodar mais de uma vez: todos os inserts usam INSERT OR IGNORE, então
-- nada é sobrescrito nem duplicado.
--
-- Aplicado por `npm run db:seed`, que usa o banco definido em
-- TURSO_DATABASE_URL (arquivo local em desenvolvimento, Turso em produção).
-- ---------------------------------------------------------------------------

-- Domínios de e-mail autorizados a se cadastrar --------------------------------
INSERT OR IGNORE INTO allowed_domain (id, domain, is_active, created_by, created_at) VALUES
  ('dom_grupomedcof', 'grupomedcof.com.br', 1, NULL, unixepoch()),
  ('dom_medcof',      'medcof.com.br',      1, NULL, unixepoch()),
  ('dom_medcof_tech', 'medcof.tech',        1, NULL, unixepoch());

-- Business Units --------------------------------------------------------------
-- `slug` é o valor usado na nomenclatura; `label` é o nome exibido na tela.
INSERT OR IGNORE INTO business_unit (id, slug, label, description, is_active, sort_order, created_at, updated_at) VALUES
  ('bu_anestesiologia',             'anestesiologia',             'Anestesiologia',             NULL, 1,  10, unixepoch(), unixepoch()),
  ('bu_cardiologia',                'cardiologia',                'Cardiologia',                NULL, 1,  20, unixepoch(), unixepoch()),
  ('bu_cirurgia',                   'cirurgia',                   'Cirurgia',                   NULL, 1,  30, unixepoch(), unixepoch()),
  ('bu_clinica_medica',             'clinica_medica',             'Clínica Médica',             NULL, 1,  40, unixepoch(), unixepoch()),
  ('bu_concursus',                  'concursus',                  'Concursus',                  NULL, 1,  50, unixepoch(), unixepoch()),
  ('bu_dermatologia',               'dermatologia',               'Dermatologia',               NULL, 1,  60, unixepoch(), unixepoch()),
  ('bu_enamed',                     'enamed',                     'Enamed',                     NULL, 1,  70, unixepoch(), unixepoch()),
  ('bu_endocrinologia',             'endocrinologia',             'Endocrinologia',             NULL, 1,  80, unixepoch(), unixepoch()),
  ('bu_endocrinologia_pediatrica',  'endocrinologia_pediatrica',  'Endocrinologia Pediátrica',  NULL, 1,  90, unixepoch(), unixepoch()),
  ('bu_ginecologia_e_obstetricia',  'ginecologia_e_obstetricia',  'Ginecologia e Obstetrícia',  NULL, 1, 100, unixepoch(), unixepoch()),
  ('bu_internato',                  'internato',                  'Internato',                  NULL, 1, 110, unixepoch(), unixepoch()),
  ('bu_lifehacks',                  'ps',                         'PS',                         NULL, 1, 120, unixepoch(), unixepoch()),
  ('bu_medicina_de_emergencia',     'medicina_de_emergencia',     'Medicina de Emergência',     NULL, 1, 130, unixepoch(), unixepoch()),
  ('bu_medicina_intensiva',         'medicina_intensiva',         'Medicina Intensiva',         NULL, 1, 140, unixepoch(), unixepoch()),
  ('bu_oftalmologia',               'oftalmologia',               'Oftalmologia',               NULL, 1, 150, unixepoch(), unixepoch()),
  ('bu_ortopedia',                  'ortopedia',                  'Ortopedia',                  NULL, 1, 160, unixepoch(), unixepoch()),
  ('bu_pediatria',                  'pediatria',                  'Pediatria',                  NULL, 1, 170, unixepoch(), unixepoch()),
  ('bu_radiologia',                 'radiologia',                 'Radiologia',                 NULL, 1, 180, unixepoch(), unixepoch()),
  ('bu_residencia',                 'residencia',                 'Residência',                 NULL, 1, 190, unixepoch(), unixepoch()),
  ('bu_revalida',                   'revalida',                   'Revalida',                   NULL, 1, 200, unixepoch(), unixepoch()),
  ('bu_urologia',                   'urologia',                   'Urologia',                   NULL, 1, 210, unixepoch(), unixepoch()),
  ('bu_usa',                        'usa',                        'USA',                        NULL, 1, 220, unixepoch(), unixepoch());

-- Matriz de permissões padrão (papel × módulo) --------------------------------
-- Pode ser alterada depois pela tela Administração > Permissões, sem deploy.
INSERT OR IGNORE INTO role_permission (id, role, module_key, can_view, can_edit, updated_at) VALUES
  -- Admin: acesso total
  ('perm_admin_name_generator',  'admin',  'name_generator', 1, 1, unixepoch()),
  ('perm_admin_documentation',   'admin',  'documentation',  1, 1, unixepoch()),
  ('perm_admin_personas',        'admin',  'personas',       1, 1, unixepoch()),
  ('perm_admin_strategy',        'admin',  'strategy',       1, 1, unixepoch()),
  ('perm_admin_parameters',      'admin',  'parameters',     1, 1, unixepoch()),
  ('perm_admin_admin',           'admin',  'admin',          1, 1, unixepoch()),
  -- Líder: usa e edita os módulos, mas não administra a plataforma
  ('perm_leader_name_generator', 'leader', 'name_generator', 1, 1, unixepoch()),
  ('perm_leader_documentation',  'leader', 'documentation',  1, 1, unixepoch()),
  ('perm_leader_personas',       'leader', 'personas',       1, 1, unixepoch()),
  ('perm_leader_strategy',       'leader', 'strategy',       1, 1, unixepoch()),
  ('perm_leader_parameters',     'leader', 'parameters',     1, 1, unixepoch()),
  -- Editor: produz conteúdo, não parametriza nem administra
  ('perm_editor_name_generator', 'editor', 'name_generator', 1, 0, unixepoch()),
  ('perm_editor_documentation',  'editor', 'documentation',  1, 1, unixepoch()),
  ('perm_editor_personas',       'editor', 'personas',       1, 1, unixepoch()),
  ('perm_editor_strategy',       'editor', 'strategy',       1, 1, unixepoch()),
  ('perm_editor_parameters',     'editor', 'parameters',     0, 0, unixepoch()),
  ('perm_editor_admin',          'editor', 'admin',          0, 0, unixepoch()),
  ('perm_leader_admin',          'leader', 'admin',          0, 0, unixepoch()),
  -- Membro: usa o gerador e lê a documentação
  ('perm_member_name_generator', 'member', 'name_generator', 1, 0, unixepoch()),
  ('perm_member_documentation',  'member', 'documentation',  1, 0, unixepoch()),
  ('perm_member_personas',       'member', 'personas',       1, 0, unixepoch()),
  ('perm_member_strategy',       'member', 'strategy',       1, 0, unixepoch()),
  ('perm_member_parameters',     'member', 'parameters',     0, 0, unixepoch()),
  ('perm_member_admin',          'member', 'admin',          0, 0, unixepoch());

-- Modelos de nomenclatura -----------------------------------------------------
-- Definem o que a ferramenta sabe nomear. Novos modelos podem ser criados pela
-- tela Administração > Nomenclaturas, sem precisar mexer aqui.
INSERT OR IGNORE INTO naming_template (id, slug, name, description, block_separator, is_active, sort_order, created_by, updated_by, created_at, updated_at) VALUES
  ('tpl_lista_ac', 'lista-activecampaign', 'Lista do ActiveCampaign', 'Listas de contatos no ActiveCampaign, separadas por BU e por tipo de público.', '-', 1, 10, NULL, NULL, unixepoch(), unixepoch()),
  ('tpl_tag_ac',   'tag-activecampaign',   'Tag do ActiveCampaign',   'Tags aplicadas a contatos no ActiveCampaign, com o mês e o ano de referência.', '-', 1, 20, NULL, NULL, unixepoch(), unixepoch());

-- Blocos de cada modelo. `position` define a ordem no nome final.
-- Lista: bu-tipo_de_lista-nome_da_lista
INSERT OR IGNORE INTO naming_template_field (id, template_id, position, field_type, label, hint, placeholder, is_required, options) VALUES
  ('fld_lista_bu',   'tpl_lista_ac', 0, 'business_unit', 'Business Unit',  'A BU responsável pela lista.', NULL, 1, NULL),
  ('fld_lista_tipo', 'tpl_lista_ac', 1, 'select',        'Tipo de lista',  'Lead para potenciais clientes, aluno para matriculados.', NULL, 1, '[{"value":"lead","label":"Lead"},{"value":"aluno","label":"Aluno"}]'),
  ('fld_lista_nome', 'tpl_lista_ac', 2, 'text',          'Nome da lista',  'Escreva normalmente, com espaços e acentos. A padronização é automática.', 'Ex.: Black Friday Novembro', 1, NULL);

-- Tag: bu-nome_da_tag-mes_ano
INSERT OR IGNORE INTO naming_template_field (id, template_id, position, field_type, label, hint, placeholder, is_required, options) VALUES
  ('fld_tag_bu',   'tpl_tag_ac', 0, 'business_unit', 'Business Unit', 'A BU responsável pela tag.', NULL, 1, NULL),
  ('fld_tag_nome', 'tpl_tag_ac', 1, 'text',          'Nome da tag',   'Escreva normalmente, com espaços e acentos. A padronização é automática.', 'Ex.: Interesse Extensivo', 1, NULL),
  ('fld_tag_mes',  'tpl_tag_ac', 2, 'month_year',    'Mês e ano',     'Mês e ano de referência da tag.', NULL, 1, NULL);

-- Categorias de documentação --------------------------------------------------
INSERT OR IGNORE INTO documentation_category (id, slug, name, description, page_template, sort_order, created_at, updated_at) VALUES
  ('cat_convencoes', 'convencoes', 'Convenções', 'Padrões de nomenclatura e dados de referência do time.', NULL, 10, unixepoch(), unixepoch()),
  ('cat_processos',  'processos',  'Processos',  'Como cada rotina do time de marketing funciona, passo a passo.', NULL, 20, unixepoch(), unixepoch()),
  ('cat_onboarding', 'onboarding', 'Onboarding', 'Primeiros passos para novos membros do time.', NULL, 30, unixepoch(), unixepoch());

-- Alinhamentos entre setores --------------------------------------------------
-- O `page_template` é o esqueleto que toda página nova desta categoria já traz
-- preenchido. Os tópicos são fixos, o conteúdo de cada um é livre: é o que
-- permite documentar um alinhamento de checkout e um de fluxo operacional no
-- mesmo formato, sem criar um formulário para cada tipo.
--
-- É gravado no mesmo formato estruturado do corpo de uma página (o do editor
-- visual), e não em Markdown, porque é exatamente isso que ele vira ao abrir
-- uma página nova.
INSERT OR IGNORE INTO documentation_category (id, slug, name, description, page_template, sort_order, created_at, updated_at) VALUES
  (
    'cat_alinhamentos',
    'alinhamentos-entre-setores',
    'Alinhamentos entre Setores',
    'O que já foi combinado com cada setor: decisões, responsáveis e pendências.',
    '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Setores envolvidos:"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Data do alinhamento:"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Participantes:"}]},{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Status:"},{"type":"text","text":" ativo"}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Contexto"}]},{"type":"paragraph","content":[{"type":"text","text":"Por que esse alinhamento aconteceu e qual problema ele resolve."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"O que ficou decidido"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Quem faz o quê"}]},{"type":"table","content":[{"type":"tableRow","content":[{"type":"tableHeader","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"align":null},"content":[{"type":"paragraph","content":[{"type":"text","text":"Item"}]}]},{"type":"tableHeader","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"align":null},"content":[{"type":"paragraph","content":[{"type":"text","text":"Responsável"}]}]},{"type":"tableHeader","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"align":null},"content":[{"type":"paragraph","content":[{"type":"text","text":"Prazo"}]}]}]},{"type":"tableRow","content":[{"type":"tableCell","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"align":null},"content":[{"type":"paragraph"}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"align":null},"content":[{"type":"paragraph"}]},{"type":"tableCell","attrs":{"colspan":1,"rowspan":1,"colwidth":null,"align":null},"content":[{"type":"paragraph"}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Pendências"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Onde isso vive"}]},{"type":"paragraph","content":[{"type":"text","text":"Links para LP, checkout, automação, planilha ou board relacionados."}]}]}',
    15,
    unixepoch(),
    unixepoch()
  );

-- Páginas iniciais ------------------------------------------------------------
-- A página de Business Units usa page_type = 'business_units_reference': o
-- conteúdo não é texto colado, é a tabela `business_unit` renderizada ao vivo.
INSERT OR IGNORE INTO documentation_page
  (id, category_id, slug, title, summary, page_type, content_format, content, visibility, sort_order, created_by, updated_by, created_at, updated_at)
VALUES
  (
    'page_business_units',
    'cat_convencoes',
    'business-units',
    'Business Units (BUs)',
    'Lista oficial das Business Units da MedCof. Esta é a fonte única de verdade, usada também pelo Gerador de Nomes.',
    'business_units_reference',
    'markdown',
    NULL,
    'all_active_users',
    10,
    NULL, NULL, unixepoch(), unixepoch()
  ),
  (
    'page_nomenclatura_listas',
    'cat_convencoes',
    'nomenclatura-de-listas',
    'Padrões de nomenclatura',
    'Formatos obrigatórios para nomear listas, tags e demais itens do CRM.',
    'standard',
    'markdown',
    '## Como funciona

Todo nome é montado por **blocos separados por hífen** (`-`). Dentro de cada bloco, as palavras são unidas por **underscore** (`_`).

A sequência de blocos muda conforme o que está sendo nomeado. O [Gerador de Nomes](/gerador-de-nomes) já conhece cada formato: basta escolher o que você quer nomear e preencher os campos.

## Formatos em uso

### Lista do ActiveCampaign

```
bu-tipo_de_lista-nome_da_lista
```

| Bloco | O que é | Valores aceitos |
| --- | --- | --- |
| `bu` | A Business Unit responsável | Um dos slugs da página [Business Units](/documentacao/convencoes/business-units) |
| `tipo_de_lista` | Se é público potencial ou matriculado | `lead` ou `aluno` |
| `nome_da_lista` | Identificação livre | Texto livre, padronizado automaticamente |

Exemplos:

| O que você quer nomear | Nome padronizado |
| --- | --- |
| Leads da Black Friday de novembro, BU Cardiologia | `cardiologia-lead-black_friday_novembro` |
| Alunos da turma 2026 de Clínica Médica | `clinica_medica-aluno-turma_2026` |
| Leads do webinário de Revalida | `revalida-lead-webinario` |

### Tag do ActiveCampaign

```
bu-nome_da_tag-mes_ano
```

| Bloco | O que é | Valores aceitos |
| --- | --- | --- |
| `bu` | A Business Unit responsável | Um dos slugs da página [Business Units](/documentacao/convencoes/business-units) |
| `nome_da_tag` | Identificação livre da tag | Texto livre, padronizado automaticamente |
| `mes_ano` | Mês e ano de referência | Formato `MM_AAAA` |

Exemplos:

| O que você quer nomear | Nome padronizado |
| --- | --- |
| Interesse em Extensivo, BU Pediatria, novembro de 2026 | `pediatria-interesse_extensivo-11_2026` |
| Abandono de carrinho, BU Revalida, janeiro de 2027 | `revalida-abandono_carrinho-01_2027` |

## Regras de conversão automática

O [Gerador de Nomes](/gerador-de-nomes) aplica estas regras ao que você digita, para que ninguém precise fazer isso na mão:

- Acentos são removidos: `Emergência` vira `emergencia`
- Tudo vira minúsculo
- Espaços e pontuação viram `_`
- Underscores repetidos são reduzidos a um só
- `&` vira `e`

> **Sempre use o Gerador de Nomes.** Nomear na mão é a principal fonte de itens duplicados e relatórios quebrados no CRM.

## Precisa de um formato novo?

Os formatos ficam cadastrados na plataforma, não no código. Um administrador pode criar um novo tipo (campanha, automação, formulário...) em **Administração → Nomenclaturas**, e ele passa a aparecer no gerador imediatamente.',
    'all_active_users',
    20,
    NULL, NULL, unixepoch(), unixepoch()
  );

-- ---------------------------------------------------------------------------
-- Estrutura de negócio: divisão de cada BU e BU de cada produto.
--
-- Repete o que as migrations 0011 a 0015 fizeram, e a repetição é proposital:
-- as migrations levam um banco EXISTENTE até aqui; este bloco leva um banco
-- NOVO ao mesmo lugar. Sem ele, `setup:local` do zero termina com as BUs sem
-- divisão e os 64 produtos sem BU — porque o seed roda depois das migrations,
-- e naquele momento a tabela `business_unit` ainda estava vazia para elas.
--
-- Ao mudar o mapeamento, mude nos dois lugares.
-- ---------------------------------------------------------------------------

UPDATE business_unit SET division_id = 'div_revalidacao'
 WHERE slug IN ('revalida', 'usa') AND division_id IS NULL;

UPDATE business_unit SET division_id = 'div_formacao_medica'
 WHERE slug IN ('enamed', 'internato', 'residencia', 'ps') AND division_id IS NULL;

UPDATE business_unit SET division_id = 'div_especialidades'
 WHERE division_id IS NULL;

UPDATE squad SET slug = 'ps', name = 'Squad PS'
 WHERE business_unit_id = 'bu_lifehacks' AND slug <> 'ps';

UPDATE product SET business_unit_id = (
  SELECT bu.id FROM business_unit bu WHERE bu.slug = CASE product.slug
    WHEN 'anest_us'                     THEN 'anestesiologia'
    WHEN 'tea'                          THEN 'anestesiologia'
    WHEN 'tea_seriado'                  THEN 'anestesiologia'
    WHEN 'tsa'                          THEN 'anestesiologia'
    WHEN 'ecg_sem_segredo'              THEN 'cardiologia'
    WHEN 'tec'                          THEN 'cardiologia'
    WHEN 'cbc'                          THEN 'cirurgia'
    WHEN 'cirurgia_hands_on'            THEN 'cirurgia'
    WHEN 'tecm'                         THEN 'clinica_medica'
    WHEN 'concursus'                    THEN 'concursus'
    WHEN 'aprova'                       THEN 'dermatologia'
    WHEN 'cosmiatria'                   THEN 'dermatologia'
    WHEN 'dermatoscopia'                THEN 'dermatologia'
    WHEN 'extensivo_ted_2027'           THEN 'dermatologia'
    WHEN 'extensivo_ted_2028'           THEN 'dermatologia'
    WHEN 'hiit_ted_2afase'              THEN 'dermatologia'
    WHEN 'ted'                          THEN 'dermatologia'
    WHEN 'tpi'                          THEN 'dermatologia'
    WHEN 'enamed'                       THEN 'enamed'
    WHEN 'hiit_enamed'                  THEN 'enamed'
    WHEN 'imersao_enamed'               THEN 'enamed'
    WHEN 'teem'                         THEN 'endocrinologia'
    WHEN 'caaep'                        THEN 'endocrinologia_pediatrica'
    WHEN 'tego'                         THEN 'ginecologia_e_obstetricia'
    WHEN 'tego_hands_on'                THEN 'ginecologia_e_obstetricia'
    WHEN 'internato'                    THEN 'internato'
    WHEN 'teme'                         THEN 'medicina_de_emergencia'
    WHEN 'teme_hands_on'                THEN 'medicina_de_emergencia'
    WHEN 'temi'                         THEN 'medicina_intensiva'
    WHEN 'temi_hands_on'                THEN 'medicina_intensiva'
    WHEN 'oftalmo_pno'                  THEN 'oftalmologia'
    WHEN 'teot_tepot'                   THEN 'ortopedia'
    WHEN 'teot_tepot_hands_on'          THEN 'ortopedia'
    WHEN 'tep'                          THEN 'pediatria'
    WHEN 'antibioticoterapia_na_pratica' THEN 'ps'
    WHEN 'ps_life_hacks'                THEN 'ps'
    WHEN 'situacoes_clinicas_ps'        THEN 'ps'
    WHEN 'ventilacao_mecanica'          THEN 'ps'
    WHEN 'radio_cbr'                    THEN 'radiologia'
    WHEN 'radiologia_descomplicada'     THEN 'radiologia'
    WHEN 'cofcards'                     THEN 'residencia'
    WHEN 'cofquest'                     THEN 'residencia'
    WHEN 'completao_rplus'              THEN 'residencia'
    WHEN 'extensivo_performance_r1'     THEN 'residencia'
    WHEN 'extensivo_r1_maio'            THEN 'residencia'
    WHEN 'extensivo_rplus_maio'         THEN 'residencia'
    WHEN 'hands_on_especificos'         THEN 'residencia'
    WHEN 'hands_on_tradicional'         THEN 'residencia'
    WHEN 'hiit_target_r1'               THEN 'residencia'
    WHEN 'hiit_target_rplus'            THEN 'residencia'
    WHEN 'intensivo_hiit_r1'            THEN 'residencia'
    WHEN 'intensivo_hiit_rplus'         THEN 'residencia'
    WHEN 'livros_ebooks'                THEN 'residencia'
    WHEN 'mentoria'                     THEN 'residencia'
    WHEN 'raiox_da_banca'               THEN 'residencia'
    WHEN 'residencia'                   THEN 'residencia'
    WHEN 'revisao_vespera_2afase'       THEN 'residencia'
    WHEN 'revisoes_vespera_rplus'       THEN 'residencia'
    WHEN 'simulado_tendencias'          THEN 'residencia'
    WHEN 'recursos_individuais'         THEN 'revalida'
    WHEN 'revalida'                     THEN 'revalida'
    WHEN 'revalida_hands_on'            THEN 'revalida'
    WHEN 'pro_tisbu'                    THEN 'urologia'
    WHEN 'usa_usmle'                    THEN 'usa'
    ELSE NULL
  END
)
WHERE business_unit_id IS NULL;
