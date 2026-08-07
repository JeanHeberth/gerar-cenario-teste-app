# Fase 12.3.1 — Frontend Auto QA BMAD: Fundação (Plano Técnico Atualizado, aguardando aprovação)

Este documento substitui, para a Fase 12.3.1, o plano técnico anterior (`fase12.3-frontend-plano-tecnico.md`, no repositório backend) onde houver divergência, incorporando integralmente a **Aprovação Técnica Oficial** recebida do usuário. Nenhum arquivo foi criado, alterado ou removido além deste próprio documento e da pasta `docs/auto-qa/` que o abriga — confirmação formal no item 7.

A partir desta fase, **os planos técnicos do frontend passam a viver neste repositório** (`gerar-cenario-teste-app/docs/auto-qa/`), não mais no repositório backend.

---

## 1. Objetivo desta fase (reafirmado)

Construir só a **fundação** do novo frontend: rota, esqueleto da feature, Design System inicial, Shared Layer, Theme global, Signals, `StateService`, `ApiService`, layout principal e o `WorkflowOverviewComponent` (visão estática de alto nível das 10 etapas). **Fora de escopo nesta fase**: Timeline detalhada/interativa, Dashboard, painéis de aprovação, ações de execução, SSE, polling.

---

## 2. Como cada decisão da Aprovação Oficial será aplicada

### 2.1 Framework — Angular 20
A branch `feature/fase-12.3` está hoje em `19.2.25` (confirmado no plano anterior). **Mudança em relação ao plano anterior**: o alvo deixa de ser Angular 22 e passa a ser **Angular 20**, conforme esta aprovação. O upgrade `19 → 20` é pré-requisito de infraestrutura desta fase, seguindo o mesmo processo já usado antes (`ng update` incremental, build+test verificados a cada passo, commit de checkpoint só mediante autorização explícita como já ocorreu anteriormente). Nenhum upgrade será executado antes da aprovação final deste plano.

### 2.2 TDD obrigatório e ordem de implementação
Ordem confirmada: **funções utilitárias → services → state → componentes → páginas**. Aplicado item a item nas seções 3–6 abaixo: cada arquivo `.ts` novo nasce com seu `.spec.ts` escrito e falhando (RED) antes da implementação (GREEN), com refactor só depois do verde.

### 2.3 Código legado — mantido, não usado, não removido
**Revoga a proposta de remoção do plano anterior.** `autoqa-artifacts/`, `autoqa.service.ts` e `autoqa.interface.ts` permanecem intactos no repositório, como referência, e não serão importados por nenhum arquivo novo desta feature. Nenhuma edição, nenhuma exclusão. Remoção fica reservada para o encerramento da Fase 12 inteira.

### 2.4 Isolamento da feature
Toda a implementação fica sob `src/app/features/auto-qa-bmad/`. Nenhum import cruzado com `autoqa-artifacts`/`cenario`/`chat-agentes`.

### 2.5 Shared Layer — decisão de localização (ponto a confirmar)
A aprovação não especifica se `shared/` fica **dentro** de `features/auto-qa-bmad/` ou em `src/app/shared/` (global à aplicação). Interpretação adotada, alinhada ao item 5 da aprovação ("toda a nova funcionalidade ficará dentro desta feature", "não misturar componentes novos com componentes antigos"): **`shared/` nasce dentro de `features/auto-qa-bmad/shared/`** nesta fase. Se no futuro outras telas da aplicação (fora do Auto QA) precisarem do mesmo Design System, promovemos para `src/app/shared/` em uma fase própria — decisão consciente para não impactar `cenario`/`chat-agentes` sem necessidade real hoje. **Peço confirmação explícita deste ponto antes de iniciar.**

### 2.6 Design System — 12 componentes mínimos
Implementados em `shared/ui/`, cada um: standalone, `OnPush`, `input()`/`output()`, zero `HttpClient`, zero regra de negócio, SCSS consumindo só variáveis do Theme (item 2.7). Lista completa e responsabilidade de cada um na seção 4.

