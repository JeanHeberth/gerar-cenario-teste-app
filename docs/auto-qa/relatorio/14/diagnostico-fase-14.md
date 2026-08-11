# FASE 14 — Design System Global e Padronização Visual do Frontend
## Diagnóstico técnico e visual — Etapa 1 (somente leitura)

**Data:** 2026-08-10
**Escopo:** todo `src/app/` (rotas, shell, 4 áreas de tela, Design System local do Auto QA, estilos globais, dependências).
**Modo:** Diagnóstico apenas — nenhum arquivo alterado, nenhum componente criado/movido, nenhuma rota alterada, backend não tocado, Playwright/pipeline não tocados.

---

## 1. Baseline

393→418 (Fase 13.8) confirmado estável nesta sessão: **418/418 testes unitários**, build de produção verde (`chunk auto-qa-bmad-routes 108.20 kB`, sem warning de budget). Nenhum comando de escrita foi executado durante este diagnóstico.

---

## 2. Mapa de rotas

| Path | Componente | Feature | Lazy/Eager | Layout | Design System | Estado visual |
|---|---|---|---|---|---|---|
| `` (raiz) | `CenarioComponent` | Gerar Cenário | Eager (standalone, import direto em `app.routes.ts`) | Bootstrap `.container` + card único | Bootstrap 5 + CSS hardcoded | **Claro**, cards brancos, gradiente azul no header, emojis inline |
| `chat-agentes` | `ChatAgentesComponent` | Chat IA | Eager | Full-height flex, sem Bootstrap | CSS hardcoded próprio | **Escuro** (`#0d0d0d`/`#1a1a1a`/`#ececec` — paleta quase idêntica ao Auto QA, porém hardcoded, não via tokens) |
| `cenarios` | `CenarioListComponent` | Cenários | Eager | Bootstrap `.container` + lista de cards | Bootstrap 5 + CSS hardcoded | **Claro**, cards brancos, mesma paleta azul/slate do Gerar Cenário |
| `auto-qa` | `ExecutionListPageComponent` | Auto QA BMAD | **Lazy** (`loadChildren`) | Design System próprio (`shared/ui/*`) | `Aqb*` (tokens `--aq-*`) | **Escuro**, consistente, endurecido nas Fases 12–13.8 |
| `auto-qa/:executionId` | `ExecutionDetailPageComponent` | Auto QA BMAD | Lazy (mesmo chunk) | idem acima | idem acima | idem acima |
| `autoqa-artifacts` | `AutoqaArtifactsComponent` | (órfã) | Eager | `shell` custom, sem Bootstrap | CSS hardcoded próprio, terceiro padrão | **Claro** (`#fff`/`#e6e6e6`), diferente dos outros dois padrões claros |

Auto QA BMAD é a **única** rota lazy-loaded — todas as outras 4 (incluindo a órfã) entram no bundle inicial (`main-*.js`, 1.77 MB raw), aumentando o custo de carregamento de toda navegação, mesmo para quem só usa Auto QA.

**Rota órfã confirmada por grep**: `autoqa-artifacts` só é referenciada em `app.routes.ts` — nenhum link de navegação (`app.component.html` só lista 4 links: Gerar Cenário, Chat IA, Cenários, Auto QA) e nenhum outro componente referencia essa rota. Só é alcançável digitando a URL diretamente.

---

## 3. Shell global (`app.component.*`)

- `AppComponent` usa `ChangeDetectionStrategy.Eager` (não `OnPush` — diverge do padrão Auto QA, que usa `OnPush` em 100% dos componentes).
- Nav (`.app-nav`): `position: fixed`, altura 48px, fundo `#1a1a1a`, um único link ativo destacado com `background: #10a37f` — **valores idênticos** aos tokens `--aq-surface`/`--aq-primary` do Auto QA, porém **hardcoded em hex**, não referenciando `var(--aq-*)` (a folha `theme.scss` já está carregada globalmente via `angular.json`, então os tokens estariam disponíveis — só não são usados aqui).
- `:host { padding-top: 48px; }` compensa a nav fixa; `html { scroll-padding-top: 48px; }` em `styles.css` evita foco/scroll ficarem atrás da nav (comentário no próprio código credita esse fix à Fase 12.3.8 do Auto QA — ou seja, **o shell global já herdou pelo menos uma correção de acessibilidade originada no Auto QA**).
- Landmarks: `<nav>` sem `aria-label` (só um nav na página, então não é ambíguo, mas também não é nomeado); conteúdo roteado **não tem `<main>`** (achado já registrado na Fase 13.8, reconfirmado aqui como afetando todas as 5 rotas, não só Auto QA).
- Links da nav usam emoji inline como parte do texto (✏️💬📋🤖) sem `aria-hidden` — mesmo achado da Fase 13.8, reconfirmado.
- Mobile: nav não tem breakpoint dedicado — `justify-content: center` e `gap: 8px` no `.app-nav-links`; com 4 links de texto+emoji, cabe em 390px sem quebra visível (não testado via Playwright real nesta etapa, só inspeção de CSS — ver seção "Responsividade").

**Navegação — KEEP ou REFINE?** **REFINE.** A estrutura (nav fixa, link ativo destacado, dark) já é o padrão correto e deve continuar existindo — mas hoje duplica em hex valores que já existem como token global. Não é candidata a REPLACE (a UX já funciona), mas é o primeiro lugar natural para consumir tokens em vez de duplicá-los.

---

## 4. Inventário do Design System Auto QA (`shared/ui/`)

14 componentes, **100% com `ChangeDetectionStrategy.OnPush`** e **100% com `.spec.ts` dedicado** (49 specs somados em `features/`, incluindo componentes de domínio) — paridade de cobertura muito acima do resto do app (0 specs em `cenario`, `cenario-list`, `chat-agentes`; 1 em `autoqa-artifacts`).

