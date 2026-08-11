# FASE 13.8 — Acessibilidade pontual e hardening final do frontend Auto QA
## Diagnóstico técnico — Etapa 1 (somente leitura)

**Data:** 2026-08-10
**Escopo:** `src/app/features/auto-qa-bmad/**` (+ `app.component.*` e `src/styles.css` como contexto global de shell/nav)
**Modo:** Diagnóstico apenas — nenhum arquivo de código, CSS, HTML, TS, teste ou pipeline foi alterado.

---

## 1. Baseline confirmado

| Item | Resultado |
|---|---|
| Testes unitários | **393/393 SUCCESS** (sem drift em relação à baseline final da Fase 13.7) |
| Build | Verde — `dist/gerar-cenario-teste-app` gerado em 3.575s |
| Node | v26.3.0 |
| Angular CLI | 22.1.3 |
| Playwright (`@playwright/test`) | 1.62.1 |
| E2E — `npx playwright test --list` | **24/24 testes listados**, 8 specs × 2 projetos (Desktop/Mobile) — contagem inalterada em relação à Fase 13.6 |

Nenhum teste foi executado de forma a alterar estado (apenas `--list`, leitura de especificação).

---

## 2. Método

Leitura direta do código-fonte atual (não há axe-core/@axe-core/playwright/Lighthouse/pa11y instalados nem usados — confirmado por não haver essas dependências no `package.json` e por não terem sido adicionadas nesta sessão). Toda classificação abaixo vem de inspeção do DOM/template real gerado, comparando contra os padrões WAI-ARIA APG (Authoring Practices Guide) aplicáveis a cada widget (listbox, tablist, dialog), e contra o comportamento já validado/hardenizado em fases anteriores (12.3.8 modais, 12.3.9 overflow horizontal, 13.7 erros/timeout).

Componentes lidos nesta rodada: `stage-timeline`, `stage-timeline-item`, `execution-inspection-panel` (referência), `aqb-modal` + os 3 confirm-modals, `apply-approval-panel`, `execution-approval-panel`, `workflow-overview`, `aqb-input`, `aqb-textarea`, `new-execution-form`, `aqb-loading`, `aqb-skeleton`, `aqb-badge`/`aqb-status-chip`, `aqb-stage-icon`, `aqb-button` (scss), `action-bar`, `execution-list-page`, `execution-detail-page` (html+scss), `warning-list`, `error-list`, `theme.scss`, `app.component.html`. Somado ao contexto já lido em fases anteriores (13.7: error-mapper, state service, retry button).

---

## 3. Achados

### 3.1 HIGH — Stage Timeline: ausência de roving tabindex (REAL_GAP confirmado)

**Onde:** `components/stage-timeline/stage-timeline.component.html` (container `role="listbox"`) + `components/stage-timeline-item/stage-timeline-item.component.html` (item `role="option"`, `tabindex="0"` fixo em **todos** os itens, linha 5).

O container declara corretamente `role="listbox"` com `aria-label`, e cada item declara `role="option"` com `aria-selected`/`aria-current` corretos. Porém **todo item tem `tabindex="0"` incondicional** — não há roving tabindex (`0` apenas no item selecionado/ativo, `-1` nos demais) nem handlers de `ArrowUp`/`ArrowDown`/`Home`/`End`. Apenas `Enter`/`Space` estão tratados (para ativar o item focado via Tab).

Resultado prático: um usuário de teclado precisa pressionar **Tab uma vez por etapa** para percorrer a Timeline, em vez de um único Tab para entrar na lista seguido de setas para navegar — o padrão esperado por qualquer leitor de tela em um `role="listbox"` (NVDA/JAWS/VoiceOver anunciam "lista com N itens" e esperam navegação por seta).

**Comparação direta com o padrão de referência já correto na mesma feature** — `execution-inspection-panel` (tabs): `[tabindex]="selected() === tab.id ? 0 : -1"` + `onKeydown` tratando `ArrowRight`/`ArrowLeft` com wrap-around (`execution-inspection-panel.component.ts:58-71`). A Timeline não replica esse padrão.

