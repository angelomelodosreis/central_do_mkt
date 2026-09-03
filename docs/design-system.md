# UI Guide — Central do Marketing

Referência interna. Não aparece para quem usa a ferramenta.

A regra que resolve a maioria das dúvidas: **se um elemento gráfico não separa
duas coisas que precisam ser separadas, ele não deveria existir.** Borda,
sombra, fundo cinza e divisória são custo visual; espaço em branco é de graça e
funciona melhor.

---

## 1. Superfícies

| Superfície | Quando                    | Classe                                         |
| ---------- | ------------------------- | ---------------------------------------------- |
| `Card`     | um assunto                | `rounded-2xl border border-slate-200 bg-white` |
| Flutuante  | dropdown, drawer, popover | `shadow-lg` + borda                            |

**Sombra só no que flutua.** Um cartão que não sai do plano da página não
projeta sombra: com dez cartões numa tela, dez sombras viram sujeira cinza
entre eles. A borda de 1px já diz onde o cartão começa.

**Não aninhe cartões.** Cartão dentro de cartão significa que a hierarquia está
errada — use uma `Section`.

## 2. Divisórias

Em ordem de preferência:

1. **Espaço.** Duas seções de assunto diferente dentro de um cartão se separam
   com `py-4` e um rótulo. Sem régua.
2. **`divide-y divide-slate-100`** em listas de linhas comparáveis — tabela,
   fila de tarefas, lista de páginas. Aqui a régua ajuda o olho a percorrer.
3. **`border-t border-slate-200`** apenas para separar o corpo do cartão de um
   rodapé de ação (Salvar/Descartar) ou de um cabeçalho.

Nunca combine as três no mesmo cartão. Um cartão com cabeçalho riscado, seções
riscadas E linhas riscadas tem mais régua que conteúdo.

## 3. Tipografia

Cinco degraus. Não invente um sexto.

| Papel     | Classe                                                         | Onde                 |
| --------- | -------------------------------------------------------------- | -------------------- |
| `page`    | `font-display text-2xl font-semibold text-slate-900`           | `PageHeader`         |
| `card`    | `text-base font-semibold text-slate-900`                       | `CardHeader`         |
| `section` | `text-xs font-semibold uppercase tracking-wide text-slate-500` | `SectionLabel`       |
| `body`    | `text-sm text-slate-700` (ou `-900` no que é nome/valor)       | conteúdo             |
| `meta`    | `text-xs text-slate-500`                                       | data, contagem, dica |

Números que se comparam em coluna levam `tabular-nums` — sem isso as casas não
alinham e a coluna deixa de ser legível de relance.

Tamanhos arbitrários (`text-[11px]`, `text-[13px]`) só em caso justificado por
comentário. O padrão é a tabela acima.

## 4. Espaçamento

Uma escala, derivada do `4px` do Tailwind:

| Uso                            | Valor       |
| ------------------------------ | ----------- |
| Entre cartões de uma página    | `space-y-4` |
| Padding do corpo de um cartão  | `px-5 py-4` |
| Cabeçalho / rodapé de cartão   | `px-5 py-3` |
| Linha de lista                 | `px-5 py-3` |
| Entre campos de um formulário  | `space-y-4` |
| Entre rótulo e campo           | `mb-1.5`    |
| Entre elementos na mesma linha | `gap-2`     |

## 5. Cor

- **Marca (`brand`, vermelho)**: a ação principal da tela e o estado ativo.
  Escassa por definição — uma `primary` por tela.
- **`slate`**: tudo o mais. Texto, borda, fundo.
- **`emerald` / `danger`**: só significado, nunca decoração. Verde é "foi na
  direção boa"; vermelho é "foi na direção ruim" ou "isto apaga".
- **`amber`**: pendência que ainda dá para resolver.

Direção importa mais que sinal: um CPL que sobe 5% é vermelho, um faturamento
que sobe 5% é verde. Quem decide é a métrica, não a aritmética.