| Componente | API (inputs/outputs) | Depende de domínio Auto QA? |
|---|---|---|
| `AqbButtonComponent` | `variant`(primary/secondary/ghost/danger), `type`, `disabled`, `loading`, `clicked` | Não |
| `AqbInputComponent` | `label`(required), `value`, `placeholder`, `type`, `error`, `valueChange` | Não |
| `AqbTextareaComponent` | `label`(required), `value`, `placeholder`, `rows`, `error`, `valueChange` | Não |
| `AqbModalComponent` | `open`, `title`, `busy`, `describedBy`, `closed` | Não |
| `AqbCardComponent` | `padding`(sm/md/lg) | Não |
| `AqbPanelComponent` | `title` | Não |
| `AqbDividerComponent` | (nenhuma — `<hr>` semântico) | Não |
| `AqbBadgeComponent` | `tone` | Não |
| `AqbPageHeaderComponent` | `title`(required), `subtitle` | Não |
| `AqbEmptyStateComponent` | `title`(required), `description` | Não |
| `AqbLoadingComponent` | `label` | Não |
| `AqbSkeletonComponent` | `variant`, `count` | Não |
| `AqbStatusChipComponent` | `status`(`AutoQaExecutionStatus`) | **Sim** — consome catálogo de status do workflow |
| `AqbStageIconComponent` | `stage`(`AutoQaStageId`) | **Sim** — consome catálogo de etapas |

---

## 5. Classificação dos componentes Auto QA (item 10 da aprovação)

| Componente | Classificação | Motivo |
|---|---|---|
| `AqbButtonComponent` | **GLOBAL_CANDIDATE** | API 100% genérica (variant/type/disabled/loading), zero import de modelo Auto QA |
| `AqbInputComponent` | **GLOBAL_CANDIDATE** | Idem — inclusive já com `aria-describedby` correto pós-13.8 |
| `AqbTextareaComponent` | **GLOBAL_CANDIDATE** | Idem |
| `AqbModalComponent` | **GLOBAL_CANDIDATE** | Focus trap + return focus + Escape + busy guard, hardenizado na 12.3.8, API genérica (`open`/`title`/`busy`/`describedBy`) |
| `AqbCardComponent` | **GLOBAL_CANDIDATE** | `padding` genérico, `ng-content` puro |
| `AqbPanelComponent` | **GLOBAL_CANDIDATE** | `title` opcional + `ng-content`, sem domínio |
| `AqbDividerComponent` | **GLOBAL_CANDIDATE** | Trivial, zero risco |
| `AqbBadgeComponent` | **GLOBAL_CANDIDATE** | `tone` genérico (não é status de workflow — quem mapeia status→tone é `AqbStatusChipComponent`) |
| `AqbPageHeaderComponent` | **GLOBAL_CANDIDATE** | `title`/`subtitle`/`ng-content` para ações — já teria uso imediato em `CenarioListComponent` (que reimplementa manualmente `.list-title`/`.list-subtitle`/botão de ação no header) |
| `AqbEmptyStateComponent` | **GLOBAL_CANDIDATE** | `title`/`description`/`ng-content`, sem domínio — teria uso imediato nos empty states hoje hardcoded em `cenario-list` e `chat-agentes` |
| `AqbLoadingComponent` | **GLOBAL_CANDIDATE** | `role="status"` + `label` genérico |
| `AqbSkeletonComponent` | **GLOBAL_CANDIDATE** | `variant`/`count` genéricos — teria uso imediato no skeleton hoje reimplementado à mão em `cenario-list.component.css` (`.skeleton-item`/`@keyframes shimmer` duplicando o mesmo conceito) |
| `AqbStatusChipComponent` | **AUTO_QA_SPECIFIC** | Acoplado ao catálogo de `AutoQaExecutionStatus` — não deve virar global sem antes separar "chip com tom+label" (genérico, já coberto por `AqbBadgeComponent`) de "mapeamento status→tom" (domínio) |
| `AqbStageIconComponent` | **AUTO_QA_SPECIFIC** | Acoplado a `AutoQaStageId` — o *mecanismo* de ícones SVG poderia virar um `AqbIconComponent` genérico (registry de paths por nome), mas não como está hoje |

Nenhum componente foi classificado como `NEEDS_REFACTOR_BEFORE_GLOBAL` isoladamente — os dois `AUTO_QA_SPECIFIC` já têm uma separação natural (badge genérico + mapeamento de domínio) que uma subfase futura poderia extrair, mas isso é trabalho de globalização, não um defeito a corrigir antes.

`DO_NOT_REUSE`: nenhum.

---

## 6. Tokens (`theme.scss`)

**Já carregado globalmente** — `angular.json` inclui `src/app/features/auto-qa-bmad/shared/theme/theme.scss` na lista `styles` de `build` **e** `test`, junto com `src/styles.css`. Isso significa: as variáveis `--aq-*`, a regra `:focus-visible` e a regra `prefers-reduced-motion` **já se aplicam a todo o app hoje**, não só ao Auto QA — só não são consumidas pelas outras 4 telas (que usam hex hardcoded e Bootstrap).

| Grupo | Local atual | Uso hoje | Classificação (item 12) |
|---|---|---|---|
| Cor (`--aq-background/surface/panel/border/primary/success/warning/danger/text-*`) | `theme.scss` | Só Auto QA consome via `var()`; nav global e Chat IA duplicam os mesmos valores em hex | **READY_TO_GLOBALIZE** — já são globais em escopo CSS, faltam consumidores |
| Espaçamento (`--aq-space-1..12`) | `theme.scss` | Só Auto QA | **READY_TO_GLOBALIZE** — escala numérica simples, sem acoplamento de domínio |
| Radius (`--aq-radius-sm/md/lg/pill`) | `theme.scss` | Só Auto QA; Bootstrap/legado usam valores soltos (10px/12px/14px/18px/999px — nenhum reaproveita a escala Auto QA, mas os valores **coincidem por acidente** em vários pontos, ex. `border-radius: 12px` aparece em `cenario.component.css` e é igual a `--aq-radius-lg`) | **READY_TO_GLOBALIZE** |
| Tipografia (`--aq-font-family`, `--aq-font-size-*`, `--aq-line-height-*`) | `theme.scss` | Só Auto QA; `body` global usa `Inter` (não está na pilha `--aq-font-family`, que começa em `-apple-system`); Chat IA duplica a mesma pilha `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` **literalmente igual** a `--aq-font-family` | **NEEDS_NORMALIZATION** — `body` usa `Inter` (Google Font carregado via `index.html`), conflitando com a pilha de sistema do Auto QA; decidir qual vence antes de globalizar |
| Foco (`--aq-focus-ring-*`) | `theme.scss` | Já global de fato (seletores `:focus-visible` cobrem `button`,`a`,`input`,`textarea`,`select`,`[role=tab]`,`[role=button]`,`[tabindex]` em **toda a aplicação**, sem restrição de feature) | **READY_TO_GLOBALIZE** — tecnicamente já globalizado, só falta documentar que isso já vale para as outras telas |
| `--aq-panel-max-width`/`--aq-content-max-width` | `theme.scss` | Só Auto QA; outras telas usam `max-width: 980px`/`1200px` soltos | **FEATURE_SPECIFIC** por enquanto — os valores das outras telas (980/1200) não coincidem com `--aq-content-max-width` (1120px), decisão de negócio antes de unificar |
| `.aq-sr-only` | `theme.scss` | Já global de fato — utilizável em qualquer template do app hoje sem nenhuma mudança | **READY_TO_GLOBALIZE** |

