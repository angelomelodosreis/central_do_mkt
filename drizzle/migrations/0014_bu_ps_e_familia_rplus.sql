-- Corrige o nome da BU "PS" e vincula as famílias R+ e PS.
--
-- A BU estava cadastrada como "Lifehacks" e ficou em MedCof Especialidades pela
-- regra padrão, porque nenhuma BU casava com o "PS" da estrutura informada.
-- Eram a mesma BU: o nome é PS, e ela pertence a Formação Médica.
--
-- O IDENTIFICADOR (`slug`) NÃO muda aqui, de propósito. Ele é o que entra nos
-- nomes já gerados e registrados fora da plataforma — trocá-lo faria as listas
-- antigas (`lifehacks-…`) deixarem de corresponder às novas. É uma decisão
-- separada, que depende de quanto `lifehacks` já circulou no CRM.

UPDATE `business_unit`
   SET `label` = 'PS',
       `division_id` = 'div_formacao_medica',
       `updated_at` = unixepoch()
 WHERE `slug` = 'lifehacks';
--> statement-breakpoint

-- O squad acompanha o nome da BU: ele nasceu como "Squad Lifehacks".
UPDATE `squad`
   SET `name` = 'Squad PS',
       `updated_at` = unixepoch()
 WHERE `business_unit_id` = (SELECT id FROM `business_unit` WHERE `slug` = 'lifehacks');
--> statement-breakpoint

UPDATE `product`
   SET `business_unit_id` = (SELECT id FROM `business_unit` WHERE `slug` = 'lifehacks'),
       `updated_at` = unixepoch()
 WHERE `slug` IN ('ps_life_hacks', 'situacoes_clinicas_ps');
--> statement-breakpoint

-- A família R+ vai para a mesma BU dos preparatórios de R1: públicos
-- diferentes, mesma frente de negócio.
UPDATE `product`
   SET `business_unit_id` = (SELECT id FROM `business_unit` WHERE `slug` = 'residencia'),
       `updated_at` = unixepoch()
 WHERE `slug` IN (
   'completao_rplus',
   'extensivo_rplus_maio',
   'hiit_target_rplus',
   'intensivo_hiit_rplus',
   'revisoes_vespera_rplus'
 );
