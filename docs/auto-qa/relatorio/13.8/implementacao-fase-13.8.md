# FASE 13.8 — Acessibilidade pontual e hardening final do frontend Auto QA
## Relatório final — Etapa 2 (implementação)

**Data:** 2026-08-10
**Escopo:** exclusivamente os 4 itens aprovados (1 HIGH + 3 MEDIUM) do diagnóstico da Etapa 1.
**Metodologia seguida:** RED → GREEN → REFACTOR/VALIDATE, nesta ordem, por item.

---

## 1. Baseline (antes de qualquer alteração)

393/393 testes unitários, build verde, 24/24 E2E — idêntico ao fechamento da Etapa 1 (nenhum drift).

## 2. Arquivos criados

Nenhum arquivo novo de código. Este relatório (`docs/auto-qa/relatorio/13.8/implementacao-fase-13.8.md`) é o único arquivo novo.

## 3. Arquivos alterados

Todos dentro da lista autorizada na seção 54 da aprovação — nenhum arquivo fora dela foi tocado:

- `components/stage-timeline/stage-timeline.component.ts`
- `components/stage-timeline/stage-timeline.component.html`
- `components/stage-timeline/stage-timeline.component.spec.ts`
- `components/stage-timeline-item/stage-timeline-item.component.ts`
- `components/stage-timeline-item/stage-timeline-item.component.html`
- `components/stage-timeline-item/stage-timeline-item.component.spec.ts`
- `shared/ui/input/aqb-input.component.ts`
- `shared/ui/input/aqb-input.component.html`
- `shared/ui/input/aqb-input.component.spec.ts`
- `shared/ui/textarea/aqb-textarea.component.ts`
- `shared/ui/textarea/aqb-textarea.component.html`
- `shared/ui/textarea/aqb-textarea.component.spec.ts`
- `components/new-execution-form/new-execution-form.component.ts`
- `components/new-execution-form/new-execution-form.component.spec.ts`
- `components/action-bar/action-bar.component.html`
- `components/action-bar/action-bar.component.spec.ts`
- `e2e/workflow-overview-timeline.spec.ts`

---

## 4. Item HIGH — Stage Timeline: roving tabindex + navegação por teclado

### 4.1 Implementação do roving tabindex

Introduzido um novo input `active` (booleano, padrão `false`) em `StageTimelineItemComponent`, independente do input `selected` já existente (que continua controlando `aria-selected`, sem nenhuma mudança de semântica). O `tabindex` do item passou de fixo (`tabindex="0"`) para reativo: `[attr.tabindex]="active() ? 0 : -1"`.

`StageTimelineComponent` calcula qual item é o `active` via `activeIndex` (`computed`):
```ts
readonly activeIndex = computed<number>(() => {
  const stage = this.selectedStage();
  const entries = this.entries();
  const idx = stage ? entries.findIndex((entry) => entry.metadata.stage === stage) : -1;
  return idx >= 0 ? idx : 0;
});
```
O template passa `[active]="i === activeIndex()"` a cada item (usando o índice do `@for`).

### 4.2 Regra de qual item fica com tabindex="0"

Prioridade única: a etapa atualmente selecionada (`selectedStage()` input, o mesmo já usado por `aria-selected` — nenhuma heurística nova, nenhum recálculo de `resolveStageVisualState`/`currentStage`). **Fallback determinístico**: se `selectedStage()` for `null` (só ocorre em uso isolado do componente — a página real sempre resolve um valor via seu próprio fallback `currentStage ?? lastStageCompleted ?? primeira etapa`), o índice `0` (primeira etapa do catálogo) fica tabbable, garantindo que o listbox nunca fique sem nenhum item alcançável por Tab.

### 4.3 Teclas implementadas (container `StageTimelineComponent.onKeydown`)

| Tecla | Efeito |
|---|---|
| `ArrowDown` / `ArrowRight` | próximo item (`(current + 1) % length`) |
| `ArrowUp` / `ArrowLeft` | item anterior (`(current - 1 + length) % length`) |
| `Home` | primeiro item (`0`), sem wrap |
| `End` | último item (`length - 1`), sem wrap |

Wrap-around confirmado: último + `ArrowDown`/`ArrowRight` → primeiro; primeiro + `ArrowUp`/`ArrowLeft` → último.

### 4.4 Selection follows focus

