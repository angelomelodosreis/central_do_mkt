-- Fecha o mapeamento produto → BU e troca o identificador da BU PS.
--
-- O identificador muda aqui, e é a única migration que faz isso: `lifehacks`
-- some da ferramenta a pedido, então os nomes gerados a partir de agora saem
-- com `ps`. As listas já criadas no CRM com `lifehacks-…` continuam existindo
-- lá e deixam de corresponder — foi decisão consciente, não descuido.

UPDATE `business_unit`
   SET `slug` = 'ps', `updated_at` = unixepoch()
 WHERE `slug` = 'lifehacks';
--> statement-breakpoint

-- O squad é criado com o slug da BU e precisa acompanhar, senão fica um
-- `lifehacks` órfão num identificador único.
UPDATE `squad`
   SET `slug` = 'ps', `updated_at` = unixepoch()
 WHERE `slug` = 'lifehacks';
--> statement-breakpoint

-- Os 16 produtos que faltavam. Informados um a um; nada aqui é dedução.
UPDATE `product` SET `business_unit_id` = (
  SELECT bu.id FROM `business_unit` bu WHERE bu.slug = CASE `product`.slug

    WHEN 'antibioticoterapia_na_pratica' THEN 'ps'
    WHEN 'ventilacao_mecanica'      THEN 'ps'

    WHEN 'aprova'                   THEN 'dermatologia'
    WHEN 'tpi'                      THEN 'dermatologia'

    WHEN 'caaep'                    THEN 'endocrinologia_pediatrica'

    WHEN 'pro_tisbu'                THEN 'urologia'

    WHEN 'recursos_individuais'     THEN 'revalida'

    -- O catálogo transversal pertence a Residência: é o público que consome
    -- banco de questões, flashcards, mentoria e simulados.
    WHEN 'cofcards'                 THEN 'residencia'
    WHEN 'cofquest'                 THEN 'residencia'
    WHEN 'hands_on_especificos'     THEN 'residencia'
    WHEN 'hands_on_tradicional'     THEN 'residencia'
    WHEN 'livros_ebooks'            THEN 'residencia'
    WHEN 'mentoria'                 THEN 'residencia'
    WHEN 'raiox_da_banca'           THEN 'residencia'
    WHEN 'revisao_vespera_2afase'   THEN 'residencia'
    WHEN 'simulado_tendencias'      THEN 'residencia'

    ELSE NULL
  END
)
WHERE `business_unit_id` IS NULL;