**Classificação:** REAL_GAP confirmado por releitura do código atual (não é resíduo de diagnóstico antigo nem suposição — o `tabindex="0"` fixo e a ausência de handlers de seta estão no HTML/TS atuais). **Severidade: HIGH** (mesmo padrão de widget, dois comportamentos de teclado divergentes dentro da mesma tela). **Recomendação: FIX_NOW** na Etapa 2, seguindo exatamente o padrão já validado do Inspection Panel.

### 3.2 MEDIUM — Erros de formulário sem associação `aria-describedby`

**Onde:** `shared/ui/input/aqb-input.component.html` (linhas 3-14) e `shared/ui/textarea/aqb-textarea.component.html` (linhas 3-14).

Quando `error()` existe, o componente define `[attr.aria-invalid]="hasError()"` e renderiza um `<p>` com a mensagem — mas **nunca associa esse `<p>` ao campo via `aria-describedby`**. Um leitor de tela sabe que o campo está inválido (`aria-invalid="true"`) mas não lê automaticamente *por quê* ao focar o campo; o usuário precisa navegar manualmente até o parágrafo de erro (se conseguir localizá-lo).

Consumido por `new-execution-form` (campos "Cenário de teste" e "Caminho do projeto"), único formulário real da feature.

**Classificação:** REAL_GAP. **Severidade: MEDIUM**. **Recomendação: FIX_NOW** — correção pontual e de baixo risco (adicionar `id` ao `<p>` de erro + `aria-describedby` condicional no `<input>`/`<textarea>`).

### 3.3 MEDIUM — Submit com erro: sem foco no primeiro campo inválido, sem resumo de erros

**Onde:** `components/new-execution-form/new-execution-form.component.ts:84-93` (`onSubmit()`).

O botão de submit fica `[disabled]="form.invalid"`, o que bloqueia o caminho principal (clique do mouse) enquanto o formulário estiver inválido. Porém `onSubmit()` chama `form.markAllAsTouched()` antes do guard — e submissão implícita via **Enter** no campo "Caminho do projeto" (`<input>` single-line) dispara `ngSubmit` mesmo com o botão desabilitado (comportamento padrão do HTML: Enter em um `<input>` de formulário aciona submit implícito independentemente do estado do botão). Isso revela as mensagens de erro visualmente, mas:
- o foco não é movido para o primeiro campo inválido;
- não existe um resumo de erros (`role="alert"` agregando "N campos precisam de atenção") anunciado nesse momento;
- combinado com 3.2, o próprio erro revelado não é lido automaticamente pelo leitor de tela.

**Classificação:** REAL_GAP, porém de exposição limitada (só ocorre via Enter no campo de input, não no textarea multi-linha, e não via clique já que o botão fica desabilitado). **Severidade: MEDIUM**. **Recomendação: FIX_NOW** junto com 3.2 (mover foco ao primeiro `aqb-input`/`aqb-textarea` com erro dentro de `onSubmit()` quando `form.invalid`).

### 3.4 MEDIUM — Indicador de ação pendente (`ActionBar`) sem texto acessível

**Onde:** `components/action-bar/action-bar.component.html:14-16` — `<aqb-loading />` é usado **sem o input `label`**.

`aqb-loading` (`shared/ui/loading/aqb-loading.component.html`) usa `role="status"` corretamente, mas só renderiza texto quando `label()` é passado; o spinner em si é `aria-hidden="true"`. Sem `label`, a região `role="status"` fica **vazia** — um leitor de tela recebe a notificação de mudança na live region mas não tem nada para anunciar.

Contraste direto: as duas telas que usam skeleton de carregamento (`execution-list-page.component.html:17-18` e `execution-detail-page.component.html:26-27`) **fazem certo** — `role="status"` + `aria-label` + `<span class="aq-sr-only">Carregando...</span>` explícito. O `ActionBar` não replica esse padrão ao despachar uma ação (`pendingAction()`).

