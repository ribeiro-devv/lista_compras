# Features de Paridade com Concorrentes — Spec e Plano por Fases

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Levar o Lista de Compras à paridade com os concorrentes em categorias, ordenação, unidades, descontos, lojas, imagens, voz, biometria, leitura de código e widget — entregue em fases, cada uma utilizável sozinha.

**Architecture:** As fases são ordenadas por custo crescente e por dependência de infraestrutura. Tudo que é puramente cliente vem primeiro (Fase 1). **Todas as mudanças de banco foram agrupadas numa única migration** (Fase 2), para que o dono precise rodar SQL uma vez só no projeto inteiro. Depois dela, as fases 3–5 consomem as colunas novas. A Fase 6 é a subida de Capacitor/Ionic, sem feature visível, que destrava as fases 7–8 (nativo).

**Tech Stack:** Angular 14, Ionic 6, Capacitor 4 (core) / 7 (CLI), Supabase (`@supabase/supabase-js` 2.110), Karma + Jasmine, localStorage como cache.

## Global Constraints

- Idioma de todo texto de UI e de todo identificador de domínio: **português**. Seguir o padrão do código existente (`tarefa`, `feito`, `valorUnitario`, `categoria`).
- Colunas novas no Postgres em **snake_case**; o mapeamento para camelCase acontece só em `TarefaService.mapItem()`.
- `list_items.categoria` guarda o **nome** da categoria (ex: `'Frutas & Verduras'`), **não** o id. Ver [tarefa.service.ts:314](../../../src/app/services/tarefa.service.ts).
- Toda coluna nova nasce com `default` e `not null` quando fizer sentido, para que o app antigo em produção continue funcionando durante o rollout.
- Nenhuma mudança de RLS pode ampliar acesso: item de lista compartilhada continua governado por `is_list_member`.
- Commits em português, com prefixo convencional (`feat:`, `fix:`, `chore:`).
- Baseline de teste: `npm run test:ci` (criado na Fase 0) precisa ficar verde ao fim de cada tarefa.
- Angular 14 **não** tem signals nem standalone components. Usar `NgModule` e o padrão de módulo já existente (`shared-components.module.ts`).

## Estado atual verificado (base da spec)

| Área | O que já existe | O que falta |
|---|---|---|
| Categoria | `list_items.categoria` (texto livre); 10 categorias **hardcoded** em [catalogo.service.ts:29](../../../src/app/services/catalogo.service.ts) | Criar categoria; mover item entre categorias |
| Ordenação | Ordem fixa: agrupa por categoria, pendentes antes de comprados ([home.page.ts:145](../../../src/app/pages/home/home.page.ts)) | Escolher critério de ordenação |
| Preço total | **Já pronto** — `totals-card` em [home.page.html:229](../../../src/app/pages/home/home.page.html) | Só o desconto |
| Arquivadas | `archived_lists` + aba "Por Mês" já agrupada ([historico.page.html:124](../../../src/app/pages/historico/historico.page.html)) | Detalhe da lista é um `alert` de texto; sem busca; sem restaurar |
| Unidade | Existe no catálogo (`ProdutoCatalogo.unidade`) | **Não existe** em `list_items` |
| Lojas | Nada | Tudo |
| Imagens | Só `icone` (ionicon) + `cor` por categoria | Ilustração por categoria |
| Nativo | `android/`, Capacitor 4 | Voz, biometria, scanner, widget |

---

## FASE 0 — Baseline de teste (bloqueia tudo)

**Por que primeiro:** hoje `ng test` termina em `TOTAL: 7 FAILED, 7 SUCCESS`. Sem baseline verde, nenhuma fase seguinte consegue distinguir "quebrei agora" de "já estava quebrado".

**Migration:** não.

**Causa das falhas (confirmada rodando):** são duas, não uma.

1. Os quatro specs de modal caem em `NullInjectorError: No provider for FormBuilder!` — o TestBed importa só `IonicModule`, sem `ReactiveFormsModule`.
2. Os três specs de página estouram `Error: Timeout - Async function did not complete within 5000ms`. O motivo não é o template: é o `TestBed.createComponent` estar **dentro** do `waitForAsync`. Instanciar a página injeta `TarefaService` → `SupabaseService`, e os timers do cliente GoTrue deixam a zona async sem estabilizar para sempre.

Os erros `NG0304 ('app-tour-overlay' is not a known element)` e `NG0303 (ngModel)` aparecem no log, mas são ruído: o Angular só os registra como `console.error`, não falham o teste. Resolvidos de lambuja pelo `CUSTOM_ELEMENTS_SCHEMA` e pelo `FormsModule` do helper.

