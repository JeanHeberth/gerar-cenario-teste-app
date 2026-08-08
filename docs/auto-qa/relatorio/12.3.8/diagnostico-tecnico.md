# Diagnóstico técnico — Fase 12.3.8 (UI Polish, Acessibilidade, E2E e Release Candidate)

**Data:** 2026-08-07
**Escopo:** somente leitura — nenhum arquivo alterado, nenhuma dependência instalada.

## 1. Diagnóstico visual da tela atual

A estrutura funcional já está completa (12.3.1–12.3.7): dashboard de histórico com cards, página de detalhe com Workflow Overview → Timeline/Stage Detail → Inspection Panel (Resumo/Artefatos/Diff/Logs) → ActionBar. Visualmente, porém, a tela ainda lê como uma sucessão de blocos empilhados com pouca hierarquia entre eles — cada componente (`ExecutionSummary`, `Inspection Panel`, `ActionBar`, painéis de aprovação) usa o mesmo `aqb-panel`/`aqb-card` genérico, sem diferenciação de peso visual entre "informação primária" (status, ação atual) e "detalhe secundário" (metadados, histórico de datas). O tema (`theme.scss`) já é consistente e monocromático (dark, tokens `--aq-*` bem centralizados), o que é uma boa base — falta hierarquia, não paleta.

## 2. Principais problemas de UX

- A tela de detalhe não comunica "o que fazer agora" em 1 segundo — `ExecutionStatusHeader` e `ActionBar` estão visualmente no mesmo nível que qualquer outro painel.
- `ExecutionSummaryComponent` (12.3.2) e `ExecutionResultSummaryComponent`/aba Resumo (12.3.6/12.3.7) mostram parte de informação sobreposta (status, datas) em dois lugares diferentes da página, sem uma hierarquia clara entre "resumo rápido" e "resumo de resultado".
- Estados "aguardando aprovação" (`WAITING_*`) e o BLOCKED visual (12.3.6) podem ser lidos como erro por um usuário novo, já que o ícone de cadeado + tom `warning` se parece com bloqueio técnico.
- Foco de teclado é inconsistente entre componentes (ver item 4).

## 3. Componentes que precisam de refinamento

`ExecutionCardComponent` (hierarquia cenário > status > metadados), `AqbPageHeaderComponent` (título "Execuções Auto QA"/página de detalhe usando o mesmo componente sem diferenciação de contexto), `ActionBarComponent` (todas as ações têm o mesmo peso visual — nenhuma diferenciação entre ação principal, destrutiva e de navegação VIEW_*), `ApplyApprovalPanelComponent`/`ExecutionApprovalPanelComponent` (checkboxes nativos sem estilização, `<fieldset>` cru), `AqbModalComponent` (ver item 6).

## 4. Inconsistências do Design System

- **Foco visível inconsistente**: `:focus-visible` customizado (`outline: 2px solid var(--aq-primary)`) existe em só 2 dos 34 arquivos `.scss` da feature (`stage-timeline-item`, `execution-inspection-panel`). O resto depende do outline nativo do navegador — funciona, mas não é visualmente consistente com o tema dark.
- **`aqb-input`/`aqb-textarea` removem `outline: none` no `:focus` substituindo só por `border-color`** (1px) — indicador de foco fraco, risco real de WCAG 2.4.7. Precisa de um indicador mais forte (ex.: `box-shadow` ou `outline` com cor do tema), não só troca de cor de borda.
- **`AqbSkeletonComponent` existe mas não é usado em nenhum lugar da feature** — código morto candidato (dentro do escopo autorizado de remoção pela seção 48) ou, alternativa preferível, adotá-lo nos loading states de página inteira (`ExecutionListPage`/`ExecutionDetailPage` hoje usam só `aqb-loading` — um spinner + texto, sem skeleton).
- **Nenhum tratamento de `prefers-reduced-motion`** em nenhum dos 34 arquivos `.scss` — a animação do spinner (`aqb-loading-spin`, infinita) e as transições de hover/tab não respeitam essa preferência.
- Tokens de tema (`theme.scss`) já são consistentes e não há HEX solto fora dele — não é um problema.

## 5. Decisão sobre BLOCKED vs WAITING visual

Recomendo migrar `BLOCKED` → `WAITING` no catálogo de UI (`execution-ui-status-catalog.ts`, `ExecutionStatusHeaderComponent`). Motivo: os três `WAITING_*_APPROVAL` que hoje mapeiam para `BLOCKED` representam aprovação humana pendente, não falha — "Interrompida" (label atual) soa mais como travamento técnico do que "Aguardando aprovação". `WAITING` com ícone neutro (ex.: relógio/pausa, não cadeado) comunica isso melhor. Mudança seria só de nomenclatura/label/ícone na camada de apresentação (tipo `ExecutionUiStatus`, catálogo, testes) — nenhum enum backend, nenhum contrato alterado. Aguardo confirmação explícita antes de renomear, já que isso toca testes já aprovados na 12.3.6.