---

## 7. Tema — múltiplas fontes de verdade visual?

**Sim, confirmadas 3 fontes de verdade de cor independentes:**
1. `theme.scss` (`--aq-*`) — Auto QA, via CSS custom properties.
2. `app.component.css` + `chat-agentes.component.css` — paleta escura *quase idêntica* à (1), mas **hardcoded em hex**, duplicada em dois arquivos diferentes (nenhum dos dois referencia o outro nem `theme.scss`).
3. Bootstrap 5 (CDN, `index.html`) + hex customizados em `cenario.component.css`/`cenario-list.component.css`/`autoqa-artifacts.component.css` — paleta clara (azul `#0d6efd`/verde `#16a34a`/slate `#0f172a`-`#475569`), 3 variações levemente diferentes de "card branco com sombra" entre as 3 telas que a usam.

`styles.css` (global) define `html,body { background:#f1f5f9; color:#0f172a }` — ou seja, o **padrão global do documento é claro**, e cada tela escura (`Chat IA`, `Auto QA`) precisa sobrescrever isso explicitamente no próprio componente. Auto QA faz isso corretamente (`execution-detail-page.component.scss` seta `background: var(--aq-background)` com comentário explícito citando a Fase 12.3.9); Chat IA faz o mesmo em hex hardcoded.

---

## 8. Dark theme — classificação (item 23)

**MIXED_STRATEGY.**

Justificativa: o escuro já é usado em 2 das 5 rotas (Auto QA e Chat IA) de forma independente uma da outra (paletas coincidentes mas não compartilhadas), enquanto as outras 3 (Gerar Cenário, Cenários, autoqa-artifacts) são claras com Bootstrap. Não é `GLOBAL_DEFAULT` porque o `body` global e a maioria das rotas são claras. Não é `FEATURE_ONLY` porque já vazou para uma segunda feature (Chat IA) de forma independente, provando que a demanda por dark já existe fora do Auto QA. A estratégia correta de médio prazo é global (unificar as duas paletas escuras via token), mas isso é decisão de Fase 14.x futura — não implementado aqui.

---

## 9. Gerar Cenário — auditoria

- Bootstrap `.container`/`.card`/`.card-header`/`.form-control`/`.form-select`/`.input-group`/`.alert`/`.d-grid`, gradiente customizado no header, `box-shadow` custom.
- Formulário Reactive Forms, mas **sem tipagem forte** (`this.fb.group({...})` sem `FormGroup<...>` tipado, diferente do `NewExecutionFormComponent` do Auto QA).
- Erros de campo (`campoInvalido()`) mostram `<small class="text-danger helper">` **sem `aria-describedby`** — mesma classe de gap corrigida no Auto QA na Fase 13.8, ainda presente aqui.
- **Erro de submit tratado com `alert()` nativo do browser** (`this.erro()` → `alert('❌ Erro ao gerar cenario.')`) — divergência forte do padrão Auto QA (`role="alert"` inline, sanitizado, sem bloquear a thread).
- `console.error` em 3 pontos (`carregarAgentes`, `buscarArquivosDaTaskJira`, `baixarTodosAnexosDaTaskJira`) — aceitável para depuração, mas nenhum tratamento de erro visual granular equivalente ao `auto-qa-error-mapper.ts`.
- `ChangeDetectionStrategy.Eager`, `HttpClient` chamado diretamente no componente (sem camada de serviço) — padrão anterior ao usado em Auto QA (`AutoQaExecutionService` dedicado).
- Zero testes unitários, zero E2E.
- Emojis extensivos como conteúdo textual dos botões/labels (🖊️👀📎📁🗑️⏳🚀✅❌ℹ️) sem `aria-hidden`.
- Responsividade: só 1 breakpoint (`max-width: 768px`), ajustando padding e empilhando os botões do grupo Jira — não testado nas 4 larguras pedidas via Playwright real (ver seção 15).

---

## 10. Chat IA — auditoria

- Layout `100vh` flex, header fixo abaixo da nav global (`top: 48px`), lista de mensagens rolável, composer fixo no rodapé.
- Paleta escura hardcoded (ver seção 7) — **conceitualmente** o mais próximo do Auto QA entre as 3 telas fora dele.
- `[(ngModel)]` (Forms Module, two-way binding) em vez de Reactive Forms — padrão diferente do resto do app.
- `[innerHTML]="formatContent(msg.content)"` — conversor de markdown próprio via regex (negrito/itálico/code/lista/quebra de linha); `[innerHTML]` do Angular sanitiza automaticamente (não há `bypassSecurityTrustHtml`), então não há XSS aberto, mas é um parser de markdown duplicado e não compartilhado com nenhuma outra feature.
- Textarea do composer e `<select>` de agente **sem `<label>`** — só `placeholder`/`title`. Botão de enviar é um `<svg>` sem texto visível, mas tem `title="Enviar (Enter)"` (não substitui `aria-label` para leitores de tela — `title` tem suporte inconsistente).
- Indicador de "digitando" (`.typing-bubble` com 3 `.dot`) — animação CSS própria, **sem `role="status"`/texto acessível equivalente** (mesma classe de gap do `ActionBar` pré-13.8: indicador visual sem anúncio para leitor de tela).
- Zero testes unitários, zero E2E.
- Elementos específicos de chat que **não devem** virar componentes genéricos: bolha de mensagem (`message-bubble`, com variação user/assistant), avatar de agente/usuário, indicador de digitação, parser de markdown — são conceitos de domínio de chat, não primitives visuais.