### Task 0.1: Script de teste headless

**Files:**
- Modify: `package.json` (bloco `scripts`)
- Modify: `karma.conf.js:40-41`

- [ ] **Step 1: Adicionar o script**

Em `package.json`, dentro de `"scripts"`:

```json
"test:ci": "ng test --watch=false --browsers=ChromeHeadless"
```

- [ ] **Step 2: Rodar e confirmar que executa**

```bash
npm run test:ci
```

Esperado: roda até o fim e imprime `TOTAL: 7 FAILED, 7 SUCCESS`. O objetivo aqui é só o script existir; consertar vem na 0.2.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: adiciona script test:ci headless"
```

### Task 0.2: Consertar os specs de página

**Files:**
- Create: `src/app/testing/configurar-teste.ts`
- Modify: `src/app/pages/{home,historico,settings}/*.page.spec.ts`
- Modify: `src/app/components/{add-produto-modal,edit-produto-modal,detalhes-produto-modal,informacoes-modal}/*.component.spec.ts`

**Interfaces:**
- Produces: `configurarTestBedDeTela(componente: Type<unknown>): void` — são sete specs com a mesma configuração, o que já justifica o helper.

- [ ] **Step 1: Rodar e capturar a falha atual**

```bash
npm run test:ci
```

Esperado: `TOTAL: 7 FAILED, 7 SUCCESS`.

- [ ] **Step 2: Criar o helper de TestBed**

`src/app/testing/configurar-teste.ts`:

```typescript
import { CUSTOM_ELEMENTS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

export function configurarTestBedDeTela(componente: Type<unknown>): void {
  TestBed.configureTestingModule({
    declarations: [componente],
    imports: [IonicModule.forRoot(), FormsModule, ReactiveFormsModule, RouterTestingModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  }).compileComponents();
}
```

- [ ] **Step 3: Reescrever os sete specs no mesmo formato**

```typescript
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(HomePage)));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
```

Duas coisas são obrigatórias e não podem ser "simplificadas": o `createComponent` fica num `beforeEach` **separado e síncrono** (é o que evita o timeout), e **não** há `fixture.detectChanges()` (ele dispara o `ngOnInit`, que abre canal de realtime no Supabase).

- [ ] **Step 4: Rodar e confirmar verde**

```bash
npm run test:ci
```

Esperado: `TOTAL: 14 SUCCESS` (ou `0 FAILED`).

- [ ] **Step 5: Commit**

```bash
git add src/app/pages
git commit -m "fix: conserta specs de pagina que nao compilavam o template"
```

---

## FASE 1 — Cliente puro, sem tocar no banco

**Migration:** não. **Ao terminar, seguir direto para a Fase 2.**

### 1.A — Ordenação da lista

**Comportamento:** um chip de ordenação no topo da lista, com quatro modos persistidos em `localStorage` (chave `ordenacaoLista`, valor padrão `categoria`):

| Modo | Rótulo | Efeito |
|---|---|---|
| `categoria` | Por categoria | Comportamento atual: agrupa por categoria, pendentes antes de comprados |
| `nome` | Nome (A-Z) | Lista única, sem cabeçalho de categoria, `localeCompare` por `tarefa` |
| `pendentes` | Faltando primeiro | Lista única, `feito=false` no topo, depois `nome` como desempate |
| `comprados` | No carrinho primeiro | Lista única, `feito=true` no topo, depois `nome` como desempate |

Nos três modos não-agrupados, `itensAgrupados` recebe **um único grupo** com `categoria: ''`, e o template esconde o cabeçalho quando `grupo.categoria` é vazio. Assim o `*ngFor` do template não muda de forma.

`codigo` (ordem de inserção) nunca é reescrito — ordenação é só visualização.

**Files:**
- Create: `src/app/services/ordenacao.service.ts`
- Create: `src/app/services/ordenacao.service.spec.ts`
- Modify: `src/app/pages/home/home.page.ts` (`recomputar()`, linha 145)
- Modify: `src/app/pages/home/home.page.html` (cabeçalho de grupo na linha 179; chip novo antes de `.produtos-groups`)
- Modify: `src/app/pages/home/home.page.scss`

**Interfaces:**
- Produces:
  - `export type ModoOrdenacao = 'categoria' | 'nome' | 'pendentes' | 'comprados';`
  - `OrdenacaoService.obterModo(): ModoOrdenacao`
  - `OrdenacaoService.definirModo(modo: ModoOrdenacao): void`
  - `OrdenacaoService.rotulo(modo: ModoOrdenacao): string`
  - `OrdenacaoService.agrupar(itens: any[], modo: ModoOrdenacao): Array<{ categoria: string; itens: any[] }>`

**Aceite:** trocar o modo reordena na hora; fechar e reabrir o app mantém o modo; nenhum `list_items` é escrito ao trocar de modo.

### 1.B — Mover item de categoria

**Comportamento:** no action sheet que já abre em `openActions(item)` ([home.page.ts:512](../../../src/app/pages/home/home.page.ts)), entra o botão **"Mudar categoria"** (ícone `pricetags-outline`). Ele abre um segundo action sheet com as categorias de `CatalogoService.obterCategorias()`, marcando a atual. Escolher grava `categoria` no item.

`TarefaService.atualizar()` hoje só envia `feito` e `valor_unitario` no `update`. Precisa passar a enviar `categoria` também — sem isso a mudança some no próximo `loadItems()`.

**Files:**
- Modify: `src/app/services/tarefa.service.ts` (`atualizar()`, ~linha 155)
- Modify: `src/app/pages/home/home.page.ts` (`openActions()`)

**Interfaces:**
- Consumes: `CatalogoService.obterCategorias(): CategoriaProduto[]`
- Produces: `TarefaService.mudarCategoria(item: any, categoria: string): Promise<void>`

**Aceite:** mover um item o tira do grupo antigo e o põe no novo; recarregar a página mantém; num item de lista compartilhada, o outro membro vê a mudança pelo realtime.

### 1.C — Tela de detalhe da lista arquivada

**Comportamento:** hoje `verDetalhesLista()` monta uma string e joga num `AlertController` — é essa a "visualização falha". Vira um modal de verdade:

- Cabeçalho: nome da lista, data de finalização, total gasto, percentual concluído.
- Itens agrupados por categoria, cada um com quantidade, unidade (quando a Fase 3 chegar), valor unitário e subtotal.
- Busca por nome do item dentro da lista arquivada.
- Botão **"Restaurar para a lista atual"**: recria os itens em `list_items` da lista selecionada, com `feito = false`. Confirma antes, avisando quantos itens serão adicionados. Não apaga a arquivada.
- Botão **"Excluir do histórico"**: confirma e remove de `archived_lists`.

**Files:**
- Create: `src/app/components/detalhes-lista-modal/detalhes-lista-modal.component.ts`
- Create: `src/app/components/detalhes-lista-modal/detalhes-lista-modal.component.html`
- Create: `src/app/components/detalhes-lista-modal/detalhes-lista-modal.component.scss`
- Modify: `src/app/components/shared-components.module.ts` (declarar + exportar)
- Modify: `src/app/pages/historico/historico.page.ts` (`verDetalhesLista()`, ~linha 305; remover `construirDetalhesList()`)
- Modify: `src/app/services/tarefa.service.ts` (método de restauração)

**Interfaces:**
- Consumes: `ListaCompra` e `ItemCompra` de `historico.service.ts`
- Produces:
  - `TarefaService.restaurarItens(itens: ItemCompra[]): Promise<number>` — devolve quantos foram inseridos
  - `HistoricoService.excluirLista(id: string): Promise<void>`

**Aceite:** abrir uma lista arquivada mostra o modal, não o alert; restaurar coloca os itens na lista atual como pendentes; excluir tira do histórico e das estatísticas.

---

## FASE 2 — Migration única (**PARADA OBRIGATÓRIA**)

**Migration:** sim — é a única do plano inteiro. Roda uma vez, no SQL Editor do Supabase, **pelo dono**.

Todas as colunas e tabelas das fases 3, 4 e 5 entram aqui de uma vez, para não interromper o trabalho de novo mais adiante.

**Files:**
- Create: `supabase/migrations/2026-08-03_features_concorrentes.sql`

**Conteúdo da migration:**

```sql
-- ============================================================
-- Fase 2 — colunas e tabelas para unidade, desconto, categorias
-- customizadas e lojas. Idempotente: pode rodar mais de uma vez.
-- ============================================================

-- --- Unidade e desconto nos itens -------------------------------
alter table public.list_items
  add column if not exists unidade  text    not null default 'un',
  add column if not exists desconto numeric not null default 0;

alter table public.list_items
  drop constraint if exists list_items_desconto_check;
alter table public.list_items
  add constraint list_items_desconto_check check (desconto >= 0);

-- --- Categorias por usuário -------------------------------------
create table if not exists public.categorias (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  icone      text not null default 'pricetag-outline',
  cor        text not null default '#6c757d',
  ordem      smallint not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);
create index if not exists categorias_user_idx on public.categorias(user_id);

alter table public.categorias enable row level security;

drop policy if exists categorias_select on public.categorias;
create policy categorias_select on public.categorias
  for select to authenticated using (user_id = auth.uid());

drop policy if exists categorias_insert on public.categorias;
create policy categorias_insert on public.categorias
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists categorias_update on public.categorias;
create policy categorias_update on public.categorias
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists categorias_delete on public.categorias;
create policy categorias_delete on public.categorias
  for delete to authenticated using (user_id = auth.uid());

-- --- Lojas ------------------------------------------------------
create table if not exists public.lojas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text not null,
  cor        text not null default '#3880ff',
  created_at timestamptz not null default now(),
  unique (user_id, nome)
);
create index if not exists lojas_user_idx on public.lojas(user_id);

alter table public.lojas enable row level security;

drop policy if exists lojas_select on public.lojas;
create policy lojas_select on public.lojas
  for select to authenticated using (user_id = auth.uid());

drop policy if exists lojas_insert on public.lojas;
create policy lojas_insert on public.lojas
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists lojas_update on public.lojas;
create policy lojas_update on public.lojas
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists lojas_delete on public.lojas;
create policy lojas_delete on public.lojas
  for delete to authenticated using (user_id = auth.uid());

-- --- Loja no histórico de preços e nas listas arquivadas --------
alter table public.historico_precos
  add column if not exists loja_id uuid references public.lojas(id) on delete set null;

alter table public.archived_lists
  add column if not exists loja_id uuid references public.lojas(id) on delete set null;

create index if not exists historico_precos_loja_idx
  on public.historico_precos(user_id, nome_normalizado, loja_id, data desc);
```

**Nota de segurança:** esta migration só adiciona. Nenhum `drop table`, nenhum `drop column`, nenhum dado apagado. As policies removidas com `drop policy if exists` são recriadas logo abaixo, iguais ou mais restritas.

**Aceite:** rodar a migration duas vezes seguidas não dá erro; `select unidade, desconto from list_items limit 1` funciona.

---

## FASE 3 — Unidade e desconto

**Migration:** não (usa a da Fase 2).

**Comportamento:**

*Unidade:* seletor no modal de adicionar e no de editar, com as opções `un`, `kg`, `g`, `L`, `ml`, `pacote`, `caixa`, `dúzia`. O padrão vem do catálogo: se o produto digitado casar com um `ProdutoCatalogo`, herda o `unidade` dele; senão, `un`. A unidade aparece ao lado da quantidade no item da lista (`2 kg`, não só `2`).

*Desconto:* campo em R$ no modal de editar, com `0` como padrão. O subtotal passa a ser `quantidade × valorUnitario − desconto`, com piso em zero. Quando há desconto, o item mostra o preço cheio riscado e o com desconto ao lado. O card de totais ganha uma linha "Você economizou" quando a soma dos descontos for maior que zero.

**Decisão travada:** `PrecoService.registrar()` continua gravando o **preço cheio**, não o com desconto. Desconto é promoção pontual; misturá-lo com a memória de preço distorceria a curva do produto.

**Files:**
- Modify: `src/app/services/tarefa.service.ts` (`mapItem`, `salvar`, `atualizar`, `calcularTotalGeral`, `calcularTotalComprado`, `arquivarListaAtual`)
- Modify: `src/app/services/historico.service.ts` (`ItemCompra` ganha `unidade` e `desconto`)
- Modify: `src/app/components/add-produto-modal/add-produto-modal.component.ts` + `.html`
- Modify: `src/app/components/edit-produto-modal/edit-produto-modal.component.ts` + `.html`
- Modify: `src/app/pages/home/home.page.ts` (`calcularSubtotal`) + `.html` (linhas 193-215)
- Create: `src/app/services/unidades.ts` (constante única com as oito unidades, usada pelos dois modais)

**Interfaces:**
- Produces:
  - `export const UNIDADES: ReadonlyArray<{ valor: string; rotulo: string }>`
  - `TarefaService.calcularSubtotal(item: any): number`
  - `TarefaService.calcularTotalDesconto(): number`

**Aceite:** item com 2 kg a R$ 10 e R$ 3 de desconto mostra subtotal R$ 17; desconto maior que o subtotal resulta em zero, nunca negativo; arquivar preserva unidade e desconto no `archived_lists.itens`.

---

## FASE 4 — Categorias customizadas

**Migration:** não (usa a da Fase 2).

**Comportamento:** as 10 categorias hardcoded viram o **conjunto padrão semeado**. No primeiro login após esta fase, se `categorias` estiver vazia para o usuário, o app insere as 10 com os mesmos nome/ícone/cor de hoje — assim nenhum item existente fica órfão, já que `list_items.categoria` casa por nome.

Tela nova em Ajustes, **"Categorias"**:
- Listar as categorias do usuário, arrastáveis para reordenar (`ordem`).
- Criar: nome, ícone (grade dos ionicons já usados) e cor (paleta de 8).
- Editar nome/ícone/cor.
- Excluir: só permitido se nenhum item ativo usar a categoria; senão, oferece mover os itens para "Outros" antes.
- "Outros" não pode ser excluída nem renomeada.

`classificarItem()` passa a consultar as categorias do usuário antes de cair nas regex de fallback.

**Files:**
- Create: `src/app/services/categoria.service.ts` + `.spec.ts`
- Create: `src/app/pages/categorias/` (page + module + routing)
- Modify: `src/app/services/catalogo.service.ts` (as 10 viram `CATEGORIAS_PADRAO` exportada; `obterCategorias()` delega ao `CategoriaService`)
- Modify: `src/app/services/tarefa.service.ts` (`classificarItem`)
- Modify: `src/app/pages/home/home.page.ts` (`getCategoriaIcon` lê do serviço, não do mapa fixo da linha 277)
- Modify: `src/app/pages/settings/settings.page.html` (entrada de menu)
- Modify: `src/app/app-routing.module.ts`

**Interfaces:**
- Produces:
  - `export const CATEGORIAS_PADRAO: ReadonlyArray<CategoriaProduto>`
  - `CategoriaService.listar(): Promise<Categoria[]>`
  - `CategoriaService.semearSeVazio(): Promise<void>`
  - `CategoriaService.criar(nome: string, icone: string, cor: string): Promise<Categoria>`
  - `CategoriaService.renomear(id: string, nome: string): Promise<void>` — atualiza também `list_items.categoria` de todos os itens com o nome antigo
  - `CategoriaService.excluir(id: string, moverPara: string | null): Promise<void>`
  - `CategoriaService.reordenar(ids: string[]): Promise<void>`

**Risco conhecido e mitigação:** como o vínculo item↔categoria é por **nome**, renomear uma categoria quebraria os itens. Por isso `renomear()` faz as duas escritas — categoria e itens — e a de itens vem primeiro; se ela falhar, o rename é abortado e nada muda.

**Segundo risco, achado durante a execução:** os produtos do catálogo apontam para categoria por **slug** (`'higiene-pessoal'`), mas as categorias no Supabase têm **UUID**. Sem tratamento, `obterCategoriaPorId()` não acharia nada e todo produto do catálogo cairia em "Outros". Solução: essa função procura primeiro em `CATEGORIAS_PADRAO` (por slug) e só depois nas categorias do usuário. Além disso, `classificarItem()` valida o palpite contra as categorias que o usuário realmente tem — se ele apagou "Bebidas", o item novo vai para "Outros" em vez de criar um grupo fantasma.

**Aceite:** usuário sem categorias ganha as 10 padrão no primeiro acesso; criar uma categoria a faz aparecer no seletor de "Mudar categoria" da Fase 1.B; renomear "Bebidas" para "Bebidas & Sucos" mantém os itens no grupo certo.

---

## FASE 5 — Lojas e ilustração por categoria

**Migration:** não (usa a da Fase 2).

### 5.A — Lojas

**Comportamento:**
- CRUD de lojas em Ajustes (nome + cor), espelhando a tela de categorias.
- Ao arquivar uma lista, o app pergunta em qual loja a compra foi feita (com opção "Não informar"). Grava em `archived_lists.loja_id`.
- `PrecoService.registrar()` passa a gravar `loja_id` junto com o preço, usando a loja selecionada na sessão atual.
- Tela nova **"Comparar preços"**: escolhe um produto, mostra o último preço por loja, ordenado do mais barato ao mais caro, com a data de cada registro.
- No autocomplete da adição rápida, quando houver preço de mais de uma loja, o chip de preço mostra o menor com o nome da loja abreviado.

**Files:**
- Create: `src/app/services/loja.service.ts` + `.spec.ts`
- Create: `src/app/pages/lojas/` (page + module + routing)
- Create: `src/app/components/comparar-precos-modal/`
- Modify: `src/app/services/preco.service.ts`
- Modify: `src/app/services/historico.service.ts` (`arquivarListaAtual` aceita `lojaId`)
- Modify: `src/app/pages/home/home.page.ts` (`arquivarLista()` pergunta a loja)

**Interfaces:**
- Produces:
  - `LojaService.listar(): Promise<Loja[]>`, `criar`, `renomear`, `excluir`
  - `LojaService.lojaAtual(): Loja | null` / `definirLojaAtual(id: string | null): void` (sessão, em localStorage)
  - `PrecoService.precosPorLoja(nome: string): Promise<Array<{ loja: Loja | null; valor: number; data: string }>>`

**Aceite:** registrar arroz a R$ 25 na Loja A e R$ 22 na Loja B faz a comparação listar B primeiro; excluir uma loja não apaga o histórico de preço (fica `loja_id = null`, exibido como "Sem loja").

### 5.B — Ilustração por categoria

**Comportamento:** cada categoria ganha uma ilustração SVG local (`src/assets/categorias/<slug>.svg`), exibida no cabeçalho do grupo na home e no card de categoria do histórico. Categoria criada pelo usuário, sem SVG correspondente, cai no ionicon escolhido — o comportamento de hoje.

**Decisão travada:** nada de foto por produto nesta fase. Foto exigiria bucket no Storage, upload, política de acesso e cache offline; o ganho visual de 80% vem da ilustração por categoria, que é asset estático e não pesa em rede.

**Como a cor funciona (decidido na execução):** um `<img src="...svg">` fica preso à cor gravada no arquivo e ignora a cor que o usuário escolheu para a categoria. A arte é aplicada como **máscara CSS** (`mask-image`) sobre um `background-color` — assim ela assume a cor da categoria. O template só emite `data-arte="<slug>"`; as dez regras de `mask-image` são estáticas no SCSS, evitando `url()` interpolada em `[style]`, que o sanitizador do Angular bloquearia.

**Files:**
- Create: `src/assets/categorias/*.svg` (10 arquivos, um por categoria padrão)
- Modify: `src/app/pages/home/home.page.html` (cabeçalho do grupo, linha 179)
- Modify: `src/app/pages/historico/historico.page.html` (card de categoria, linha 186)
- Modify: `src/app/services/categoria.service.ts` (resolver caminho do SVG por slug)

**Aceite:** as 10 padrão mostram ilustração; categoria nova mostra o ionicon; nenhuma requisição de rede nova.

---

## FASE 6 — Subida de Capacitor e Ionic (**infra, sem feature visível**)

**Migration:** não.

**Por que existe:** `@capacitor/core` está em 4 e o `@capacitor/cli` em 7 — desalinhados. Os plugins das fases 7 e 8 (`@capacitor-mlkit/barcode-scanning`, biometria) exigem Capacitor 6+. Sem esta fase, as três features nativas ficam impossíveis.

**Escopo:**
- `@capacitor/*` 4 → 7 (core, android, app, haptics, keyboard, status-bar).
- Ionic 6 → 8 e Angular 14 → 17, na ordem: 14→15→16→17, uma de cada vez, com `npm run test:ci` verde entre cada salto.
- Gradle e `compileSdk` do `android/` conforme exigido pelo Capacitor 7 (`compileSdk 35`).
- `protractor` e a pasta `e2e/` saem — Protractor está morto e trava o upgrade do Angular.

**Risco:** é a fase mais arriscada do plano e a única sem entrega visível ao usuário. Angular 14→17 muda `ngIf`/`ngFor` (opcional), `RouterModule` e o build para esbuild. Espere que o `npm run test:ci` quebre em cada salto.

**Mitigação obrigatória:** fazer em branch separada (`chore/upgrade-capacitor-7`), um salto de versão por commit, com o app rodando no dispositivo verificado ao fim de cada salto — não só os testes.

**Aceite:** `npx cap doctor` sem erro; APK debug instala e abre; `npm run test:ci` verde.

**Como saiu na execução (03/08/2026):** Angular 14 → 15 → 16 → 17.3.12, Ionic 6 → 8.8, Capacitor 4 → 7.6, um commit por salto, com `npm run test:ci` e `ng build` verdes entre cada um. Três coisas que a spec não previa:

1. **rxjs 6 → 7.8 virou obrigatório**, porque o Ionic 8 exige `rxjs >=7.5` e o `ng update` do Angular não sobe rxjs sozinho. Risco baixo aqui: o código não usa `toPromise()` nem `pipe()` em lugar nenhum.
2. **zone.js 0.14 removeu os subcaminhos `dist/`.** `import 'zone.js/dist/zone'` e `'zone.js/dist/zone-testing'` viraram `'zone.js'` e `'zone.js/testing'`. Sem isso o Karma nem carrega.
3. **AGP 8 exige `namespace` no `build.gradle`** e proíbe o atributo `package` no `AndroidManifest.xml`; `compileSdkVersion`/`minSdkVersion`/`targetSdkVersion` viraram `compileSdk`/`minSdk`/`targetSdk`.

**Aceite alcançado:** `npx cap doctor` responde `Android looking great!`, e `./gradlew assembleDebug` termina em **`BUILD SUCCESSFUL`**, gerando um APK de 25,5 MB com `compileSdk 35` / `targetSdk 35`. Toolchain usada: JDK 21.0.11 e Android SDK (platform-tools, platforms;android-35, build-tools;35.0.0), instalados em `C:/Users/ingri/sdk/android`.

**Como rodar o build do Android nesta máquina:**

```bash
JAVA_HOME=C:/Users/ingri/java/jdk-21.0.11_windows-x64_bin/jdk-21.0.11 ./gradlew assembleDebug
```

O `android/local.properties` aponta o `sdk.dir` e **não** é versionado (já estava no `.gitignore`). Use barra normal no caminho: com barra invertida o Gradle falha com `java.io.IOException: A sintaxe do nome do arquivo... está incorreta`, que não diz nada sobre a causa real.

**Único item de aceite ainda em aberto:** "APK instala e abre". Não há aparelho conectado (`adb devices` vazio) nem emulador criado, então a instalação não foi testada. Falta o dono conectar o celular com depuração USB e rodar `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

---

## FASE 7 — Nativo: voz, biometria, leitor de código

**Migration:** não. **Depende da Fase 6.**

### 7.A — Adicionar item por voz

`@capacitor-community/speech-recognition`, locale `pt-BR`. Botão de microfone na barra de adição rápida ([home.page.html:103](../../../src/app/pages/home/home.page.html)). Fluxo: segurar para falar, soltar para reconhecer; o texto cai no `novoItem` e o usuário confirma antes de gravar — **não** grava direto, porque reconhecimento erra e item errado na lista compartilhada incomoda todo mundo.

Frases com quantidade ("dois quilos de arroz") são parseadas por regex simples: número por extenso ou dígito + unidade conhecida + `de` + resto vira o nome. Se o parse falhar, o texto inteiro vira o nome do item.

Permissão `RECORD_AUDIO` pedida na hora do primeiro uso, com explicação antes do diálogo do sistema.

### 7.B — Biometria

`capacitor-native-biometric`. Opção "Exigir biometria ao abrir" em Ajustes, desligada por padrão. Ao voltar do background, se ligada, cobre a tela com um overlay até autenticar.

**Limite de segurança que precisa estar claro na UI:** isto é um bloqueio de tela local, não autenticação no servidor. A sessão do Supabase continua válida no dispositivo e alguém com acesso root ao aparelho ainda alcança os dados. O texto da opção deve dizer "Bloqueia a tela do app", não "Protege seus dados".

Fallback obrigatório para PIN/senha do aparelho quando não houver biometria cadastrada — nunca deixar o usuário trancado fora do próprio app.

### 7.C — Leitura de código de barras

`@capacitor-mlkit/barcode-scanning`. Escopo **apenas** o código de barras do produto (EAN-13). Ao ler, o app busca o EAN nos produtos que o próprio usuário já associou; se não conhecer, pergunta o nome e guarda a associação para a próxima vez. Ou seja: o app aprende o código, não consulta base externa.

**Fora de escopo, decidido:** QR de nota fiscal (NFC-e). Importar o cupom exige raspar o site da SEFAZ, que tem layout e endereço diferentes por estado e muda sem aviso. É projeto próprio, não feature desta fase.

**Files (7.A–7.C):**
- Create: `src/app/services/voz.service.ts`, `src/app/services/biometria.service.ts`, `src/app/services/scanner.service.ts`
- Modify: `src/app/pages/home/home.page.html` / `.ts`
- Modify: `src/app/pages/settings/settings.page.html` / `.ts`
- Modify: `src/app/app.component.ts` (overlay de bloqueio no resume)
- Modify: `android/app/src/main/AndroidManifest.xml` (`RECORD_AUDIO`, `CAMERA`)
- Migration extra: coluna `ean text` em `public.produtos`... **não existe essa tabela neste projeto** — a associação EAN→nome vai para `localStorage` (chave `eanConhecidos`), coerente com o catálogo, que também é local.

**Aceite:** ditar "arroz" preenche o campo e espera confirmação; desligar a biometria nas Ajustes remove o overlay; ler o mesmo EAN duas vezes usa o nome aprendido na primeira.

**Como saiu na execução (03/08/2026):** plugins fixados nas versões compatíveis com Capacitor 7 — `@capacitor-community/speech-recognition@7.0.1`, `@aparajita/capacitor-biometric-auth@9.1.2` e `@capacitor-mlkit/barcode-scanning@7.5.0`. As versões mais novas de dois deles (mlkit 8.x, biometric-auth 10.x) **exigem Capacitor 8** e ficariam quebradas aqui.

Decisões tomadas durante a implementação:

- **`capacitor-native-biometric` foi descartado** em favor de `@aparajita/capacitor-biometric-auth`: o primeiro não tem release para Capacitor 7.
- **Ligar a biometria exige autenticar na hora.** Se a digital falhar no momento de ligar a opção, ela não é ativada — senão o usuário descobriria o problema só no próximo boot, já trancado fora do app.
- **O overlay tranca ao SAIR para o background**, não ao voltar. Assim a tela já está coberta quando o app aparece no seletor de apps recentes.
- **O ditado nunca grava direto:** mostra "Ouvi: ..." e o item interpretado, e espera confirmação.
- **A associação EAN→nome mora no `localStorage`** (chave `eanConhecidos`), coerente com o catálogo, que também é local. A spec previa uma coluna em `public.produtos`, mas essa tabela não existe neste projeto.
- **`body.barcode-scanner-active` no `global.scss` é obrigatório:** o MLKit renderiza a câmera ATRÁS da webview, e sem deixar o fundo transparente o usuário vê só uma tela opaca.

**Verificado:** `BUILD SUCCESSFUL` com os sete plugins, APK de 44,9 MB (era 25,5 MB antes — o MLKit responde pela maior parte), com `RECORD_AUDIO`, `CAMERA` e `USE_BIOMETRIC` presentes no APK. **Não verificado:** as três features no aparelho — nenhuma delas funciona no navegador, e não há dispositivo conectado a esta máquina.

---

## FASE 8 — Widget Android

**Migration:** não. **Depende da Fase 6.**

**Comportamento:** widget de tela inicial mostrando os itens pendentes da lista atual (até 8), com contador e botão que abre o app. Marcar item pelo widget **não** entra nesta versão — exigiria escrita no Supabase a partir do processo do widget, sem sessão autenticada disponível.

**Como funciona:** Capacitor não faz widget. O caminho é:
1. O app grava um resumo da lista em `SharedPreferences` a cada mudança (via plugin Capacitor pequeno, escrito à mão em Kotlin).
2. Um `AppWidgetProvider` em Kotlin lê o `SharedPreferences` e desenha o `RemoteViews`.
3. O app dispara `AppWidgetManager.updateAppWidget` quando a lista muda.

**Files:**
- Create: `android/app/src/main/java/.../ListaWidgetProvider.kt`
- Create: `android/app/src/main/res/layout/widget_lista.xml`
- Create: `android/app/src/main/res/xml/widget_lista_info.xml`
- Create: `android/app/src/main/java/.../WidgetBridgePlugin.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `src/app/services/tarefa.service.ts` (notificar a ponte)

**Custo honesto:** esta fase sozinha custa mais que 7.A, 7.B e 7.C somadas, e só tem valor se o app estiver publicado e em uso diário. É a última por isso.

**Aceite:** widget aparece na gaveta; adicionar item no app atualiza o widget em até 5 segundos; desinstalar o widget não quebra o app.

---

## Resumo das paradas

| Fase | Migration? | Segue sozinha para a próxima? |
|---|---|---|
| 0 — Baseline de teste | não | ✅ feita |
| 1 — Ordenação, mover categoria, detalhe da arquivada | não | ✅ feita |
| 2 — Migration única | **SIM** | ✅ rodada pelo dono em 03/08/2026 |
| 3 — Unidade e desconto | não | ✅ feita |
| 4 — Categorias customizadas | não | ✅ feita |
| 5 — Lojas e ilustrações | não | ✅ feita |
| 6 — Upgrade Capacitor/Ionic/Angular | não | ✅ feita — APK validado no aparelho pelo dono |
| 7 — Voz, biometria, scanner | não | ✅ código feito e APK compila; falta testar no aparelho |
| 8 — Widget | não | fim |
