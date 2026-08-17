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
cp .env.example .env.local
npm run setup:local
npm run dev
```

Não é preciso criar conta em serviço nenhum: o banco de desenvolvimento é um
arquivo SQLite em `.data/local.db`, na sua própria máquina.

Abra <http://localhost:3000>. Na tela de login vai aparecer um painel amarelo
**🧪 Modo de teste local** com quatro botões:

| Botão | O que você vê |
| --- | --- |
| **Entrar como Administrador** | Tudo: aprovar cadastros, permissões, BUs, auditoria e desfazer |
| **Entrar como Líder** | Edita conteúdo e define os parâmetros, sem a área de acessos |
| **Entrar como Editor** | Cria e edita documentação, personas e o calendário da BU que responde |
| **Entrar como Membro** | Só consulta: gerador, documentação, personas e calendário |

Assim você compara os níveis de acesso na prática. Enquanto o modo de teste
estiver ligado, aparece uma faixa amarela no topo de todas as telas, para não
haver dúvida de que são dados fictícios.

O `BETTER_AUTH_SECRET` do arquivo de exemplo serve para o modo de teste. Quando
for usar o login do Google de verdade, gere um valor próprio (Parte 1, passo 3).

**Para desligar o modo de teste**, apague a linha `ALLOW_TEST_LOGIN` do arquivo
`.env.local` e reinicie com `npm run dev`.

As contas de teste **não interferem** no login real: quando você configurar o
Google, seu primeiro acesso continua virando administrador normalmente (a regra
ignora as contas fictícias).

> **Isso não é um risco de segurança na versão publicada.** O recurso só existe
> em desenvolvimento: no build de produção a verificação compila para "sempre
> falso" e a variável `ALLOW_TEST_LOGIN` nem é lida. Mesmo que alguém a defina
> nas variáveis da Vercel por engano, o login de teste não funciona — e isso vale
> também para os Preview Deployments, que rodam em modo de produção.

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
cp .env.example .env.local
```

Abra o arquivo `.env.local` e preencha:

```
TURSO_DATABASE_URL="file:./.data/local.db"
GOOGLE_CLIENT_ID="cole aqui o ID do cliente"
GOOGLE_CLIENT_SECRET="cole aqui a chave secreta"
BETTER_AUTH_SECRET="gere um valor com o comando abaixo"
BETTER_AUTH_URL="http://localhost:3000"
```

Para gerar o `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

> **Nunca comite o `.env.local` no Git.** Ele já está no `.gitignore` — é o
> arquivo que guarda as credenciais. O `.env.example`, que só tem placeholders,
> é a única exceção versionada.

### 4. Criar o banco de dados local

```bash
npm run db:migrate
```

Isso cria as tabelas num arquivo SQLite em `.data/local.db`. Nada sai da sua
máquina e não é preciso ter conta em serviço nenhum ainda.

### 5. Carregar os dados iniciais

```bash
npm run db:seed
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

## Parte 3 — Publicar na Vercel (quando chegar a hora)

Nada disso é necessário para desenvolver localmente.

1. **Criar o banco de produção no Turso.** O arquivo local não serve: o sistema
   de arquivos de uma função da Vercel é efêmero e somente leitura.

   O que você precisa obter, de um jeito ou de outro, são dois valores: a **URL**
   (`libsql://...`) e um **token de acesso**. Escolha a região mais próxima da
   configurada em `vercel.json` (hoje `gru1`, São Paulo).

   **Opção A — pelo painel, sem instalar nada.** Entre em
   <https://app.turso.tech>, crie um database (*Create Database*), escolha a
   região e depois, na página dele, copie a URL e gere um token em *Generate
   Token*. É o caminho mais curto.

   **Opção B — pela linha de comando.** A CLI de nuvem do Turso **não vem pelo
   npm** (o pacote `turso` no npm é outra coisa: é o shell SQL local `tursodb`,
   sem os comandos de conta). Use o instalador oficial, que baixa de
   `github.com/tursodatabase/` e instala em `$HOME/.turso` — **sem sudo, sem
   root**:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
   Abra um terminal novo (o instalador acrescenta o PATH ao seu `~/.zshrc`) e
   então:
   ```bash
   turso auth login
   turso db create central-do-marketing
   turso db show central-do-marketing --url
   turso db tokens create central-do-marketing
   ```

2. **Criar uma segunda credencial do Google** para o endereço de produção, com o
   redirect URI `https://SEU-DOMINIO/api/auth/callback/google`.

3. **Cadastrar as variáveis na Vercel**, em *Settings → Environment Variables*
   (nunca no código, nunca num arquivo `.env` comitado):

   | Variável | Valor |
   | --- | --- |
   | `TURSO_DATABASE_URL` | a URL `libsql://...` do passo 1 |
   | `TURSO_AUTH_TOKEN` | o token do passo 1 |
   | `BETTER_AUTH_SECRET` | um valor novo, gerado com `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | `https://SEU-DOMINIO` |
   | `GOOGLE_CLIENT_ID` | o ID do cliente de produção |
   | `GOOGLE_CLIENT_SECRET` | a chave secreta de produção |

   Não defina `ALLOW_TEST_LOGIN` — em produção ela não tem efeito nenhum.

