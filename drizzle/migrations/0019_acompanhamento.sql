-- Acompanhamento: o ritual de weekly/quinzenal da BU virado sistema.
--
-- O que existia era um checklist preenchido a cada reunião e arquivado depois.
-- O problema não é ele ser manual: é ser ISOLADO. A reunião de hoje não sabe o
-- que a de duas semanas atrás decidiu, e a ação combinada lá morre no arquivo.
--
-- O que estas tabelas acrescentam é continuidade: o que ficou em aberto volta,
-- o que foi decidido continua consultável, e a ação combinada vira trabalho de
-- verdade no board de alguém.

CREATE TABLE `bu_review` (
  `id` text PRIMARY KEY NOT NULL,
  `business_unit_id` text NOT NULL REFERENCES `business_unit`(`id`) ON DELETE cascade,
  `meeting_date` integer NOT NULL,
  `status` text DEFAULT 'on_track' NOT NULL,
  `status_note` text,
  `highlight` text,
  `concern` text,
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

-- `user_id` quando a pessoa tem conta; `name` para o convidado que não tem.
-- Sem a segunda opção a lista de participantes fica falsa na primeira reunião
-- com visita.
CREATE TABLE `bu_review_participant` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL REFERENCES `bu_review`(`id`) ON DELETE cascade,
  `user_id` text REFERENCES `user`(`id`) ON DELETE cascade,
  `name` text
);
--> statement-breakpoint
CREATE INDEX `bu_review_participant_idx` ON `bu_review_participant` (`review_id`);
--> statement-breakpoint

-- O que fizemos / o que aconteceu / o que aprendemos / o que faremos com isso.
-- O documento antigo tinha um bloco por tipo de ação e quase todos voltavam
-- vazios toda semana; aqui o tipo é etiqueta e registra-se só o relevante.
CREATE TABLE `bu_review_learning` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL REFERENCES `bu_review`(`id`) ON DELETE cascade,
  `category` text NOT NULL,
  `what_we_did` text NOT NULL,
  `what_happened` text,
  `what_we_learned` text,
  `next_step` text,
  `sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bu_review_learning_idx` ON `bu_review_learning` (`review_id`);
--> statement-breakpoint

-- O raciocínio da reunião. É o que o checklist não guardava: seis meses
-- depois ninguém lembra se a mudança de canal foi decisão ou acidente.
CREATE TABLE `bu_review_note` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL REFERENCES `bu_review`(`id`) ON DELETE cascade,
  `kind` text NOT NULL,
  `text` text NOT NULL,
  `depends_on` text,
  `resolved_at` integer,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bu_review_note_idx` ON `bu_review_note` (`review_id`);
--> statement-breakpoint
CREATE INDEX `bu_review_note_kind_idx` ON `bu_review_note` (`kind`);
--> statement-breakpoint

-- A próxima ação é uma TAREFA. Esta tabela é só o elo.
--
-- A alternativa seria uma lista de ações própria do acompanhamento, com o
-- próprio status — dois sistemas de "coisas para fazer" na mesma ferramenta, e
-- o segundo é justamente o que ninguém abre entre uma reunião e outra. O
-- documento que estamos substituindo já era isso.
CREATE TABLE `bu_review_action` (
  `id` text PRIMARY KEY NOT NULL,
  `review_id` text NOT NULL REFERENCES `bu_review`(`id`) ON DELETE cascade,
  `task_id` text NOT NULL REFERENCES `task`(`id`) ON DELETE cascade,
  `expected_result` text,
  `sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bu_review_action_unique` ON `bu_review_action` (`review_id`, `task_id`);
--> statement-breakpoint
CREATE INDEX `bu_review_action_review_idx` ON `bu_review_action` (`review_id`);
--> statement-breakpoint
CREATE INDEX `bu_review_action_task_idx` ON `bu_review_action` (`task_id`);
