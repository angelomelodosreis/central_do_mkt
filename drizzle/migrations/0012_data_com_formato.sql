-- O bloco de data passa a ter FORMATO.
--
-- `month_year` era um tipo de campo; virou um formato dentro do tipo `date`.
-- Como tipo, "dia, mês e ano" exigiria um segundo tipo com a mesma descrição,
-- o mesmo formulário e a mesma validação — e um terceiro no dia em que
-- aparecesse "só o ano".
--
-- Backfill antes de qualquer coisa: todo bloco existente é `month_year`, que é
-- exatamente o formato que ele já produzia. Nenhum nome gerado muda.
ALTER TABLE `naming_template_field` ADD `date_format` text;--> statement-breakpoint

UPDATE `naming_template_field`
   SET `field_type` = 'date',
       `date_format` = 'month_year'
 WHERE `field_type` = 'month_year';