---

## 11. Cenários (listagem) — auditoria

- Bootstrap + hex hardcoded, mesma família visual de Gerar Cenário (cards brancos, `border-radius` 10–14px, sombra suave).
- **Achado de acessibilidade concreto**: `<div class="cenario-card" (click)="toggleDetalhes(cenario)">` — **div clicável sem `role="button"`, sem `tabindex`, sem handler de teclado (`Enter`/`Space`)**. Totalmente inacessível via teclado — cada cenário só pode ser expandido com mouse/touch.
- Campo de busca (`<input [ngModel]>`) sem `<label>` associado, só `placeholder`.
- Skeleton de carregamento (`.skeleton-item` + `@keyframes shimmer`) tem `aria-hidden="true"` no container — correto — mas **sem texto `aq-sr-only` equivalente anunciando "carregando"** (diferente do padrão já resolvido no Auto QA desde antes da 13.7).
- Empty states (`Nenhum cenário encontrado`/`Nenhum resultado para a busca`/erro de carregamento) — 3 variações de um mesmo bloco `.empty-state`, sem componente compartilhado, cada uma com `<h3>`+`<p>` hardcoded — mapeiam 1:1 para `AqbEmptyStateComponent`.
- Botões de exportação (`.doc`/`.xlsx`/`.pdf`/`.jira`) usam `title` como única descrição — nome acessível vem do texto visível do botão (`📄 .doc` etc.), então tecnicamente têm nome acessível (o texto do botão), só o emoji não está marcado `aria-hidden`.
- **Sem paginação** — carrega a lista inteira do backend de uma vez (`this.http.get<any[]>(...)`) e filtra 100% client-side; diferente do Auto QA (paginado servidor).
- Bloco HTML inteiro comentado (linhas 32-48, "Card de Configuração do Jira") — código morto, candidato a `REMOVE LATER` (ver seção 19).
- Zero testes unitários, zero E2E.

---

## 12. `autoqa-artifacts` — auditoria

Página órfã (sem link de nav, só alcançável por URL direta — ver seção 2). Implementa um formulário completo de execução de workflow Auto QA (`AutomationFramework`/`AutomationLanguage`/`AutoQaMode`/`steps` com `statusReachedAt`) via `AutoQaService`/`autoqa.interface.ts` próprios (em `src/app/services/` e `src/app/models/`, **fora** de `features/auto-qa-bmad`). Conceitualmente é um **precursor do que hoje é `features/auto-qa-bmad`** — mesmo domínio (execução de workflow de geração de testes por etapas), implementação totalmente separada e não mais linkada.

- Terceira paleta visual clara (`#fff`/`#e6e6e6`), diferente de Bootstrap e do padrão Gerar Cenário/Cenários.
- Único, entre os 4 fora do Auto QA BMAD, com `.spec.ts` (`autoqa-artifacts.component.spec.ts`, 127 linhas).
- Último commit a tocar esses arquivos: `1d6d502` ("Finalizado a fase 12.3") — mesmo commit-base de todo o resto do app antes do início da Fase 13, não indica atividade recente isolada.
- **Classificação: UNCERTAIN.** Não há evidência de uso ativo (sem link de navegação), mas também não há confirmação de que está morto (tem service/model/testes funcionais, pode ser usada deliberadamente via URL direta por algum fluxo interno/QA manual). Não remover por suposição — recomendação: confirmar com o dono do produto antes de qualquer decisão (`REMOVE LATER` só depois dessa confirmação).

---

## 13. Inventário visual — padrões repetidos

| Padrão | Auto QA | Gerar Cenário | Cenários | Chat IA | `autoqa-artifacts` |
|---|---|---|---|---|---|
| Botão primário | `AqbButtonComponent[variant=primary]` (token) | `.btn.btn-success` (Bootstrap, gradiente verde custom) | `.btn.btn-primary` (Bootstrap puro) | `.send-button` (custom, SVG) | Bootstrap (não auditado a fundo, fora do escopo crítico) |
| Botão secundário | `AqbButtonComponent[variant=secondary]` | `.btn.btn-outline-*` (Bootstrap) | `.btn.btn-outline-*` (Bootstrap) | `.btn-new-chat` (custom) | Bootstrap |
| Input de texto | `AqbInputComponent` (label+erro+`aria-describedby`) | `.form-control` (Bootstrap, label solto, erro sem describedby) | `.form-control` sem label | `<textarea>` sem label | Provavelmente Bootstrap (não lido a fundo) |
| Card | `AqbCardComponent`/`AqbPanelComponent` | `.card`/`.scenario-card` (Bootstrap) | `.cenario-card` (custom) | `.message-bubble` (conceito diferente — bolha, não card) | `.shell` (custom) |
| Empty state | `AqbEmptyStateComponent` | — (não se aplica) | `.empty-state` (custom, 3 variações) | `.empty-state` (custom, 2 variações, **mesma classe CSS já reaproveitada informalmente dentro da própria tela**) | — |
| Loading/skeleton | `AqbLoadingComponent`/`AqbSkeletonComponent` | `⏳` emoji no texto do botão | `.skeleton-item` + `@keyframes shimmer` custom | `.typing-bubble` + dots custom | provável spinner custom (não auditado) |
| Alert/feedback | `role="alert"` inline, catálogo de mensagens sanitizado | `.alert.alert-success/danger/info` (Bootstrap) + `alert()` nativo | `role="alert"` só no empty state de erro | mensagem de erro inline na própria bolha de chat | não auditado a fundo |
| Modal | `AqbModalComponent` (focus trap completo) | nenhum modal identificado | nenhum modal identificado | nenhum modal identificado | não auditado a fundo |
| Paginação | Auto QA (servidor, botões Anterior/Próxima) | — | nenhuma (lista completa + filtro client-side) | — | não auditado a fundo |

---

## 14. Duplicações (item 18 — comparação real, não só por nome)