### 2.7 Tema Global
`shared/theme/theme.scss` com **CSS Custom Properties** (`:root { --auto-qa-color-*: ... }`), importado uma única vez em `styles.css` (arquivo raiz global, já existente). Variáveis mínimas exigidas — `background, surface, panel, border, primary, success, warning, danger, text-primary, text-secondary, text-muted` — mais duas categorias de apoio **não pedidas explicitamente, mas dependência direta inevitável** dos componentes do item 2.6 (todo Button/Card/Panel precisa de espaçamento e raio de borda consistentes, senão os valores voltam a ficar espalhados nos componentes, contrariando o próprio objetivo do tema): uma escala pequena de `spacing` (4/8/12/16/24/32px) e `radius` (sm/md/lg). Sinalizado aqui para aprovação explícita junto com o resto — não é uma cor "espalhada", é a mesma lógica de centralização aplicada a mais dois tokens.

### 2.8 Stage Metadata evoluído
`auto-qa-stage-catalog.ts` passa a exportar, por etapa, exatamente os campos pedidos: `id, order, title, subtitle, description, icon, color, loadingMessage, successMessage, errorMessage`. Nesta fase o catálogo é consumido só pelo `WorkflowOverviewComponent` (estático); a Timeline detalhada (fase futura) consumirá o mesmo catálogo, sem duplicar dado.

### 2.9 Catálogo de ícones — sem emoji
Cada um dos 10 agentes (Discovery, Scenario, Knowledge, Planning, Generation, Review, Apply, Execute, Failure, Learning) ganha um ícone SVG inline próprio, autoral (sem biblioteca externa nova — mantém a restrição de "nenhuma dependência nova" já vigente desde o plano anterior). Implementado como um único `AutoQaStageIconComponent` (`shared/ui/` ou `icons/`, ver árvore) com `input<AutoQaStageId>()` e um `@switch` interno renderizando o `<svg>` correspondente — evita 10 componentes triviais separados e mantém tudo testável com um spec por ícone.

### 2.10 WorkflowOverviewComponent
Componente novo, **desacoplado da Timeline futura** (não compartilha estado nem seleção com ela). Renderiza as 10 etapas do `auto-qa-stage-catalog` lado a lado (ícone + título), marcando visualmente `done/current/pending` a partir de `currentStage`/`lastStageCompleted` de uma execução carregada — mas **sem clique, sem detalhe expandido, sem painel lateral** (isso é a Timeline interativa, explicitamente fora de escopo). Fica no topo da página de detalhe da execução.

### 2.11 UX / Objetivo Visual / Componentização / Performance / Arquitetura SOLID
Já eram princípios do plano anterior (item 12–16 da aprovação = itens 9, 13, 14, 15 do plano original) — mantidos sem alteração: smart só em `pages/`, zero `HttpClient`/regra de negócio em componente visual, `OnPush` + Signals + `track` obrigatório + lazy loading, comunicação sempre via Service/StateService.

### 2.12 Restrições de backend
Reafirmadas — nenhum endpoint, contrato, Mongo, Workflow, `AutoQaContext`, agente ou service de backend é tocado nesta fase.

---

## 3. Estrutura completa de diretórios (revisada para a Fase 12.3.1)