Efeito colateral visual: nem usuários videntes recebem confirmação textual de "ação em andamento" — só o spinner e o botão ficando `disabled` (que a maioria das AT/leitores de tela não anuncia como "carregando", apenas como "indisponível").

**Classificação:** REAL_GAP. **Severidade: MEDIUM**. **Recomendação: FIX_NOW** — passar um `label` (ex.: `"Executando ação..."`) para o `<aqb-loading />` do ActionBar, replicando o padrão `aq-sr-only` já usado nas páginas.

### 3.5 LOW/OBSERVATION — Hierarquia de headings pula de `h1` para `h3`

**Onde:** `shared/ui/page-header/aqb-page-header.component.html` (`h1`) é seguida, em toda a árvore de `execution-detail-page`, diretamente por `h3` em `aqb-panel`, `stage-detail-panel`, `error-list`, `warning-list`, `execution-result-summary` — nunca há um `h2` na página. (`h2` só aparece dentro de `aqb-modal`, um contexto de diálogo separado, o que é aceitável.)

Não é uma falha de ordem (os headings aparecem na ordem correta do DOM) nem impede navegação por heading, mas quebra a expectativa de hierarquia sequencial usada por leitores de tela ao navegar por nível (`h1`→`h2`→`h3`). **Severidade: LOW**. **Recomendação: FUTURE** (não bloqueia; ajuste cosmético de nível, sem risco).

### 3.6 LOW/OBSERVATION — Ausência de landmark `<main>` no shell da aplicação

**Onde:** `src/app/app.component.html` — `<nav class="app-nav">` seguido diretamente de `<router-outlet>`, sem um `<main>` (ou `role="main"`) envolvendo o conteúdo roteado.

Está fora do diretório `features/auto-qa-bmad/**` (é o shell compartilhado por toda a aplicação), mas afeta diretamente a navegação por landmarks de qualquer página da feature Auto QA, incluído aqui por fazer parte do "contexto de nav global" mencionado no escopo do diagnóstico. **Severidade: LOW**. **Recomendação: FUTURE** (mudança de shell global, fora do raio de uma correção pontual da feature; risco de afetar outras rotas fora do Auto QA — `chat-agentes`, `cenarios`, `gerar-cenario`).

### 3.7 OBSERVATION — Contraste de `--aq-text-muted` no limite da AA

`--aq-text-muted: #7d7d7d` sobre `--aq-background: #131313` ≈ **4.51:1** — passa o mínimo WCAG AA para texto normal (4.5:1), mas com margem quase nula. Qualquer uso futuro desse token sobre um fundo ainda mais escuro (ou com texto pequeno < 14px bold/18px regular) pode cair abaixo do limite. **Severidade: OBSERVATION**. **Recomendação: NO_ACTION agora**, mas vale nota para quem for introduzir novos usos desse token.

### 3.8 OBSERVATION — Emoji decorativo no nav global sem `aria-hidden`

`app.component.html` prefixa cada link de navegação com um emoji (`✏️`, `💬`, `📋`, `🤖`) sem `aria-hidden="true"`, seguido do rótulo textual real. A maioria das AT vai anunciar o nome do emoji antes do rótulo (ex.: "lápis, Gerar Cenário") — ruído, não bloqueio. **Severidade: OBSERVATION**. **Recomendação: NO_ACTION** (fora do escopo da feature; mudança de shell global).

### 3.9 OBSERVATION — Alvo de toque dos botões (`aqb-button`) sem `min-height` explícito

`shared/ui/button/aqb-button.component.scss` não define `min-height`/`min-width`; com `padding: var(--aq-space-2) var(--aq-space-4)` (8px/16px) e `font-size-sm` (13px), a altura efetiva fica ≈ 32px — acima do mínimo WCAG 2.2 AA (24×24px, SC 2.5.8), mas abaixo do recomendado AAA (44×44px). Testado nas larguras 1440/1280/768/390 (a regra é a mesma em todos os breakpoints, sem media query específica para touch). **Severidade: OBSERVATION**. **Recomendação: NO_ACTION** (já conforme AA).