4. **Preparar o banco de produção**, apontando os scripts para ele. As migrations
   não rodam no build da Vercel de propósito: um build com falha no meio deixaria
   o banco num estado indefinido, e todo deploy passaria a depender do banco estar
   acessível. Rode uma vez, da sua máquina:
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:migrate
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npm run db:seed
   ```

5. **Conferir o build de produção localmente** antes de publicar:
   ```bash
   npm run build && npm start
   ```

6. **Publicar:** conecte o repositório do GitHub à Vercel. Cada push na `main`
   publica em produção e cada branch ganha um Preview Deployment. Para publicar
   da linha de comando: `npx vercel --prod`.

> **Atenção aos Preview Deployments.** Eles usam as mesmas variáveis de ambiente
> do escopo que você marcar na Vercel. Se apontarem para o banco de produção,
> qualquer teste numa branch escreve em dados reais. Crie um segundo banco no
> Turso para o escopo *Preview* se for usar previews com o time.

---

## Comandos disponíveis

| Comando | Para que serve |
| --- | --- |
| `npm run dev` | Sobe a aplicação em <http://localhost:3000> |
| `npm run setup:local` | Cria as tabelas e carrega os dados iniciais |
| `npm run db:generate` | Gera uma nova migration depois de mudar o schema |
| `npm run db:migrate` | Aplica as migrations no banco de `TURSO_DATABASE_URL` |
| `npm run db:seed` | Recarrega os dados iniciais (seguro rodar de novo) |
| `npm run db:studio` | Abre o Drizzle Studio para inspecionar o banco |
| `npm run typecheck` | Confere os tipos do TypeScript |
| `npm run build` | Build de produção |
| `npm start` | Roda o build de produção localmente |

Os comandos de banco agem sobre o que estiver em `TURSO_DATABASE_URL` — o
arquivo local, por padrão. Para mirar produção, passe a URL e o token na frente
do comando (ver Parte 3, passo 4).

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

- **Next.js 16 na Vercel**, sem adapter. O projeto nasceu para Cloudflare Workers
  via `@opennextjs/cloudflare`; a migração para a Vercel removeu o adapter, o
  `wrangler` e o banco D1 (ago/2026).
- **libSQL/Turso** como banco, e não Postgres. O schema já era SQLite — 8 arquivos
  com `sqliteTable`, 37 campos `mode: "timestamp"`, 11 `boolean` e 7 `json`. Como
  o libSQL é SQLite, o schema, as 7 migrations e o seed continuaram valendo sem
  reescrita; ir para Postgres exigiria refazer tudo isso e trocar `LIKE` por
  `ILIKE` na busca. Em desenvolvimento a mesma biblioteca abre um arquivo local,
  o que mantém o projeto rodável sem conta em serviço nenhum.
- **Nenhum `replace()` profundamente aninhado em SQL.** O parser do libSQL estoura
  a pilha (*parser stack overflow*) com o encadeamento de 48 chamadas que as
  migrations `0002` e `0003` usavam para tirar acento; elas foram reescritas em
  lotes de 6, um statement por lote. Se precisar normalizar texto em SQL de novo,
  quebre em statements.
- **As migrations são aplicadas por `scripts/db-migrate.mjs`**, que usa o migrator
  do `drizzle-orm`, e não por `drizzle-kit migrate`: o comando do kit encerra com
  código 0 sem aplicar nada quando o dialeto é sqlite em arquivo — falha
  silenciosa, pior que erro. O `drizzle-kit` ficou só para `generate` e `studio`.
- **better-auth** em vez de NextAuth/Auth.js: guarda as sessões no banco, o que é
  o que permite derrubar o acesso de um usuário suspenso imediatamente.
- **`export const dynamic = "force-dynamic"` no layout de `(app)`**, e não página
  por página. Toda rota autenticada lê a sessão do request, então nenhuma pode ser
  pré-renderizada; quando isso era declarado individualmente, `/admin` e
  `/parametros` ficaram de fora e o `next build` falhava ao montar o auth fora de
  um request.
- **`@libsql/client` e `libsql` em `serverExternalPackages`.** Carregam binários
  nativos; sem declarar, o bundler tenta empacotá-los e o build quebra.
- **Sem `middleware`/`proxy.ts`.** O controle de acesso real está em
  `requireUser()`, no layout das rotas autenticadas, que consulta o banco a cada
  requisição. Uma camada de middleware só evitaria renderização desnecessária.
- **Sem versionamento de documentos** nesta versão: a trilha de auditoria já
  guarda o antes e o depois de cada edição, o que cobre a necessidade e permite
  desfazer. Uma tabela dedicada de versões pode ser adicionada depois sem mexer
  no que já existe.

## O que ficou de fora desta versão

- Integração via API com o ActiveCampaign (hoje o nome é gerado para copiar e colar)
- Delegação da aprovação de cadastros para líderes (o papel já existe no banco; falta a tela)
- Histórico completo de versões de cada página de documentação
- Edição de um bloco de nomenclatura já criado (hoje se remove e adiciona de novo)
