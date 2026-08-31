-- Vincula cada produto à sua Business Unit.
--
-- Só os casos inequívocos: o identificador nomeia a especialidade (`cosmiatria`,
-- `radiologia_descomplicada`), traz a sigla da sociedade (`cbc` = Colégio
-- Brasileiro de Cirurgiões, `radio_cbr` = Colégio Brasileiro de Radiologia) ou é
-- um título de especialista cuja sigla corresponde a uma BU existente
-- (`tego` → Ginecologia e Obstetrícia, `teot_tepot` → Ortopedia).
--
-- Os ambíguos ficam de fora de propósito: preenchê-los por semelhança produziria
-- dado errado com cara de dado certo, e o nome gerado sairia com a BU trocada
-- sem nada reclamar.
--
-- Escrito por `slug` e não por id: os ids de produto vêm do próprio slug hoje,
-- mas o slug é o que foi informado e o que sobrevive a um recadastro.

UPDATE `product` SET `business_unit_id` = (
  SELECT bu.id FROM `business_unit` bu WHERE bu.slug = CASE `product`.slug

    -- Anestesiologia: TEA e TSA são os títulos da SBA; `anest_us` é o de
    -- ultrassonografia em anestesia.
    WHEN 'anest_us'            THEN 'anestesiologia'
    WHEN 'tea'                 THEN 'anestesiologia'
    WHEN 'tea_seriado'         THEN 'anestesiologia'
    WHEN 'tsa'                 THEN 'anestesiologia'

    -- Cardiologia
    WHEN 'ecg_sem_segredo'     THEN 'cardiologia'
    WHEN 'tec'                 THEN 'cardiologia'

    -- Cirurgia
    WHEN 'cbc'                 THEN 'cirurgia'
    WHEN 'cirurgia_hands_on'   THEN 'cirurgia'

    -- Clínica Médica
    WHEN 'tecm'                THEN 'clinica_medica'

    -- Dermatologia: TED é o título da SBD; os extensivos e o HIIT são
    -- preparatórios para ele.
    WHEN 'cosmiatria'          THEN 'dermatologia'
    WHEN 'dermatoscopia'       THEN 'dermatologia'
    WHEN 'ted'                 THEN 'dermatologia'
    WHEN 'extensivo_ted_2027'  THEN 'dermatologia'
    WHEN 'extensivo_ted_2028'  THEN 'dermatologia'
    WHEN 'hiit_ted_2afase'     THEN 'dermatologia'

    -- Endocrinologia
    WHEN 'teem'                THEN 'endocrinologia'

    -- Enamed
    WHEN 'hiit_enamed'         THEN 'enamed'
    WHEN 'imersao_enamed'      THEN 'enamed'

    -- Ginecologia e Obstetrícia
    WHEN 'tego'                THEN 'ginecologia_e_obstetricia'
    WHEN 'tego_hands_on'       THEN 'ginecologia_e_obstetricia'

    -- Medicina de Emergência
    WHEN 'teme'                THEN 'medicina_de_emergencia'
    WHEN 'teme_hands_on'       THEN 'medicina_de_emergencia'

    -- Medicina Intensiva
    WHEN 'temi'                THEN 'medicina_intensiva'
    WHEN 'temi_hands_on'       THEN 'medicina_intensiva'

    -- Oftalmologia
    WHEN 'oftalmo_pno'         THEN 'oftalmologia'

    -- Ortopedia
    WHEN 'teot_tepot'          THEN 'ortopedia'
    WHEN 'teot_tepot_hands_on' THEN 'ortopedia'

    -- Pediatria
    WHEN 'tep'                 THEN 'pediatria'

    -- Radiologia
    WHEN 'radio_cbr'           THEN 'radiologia'
    WHEN 'radiologia_descomplicada' THEN 'radiologia'

    -- Residência: preparatórios para a prova de acesso direto (R1).
    WHEN 'extensivo_performance_r1' THEN 'residencia'
    WHEN 'extensivo_r1_maio'   THEN 'residencia'
    WHEN 'hiit_target_r1'      THEN 'residencia'
    WHEN 'intensivo_hiit_r1'   THEN 'residencia'

    -- Revalida
    WHEN 'revalida_hands_on'   THEN 'revalida'

    -- USA
    WHEN 'usa_usmle'           THEN 'usa'

    ELSE NULL
  END
)
WHERE `business_unit_id` IS NULL;