```
src/app/features/auto-qa-bmad/
├── auto-qa-bmad.routes.ts
├── shared/
│   ├── ui/
│   │   ├── button/               (aqb-button.component.ts/.html/.scss/.spec.ts)
│   │   ├── card/
│   │   ├── panel/
│   │   ├── badge/
│   │   ├── divider/
│   │   ├── input/
│   │   ├── textarea/
│   │   ├── modal/
│   │   ├── loading/
│   │   ├── skeleton/
│   │   ├── empty-state/
│   │   ├── page-header/
│   │   └── stage-icon/           (AutoQaStageIconComponent — item 2.9)
│   ├── constants/
│   │   └── auto-qa.constants.ts  (mínimo nesta fase: nenhuma constante além do necessário para o theme.constants)
│   ├── utils/
│   │   └── (reservado — nenhuma função utilitária além do stage-catalog, que fica em models/)
│   ├── pipes/
│   │   └── (reservado — nenhum pipe necessário nesta fase)
│   ├── animations/
│   │   └── fade.animations.ts    (transição sutil de entrada, único item desta fase)
│   └── theme/
│       ├── theme.scss            (CSS custom properties — item 2.7)
│       └── theme.constants.ts    (espelho TS das cores, para o SVG dos ícones que não lê var CSS diretamente em todos os navegadores-alvo)
├── models/
│   ├── auto-qa-execution.model.ts        (AutoQaExecutionResponse e tipos irmãos, só os campos já usados nesta fase)
│   ├── auto-qa-enums.model.ts            (AutoQaWorkflowStatus, AutoQaStage)
│   └── auto-qa-stage-catalog.ts          (evoluído — item 2.8)
├── services/
│   ├── auto-qa-execution.service.ts      (os 11 métodos do controller — plumbing completo, baixo risco, evita retrabalho de scaffolding em fase futura)
│   └── auto-qa-execution.service.spec.ts
├── state/
│   ├── auto-qa-execution-state.service.ts   (nesta fase: só leitura — ver 3.1 abaixo)
│   └── auto-qa-execution-state.service.spec.ts
├── pages/
│   ├── execution-list-page/       (lista real via GET, usando Card/EmptyState/Skeleton do Design System)
│   │   ├── execution-list-page.component.ts
│   │   ├── execution-list-page.component.html
│   │   ├── execution-list-page.component.scss
│   │   └── execution-list-page.component.spec.ts
│   └── execution-detail-page/     (PageHeader + status básico + WorkflowOverview — sem ações)
│       ├── execution-detail-page.component.ts
│       ├── execution-detail-page.component.html
│       ├── execution-detail-page.component.scss
│       └── execution-detail-page.component.spec.ts
└── components/
    └── workflow-overview/
        ├── workflow-overview.component.ts
        ├── workflow-overview.component.html
        ├── workflow-overview.component.scss
        └── workflow-overview.component.spec.ts
```

**3.1 — Escopo do `StateService`/`ApiService` nesta fase:** `AutoQaExecutionService` é implementado por completo (os 11 métodos HTTP — puro plumbing tipado, sem UI, sem risco, testável isoladamente com `HttpTestingController`). Já o `AutoQaExecutionStateService` **só ativa o lado de leitura** nesta fase: `list`, `current`, `loading`, `error` (signals) e os métodos `loadList()`/`loadExecution(id)`. Os métodos de escrita (`dispatch`, aprovações, cancel) **não são chamados por nenhuma UI ainda** — ficam de fora desta fase porque não há botão/ação para dispará-los (Aprovação/Execução estão fora do escopo, item 1). Evita construir estado para interações que ainda não existem.

**Ficam explicitamente fora desta fase** (adiados): `stage-timeline`, `stage-timeline-item`, `stage-detail-panel`, `action-bar`, `apply-approval-panel`, `execution-approval-panel`, `warning-list`, `error-list`, `cancel-dialog`, `new-execution-form` funcional, `execution-toolbar` com ação de cancelar, `execution-card` clicável com navegação completa de ações. Isso são exatamente os itens do plano anterior que dependiam de Aprovação/Execução/Timeline — retomados na próxima subfase.

---

## 4. Componentes do Design System (`shared/ui/`) — 12 + 1

| Componente | Responsabilidade | API (`input`/`output`) |
|---|---|---|
| `AqbButton` | botão com variantes (primary/secondary/ghost/danger), estado `loading` | `variant`, `disabled`, `loading` / `clicked` |
| `AqbCard` | container com borda/fundo do tema, `padding` configurável | `padding` (slot via `ng-content`) |
| `AqbPanel` | container maior, com título opcional (usa `AqbPageHeader` internamente ou slot) | `title?` (slot) |
| `AqbBadge` | rótulo curto colorido (tom neutro/sucesso/alerta/erro) | `tone` (slot) |
| `AqbDivider` | linha divisória com espaçamento do tema | — |
| `AqbInput` | input de texto com label/erro, `ControlValueAccessor` ou `input()`+`output()` simples (form reativo por fora) | `label`, `value`, `error?` / `valueChange` |
| `AqbTextarea` | igual ao acima, multi-linha | idem |
| `AqbModal` | modal genérico (overlay + slot de conteúdo + botão fechar) | `open`, `title?` / `closed` |
| `AqbLoading` | indicador de carregamento inline (não bloqueia tela) | `label?` |
| `AqbSkeleton` | placeholder de carregamento (linhas/blocos) | `variant` (`text`\|`block`), `count?` |
| `AqbEmptyState` | estado vazio genérico (ícone/slot + título + descrição) | `title`, `description?` (slot de ação) |
| `AqbPageHeader` | cabeçalho de página (título + subtítulo + slot de ações à direita) | `title`, `subtitle?` (slot) |
| `AutoQaStageIcon` | ícone SVG inline por `AutoQaStageId`, sem emoji | `stage` |