- **Botão "primário de sucesso"**: `.btn-success` (Gerar Cenário, gradiente verde `#16a34a→#22c55e`) vs `AqbButtonComponent[variant=primary]` (`--aq-primary: #10a37f`) — **cores diferentes**, ambos representam "ação principal positiva", API completamente diferente (classe CSS solta vs componente com `loading`/`disabled`/output tipado). Não são equivalentes hoje, mas são o mesmo *conceito*.
- **Empty state**: `.empty-state` em `cenario-list` (3 variações inline) vs `.empty-state` em `chat-agentes` (2 variações inline, nome de classe **coincidentemente igual**, sem relação de código) vs `AqbEmptyStateComponent` (componente real). Três implementações do mesmo conceito, zero compartilhamento.
- **Skeleton/loading**: `.skeleton-item`+`@keyframes shimmer` (Cenários) vs `AqbSkeletonComponent` (Auto QA, sem keyframes custom — usa opacidade/gradiente do próprio tema). Mesmo conceito, CSS duplicado independentemente.
- **Alert de feedback**: `.alert.alert-success/danger/info` (Bootstrap, Gerar Cenário) vs mensagens de erro custom do Auto QA (`role="alert"`, catálogo fixo) — mesmo conceito, uma usa biblioteca, outra é sistema próprio.

---

## 15. Responsividade (1440/1280/768/390) — auditoria por inspeção de CSS

Sem alteração de Playwright/E2E nesta etapa (vedado); avaliação por leitura de CSS/media queries existentes, não por captura visual real nas 4 larguras (ambiente não foi usado para abrir as telas manualmente nesta rodada — ver limitação na seção "Confirmações").

| Tela | 1440 | 1280 | 768 | 390 | Observação |
|---|---|---|---|---|---|
| Auto QA | PASS | PASS | PASS | PASS | Validado por E2E real (`Mobile` project, 390×844) nas Fases 12–13.8 |
| Gerar Cenário | PASS (provável) | PASS (provável) | PARTIAL | PARTIAL | Só 1 breakpoint (768px) trata layout; abaixo disso (390) não há regra dedicada — grupo Jira e file-chips têm `max-width` ajustado, mas botões `.btn-outline-*` do grupo Jira não testados em 390 real |
| Cenários | PASS (provável) | PASS (provável) | PARTIAL | PARTIAL | Mesmo padrão — só 1 breakpoint (768px), nada abaixo |
| Chat IA | PASS (provável) | PASS (provável) | UNCERTAIN | UNCERTAIN | Nenhuma media query encontrada no CSS lido (405 linhas, primeiras 60 sem breakpoint) — necessário ler o restante do arquivo para confirmar antes de qualquer migração |
| `autoqa-artifacts` | UNCERTAIN | UNCERTAIN | UNCERTAIN | UNCERTAIN | Não auditado em profundidade (rota órfã, prioridade baixa) |

**PASS (provável)** = layout largo (flex/grid simples, `max-width` centralizado) que tende a funcionar em desktop sem quebra óbvia pela leitura do CSS, mas não confirmado visualmente nesta etapa.

---

## 16. Overflow horizontal global

A correção H1 (Fase 12.3.9, `min-width:0` em grid items) é **específica da Execution Detail** (`execution-detail-page.component.scss`) e do padrão de grid usado lá — não há evidência de que o mesmo bug (grid blowout) exista nas outras telas, que não usam CSS Grid da mesma forma (Bootstrap `.container`/flex simples). **Não generalizar a correção sem evidência** (conforme item 41 da aprovação) — nenhuma tela fora do Auto QA foi identificada com o mesmo padrão de grid que causaria o mesmo bug.

---

## 17. Mobile — páginas desktop-first

- **Gerar Cenário** e **Cenários**: parcialmente mobile-aware (1 breakpoint cada), mas construídas em cima de Bootstrap `.container` com `max-width: 980px` fixo — funcionam em mobile por fallback do grid Bootstrap, não por design mobile-first deliberado.
- **Chat IA**: `100vh` flex sem nenhum breakpoint identificado nas primeiras 60 linhas do CSS — candidata a auditoria mais profunda antes de qualquer migração (registrado como pendência, não avaliado a fundo nesta rodada por orçamento de tempo).
- **`autoqa-artifacts`**: não avaliado (rota órfã, baixa prioridade).
- **Auto QA**: mobile-first comprovado por E2E real nas Fases 12–13.

---

## 18. Acessibilidade aparente fora do Auto QA (sem repetir a Fase 13.8)

| Achado | Tela | Severidade |
|---|---|---|
| Div clicável sem `role="button"`/`tabindex`/teclado | Cenários (`.cenario-card`) | **HIGH** — bloqueia uso por teclado de uma função central da tela |
| Inputs sem `<label>` (só `placeholder`) | Cenários (busca), Chat IA (composer, select de agente) | **MEDIUM** |
| Erro de campo sem `aria-describedby` | Gerar Cenário | **MEDIUM** (mesma classe de gap já corrigida no Auto QA) |
| Uso de `alert()` nativo para erro de submit | Gerar Cenário | **MEDIUM** — bloqueia a thread, inconsistente com o resto do app, não estilizável/testável |
| Indicador "digitando" sem `role="status"`/texto acessível | Chat IA | **MEDIUM** (mesma classe de gap corrigida no `ActionBar` na 13.8) |
| Botão de enviar (SVG) sem `aria-label` (só `title`) | Chat IA | **LOW** |
| Emojis decorativos sem `aria-hidden` (dezenas de ocorrências) | Gerar Cenário, Cenários, Chat IA, nav global | **LOW**, cumulativo |
| Skeleton sem texto `aq-sr-only` equivalente | Cenários | **LOW** |

Nenhum destes é corrigido nesta etapa — apenas registrado para migração futura, conforme mandato.

---

## 19. Dependências visuais (item 44)

