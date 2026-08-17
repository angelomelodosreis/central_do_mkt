ALTER TABLE `documentation_page` ADD `search_text` text;
--> statement-breakpoint
-- Preenche a coluna de busca para as páginas que já existem. A cadeia de
-- `replace` reproduz, em SQL, a mesma normalização feita no aplicativo
-- (minúsculas e sem acento) — o `lower()` do SQLite sozinho só cobre ASCII.
--
-- Os replace() vão em lotes, um statement por lote, porque o parser do
-- libSQL/Turso estoura a pilha com o aninhamento de 48 chamadas em um só
-- statement. O resultado é idêntico ao encadeamento original.
UPDATE `documentation_page`
SET `search_text` = lower(`content`)
WHERE `content` IS NOT NULL AND `content` <> '';
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'á', 'a'), 'à', 'a'), 'â', 'a'), 'ã', 'a'), 'ä', 'a'), 'é', 'e') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'è', 'e'), 'ê', 'e'), 'ë', 'e'), 'í', 'i'), 'ì', 'i'), 'î', 'i') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'ï', 'i'), 'ó', 'o'), 'ò', 'o'), 'ô', 'o'), 'õ', 'o'), 'ö', 'o') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'ú', 'u'), 'ù', 'u'), 'û', 'u'), 'ü', 'u'), 'ç', 'c'), 'ñ', 'n') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'Á', 'a'), 'À', 'a'), 'Â', 'a'), 'Ã', 'a'), 'Ä', 'a'), 'É', 'e') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'È', 'e'), 'Ê', 'e'), 'Ë', 'e'), 'Í', 'i'), 'Ì', 'i'), 'Î', 'i') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'Ï', 'i'), 'Ó', 'o'), 'Ò', 'o'), 'Ô', 'o'), 'Õ', 'o'), 'Ö', 'o') WHERE `search_text` IS NOT NULL;
--> statement-breakpoint
UPDATE `documentation_page` SET `search_text` = replace(replace(replace(replace(replace(replace(`search_text`, 'Ú', 'u'), 'Ù', 'u'), 'Û', 'u'), 'Ü', 'u'), 'Ç', 'c'), 'Ñ', 'n') WHERE `search_text` IS NOT NULL;