Nenhum destes conhece `HttpClient`, `AutoQaExecutionService` ou `AutoQaExecutionStateService`.

---

## 5. Rotas (revisado)

```ts
// auto-qa-bmad.routes.ts
export const AUTO_QA_BMAD_ROUTES: Routes = [
  { path: '', component: ExecutionListPageComponent },
  { path: ':executionId', component: ExecutionDetailPageComponent },
];
```
Mesma integração via `loadChildren` em `app.routes.ts` já descrita no plano anterior — mantida sem alteração.

---

## 6. Quantidade estimada de testes (Fase 12.3.1)

| Camada | Estimativa |
|---|---|
| `auto-qa-stage-catalog.ts` (dados + eventual função auxiliar) | 3–5 |
| `AutoQaExecutionService` (11 métodos + 2–3 casos de erro) | 13–15 |
| `AutoQaExecutionStateService` (só leitura: `loadList`/`loadExecution`, sucesso e erro) | 6–8 |
| Design System — 13 componentes × ~3 specs cada | 35–40 |
| `WorkflowOverviewComponent` | 4–6 |
| `ExecutionListPageComponent` / `ExecutionDetailPageComponent` (2 × ~4–5) | 8–10 |
| **Total estimado desta fase** | **≈ 70–85 testes** |

(Complementa, não substitui, a estimativa de ~100–120 testes do plano geral da Fase 12.3 — o restante fica para as subfases de Timeline/Aprovação/Execução.)

---

## 7. Confirmação de que nenhum arquivo foi alterado

Confirmado. Nesta etapa só foi criada a pasta `docs/auto-qa/` (vazia até este arquivo) e este próprio documento de planejamento. Nenhum componente, service, rota, SCSS, `theme.scss` ou config (`angular.json`/`package.json`) foi criado ou alterado. Nenhum `npm install`. Nenhum commit.

---

## 8. Riscos técnicos (específicos desta subfase, além dos já listados no plano geral)

1. **Ambiguidade de localização do `shared/`** (item 2.5) — decisão tomada e sinalizada para confirmação; se o usuário preferir `src/app/shared/` global, a estrutura muda antes do primeiro spec, sem custo agora (nada foi criado ainda).
2. **Tokens de `spacing`/`radius` não pedidos explicitamente** (item 2.7) — sinalizados como dependência inevitável dos componentes do Design System; aguardando confirmação para não extrapolar o escopo aprovado sem aviso.
3. **Mudança de alvo de versão (22 → 20)** — precisa ser executada como pré-requisito real nesta branch (hoje em 19.2.25) antes do primeiro commit de implementação, do mesmo jeito que o upgrade 19→22 vinha sendo feito antes (incremental, com verificação a cada passo).
4. **`WorkflowOverviewComponent` sem dado real de execução em algumas rotas** — na `execution-list-page` não há `executionId` selecionado; o componente só aparece na `execution-detail-page`, alimentado pela leitura (`GET /{id}`) já disponível — não há mock de dado inventado.
5. **Reuso disciplinado do Design System**: por ser a primeira leva de componentes puramente visuais do projeto, o maior risco não é técnico e sim de convenção — qualquer SCSS com HEX direto em vez de `var(--auto-qa-color-*)` quebra o objetivo do item 2.7 já na primeira fase; será tratado como critério de aceite de cada spec/PR desta fase.

---

## 9. Aguardando aprovação explícita

Este plano não avança para specs/implementação sem aprovação. Pontos que dependem de decisão do usuário antes de iniciar:
- Confirmar a localização do `shared/` dentro de `features/auto-qa-bmad/` (item 2.5), ou pedir que já nasça global em `src/app/shared/`.
- Confirmar a inclusão dos tokens `spacing`/`radius` no Theme (item 2.7), além dos 11 tokens de cor explicitamente pedidos.
- Confirmar o upgrade Angular 19 → 20 como pré-requisito de execução desta fase (mesmo fluxo incremental já usado antes).
- Validar a árvore de diretórios e a lista de 13 componentes do Design System (seções 3–4) antes do primeiro spec.