- **Bootstrap 5** — `package.json` (`bootstrap@^5.3.5`, mas parece não importado via SCSS/JS em nenhum lugar — só o CSS é carregado via **CDN** em `index.html`, `bootstrap@5.3.3`, versão de patch diferente da do `package.json`). Usado extensivamente em Gerar Cenário e Cenários (`.container`,`.card`,`.btn`,`.form-control`,`.alert`,`.d-grid`, etc.).
- **Google Fonts** (`fonts.googleapis.com`) — `Roboto` (pesos 300/400/500), carregado via `<link>` no `index.html`; `body` global usa `Inter` (não é o Roboto carregado!) — **inconsistência**: a fonte carregada (Roboto) não é a mesma declarada no CSS global (`Inter`, que provavelmente cai no fallback do sistema por não estar carregada). Achado técnico relevante para qualquer normalização de tipografia.
- **Material Icons** (`fonts.googleapis.com/icon?family=Material+Icons`) — carregado globalmente; não foi encontrado uso de `<i class="material-icons">` nos 4 componentes lidos nesta auditoria (pode estar em uso em algum ponto não coberto, ou ser resíduo não utilizado — `UNCERTAIN`, não remover por suposição).
- **html2canvas**, **jspdf**/**jspdf-autotable**, **xlsx**/**xlsx-js-style**, **file-saver** — dependências funcionais (exportação de documentos em `cenario-list`), não visuais/Design System — fora do escopo de padronização visual.
- **`langflow-chat`** — web component de terceiro, injetado via CSS global (`src/styles.css`, `langflow-chat { position: fixed !important; ... }`) mas **nenhuma tag `<langflow-chat>`** foi encontrada nos componentes lidos — resíduo de estilo para um elemento não localizado nesta auditoria (`UNCERTAIN`, pode estar em `index.html`/script externo não coberto por esta leitura, ou ser legado morto).
- Nenhuma dependência visual nova será instalada por este diagnóstico nem é recomendada nesta etapa.

---

## 20. CSS global (`src/styles.css`) — riscos para um Design System futuro

- `html, body { background:#f1f5f9; color:#0f172a }` — define um tema claro no nível mais alto possível; qualquer futura globalização de tokens dark precisa decidir se isso muda para `var(--aq-background)`/`var(--aq-text-primary)` (o que afetaria as 3 telas claras hoje) ou se permanece claro como padrão e cada tela dark continua sobrescrevendo localmente.
- `langflow-chat { ... !important }` (4 declarações `!important`) — regra de terceiro isolada, baixo risco de colisão (seletor de tag customizada, muito específico).
- `html { scroll-padding-top: 48px }` — acoplado ao valor fixo de altura da nav (`48px`, duplicado também em `app.component.css`); se a nav mudar de altura no futuro, são 2 lugares a atualizar manualmente (nenhum token compartilhado hoje).
- Nenhum `::ng-deep` encontrado em todo `src/app/` (checado via grep) — **positivo**, zero uso do hack de encapsulamento.
- `!important` fora de `theme.scss`: 2 ocorrências em `cenario.component.css`, 1 em `cenario-list.component.css` — todas sobrescrevendo comportamento padrão do Bootstrap em breakpoints específicos, risco baixo (escopo local ao componente, `ViewEncapsulation` padrão do Angular já isola).
- Nenhum uso de `ViewEncapsulation.None`/`ViewEncapsulation.ShadowDom` encontrado em `src/app/` — todos os componentes usam o encapsulamento padrão (`Emulated`), o que é favorável para uma migração incremental seguridade (CSS não vaza entre componentes hoje).

---

## 21. Nomenclatura `AQB` (item 47)

`AQB` nasceu como abreviação de "Auto QA BMAD". Recomendação (não implementar agora): **manter o prefixo `Aqb*` na primeira leva de globalização** (evita um rename simultâneo à extração, que multiplicaria o risco de uma única subfase) e avaliar rename para algo neutro (ex.: `Ui*`/`Ds*`) **somente depois** que os componentes já estiverem estáveis no novo local compartilhado — rename é reversível e de baixo risco técnico a qualquer momento (só busca/substituição + imports), então não precisa bloquear a migração inicial.

---

## 22. Localização recomendada do Design System global (item 48)

Recomendação: **`src/app/shared/ui/`** (espelhando exatamente o padrão já validado em `features/auto-qa-bmad/shared/ui/`, só subindo um nível para fora da feature). Motivos: (a) já existe uma convenção `shared/ui/<componente>/` funcionando e testada — reaproveitar a convenção reduz decisões novas; (b) `src/app/core/ui/` sugeriria acoplamento a serviços/infra (que não é o caso, são só componentes apresentacionais); (c) `src/app/shared/design-system/` é mais verboso sem ganho de clareza. Tokens (`theme.scss`) recomenda-se mover para `src/app/shared/theme/theme.scss` (mesmo padrão de nome, fora da feature) quando globalizados — não movido nesta etapa.

---

## 23. Estratégia de migração incremental proposta (item 49 — definida após leitura do código real, não assumida a priori)

1. **Fase 14.1 — Tokens globais**: mover/copiar `theme.scss` para `src/app/shared/theme/theme.scss` (ou promover o já existente, já que tecnicamente já é global em escopo CSS); resolver a inconsistência `Inter` vs pilha `-apple-system` da seção 6; decidir sobre o `body` claro global. Nenhum componente migra ainda.
2. **Fase 14.2 — Primitives sem domínio**: migrar os 12 `GLOBAL_CANDIDATE` (seção 5) para `src/app/shared/ui/`, mantendo `Aqb*`; re-exportar/reimportar em `features/auto-qa-bmad` para não quebrar nada lá (zero regressão no Auto QA é requisito, seção 51 da aprovação).
3. **Fase 14.3 — Shell/Nav**: `app.component.*` passa a consumir `var(--aq-*)` em vez de hex duplicado; landmark `<main>`; `aria-hidden` nos emojis da nav.
4. **Fase 14.4 — Cenários (listagem)**: menor risco relativo (sem integração Jira/upload complexa) — trocar `.empty-state`/skeleton/card por primitives globais; corrigir a div clicável (HIGH de acessibilidade) nesse momento.
5. **Fase 14.5 — Gerar Cenário**: mais complexa (upload de arquivo, drag-and-drop, integração Jira) — migrar inputs/botões/alerts para primitives, substituir `alert()` nativo por padrão `role="alert"`.
6. **Fase 14.6 — Chat IA**: elementos de domínio de chat (bolha, avatar, digitando) permanecem locais; só primitives genéricos (botão, textarea, empty state) migram.
7. **Fase 14.7 — Limpeza**: decisão sobre `autoqa-artifacts` (seção 12), remoção do bloco HTML comentado em `cenario-list` (seção 19 do achado), remoção de dependências visuais confirmadamente não usadas (Material Icons, se de fato não utilizado).