---

## 4. KEEP AS IS — confirmado sem regressão e correto

- **Modal (`aqb-modal`) — focus trap, retorno de foco, Escape com guard de `busy`**: releitura completa de `aqb-modal.component.ts`/`.html` confirma que o hardening da Fase 12.3.8 está intacto — `ngAfterViewChecked` gerencia foco inicial/retorno sem timers arbitrários, `onTab`/`onShiftTab` ciclam corretamente, `onClose()`/`onEscape()` respeitam `busy()`. Os 3 confirm-modals (`cancel-confirm-modal`, `apply-confirm-modal`, `execute-confirm-modal`) usam o componente de forma consistente, com `describedBy` real por `id`.
- **Inspection Panel (tabs)**: roving tabindex + `ArrowLeft`/`ArrowRight` com wrap-around, `role="tablist"`/`tab`/`tabpanel"` com `aria-controls`/`aria-labelledby` corretos — é o padrão de referência confirmado correto, usado como base de comparação para o gap 3.1.
- **Live regions de erro** (`role="alert"`) em `execution-list-page` (`state.error()`) e `execution-detail-page` (`state.error()` e `state.actionError()`): confirmado sem regressão desde a Fase 13.7 — o botão de retry (`onRetryLoad`, novo na 13.7) não interfere na estrutura do `role="alert"` existente.
- **Skeletons/loading de página** (`execution-list-page`, `execution-detail-page`): `role="status"` + `aria-label` + `<span class="aq-sr-only">` — padrão correto e replicável (é exatamente o que falta no `ActionBar`, achado 3.4).
- **`prefers-reduced-motion`** (`theme.scss:89-95`): regra global neutraliza `animation-duration`/`transition-duration` para `*`, cobrindo spinner (`aqb-loading`), skeleton, hover, seleção de tab e abertura de modal — sem exceção identificada.
- **`:focus-visible` global** (`theme.scss:73-83`): cobre `button`, `a`, `input`, `textarea`, `select`, `[role='tab']`, `[role='button']`, `[tabindex]` — o seletor `[tabindex]` garante que o indicador de foco também se aplica aos itens da Stage Timeline (que têm `tabindex` mesmo sem roving), então o gap 3.1 é de navegação por teclado, não de visibilidade de foco.
- **Nenhuma dependência de cor isolada para status**: `aqb-badge`/`aqb-status-chip` sempre renderizam o rótulo textual (`{{ metadata().label }}`) junto do tom de cor — confirmado em todos os pontos de uso.
- **Ícones decorativos** (`aqb-stage-icon`, ícones do Inspection Panel): todos os `<svg>` têm `aria-hidden="true"`, sem exceção encontrada.
- **H1 — overflow horizontal (Fase 12.3.9)**: releitura de `execution-detail-page.component.scss` e `stage-timeline.component.scss` confirma que a correção (`min-width: 0` nos grid items + `overflow-x: auto` contido dentro da própria Timeline) segue intacta — o scroll horizontal em mobile (≤800px) é **interno à Timeline**, não vaza para a página. Comentários originais da correção permanecem no CSS, ainda precisos.
- **Fieldset/legend para grupos de checkbox**: `apply-approval-panel` e `execution-approval-panel` usam `<fieldset>`/`<legend>` corretamente para "Operações autorizadas"/"Comandos autorizados"; checkboxes individuais usam `<label>` envolvente (associação implícita correta).
- **Estados vazios**: `aqb-empty-state` usado de forma consistente em lista vazia, avisos vazios e erros vazios — sem texto genérico ambíguo (sempre contextualizado: "Nenhuma execução disponível.", "Nenhum aviso registrado nesta execução.", etc.).

---

## 5. Classificação final

**ACCESSIBILITY_HARDENING_REQUIRED**