## 6. Componentes

Antes de escrever markup novo, procure aqui. Se um padrão se repete três vezes,
ele vira componente.

### Estrutura

- **`PageHeader`** — título, descrição e ação da página. Uma por tela.
- **`Card`** / **`CardHeader`** / **`CardBody`**
- **`Section`** — um trecho nomeado dentro de um cartão. Substitui os
  cabeçalhos de seção escritos à mão.
- **`Row`** — linha de rótulo e valor (`grid` de duas colunas). É o formato de
  uma ficha.
- **`Toolbar`** — a faixa de filtros no topo de uma tela. Sempre acima de tudo
  e válida para a tela inteira.

### Dados

- **`Stat`** — um indicador: rótulo, valor, variação. Clicável quando troca o
  que o resto da tela mostra.
- **`StatGrid`** — a faixa de indicadores.
- **`Table` / `Th` / `Td`** — tabela de dados.
- **`BarrasComLinha`, `BarrasHorizontais`** — gráficos (SVG próprio, sem
  biblioteca).

### Entrada

- **`Field`** — rótulo, controle, dica, obrigatoriedade.
- **`Input`, `Textarea`, `Select`** — `Select` é próprio (o nativo é desenhado
  pelo sistema operacional e destoa em cada máquina) e aceita seleção múltipla.
- **`FIELD_WIDTHS`** — a largura vem do conteúdo esperado, não do gosto.

### Ação e retorno

- **`Button` / `ButtonLink`** — `secondary` é o padrão; `primary` é escolha
  explícita.
- **`Badge` / `StatusBadge`**
- **`EmptyState`** — `variant="page"` para a tela inteira vazia,
  `variant="inline"` dentro de um cartão.
- **`Drawer`** — formulário que não cabe na linha.
- **`Skeleton`** — carregamento.

## 7. Formulários

**Um "Salvar" por tela, não por campo.** A tela é um rascunho: o que se digita
muda a interface na hora e só vai para o banco no botão. "Descartar" volta ao
que o servidor mandou. Os dois botões aparecem **só quando há o que salvar** —
um "Salvar" permanentemente desabilitado parece a tela quebrada.

Campo vazio significa ausência, não zero. Onde a diferença importa (números
lançados à mão), guarde `null`.

## 8. Estados

| Estado     | Como se comunica                                          |
| ---------- | --------------------------------------------------------- |
| Carregando | `Skeleton` com a forma do conteúdo, nunca um spinner só   |
| Vazio      | `EmptyState` que diz o que fazer, não só que está vazio   |
| Erro       | Texto junto do campo que causou; `role="alert"`           |
| Sucesso    | O próprio estado novo da tela. Sem "salvo com sucesso"    |
| Destrutivo | Confirmação na própria linha, com o nome do que vai sumir |

O vermelho de uma ação destrutiva mora na **confirmação**, não na lista: uma
tela com dezesseis "Excluir" vermelhos grita apagar o tempo todo.

## 9. Texto

- Português do Brasil, sem jargão de produto.
- Frase curta. Um rótulo não precisa de artigo: "Cargo", não "O cargo".
- Dica (`hint`) só quando ela impede um erro. "Fora de todos os squads" ao lado
  de um botão "+ Adicionar" não impede nada.
- Nunca use o nome da tabela na tela. `org_unit` é "time", "setor", "área" —
  o que a pessoa chama.

## 10. Acessibilidade

- Todo controle tem rótulo (`<label>` ou `aria-label`).
- Foco visível: `focus-visible:outline-2 focus-visible:outline-offset-2`.
- Contraste mínimo AA (4,5:1 em texto normal). `text-slate-400` só em
  decoração; `text-slate-500` é o mínimo para texto que se lê.
- Toda interação de mouse tem equivalente de teclado.

---

## Como evoluir este sistema

Mudou um padrão? Mude no componente, não na tela. Se a mudança não puder ser
feita no componente, o componente está errado — conserte-o antes.
