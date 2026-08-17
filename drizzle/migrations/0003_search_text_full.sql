-- Recalcula a coluna de busca incluindo título e resumo, não só o corpo.
--
-- Ter tudo numa coluna só é o que permite à busca fazer uma comparação por
-- palavra: normalizar cada coluna dentro da consulta multiplicava os parâmetros
-- e estourava o limite do SQLite.
--
-- As páginas com corpo estruturado (JSON) são reescritas pelo aplicativo assim
-- que forem salvas; aqui o JSON entra como texto mesmo, o que no pior caso gera
-- acerto a mais, nunca a menos.
--
-- Os replace() são aplicados em lotes, um statement por lote, e não num único
-- aninhamento de 48 chamadas: o parser do libSQL/Turso estoura a pilha antes
-- disso (SQLITE_ERROR: parser stack overflow). O resultado final é idêntico.
UPDATE `documentation_page`
SET `search_text` = lower(`title` || char(10) || coalesce(`summary`,'') || char(10) || coalesce(`content`,''));
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'á', 'a'), 'à', 'a'), 'â', 'a'), 'ã', 'a'), 'ä', 'a'), 'é', 'e');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'í', 'i'), 'ì', 'i'), 'î', 'i');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'ï', 'i'), 'ó', 'o'), 'ò', 'o'), 'ô', 'o'), 'õ', 'o'), 'ö', 'o');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'ú', 'u'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ñ', 'n');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'Á', 'a'), 'À', 'a'), 'Â', 'a'), 'Ã', 'a'), 'Ä', 'a'), 'É', 'e');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'È', 'e'), 'Ê', 'e'), 'Ë', 'e'), 'Í', 'i'), 'Ì', 'i'), 'Î', 'i');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'Ï', 'i'), 'Ó', 'o'), 'Ò', 'o'), 'Ô', 'o'), 'Õ', 'o'), 'Ö', 'o');
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'Ú', 'u'), 'Ù', 'u'), 'Û', 'u'), 'Ü', 'u'), 'Ç', 'c'), 'Ñ', 'n');