## 6. Diagnóstico do `AqbModalComponent`

Confirmado (lido novamente nesta sessão): o componente tem `role="dialog"`, `aria-modal="true"`, `aria-label` — mas **não tem** foco inicial ao abrir, **não tem** focus trap (Tab pode escapar para o conteúdo atrás do overlay), **não tem** `(keydown.escape)`, e **não tem** retorno de foco ao elemento que abriu o modal. É usado por `CancelConfirmModal`, `ApplyConfirmModal` e `ExecuteConfirmModal` — corrigir uma vez neste componente compartilhado resolve os três de uma vez (e qualquer modal futuro).

## 7. Estratégia de focus trap

Implementar no próprio `AqbModalComponent` (sem biblioteca externa): ao abrir (via `effect()` reagindo ao input `open`), localizar todos os elementos focáveis dentro do modal (`querySelectorAll` de seletores padrão: `button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`) e, num `(keydown.tab)` no container do modal, interceptar `Tab`/`Shift+Tab` quando o foco estiver no primeiro/último elemento, redirecionando ciclicamente. É a técnica padrão do padrão WAI-ARIA Dialog (Modal), implementável sem dependência nova.

## 8. Estratégia de return focus

Antes de abrir o modal, capturar `document.activeElement` (o botão que disparou a abertura). Ao fechar (`closed`/Escape/backdrop — se aplicável), chamar `.focus()` nesse elemento salvo. Isso fica melhor centralizado no próprio `AqbModalComponent` via `effect()` no input `open` (salva ao transicionar `false→true`, restaura ao transicionar `true→false`), para não exigir que cada consumidor (`CancelConfirmModal` etc.) reimplemente isso.

## 9. Estratégia de Escape

Adicionar `(keydown.escape)` no `AqbModalComponent`, mas condicionado: se o modal expõe um estado "operação em andamento" (os três modais atuais já têm um input `submitting`), Escape só fecha quando `!submitting()`. Isso exige que `AqbModalComponent` passe a aceitar um input opcional (ex.: `preventEscapeWhen` ou reaproveitar um novo input `busy`) — pequena extensão de contrato do componente compartilhado, testável (item 26 do documento: comportamento precisa estar testado).

## 10. Plano de responsividade por viewport

Usar o Chrome DevTools (via ferramenta de automação de browser já disponível nesta sessão) nos 4 breakpoints exigidos (1440/1280/768/390), navegando o fluxo real: dashboard → criar execução → detalhe → Timeline → Inspection tabs → ActionBar → cada modal. `execution-detail-page.component.scss` já tem media queries em 960px/800px (tablet/mobile) — validar se esses breakpoints realmente cobrem 768px/390px goal ou se precisam de ajuste fino. Registrar screenshots/achados antes de qualquer alteração de CSS.

## 11. Estado atual do Playwright no projeto

**Não existe.** `package.json` não tem `playwright`/`@playwright/test`; não há `playwright.config.ts`; não há pasta `e2e/`; `angular.json` não tem builder `e2e` configurado. É uma dependência nova a ser adicionada.

## 12. Necessidade de dependência nova

Sim — `@playwright/test` (dev dependency) precisa ser instalado, além de rodar `npx playwright install` para os browsers. **Aguardando aprovação explícita antes de instalar**, conforme item 38 do documento.

## 13. Cenários E2E planejados

~8 cenários (dentro da faixa 6–12 aprovada): (1) dashboard carrega e mostra histórico/empty state; (2) criar execução e navegar para o detalhe; (3) Workflow Overview + Timeline renderizam e permitem selecionar etapa; (4) Inspection Panel — navegar entre as 4 abas via clique e teclado (`ArrowLeft`/`ArrowRight`); (5) abrir e cancelar um modal de confirmação (teclado: Tab preso, Escape fecha, foco retorna ao botão); (6) fluxo de aprovação (Apply ou Execution) quando disponível no ambiente; (7) API indisponível → error state com retry; (8) execução inexistente (`404`) → error state sanitizado.

## 14. Estratégia de Happy Path

Depende de o backend em `http://localhost:8089` (ambiente `dev`) estar acessível no momento da execução dos E2E. Se estiver: rodar o fluxo real create → detail → (start, se disponível) sem mocks. Se não estiver (mais provável em CI/sandbox sem o Java rodando): documentar o bloqueio explicitamente no relatório (nunca simular sucesso) e restringir os E2E "reais" a cenários que não dependem de resposta do backend (ex.: cenário 7 acima, testado interceptando a requisição para simular indisponibilidade de propósito — isso é diferente de mockar sucesso).