**Regra de ouro aplicada**: cada subfase migra uma fronteira coerente só (uma tela ou um grupo de tokens), nunca "o frontend inteiro" — consistente com a seção 50 da aprovação.

---

## 24. Dependências entre subfases

14.2 depende de 14.1 (primitives usam tokens). 14.3–14.6 dependem de 14.2 (cada tela consome os primitives já migrados). 14.7 depende de todas as anteriores estarem concluídas (limpeza só depois que nada mais referencia o que seria removido). 14.4 e 14.5 não dependem uma da outra (podem ser reordenadas); 14.6 é independente das duas mas se beneficia de vir depois (mais primitives disponíveis, menos trabalho de adaptação).

---

## 25. Critérios de aceite futuros (a valer em cada subfase, não avaliados agora)

- 418/418 testes unitários do Auto QA continuam verdes após cada subfase (nenhuma subfase pode quebrar o Auto QA).
- 26/26 E2E do Auto QA continuam verdes.
- Build de produção verde, sem estouro de budget.
- Cada componente migrado leva consigo (ou ganha, se não tiver) um `.spec.ts` equivalente ao padrão Auto QA antes de ser considerado "migrado" (não só copiado).
- Nenhuma tela migrada pode regredir abaixo do nível de acessibilidade que tinha antes (ex.: migrar Cenários deve corrigir, não apenas preservar, a div clicável).

---

## 26. Riscos de movimentação por componente (item 54)

| Componente | Risco | Motivo |
|---|---|---|
| `AqbDividerComponent` | **LOW** | Zero API, zero dependência |
| `AqbCardComponent` | **LOW** | API trivial, `ng-content` puro |
| `AqbBadgeComponent` | **LOW** | API trivial |
| `AqbPanelComponent` | **LOW** | API trivial |
| `AqbEmptyStateComponent` | **LOW** | API trivial, sem HTTP/estado |
| `AqbPageHeaderComponent` | **LOW** | API trivial |
| `AqbLoadingComponent` | **LOW** | API trivial |
| `AqbSkeletonComponent` | **LOW** | API trivial |
| `AqbButtonComponent` | **MEDIUM** | Usado em muitos lugares dentro do Auto QA (alto número de call sites) — baixo risco técnico, mas qualquer mudança de import precisa tocar muitos arquivos |
| `AqbInputComponent` / `AqbTextareaComponent` | **MEDIUM** | Idem — muitos call sites; além disso a correção de `aria-describedby` (13.8) é recente, risco de regressão se a extração for descuidada |
| `AqbModalComponent` | **MEDIUM** | Lógica não trivial (focus trap/ElementRef/foco programático); poucos call sites hoje (3 confirm-modals), mas qualquer bug na extração afeta todos de uma vez |
| `AqbStatusChipComponent` | **HIGH** (para globalizar como está) | Acoplado a `AutoQaExecutionStatus`; globalizar exigiria antes separar o mapeamento de domínio do primitive visual — risco alto se feito sem esse passo intermediário |
| `AqbStageIconComponent` | **HIGH** (para globalizar como está) | Acoplado a `AutoQaStageId`/catálogo de ícones por etapa — mesma observação |

---

## 27. `KEEP_LOCAL` (item 55 — usado só uma vez, não precisa virar global)

- `ExecutionCardComponent`, `StageTimelineComponent`/`StageTimelineItemComponent`, `WorkflowOverviewComponent`, `ExecutionInspectionPanelComponent`, os 3 confirm-modals, os 2 approval-panels — todos fortemente acoplados ao domínio Auto QA (`AutoQaExecutionResponse`, `pendingAction`, `availableActions`, `stage`), usados uma única vez cada dentro da própria feature. Nenhum deve virar componente global — são exatamente o tipo de componente que a seção 57 da aprovação veda mover ("nenhum model Auto QA deve ser movido para shared apenas para suportar Design System").
- `doc-export.styles.ts` (`cenario-list`) — estilos de exportação de planilha/documento, específico da funcionalidade, sem relação com Design System visual.

---

## 28. `KEEP AS IS`

- Toda a arquitetura interna do Auto QA (`shared/ui/*`, state service, error mapper, timeout) — referência, não mexer.
- `theme.scss` já carregado globalmente em `angular.json` — não precisa de nenhuma ação estrutural para "se tornar" global, já é.
- Ausência de `::ng-deep`/`ViewEncapsulation.None` em todo o app — manter essa disciplina.
- `html { scroll-padding-top: 48px }` em `styles.css` — correção legítima, herdada do Auto QA, já beneficia todo o app.
- O modal do Auto QA (`AqbModalComponent`) e o Inspection Panel — referência de acessibilidade, não alterar fora do que já é planejado como migração (não redesenhar).

---

## 29. `REMOVE LATER` (só código comprovadamente morto/duplicado — nada removido agora)

- Bloco HTML comentado em `cenario-list.component.html` (linhas 32-48, "Card de Configuração do Jira/Zephyr Scale") — claramente código morto (comentado, não referenciado por nenhum `[hidden]`/flag), candidato direto a remoção em uma limpeza futura (Fase 14.7).

---

## 30. `UNCERTAIN`

- Rota/feature `autoqa-artifacts` inteira (seção 12) — órfã de navegação, mas com testes funcionais; não presumir uso ou não-uso.
- Google Fonts "Material Icons" carregado em `index.html` — nenhum uso de `.material-icons` encontrado nos 4 componentes lidos nesta rodada, mas a auditoria não cobriu 100% do código-fonte (`services/`, `models/`, possíveis outros componentes não mapeados por rota) — não remover por suposição.
- `langflow-chat` — regra CSS presente em `src/styles.css` sem elemento correspondente encontrado nos templates lidos; pode estar em um script externo/`index.html` não coberto.

---

## 31. Cobertura de testes (itens 41/52/53)

| Área | Unit specs | E2E |
|---|---|---|
| Auto QA BMAD | 49 arquivos `.spec.ts` (418 testes) | 26 testes (13 specs × 2 projetos) |
| Gerar Cenário | 0 | 0 |
| Cenários | 0 | 0 |
| Chat IA | 0 | 0 |
| `autoqa-artifacts` | 1 arquivo (127 linhas) | 0 |
| `services/` (raiz, fora do Auto QA) | 1 arquivo | — |