Motivo: 1 achado HIGH (Stage Timeline sem roving tabindex — REAL_GAP confirmado, não suposição) + 3 achados MEDIUM (associação de erro de formulário, foco em submit inválido, indicador de ação pendente sem texto acessível). Nenhum BLOCKER — a feature é operável de ponta a ponta por teclado e leitor de tela hoje, mas com atrito real nesses 4 pontos. Os demais achados (LOW/OBSERVATION) não impedem aprovação, apenas ficam registrados para eventual FUTURE.

## 6. Recomendações — FIX_NOW (candidatos à Etapa 2, mediante nova aprovação)

1. Roving tabindex + navegação por seta na Stage Timeline (3.1) — HIGH.
2. `aria-describedby` nos erros de `aqb-input`/`aqb-textarea` (3.2) — MEDIUM.
3. Foco no primeiro campo inválido ao submeter formulário inválido (3.3) — MEDIUM.
4. `label` acessível no `<aqb-loading />` do `ActionBar` (3.4) — MEDIUM.

## 7. Recomendações — FUTURE (fora do escopo imediato)

- Ajuste de hierarquia de headings (3.5).
- Landmark `<main>` no shell global (3.6) — requer avaliação de impacto nas demais rotas (`chat-agentes`, `cenarios`, `gerar-cenario`), fora do raio da feature Auto QA.

## 8. Arquivos afetados por um eventual FIX_NOW (nenhum alterado nesta etapa)

- `components/stage-timeline-item/stage-timeline-item.component.ts`
- `components/stage-timeline-item/stage-timeline-item.component.html`
- `components/stage-timeline/stage-timeline.component.ts`
- `shared/ui/input/aqb-input.component.ts`
- `shared/ui/input/aqb-input.component.html`
- `shared/ui/textarea/aqb-textarea.component.ts`
- `shared/ui/textarea/aqb-textarea.component.html`
- `components/new-execution-form/new-execution-form.component.ts`
- `components/action-bar/action-bar.component.html`

## 9. Testes necessários (para uma eventual Etapa 2, não criados agora)

- Unitário: `stage-timeline-item.component.spec.ts`/`stage-timeline.component.spec.ts` — roving tabindex (`tabindex` -1/0 conforme seleção) + `ArrowUp`/`ArrowDown`/`Home`/`End`.
- Unitário: `aqb-input.component.spec.ts`/`aqb-textarea.component.spec.ts` — `aria-describedby` aponta para o `id` do erro quando presente, `null`/ausente quando não há erro.
- Unitário: `new-execution-form.component.spec.ts` — foco no primeiro controle inválido após submit com formulário inválido.
- Unitário: `action-bar.component.spec.ts` — `aqb-loading` recebe `label` não vazio quando `pendingAction()` corresponde à ação.
- E2E (Playwright): estender `workflow-overview-timeline.spec.ts` para navegar a Timeline via teclado (seta) em vez de apenas clique, confirmando foco e seleção seguem a etapa ativa.

## 10. Confirmações

- Backend: **não tocado** (nenhum arquivo do repositório `criar-cenario-testes` foi lido ou alterado nesta sessão).
- Pipelines (`.github/workflows/*.yml`): **não tocados**.
- Playwright config/specs: **não tocados** (apenas `--list` executado, leitura sem side-effect).
- Nenhum arquivo de código, CSS, HTML, TS ou teste foi criado/alterado/removido nesta Etapa 1.
- Nenhum comando Git de escrita (`add`/`commit`/`push`/`merge`/etc.) foi executado.
- Baseline (393 testes unitários, build verde, 24 E2E) confirmada antes e permanece inalterada — nenhuma execução nesta sessão poderia tê-la alterado, já que nenhum arquivo foi modificado.

---

**PARE.** Diagnóstico da Fase 13.8 / Etapa 1 encerrado. Aguardando aprovação explícita e separada para eventual Etapa 2 (implementação dos 4 itens FIX_NOW listados na seção 6), seguindo RED→GREEN→VALIDATE.