Aprovado na seção 9 da autorização — cada navegação por seta/`Home`/`End` chama `this.stageSelected.emit(entries[nextIndex].metadata.stage)` (mesmo evento já consumido pela página hospedeira) **e** move o foco DOM real via `this.itemComponents?.toArray()[nextIndex]?.focus()`. Não é necessário `Enter` adicional após a seta.

### 4.5 Enter / Space preservados

Inalterados em `StageTimelineItemComponent` — `(keydown.enter)="select()"` e `(keydown.space)="onSpace($event)"` continuam no próprio item. O `onKeydown` do container ignora (`return` no `default` do `switch`) qualquer tecla que não seja de navegação, então o evento de `Enter`/`Space` sobe por bubbling sem interferência.

### 4.6 Foco programático

`StageTimelineItemComponent` expõe um método público `focus()`:
```ts
private readonly elementRef: ElementRef<HTMLElement> = inject(ElementRef);
focus(): void {
  this.elementRef.nativeElement.querySelector<HTMLElement>('[role="option"]')?.focus();
}
```
`StageTimelineComponent` obtém as instâncias via `@ViewChildren(StageTimelineItemComponent)` — mesmo padrão idiomático já usado por `ExecutionInspectionPanelComponent` (`@ViewChildren('tabButton')`). Nenhum `document.querySelector` global, nenhum `setTimeout`.

### 4.7 `aria-selected` / `aria-current`

Ambos preservados sem alteração de lógica — `aria-selected` continua vindo de `selected()` (`entry.metadata.stage === selectedStage()`), `aria-current="step"` continua vindo de `state() === 'CURRENT'` em `StageTimelineItemComponent`, nenhum dos dois foi tocado por este item.

### 4.8 Responsabilidade entre componentes

`StageTimelineComponent` (container) decide índice ativo, calcula navegação e move foco. `StageTimelineItemComponent` (item) permanece apresentacional — só reflete `active`/`selected`/`state` e expõe `focus()`; não conhece os demais itens nem a lógica de lista.

### 4.9 Resolver de estado

`resolveStageVisualState`, `AUTO_QA_STAGE_CATALOG`, `WorkflowStatus`/`currentStage`/`lastStageCompleted` — **não tocados**. A correção é 100% de interação/acessibilidade.

---

## 5. Item MEDIUM — `aria-describedby` em `aqb-input`/`aqb-textarea`

Adicionado `errorId = computed(() => \`${inputId()}-error\`)` em ambos os componentes (reaproveita o `id` do próprio campo como base, sem contador global adicional). O `<p>` de erro ganhou `[id]="errorId()"`; o `<input>`/`<textarea>` ganhou `[attr.aria-describedby]="hasError() ? errorId() : null"` (input) / `[attr.aria-describedby]="error() ? errorId() : null"` (textarea) — `null` remove o atributo por completo quando não há erro (confirmado por teste: não aponta para nenhum id inexistente).

**Estratégia de IDs**: `${inputId()}-error`, onde `inputId()` já é único por instância (contador `nextId` incremental existente). Teste dedicado confirma que duas instâncias do mesmo componente geram IDs de erro distintos.

**Help text**: nenhum dos dois componentes possui input de texto auxiliar/hint separado do erro — confirmado por leitura do código-fonte antes de implementar (só existem `label`/`value`/`placeholder`/`type|rows`/`error`). Não havia nada para preservar; `aria-describedby` aponta exclusivamente para o erro.

---

## 6. Item MEDIUM — Foco no primeiro campo inválido (`NewExecutionForm`)

`onSubmit()` foi reestruturado preservando 100% do comportamento anterior no caminho válido, separando o guard de `invalid` do guard de `submitting`:

```ts
onSubmit(): void {
  this.form.markAllAsTouched();
  if (this.form.invalid) {
    this.focusFirstInvalidField();
    return;
  }
  if (this.submitting()) {
    return;
  }
  this.created.emit({ ... });
}

private focusFirstInvalidField(): void {
  if (this.form.controls.scenario.invalid) {
    this.elementRef.nativeElement.querySelector<HTMLElement>('textarea')?.focus();
    return;
  }
  if (this.form.controls.projectPath.invalid) {
    this.elementRef.nativeElement.querySelector<HTMLElement>('input')?.focus();
  }
}
```

