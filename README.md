# Central do Marketing · MedCof

Plataforma interna do time de marketing da MedCof. Reúne ferramentas do dia a dia,
documentação de processos e convenções, com controle de acesso e trilha de
auditoria.

**O que já existe nesta primeira versão:**

| Módulo | O que faz |
| --- | --- |
| **Gerador de Nomes** | Monta nomes padronizados para o CRM — listas, tags e o que mais for cadastrado — prontos para copiar e colar. |
| **Documentação** | Base de conhecimento por categorias, escrita em Markdown, com controle de quem pode ver cada página. Inclui a lista oficial de Business Units, renderizada ao vivo do banco. |
| **Administração** | Aprovação de cadastros, papéis e permissões, cadastro de BUs, modelos de nomenclatura, domínios de e-mail autorizados e trilha de auditoria com botão de desfazer. |

---

## Parte 0 — Só quero ver funcionando (sem configurar o Google)

Se você só quer conhecer a plataforma, são **quatro comandos** e nenhuma
configuração no Google:

```bash
npm install
cp .dev.vars.example .dev.vars
npm run setup:local
npm run dev
```

Abra <http://localhost:3000>. Na tela de login vai aparecer um painel amarelo
**🧪 Modo de teste local** com três botões:

| Botão | O que você vê |
| --- | --- |
| **Entrar como Administrador** | Tudo: aprovar cadastros, permissões, BUs, auditoria e desfazer |
| **Entrar como Líder** | Gerador de nomes e edição da documentação, sem a área de administração |
| **Entrar como Membro** | Gerador de nomes e leitura da documentação, sem editar nada |

Assim você compara os níveis de acesso na prática. Enquanto o modo de teste
estiver ligado, aparece uma faixa amarela no topo de todas as telas, para não
haver dúvida de que são dados fictícios.

O `BETTER_AUTH_SECRET` do arquivo de exemplo serve para o modo de teste. Quando
for usar o login do Google de verdade, gere um valor próprio (Parte 1, passo 3).

**Para desligar o modo de teste**, apague a linha `ALLOW_TEST_LOGIN` do arquivo
`.dev.vars` e reinicie com `npm run dev`.

As contas de teste **não interferem** no login real: quando você configurar o
Google, seu primeiro acesso continua virando administrador normalmente (a regra
ignora as contas fictícias).

> **Isso não é um risco de segurança na versão publicada.** O recurso só existe
> em desenvolvimento: no pacote gerado para a Cloudflare, a verificação compila
> para "sempre falso" e a variável `ALLOW_TEST_LOGIN` nem é lida. Mesmo que
> alguém a defina no servidor por engano, o login de teste não funciona.

---

## Parte 1 — Rodar na sua máquina (passo a passo)

Você precisa fazer isso uma única vez. Depois, o dia a dia é só o passo 6.

### 1. Instalar as dependências

```bash
npm install
```

### 2. Criar as credenciais do Google (login)

A plataforma não tem senha própria: as pessoas entram com a conta Google da
MedCof. Para isso, é preciso criar uma credencial no Google:

