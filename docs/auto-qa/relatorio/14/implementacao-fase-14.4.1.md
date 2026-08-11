# FASE 14.4.1 — Alinhamento Visual do Gerar Cenário
## Relatório final (migração visual + correção de fundo)

**Data:** 2026-08-11
**Pré-condição confirmada:** Fase 14.4 = `FASE_14_4_CENARIOS_MIGRATED`.
**Escopo:** estritamente visual — nenhuma alteração funcional. Fase 14.5 NÃO foi iniciada nesta subfase.

---

## Parte 1 — Migração visual (Bootstrap/tema claro → Design System global)

1. **Baseline:** 444/444 unit, 30/30 E2E, build verde (`main` 1,78 MB / 443,43 kB) antes de qualquer alteração.
2. **Rota:** `/` — inalterada.
3. **Arquivos alterados:** `src/app/cenario/cenario.component.ts` (só imports de primitives), `.html` (reescrito visualmente), `.css` (reescrito com tokens). Nenhum outro arquivo tocado.
4. **Primitives usados:** `AqbPageHeaderComponent`, `AqbButtonComponent`, `AqbCardComponent`.
5. **Header antigo removido:** sim — gradiente azul/`card-header` Bootstrap eliminado.
6. **PageHeader:** `aqb-page-header` com título "Gerador de Cenário de Teste" (sem subtítulo — não existia texto auxiliar original a preservar).
7. **Visualizar Cenários:** migrado para `aqb-button variant="secondary"`, mesma navegação (`irParaCenarios()`).
8. **Título da tela:** texto preservado integralmente.
9. **Regra de Negócio:** mantido `<textarea>` nativo com `formControlName` — `AqbTextareaComponent` não implementa `ControlValueAccessor`/evento `blur`, então trocar quebraria o rastreio de `touched` usado por `campoInvalido()`. Fallback previsto no próprio escopo aprovado (item 20 da aprovação).
10. **Agente e demais selects:** `<select>` nativo estilizado com tokens (sem primitive Select — não existe um aprovado).
11. **Jira:** input nativo + linha de botões, comportamento 100% preservado.
12. **Botões Jira:** migrados para `aqb-button` (`secondary`/`ghost`), `disabled` e `click` preservados.
13. **Anexos/Dropzone:** visual migrado para tema escuro (borda tracejada com `--aq-border`/`--aq-primary` no estado ativo); `dragover`/`dragleave`/`drop` intocados.
14. **File input nativo:** mantido, apenas reskinado.
15. **File chips:** classes renomeadas para BEM local com tokens; estrutura e `removerPdf(i)` preservados.
16. **Remover arquivo:** mantido nativo (não separado o suficiente do chip para justificar `AqbButton` sem risco visual).
17. **CTA:** migrado para `aqb-button type="submit" variant="primary"`, `[disabled]="form.invalid || loading"` idêntico — submit real preservado (o primitive renderiza `<button type="submit">` nativo, sem `preventDefault`).
18. **Loading do CTA:** texto condicional (`⏳ Gerando...`) preservado; input `loading` do primitive não usado, para não duplicar a lógica de `disabled`.
19. **Alerts visuais:** classes Bootstrap (`alert-success` etc.) substituídas por `.cenario-page__alert--*` com tokens; `jiraMessageType`/`uploadMessageType` (TS) intocados.
20. **Tokens:** cores, espaçamento, radius, tipografia e transições 100% via `--aq-*`; zero hex novo.
21. **Bootstrap restante:** nenhuma classe Bootstrap na tela (removido `container`, `card`, `form-control`, `btn-*`, `alert-*`, `input-group`, `d-grid` etc.).
22. **Shadows:** removidas (sombra do card antigo eliminada, sem token novo).
23. **Emojis:** mantidos; os dois puramente decorativos (📎, 📁) receberam `aria-hidden="true"`.
24. **Funcional:** submit, payload, endpoint, agentes, workflow, Jira, upload, drag/drop, navegação e feedback — nenhum alterado (nenhuma linha de lógica tocada no `.ts` além dos 3 imports).
25. **Testes:** 444/444 unit e 30/30 E2E sem nenhum teste novo (subfase estritamente visual).
26. **Build:** produção OK. Bundle: `main` 1,78 MB → 1,79 MB raw / 443,43 kB → 443,20 kB transfer — variação desprezível.

---

## Parte 2 — Correção obrigatória (faixas laterais claras)

**Problema reportado:** o conteúdo central usava o tema escuro corretamente, mas restavam faixas claras nas extremidades esquerda/direita da página em telas largas.

**Causa raiz:** o mesmo elemento (`.cenario-page`) acumulava `max-width: 840px; margin: 0 auto` **e** `background: var(--aq-background)`. Como o fundo estava aplicado ao elemento já limitado em largura, o corpo claro (`html, body { background: #f1f5f9 }` em `src/styles.css`, congelado por definição da fase) ficava visível nas laterais em viewports > 840px.

**Correção:** separação estrutural `page` (full-width, fundo) / `content` (max-width, centralizado):

```html
<div class="cenario-page">          <!-- full-width, background, min-height -->
  <div class="cenario-page__content"> <!-- max-width, centralizado, padding -->
    ...conteúdo...
  </div>
</div>
```

```css
.cenario-page {
  width: 100%;
  background: var(--aq-background);
  color: var(--aq-text-primary);
  min-height: calc(100vh - var(--aq-nav-height));
}

.cenario-page__content {
  display: flex;
  flex-direction: column;
  gap: var(--aq-space-6);
  max-width: var(--aq-content-max-width);
  margin-inline: auto;
  padding: var(--aq-space-6) var(--aq-space-4);
}
```

- Valor mágico `840px` substituído pelo token `--aq-content-max-width` (o mesmo usado em `/cenarios`).
- `min-height` mantido via `--aq-nav-height`.
- **Arquivos alterados:** `cenario.component.html` (wrapper `.cenario-page__content`), `cenario.component.css` (split de responsabilidades). TypeScript **não** foi tocado.
- **Body global, AppComponent, theme.scss, primitives:** não alterados.
- **Validação por pixel** (`elementFromPoint` nas bordas x=2/x=largura−2): 1440 e 1280 retornam `.cenario-page` com `background-color: rgb(19, 19, 19)` (= `--aq-background`) nas duas extremidades — **sem faixa clara**. 768/390 ficam abaixo do `max-width`, então `.cenario-page__content` ocupa 100% e herda o fundo do pai — mesmo resultado visual.
- **Overflow:** `scrollWidth === innerWidth` exatamente (0px de diferença) nos 4 viewports.
- **Testes:** 444/444 unit, 30/30 E2E — sem alteração de contagem.
- **Build:** verde (`main` 1,79 MB / 442,98 kB).

---

## Classificação final

**FASE_14_4_1_BACKGROUND_FIXED**

Critérios de aceite (visual, funcional, escopo, responsividade) todos atendidos — ver detalhamento acima.

---

**PARE.** Fase 14.5 NÃO foi iniciada. Nenhum commit/push executado nesta subfase (Git permaneceu manual). Aguardando revisão.