Ordem de checagem = ordem visual/DOM (cenário antes de caminho do projeto) — não hardcoda nomes de campo além do necessário para os dois controles reais existentes hoje. Sem `setTimeout`: os elementos nativos `<textarea>`/`<input>` já existem no DOM independentemente de erro (só o `<p>` de mensagem entra/sai condicionalmente), então o foco não depende de aguardar re-render.

**Submit via Enter**: validado — o botão continua `[disabled]="form.invalid"` (não removido), mas o submit implícito via Enter no campo "Caminho do projeto" (comportamento nativo do HTML, independente do estado do botão) chega a `onSubmit()`, que agora move o foco corretamente.

**Error summary**: não criado, conforme vedado explicitamente na aprovação (seção 28).

---

## 7. Item MEDIUM — `ActionBar`: loading com texto acessível

Alteração de uma linha em `action-bar.component.html`:
```html
<!-- antes -->
<aqb-loading />
<!-- depois -->
<aqb-loading label="Executando ação..." />
```
`AqbLoadingComponent` já resolvia a renderização condicional do texto (`@if (label())`) e o `role="status"` — reaproveitado sem nenhuma duplicação de `role`/`aria-live`. O texto é visível (não `sr-only`), consistente com o comportamento já existente do componente; nenhum CSS novo foi necessário.

---

## 8. Testes novos

| Área | Arquivo | Novos testes |
|---|---|---|
| Stage Timeline (container) | `stage-timeline.component.spec.ts` | 11 (tabindex único, fallback sem seleção, ArrowDown/Right/Up/Left, wrap×2, Home, End, foco DOM, Enter não interferido) |
| Stage Timeline Item | `stage-timeline-item.component.spec.ts` | 4 (não-tabbable padrão, tabbable quando `active`, deixa de ser tabbable, `focus()` público) — substituindo o teste antigo que assumia `tabindex="0"` fixo |
| `aqb-input` | `aqb-input.component.spec.ts` | 3 (`aria-describedby` aponta pro erro, ausente sem erro, IDs únicos por instância) |
| `aqb-textarea` | `aqb-textarea.component.spec.ts` | 2 (`aria-describedby` aponta pro erro, ausente sem erro) |
| `NewExecutionForm` | `new-execution-form.component.spec.ts` | 3 (foco no cenário quando ambos vazios, foco no caminho quando só cenário válido, não move foco em submit bem-sucedido) |
| `ActionBar` | `action-bar.component.spec.ts` | 2 (texto acessível não vazio no loading, ausência de `role="status"` sem ação pendente) |
| E2E | `e2e/workflow-overview-timeline.spec.ts` | 1 novo teste (roving tabindex real no browser: único tabbable, `ArrowRight` move seleção+foco+painel, `Home` volta ao primeiro) |

**Total de testes novos:** 25 unitários + 1 E2E (×2 projetos Desktop/Mobile = 2 execuções).

---

## 9. Resultados

- **Unitário:** baseline 393 → **418/418 SUCCESS** (393 + 25 novos, nenhuma falha, nenhum teste pré-existente quebrado).
- **E2E:** baseline 24 → **26/26 passed** (Desktop: 13/13, Mobile: 13/13).
- **Build produção:** verde, `Application bundle generation complete. [3.648 seconds]`. Nenhum budget do `angular.json` foi alterado nem estourado (nenhum warning/erro de budget no output).

## 10. Responsividade

Revalidado nos dois projetos Playwright (`Desktop Chrome` padrão e `Mobile` fixo em 390×844, conforme `playwright.config.ts` — arquivo não alterado). O novo teste de teclado da Timeline passou em ambos. A Timeline continua com `overflow-x: auto` interno em ≤800px (`stage-timeline.component.scss`, **não alterado nesta etapa**) — mover o foco programaticamente entre itens aciona o comportamento nativo do browser de rolar o item focado para dentro da área visível do **contêiner com scroll mais próximo** (a própria `.stage-timeline`), nunca a página.

## 11. Confirmação de ausência de overflow horizontal global

`dashboard.spec.ts` (não alterado nesta etapa, já cobre a asserção de overflow horizontal) continua passando em Desktop e Mobile após todas as mudanças — nenhuma regressão do fix H1/Fase 12.3.9.

## 12. Confirmações de escopo