## 15. Estratégia para ambiente backend indisponível

Usar interceptação de rota do Playwright (`page.route()`) **apenas** para os cenários que precisam simular uma condição específica e determinística (ex.: erro 500/network para testar o error state, ou 404 para execução inexistente) — nunca para simular um fluxo de sucesso completo do domínio. Cenários que dependem de dado real do backend (criar execução, aprovar, aplicar) só rodam se o backend real responder; caso contrário ficam marcados como `test.skip()` com motivo registrado, não como sucesso forjado.

## 16. Auditoria inicial de performance

Nada crítico identificado na leitura do código: `ActionBar`/`WorkflowOverview`/`StageTimeline`/todos os `@for` já usam `track` (com uma exceção pré-existente e já registrada — `apply-approval-panel`/`aqb-skeleton` geram o warning `NG0956` de "track by identity", não introduzido nesta fase). Todos os componentes da feature usam `ChangeDetectionStrategy.OnPush`. `AutoQaExecutionStateService` já faz guard contra chamadas duplicadas (`_loading`/`_pendingAction`). Nenhuma subscription órfã aparente — todas usam `takeUntilDestroyed`.

## 17. Chunk atual da feature

`auto-qa-bmad-routes`: **97.65 kB raw / 17.75 kB transfer** (build de produção rodado nesta sessão, sem alterações). Continua lazy-loaded via `loadChildren` em `app.routes.ts`. Esse é o baseline para comparação ao final da 12.3.8.

## 18. Arquivos previstos para alteração

`AqbModalComponent` (+scss) e os 3 consumidores de modal (specs, para os novos testes de foco/Escape); `execution-ui-status-catalog.ts` + `ExecutionStatusHeaderComponent` (se BLOCKED→WAITING for aprovado); `theme.scss` (regra global de `prefers-reduced-motion` e, possivelmente, um token de foco único); `aqb-input`/`aqb-textarea` (indicador de foco); `ExecutionCardComponent`, `ActionBarComponent`, `AqbPageHeaderComponent`, painéis de aprovação (refinamento visual, sem mudança de contrato/inputs-outputs); `execution-list-page`/`execution-detail-page` (uso de Skeleton nos loading states, se aprovado).

## 19. Arquivos previstos para criação

`playwright.config.ts`, pasta `e2e/` com os ~8 specs (item 13), possivelmente um pequeno helper de fixtures E2E. Nenhum novo componente de produção é esperado além de ajustes nos existentes.

## 20. Testes unitários previstos

Focados no `AqbModalComponent` (focus trap, Escape condicionado a `submitting`/`busy`, return focus) propagados via specs dos 3 modais existentes; teste de regressão se BLOCKED→WAITING for aprovado (`execution-ui-status-catalog.spec.ts`, `execution-status-header.component.spec.ts`); nenhuma reescrita ampla da suíte existente.

## 21. Testes E2E previstos

~8 (item 13), sem redundância com a suíte unitária (E2E cobre integração real de navegador — teclado, foco, viewport — não repete asserções que já são de unidade).

## 22. Riscos

- Ambiente de execução dos E2E pode não ter o backend Java acessível (`localhost:8089`), limitando o Happy Path real — mitigado documentando bloqueio em vez de forjar sucesso.
- Mudança de foco visível em `aqb-input`/`aqb-textarea` pode exigir revisão de contraste (WCAG) — validar visualmente antes de finalizar.
- Renomear BLOCKED→WAITING toca testes já aprovados na 12.3.6 — só fazer com aprovação explícita.

## 23. Limitações

Validação de contraste de cores não será feita com ferramenta automatizada de auditoria externa nesta fase (item 43 do documento não exige isso sem aprovação); tablet pode ficar coberto por validação visual/manual em vez de E2E completo, conforme permitido no item 44.

## 24. Dívidas técnicas que permanecerão

Generated Files/Preview/Diff/Logs/Retry sem contrato público (desde 12.3.7); Failure/Learning detalhados não públicos; ApplyOperation/ExecutionCommandId específicos por execução não públicos — nenhuma dessas é tratada nesta fase (é UX/hardening, não domínio).

## 25. Confirmação de que nenhum arquivo foi alterado

Confirmado — esta resposta é resultado exclusivo de leitura e de um `ng build` (não altera código-fonte, só gera `dist/`, que já está no `.gitignore` do projeto Angular padrão).

## 26. Confirmação de backend congelado

Confirmado — nenhum arquivo Java/backend foi tocado ou será tocado.

## 27. Confirmação de que aguardará nova aprovação antes de implementar

Confirmado — nenhuma dependência foi instalada, nenhum componente foi alterado, nenhum teste E2E foi criado. Aguardando aprovação explícita, incluindo decisão sobre o item 5 (BLOCKED→WAITING) antes de iniciar a implementação em TDD.