1. Acesse [console.cloud.google.com](https://console.cloud.google.com/)
2. Crie um projeto (ou selecione um existente) chamado, por exemplo, `Central do Marketing`
3. No menu, vá em **APIs e serviços → Tela de permissão OAuth**
   - Tipo: **Interno** (se todas as contas forem do Workspace da MedCof) ou **Externo**
   - Preencha nome do app e e-mail de suporte
4. Vá em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**
   - Tipo de aplicativo: **Aplicativo da Web**
   - Nome: `Central do Marketing (local)`
   - Em **URIs de redirecionamento autorizados**, adicione exatamente:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
5. Copie o **ID do cliente** e a **Chave secreta do cliente**

### 3. Preencher o arquivo de segredos

Copie o modelo e preencha:

```bash
cp .dev.vars.example .dev.vars
```

Abra o arquivo `.dev.vars` e preencha:

```
GOOGLE_CLIENT_ID="cole aqui o ID do cliente"
GOOGLE_CLIENT_SECRET="cole aqui a chave secreta"
BETTER_AUTH_SECRET="gere um valor com o comando abaixo"
BETTER_AUTH_URL="http://localhost:3000"
```

Para gerar o `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

> **Nunca comite o `.dev.vars` no Git.** Ele já está no `.gitignore` — é o
> arquivo que guarda as credenciais.

### 4. Criar o banco de dados local

```bash
npm run db:migrate:local
```

Isso cria as tabelas num banco SQLite local, dentro da pasta `.wrangler/`.
Nada sai da sua máquina e não é preciso ter conta na Cloudflare ainda.

### 5. Carregar os dados iniciais

```bash
npm run db:seed:local
```

Isso cadastra:
- as **22 Business Units** da MedCof
- os **3 domínios de e-mail** autorizados (`grupomedcof.com.br`, `medcof.com.br`, `medcof.tech`)
- a **matriz de permissões** padrão dos papéis
- os **modelos de nomenclatura** de lista e de tag do ActiveCampaign
- as categorias iniciais de documentação e as páginas de **Business Units** e **Padrões de nomenclatura**

Os passos 4 e 5 juntos, em um comando só: `npm run setup:local`

### 6. Subir a aplicação

```bash
npm run dev
```

Abra <http://localhost:3000> e entre com sua conta Google da MedCof.

> **O primeiro login vira administrador automaticamente.** A primeira pessoa que
> entrar na plataforma recebe papel de administrador e acesso liberado, sem
> precisar de aprovação. Todas as seguintes ficam como *aguardando aprovação*
> até que um administrador libere na tela **Administração → Usuários**.

---

## Parte 1.5 — Modelos de nomenclatura

O Gerador de Nomes não sabe apenas nomear listas: ele monta **qualquer formato
cadastrado** em *Administração → Nomenclaturas*. Dois já vêm prontos:

| Modelo | Formato | Exemplo |
| --- | --- | --- |
| Lista do ActiveCampaign | `bu-tipo_de_lista-nome_da_lista` | `cardiologia-lead-black_friday_novembro` |
| Tag do ActiveCampaign | `bu-nome_da_tag-mes_ano` | `pediatria-interesse_extensivo-11_2026` |

### Criar um formato novo (sem programação)

1. Vá em **Administração → Nomenclaturas** e clique em *Criar e definir blocos*
2. Adicione um bloco de cada vez. Cada bloco pode ser de um destes tipos:

| Tipo de bloco | O que faz |
| --- | --- |
| **Business Unit** | Dropdown com as BUs cadastradas, sempre atualizado sozinho |
| **Lista de opções fixas** | Dropdown com as opções que você digitar (uma por linha, no formato `valor \| Rótulo`) |
| **Texto livre** | A pessoa digita; a padronização para `snake_case` é automática |
| **Mês e ano** | Dois seletores que resultam em `MM_AAAA` |

3. Use as setas ↑ ↓ para colocar os blocos na ordem certa
4. Volte à listagem e clique em **Ativar**

O modelo passa a aparecer no gerador na mesma hora, para o time todo.

> Um modelo nasce **inativo** e só pode ser ativado depois de ter pelo menos um
> bloco — assim ninguém esbarra num formulário vazio.

### Sobre os nomes gerados

A ferramenta é **auxiliar na padronização**, não um registro do que foi criado.
Nenhum nome gerado é gravado no banco nem na auditoria. A lista *"Copiados nesta
sessão"* fica apenas no navegador da pessoa e some quando ela sai da plataforma.

---

## Parte 2 — Como a segurança funciona

São quatro camadas independentes. Uma falhar não abre a porta:

1. **Domínio de e-mail** — só e-mails dos domínios cadastrados em
   *Administração → Domínios de e-mail* conseguem criar cadastro. Qualquer outra
   conta Google é recusada antes de qualquer dado ser gravado.
2. **Aprovação manual** — todo cadastro novo nasce *pendente* e não acessa nada
   até um administrador aprovar.
3. **Papel e permissões** — cada papel (Administrador, Líder, Membro) tem
   permissão de ver/editar por módulo, configurável em
   *Administração → Permissões* sem precisar mexer no código.
4. **Revalidação a cada acesso** — a cada página aberta, a plataforma reconfere no
   banco se a pessoa continua ativa e se o domínio dela continua autorizado.
   Por isso, suspender alguém tem efeito imediato: as sessões dele são derrubadas
   na hora, sem esperar expirar.

**Trilha de auditoria.** Toda ação relevante fica registrada em
*Administração → Auditoria*: quem fez, o quê, quando, e o estado anterior.
Ações destrutivas ou sensíveis (suspender usuário, mudar papel, desativar BU ou
domínio, editar/excluir documentação, alterar permissões) ganham botão
**Desfazer**, que restaura o estado anterior e registra o próprio desfazer.

**Travas de proteção contra bloqueio total:**
- Um administrador não consegue suspender nem rebaixar a própria conta
- Um administrador não consegue desativar o domínio do próprio e-mail
- A permissão do Administrador sobre o módulo de Administração não pode ser desmarcada

---

## Parte 3 — Publicar na Cloudflare (quando chegar a hora)

Nada disso é necessário para desenvolver localmente.

1. **Criar o banco de verdade:**
   ```bash
   npx wrangler d1 create central_do_marketing_db
   ```
   Copie o `database_id` retornado e substitua o valor em `wrangler.jsonc`
   (hoje está com um valor de espera, usado apenas localmente).

2. **Criar uma segunda credencial do Google** para o endereço de produção, com o
   redirect URI `https://SEU-DOMINIO/api/auth/callback/google`.

3. **Cadastrar os segredos no Worker** (não vão no código):
   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put BETTER_AUTH_SECRET
   npx wrangler secret put BETTER_AUTH_URL
   ```

4. **Preparar o banco de produção:**
   ```bash
   npm run db:migrate:remote
   npm run db:seed:remote
   ```

5. **Testar no runtime real da Cloudflare antes de publicar** (importante — o
   `npm run dev` não pega tudo):
   ```bash
   npm run cf:preview
   ```

6. **Publicar:**
   ```bash
   npm run cf:deploy
   ```

> **Plano da Cloudflare:** o plano gratuito dos Workers limita o processamento a
> 10ms por requisição, o que é pouco para uma aplicação Next.js. Assine o
> **Workers Paid** (a partir de ~US$ 5/mês) antes de colocar o time todo para usar.

---

## Comandos disponíveis

| Comando | Para que serve |
| --- | --- |
| `npm run dev` | Sobe a aplicação em <http://localhost:3000> |
| `npm run setup:local` | Cria as tabelas e carrega os dados iniciais |
| `npm run db:generate` | Gera uma nova migration depois de mudar o schema |
| `npm run db:migrate:local` | Aplica as migrations no banco local |
| `npm run db:seed:local` | Recarrega os dados iniciais (seguro rodar de novo) |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run build` | Build de produção |
| `npm run cf:preview` | Roda no runtime real da Cloudflare, sem publicar |
| `npm run cf:deploy` | Publica na Cloudflare |

---

## Estrutura do projeto

```
src/
  app/
    (public)/            Telas sem login: login, aguardando aprovação, acesso suspenso
    (app)/               Telas com login (o layout aqui é o portão de acesso)
      painel/
      gerador-de-nomes/
      documentacao/
      admin/
    api/auth/            Endpoints de login/logout do better-auth
    not-found.tsx        Página 404 da plataforma
  lib/
    auth/                Login, papéis, permissões e o portão `requireUser()`
    db/schema/           Definição das tabelas
    modules/             Regras de negócio por módulo
  components/            Componentes de interface reutilizáveis
drizzle/
  migrations/            Histórico de mudanças no banco
  seed.sql               Dados iniciais (BUs, domínios, permissões, docs)
```

### Como adicionar um módulo novo

1. Adicione a chave do módulo em `MODULE_KEYS` (`src/lib/db/schema/access.schema.ts`)
2. Crie a pasta da tela em `src/app/(app)/nome-do-modulo/`
3. Comece a página com `await requirePermission("nome_do_modulo", "view")`
4. Registre as ações com `writeAuditLog()` (`src/lib/modules/audit/log.ts`)
5. Adicione o item no menu em `src/app/(app)/layout.tsx`
6. Cadastre as permissões do módulo por papel em *Administração → Permissões*

---

## Decisões técnicas

- **Next.js 16 + Cloudflare Workers** via `@opennextjs/cloudflare`. O adapter
  antigo (`@cloudflare/next-on-pages`) foi descontinuado e arquivado pela
  Cloudflare em set/2025. Como consequência, **nunca use
  `export const runtime = "edge"`** — não é suportado neste adapter.
- **better-auth** em vez de NextAuth/Auth.js: o adapter oficial do Auth.js para o
  banco D1 não é mantido pela Cloudflare e tem incompatibilidade conhecida com o
  OpenNext. Além disso, o better-auth guarda as sessões no banco, o que é o que
  permite derrubar o acesso de um usuário suspenso imediatamente.
- **Drizzle ORM** para o banco. As migrations são geradas pelo `drizzle-kit` mas
  aplicadas pelo `wrangler` — o `drizzle-kit migrate` não funciona com o D1.
- **Sem `middleware`/`proxy.ts`.** No Next 16 esse arquivo roda obrigatoriamente
  no runtime Node, que o adapter da Cloudflare ainda não suporta (o build falha
  com *"Node.js middleware is not currently supported"*). Não há perda de
  segurança: o controle de acesso real está em `requireUser()`, no layout das
  rotas autenticadas, que consulta o banco a cada requisição. Uma camada de
  middleware só evitaria renderização desnecessária.
- **Não marque `better-auth` em `serverExternalPackages`.** Se marcado, o build
  para a Cloudflare quebra: a variante `workerd` de
  `@better-auth/core/instrumentation` não é copiada para o bundle.
- **Sem versionamento de documentos** nesta versão: a trilha de auditoria já
  guarda o antes e o depois de cada edição, o que cobre a necessidade e permite
  desfazer. Uma tabela dedicada de versões pode ser adicionada depois sem mexer
  no que já existe.

## O que ficou de fora desta versão

- Integração via API com o ActiveCampaign (hoje o nome é gerado para copiar e colar)
- Delegação da aprovação de cadastros para líderes (o papel já existe no banco; falta a tela)
- Histórico completo de versões de cada página de documentação
- Edição de um bloco de nomenclatura já criado (hoje se remove e adiciona de novo)