- **Backend**: nenhum arquivo do repositório `criar-cenario-testes` foi alterado. **Nota operacional** (não é alteração de código): o processo local do backend estava rodando sem a variável de ambiente `AUTO_QA_ALLOWED_ROOTS`, causando `403 Forbidden` real em `/tmp/projeto-e2e` — reproduzido via `curl` direto ao backend, **antes** de qualquer alteração de frontend nesta etapa, confirmando que a causa é puramente de configuração de ambiente local, não uma regressão introduzida aqui. O processo foi reiniciado localmente (`kill` + novo `./gradlew bootRun` com `AUTO_QA_ALLOWED_ROOTS=/tmp/projeto-e2e` em variável de ambiente real do SO) para permitir a validação E2E completa e real — mesma prática operacional já usada nas Fases 13.5/13.6. Nenhum arquivo backend foi tocado.
- **HTTP/state**: `AutoQaExecutionService`, `AutoQaExecutionStateService`, `auto-qa-error-mapper.ts`, timeout (Fase 13.7) — não tocados.
- **Pipeline**: `.github/workflows/*.yml` — não tocados.
- **`playwright.config.ts`**: não tocado.
- **Modal (`aqb-modal`)**: não tocado — `modal-accessibility.spec.ts` (2 testes E2E) continua verde.
- **Inspection Tabs**: não tocado — `inspection-panel.spec.ts` (2 testes E2E) continua verde.
- **Reduced motion**: `theme.scss` não tocado.
- **Headings**: não alterados (LOW/FUTURE, mantido conforme aprovado).
- **Shell global** (`app.component.*`): não alterado.
- **`availableActions`**: lógica de habilitação de ações não tocada — todos os testes pré-existentes do `ActionBar` sobre `isFunctional`/`isDisabled`/ordem continuam verdes.
- **M2 da Fase 13.7** (`canRefresh` bloqueado durante `pendingAction`): não tocado, testes correspondentes em `auto-qa-execution-state.service.spec.ts` continuam verdes (fazem parte dos 418).

## 13. Dependências novas

Nenhuma. Nenhum pacote instalado (`package.json`/`package-lock.json` não tocados).

## 14. Logging/polling novos

Nenhum `console.log`/`console.error`/`console.warn`/`console.debug` adicionado. Nenhum polling adicionado.

## 15. Limitações

- O fallback de `activeIndex` (primeiro item tabbable quando `selectedStage` é `null`) só é exercitado na prática em uso isolado do componente (testes) — na página real, `selectedStage()` nunca é `null` graças ao fallback já existente em `ExecutionDetailPageComponent`. Documentado no código para deixar essa dependência explícita.
- A correção de foco no formulário cobre os dois campos existentes hoje (`scenario`, `projectPath|`); se um novo campo for adicionado ao formulário no futuro, `focusFirstInvalidField()` precisará de uma nova checagem explícita (não há mecanismo genérico de percorrer todos os controles — decisão deliberada para não introduzir complexidade além do necessário, conforme vedado na seção 24 da aprovação).

## 16. LOW/FUTURE restantes (não tratados nesta etapa, conforme aprovação)

- Hierarquia de headings `h1`→`h3` sem `h2` intermediário.
- Ausência de landmark `<main>` no shell global (`app.component.html`).
- Emoji decorativo no nav global sem `aria-hidden`.
- Contraste de `--aq-text-muted` no limite da AA (~4.51:1).
- Alvo de toque dos botões (~32px) — já conforme AA (24×24), abaixo do recomendado AAA (44×44).

## 17. Classificação final

**ACCESSIBILITY_SUFFICIENT**

Justificativa: o único achado HIGH (Stage Timeline sem roving tabindex) foi corrigido e validado (unitário + E2E real no browser). Os três achados MEDIUM (aria-describedby, foco em submit inválido, loading sem texto acessível) foram corrigidos e validados. Nenhum BLOCKER existia. Os itens LOW/FUTURE remanescentes (seção 16) não impedem esta classificação, conforme critério da seção 67 da aprovação.

## 18. Confirmações finais

- Nenhum comando Git de escrita foi executado (`add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean`) — nenhum PR criado, nenhum merge realizado.
- Nenhuma fase nova foi iniciada (Fase 14 não foi tocada). Nenhum redesign, nenhuma alteração de shell global.

---

**PARE.** Implementação da Fase 13.8 / Etapa 2 encerrada. Aguardando revisão.
