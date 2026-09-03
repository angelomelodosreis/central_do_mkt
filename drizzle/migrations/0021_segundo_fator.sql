-- Segundo fator obrigatório (TOTP).
--
-- O login continua sendo o do Google. O que muda é que a senha do Google
-- deixa de ser suficiente: cada sessão passa a exigir também um código de seis
-- dígitos gerado num app autenticador (Google Authenticator, Authy, 1Password).
--
-- Por que TOTP e não código por e-mail: o código por e-mail chegaria na mesma
-- caixa do Google que acabou de autenticar a pessoa — quem tomasse a conta de
-- e-mail passaria pelos dois fatores. O app é um segredo que não vive no
-- Google, que é justamente o ponto de ter um segundo fator.

-- O segredo TOTP de cada pessoa, cifrado com uma chave derivada de
-- BETTER_AUTH_SECRET. Trocar esse segredo invalida todos os cadastros.
CREATE TABLE `two_factor` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL REFERENCES `user`(`id`) ON DELETE cascade,
  `secret` text NOT NULL,
  `backup_codes` text NOT NULL,
  `verified` integer DEFAULT 0 NOT NULL,
  `failed_verification_count` integer DEFAULT 0 NOT NULL,
  `locked_until` integer
);
--> statement-breakpoint
CREATE INDEX `two_factor_user_idx` ON `two_factor` (`user_id`);
--> statement-breakpoint
CREATE INDEX `two_factor_secret_idx` ON `two_factor` (`secret`);
--> statement-breakpoint

-- Se a pessoa concluiu o cadastro do app. Campo do plugin do better-auth.
ALTER TABLE `user` ADD `two_factor_enabled` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Quando ESTA sessão confirmou um código.
--
-- Na sessão, e não no usuário: guardado no usuário, o segundo fator valeria
-- uma vez na vida, e um cookie roubado depois disso entraria sem passar por
-- nada. Nulo em toda sessão que já existe — todo mundo confirma uma vez ao
-- voltar, que é exatamente o efeito desejado ao ligar isto.
ALTER TABLE `session` ADD `two_factor_verified_at` integer;
