-- O Acompanhamento vira um ROTEIRO usado ao vivo, e não um formulário de ata.
--
-- A primeira versão interpretou a funcionalidade como "documentar a reunião".
-- Quem abre a tela é o Coordenador Médico, DURANTE a conversa com o Analista, e
-- ele é leigo em marketing: o valor está em a tela dizer o que perguntar, não
-- em coletar o que foi dito.
--
-- As tabelas são recriadas do zero em vez de remendadas. Duas razões: o
-- `status` precisa passar a aceitar nulo (a avaliação da BU é a ÚLTIMA coisa da
-- reunião, e um padrão diria "no caminho" antes de alguém olhar um número), e
-- SQLite não afrouxa um NOT NULL sem reconstruir a tabela. Como nada disto foi
-- publicado — as tabelas nasceram na migração anterior, ainda não implantada —,
-- recriar é mais honesto do que uma sequência de remendos.
--
-- O que deixa de existir, e por quê:
--
--   bu_review_participant  "quem participou" e "convidados" são burocracia de
--                          ata; ninguém consulta isso depois.
--   bu_review_learning     quatro campos por ação viravam digitação em toda
--                          reunião. O aprendizado passa a nascer dentro do tema
--                          que o gerou.
--   bu_review_note         bloco separado de problemas e decisões duplicava o
--                          que o tema já registra.
--   highlight / concern    "o melhor do período" é campo sem função clara.
--   expected_result        um quarto campo no encaminhamento, numa reunião ao
--                          vivo, é o campo que fica em branco.

DROP TABLE IF EXISTS `bu_review_participant`;
--> statement-breakpoint
DROP TABLE IF EXISTS `bu_review_learning`;
--> statement-breakpoint
DROP TABLE IF EXISTS `bu_review_note`;
--> statement-breakpoint
DROP TABLE IF EXISTS `bu_review_action`;
--> statement-breakpoint
DROP TABLE IF EXISTS `bu_review`;
--> statement-breakpoint

CREATE TABLE `bu_review` (
  `id` text PRIMARY KEY NOT NULL,
  `business_unit_id` text NOT NULL REFERENCES `business_unit`(`id`) ON DELETE cascade,
  `meeting_date` integer NOT NULL,
  `status` text,
  `status_note` text,
  `closed_at` integer,
  `created_by` text,
  `updated_by` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bu_review_unique` ON `bu_review` (`business_unit_id`, `meeting_date`);
--> statement-breakpoint
CREATE INDEX `bu_review_bu_idx` ON `bu_review` (`business_unit_id`);
--> statement-breakpoint

-- Um tema revisado na reunião.
--
-- Só existe linha para tema que o Coordenador tocou: a ausência de linha
-- significa "não falamos disso hoje", que é um resultado legítimo e diferente
-- de "está tudo bem".
--
-- `note` e `decision` são as ÚNICAS coisas que se digita, e só quando há
-- exceção. Tema sem problema fica com status `ok` e nenhum texto.
CREATE TABLE `bu_review_topic` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL REFERENCES `bu_review`(`id`) ON DELETE cascade,
  `topic` text NOT NULL,
  `status` text NOT NULL,
  `note` text,
  `decision` text,
  `updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bu_review_topic_unique` ON `bu_review_topic` (`review_id`, `topic`);
--> statement-breakpoint
CREATE INDEX `bu_review_topic_review_idx` ON `bu_review_topic` (`review_id`);
--> statement-breakpoint

-- O encaminhamento é uma TAREFA; esta tabela é só o elo.
--
-- `topic` guarda de qual assunto ele nasceu — é o que vai permitir responder
-- "quantas vezes mídia gerou pendência neste trimestre?" sem reprocessar texto.
--
-- `follow_up_note` é o que o Coordenador anota na reunião SEGUINTE sobre uma
-- pendência ("não foi feito porque o fornecedor atrasou"). Fica no elo e não na
-- tarefa porque é observação da reunião, não mudança no trabalho.
CREATE TABLE `bu_review_action` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL REFERENCES `bu_review`(`id`) ON DELETE cascade,
  `task_id` text NOT NULL REFERENCES `task`(`id`) ON DELETE cascade,
  `topic` text,
  `follow_up_note` text,
  `sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bu_review_action_unique` ON `bu_review_action` (`review_id`, `task_id`);
--> statement-breakpoint
CREATE INDEX `bu_review_action_review_idx` ON `bu_review_action` (`review_id`);
--> statement-breakpoint
CREATE INDEX `bu_review_action_task_idx` ON `bu_review_action` (`task_id`);