**Nenhuma tela fora do Auto QA tem qualquer cobertura E2E hoje.** Antes de migrar qualquer uma delas para o Design System global, será necessário estabelecer ao menos uma cobertura E2E mínima de regressão visual/funcional (goldenpath) — do contrário não há como comprovar "zero regressão" depois da migração, ao contrário do Auto QA, que tem essa rede de segurança.

---

## 32. Arquivos que provavelmente seriam alterados na primeira subfase (14.1 — tokens, projeção, nada decidido)

- `angular.json` (ajustar caminho de `theme.scss` se for movido para `shared/theme/`, ou manter como está se a decisão for não mover fisicamente).
- Novo arquivo `src/app/shared/theme/theme.scss` (ou confirmação de manter o atual).
- `src/styles.css` (possível resolução da inconsistência `Inter`/pilha de sistema).
- `src/index.html` (possível remoção do link de Google Fonts Roboto se a decisão for adotar a pilha de sistema do Auto QA).
- Nenhum arquivo de `features/auto-qa-bmad` precisaria mudar nesta subfase (tokens continuam os mesmos valores, só potencialmente de local diferente).

## 33. Testes necessários antes da primeira migração

- E2E golden-path mínimo para Cenários e Gerar Cenário (candidatas mais próximas, seção 23) — pelo menos 1 teste cada cobrindo o fluxo principal, antes de qualquer subfase 14.4/14.5.
- Snapshot ou asserção de cor/token computado (via `getComputedStyle`) para pelo menos um elemento por tela, como guarda de regressão visual mínima na ausência de uma ferramenta de screenshot-diff (não recomendada instalação nesta fase).

---

## 34. Achados por severidade

**BLOCKER:** nenhum — a arquitetura atual (componentes standalone, tokens já em CSS global, ausência de `::ng-deep`, separação clara de features) permite migração incremental segura. Nenhuma diferença de cor foi classificada como BLOCKER (conforme vedado).

**HIGH:**
- H1. Div clicável sem semântica/teclado em Cenários (`.cenario-card`) — acessibilidade, correção recomendada independente do timing da migração de Design System.
- H2. `AqbStatusChipComponent`/`AqbStageIconComponent` acoplados a domínio — HIGH especificamente *para o ato de globalizar como estão*, não para o uso atual dentro do Auto QA (que está correto).

**MEDIUM:**
- M1. 3 fontes de verdade visual independentes (tokens Auto QA, hex duplicado no shell/Chat IA, Bootstrap+hex no resto) — duplicação estrutural que cresce a cada nova tela até ser endereçada.
- M2. Zero cobertura de teste (unit/E2E) em 3 das 4 telas fora do Auto QA — bloqueia migração segura até ser minimamente resolvido.
- M3. `alert()` nativo em Gerar Cenário para erro de submit.
- M4. Inconsistência de fonte carregada (Roboto) vs declarada (Inter) no CSS global.
- M5. Inputs sem `<label>` / erro sem `aria-describedby` fora do Auto QA (recorrente em 2 telas).
- M6. Indicador "digitando" do Chat IA sem anúncio acessível.

**LOW:**
- L1. Nav global e Chat IA duplicam hex idênticos aos tokens Auto QA em vez de consumi-los (tokens já estão disponíveis globalmente).
- L2. Emojis decorativos sem `aria-hidden` (múltiplas telas).
- L3. Ausência de landmark `<main>` no shell (já registrado na Fase 13.8, reconfirmado como afetando as 5 rotas).
- L4. Bloco HTML morto comentado em `cenario-list`.
- L5. Terceira paleta clara isolada em `autoqa-artifacts`.

**OBSERVATIONS:**
- O1. `theme.scss` já é tecnicamente global (carregado em `angular.json`) — a "globalização" de tokens é mais uma questão de adoção/consumo do que de movimentação física.
- O2. `autoqa-artifacts` sugere uma implementação anterior do próprio domínio Auto QA, hoje superada pela `features/auto-qa-bmad` — não removido por falta de confirmação.
- O3. Material Icons/`langflow-chat` — dependências cujo uso não foi confirmado nesta auditoria (escopo de leitura não cobriu 100% do código).

---

## 35. Classificação final

**DESIGN_SYSTEM_READY_FOR_INCREMENTAL_MIGRATION**

Justificativa: nenhum BLOCKER arquitetural — os componentes candidatos a globalização são majoritariamente `GLOBAL_CANDIDATE` de risco `LOW`/`MEDIUM`, os tokens já existem em escopo CSS global (só não são consumidos fora do Auto QA), não há `::ng-deep`/`ViewEncapsulation.None` complicando extração, e a estrutura de rotas/standalone components já é compatível com migração incremental por fronteiras (uma tela por vez). As lacunas identificadas (zero cobertura de teste nas 3 telas legadas, acoplamento de 2 componentes a domínio, 3 fontes de verdade visual) são exatamente o tipo de preparação que a sequência de subfases proposta (seção 23) já endereça uma de cada vez — não impedem o início, só definem a ordem seria (tokens → primitives → shell → telas, cobertura de teste antes de cada tela migrar).

---

## 36. Confirmações finais

- **Backend**: não tocado; nenhum arquivo do repositório `criar-cenario-testes` lido além do necessário para este diagnóstico já ter sido feito em fases anteriores (nenhuma leitura nova de backend nesta etapa).
- **Playwright**: `playwright.config.ts` e `e2e/*.spec.ts` — não tocados (só lidos/listados para levantar cobertura, seção 31).
- **Pipeline**: `.github/workflows/*.yml` — não tocados.
- **Nenhum arquivo alterado**: confirmado via este diagnóstico ser 100% leitura (`Read`/`Bash` somente-leitura/`grep`/`find`) — nenhum `Write`/`Edit` foi executado em nenhum arquivo de código nesta etapa, só a criação deste relatório.
- **Nenhum comando Git de escrita**: nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` foi executado.
- **Nenhuma implementação, componente novo, `shared/ui` global, migração de AQB, alteração de tokens, shell, tela ou teste** foi realizada.

---

**PARE.** Diagnóstico da Fase 14 / Etapa 1 encerrado. Aguardando aprovação explícita e separada antes de qualquer Etapa 2 (implementação de qualquer subfase da seção 23).
