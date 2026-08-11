# FASE 14 — Design System Global
## FASE 14.3 — Shell + Navegação Global — Relatório final

**Data:** 2026-08-11
**Pré-condição confirmada:** Fase 14.2 = `FASE_14_2_PRIMITIVES_GLOBAL_READY`.

---

1. **Baseline:** 418/418 unit, 26/26 E2E, build verde (`main` 1.77 MB / 441.38 kB antes desta fase).

2. **Arquivos criados:** `src/app/app.component.spec.ts` (não existia antes desta fase).

3. **Arquivos alterados:** `src/app/app.component.html`, `src/app/app.component.css`, `src/styles.css`, `src/app/shared/theme/theme.scss` (só para o token `--aq-nav-height`, conforme seção 18/19 da aprovação). `app.component.ts` **não precisou** de nenhuma alteração (nenhuma lógica nova, `ChangeDetectionStrategy.Eager` preservado).

4. **Estrutura final `AppComponent`:** `<nav class="app-nav" aria-label="Navegação principal">` com 4 links, cada um com um `<span aria-hidden="true">` (emoji) + `<span>` (texto do nome acessível), seguido de `<main><router-outlet /></main>`.

5. **Landmark `nav`:** presente, com `aria-label="Navegação principal"` (autorizado pela seção 11, adicionado por clareza — só existe 1 nav na aplicação, mas o rótulo remove qualquer ambiguidade futura sem custo).

6. **Landmark `main`:** presente, envolvendo o `<router-outlet>` — confirmado por teste unitário (`mains.length === 1`) e por leitura de todas as 5 páginas roteadas (nenhuma delas já criava um `<main>` próprio, verificado antes de implementar — nenhum conflito).

7. **Quantidade de `main`:** exatamente 1 em toda a árvore renderizada (shell + qualquer rota).

8. **Links da nav:** 4, preservados na mesma ordem — Gerar Cenário, Chat IA, Cenários, Auto QA.

9. **Destinos:** inalterados — `/`, `/chat-agentes`, `/cenarios`, `/auto-qa`. `autoqa-artifacts` **não** foi adicionado (permanece `UNCERTAIN`, fora do menu).

10. **Emojis:** os 4 (`✏️`, `💬`, `📋`, `🤖`) preservados visualmente, agora envolvidos em `<span aria-hidden="true">`, separados do `<span>` de texto.

11. **`aria-hidden`:** aplicado aos 4 spans de emoji — confirmado por teste unitário que cada `.app-nav-link-icon` tem `aria-hidden="true"`.

12. **`aria-current`:** implementado via template reference variable do próprio `routerLinkActive` (`#rlaX="routerLinkActive"`) + `[attr.aria-current]="rlaX.isActive ? 'page' : null"` — nenhuma lógica manual de comparação de URL. Confirmado por teste unitário: exatamente 1 link com `aria-current="page"` após a navegação inicial (`/`, que ativa "Gerar Cenário").

13. **`routerLinkActive`:** preservado (classe `active` continua sendo aplicada da mesma forma); passou a também expor `isActive` via variável de template, reaproveitado para `aria-current` — nenhuma duplicação de lógica de detecção de rota ativa.

14. **Tokens utilizados:** `--aq-surface` (fundo da nav), `--aq-border` (borda inferior + fundo do hover), `--aq-primary` (fundo do link ativo), `--aq-text-primary` (texto da marca + texto no hover), `--aq-nav-height` (novo, altura da nav + padding-top do shell + `scroll-padding-top` global).

15. **Hex removidos:** `#1a1a1a`→`var(--aq-surface)`, `#3f3f3f`(borda)→`var(--aq-border)`, `#3f3f3f`(hover bg)→`var(--aq-border)`, `#ececec`(marca)→`var(--aq-text-primary)`, `#ececec`(hover texto)→`var(--aq-text-primary)`, `#10a37f`(ativo bg)→`var(--aq-primary)`. 6 substituições, todas por equivalência **exata** de valor (confirmado por comparação byte a byte com `theme.scss` antes de substituir).

16. **Hex restantes e justificativa:** `#9ca3af` (cor padrão do texto do link, estado não-ativo/não-hover) e `#ffffff` (cor do texto do link ativo) — nenhum dos dois tem token equivalente exato no tema atual (`--aq-text-secondary` é `#b4b4b4`, valor diferente de `#9ca3af`). Substituir por um token de valor diferente mudaria a aparência, o que a aprovação veda explicitamente (seção 17: "não mudar intencionalmente... salvo diferença inevitável comprovada por equivalência de token"). Mantidos como estavam.

17. **Token `--aq-nav-height` criado ou não:** **criado**, em `src/app/shared/theme/theme.scss`.

18. **Motivo:** eliminar a duplicação do valor `48px` que existia em 3 pontos (`app.component.css` `.app-nav { height }`, `app.component.css` `:host { padding-top }`, `src/styles.css` `html { scroll-padding-top }`) — autorizado explicitamente pelas seções 18/19 da aprovação, único token de layout criado nesta fase (não uma coleção).

19. **`scroll-padding-top` preservado:** sim — continua presente em `src/styles.css`, agora como `scroll-padding-top: var(--aq-nav-height)` em vez do valor `48px` literal; comportamento idêntico (mesmo valor computado).

20. **Padding/offset do shell:** preservado — `:host { padding-top: var(--aq-nav-height) }`, mesma técnica simples de antes (sem margin hack/transform/position absolute novos).

21. **`focus-visible`:** já coberto pela regra global de `theme.scss` (seletor `a:focus-visible`) — confirmado que os links da nav recebem indicador de foco visível sem nenhuma regra local nova (`KEEP AS IS`, nenhuma duplicação de outline adicionada).

22. **Touch targets:** inalterados — `padding: 8px 14px` nos links da nav não foi tocado, mesma área clicável de antes.

23. **Responsividade 1440:** **PASS** — 4 links visíveis, sem overflow (validado via inspeção real do DOM renderizado nessa largura).

24. **Responsividade 1280:** **PASS** — idem.

25. **Responsividade 768:** **PASS** — idem.

26. **Responsividade 390:** **PASS** — 4 links continuam visíveis por extenso (nenhum texto ocultado, nenhum ícone-only), sem overflow horizontal.

27. **Overflow:** **zero** overflow horizontal global em nenhuma das 4 larguras testadas (`document.documentElement.scrollWidth === clientWidth` em todos os casos).

28. **Auto QA:** 26/26 E2E verdes após a mudança de shell, incluindo os 2 testes de acessibilidade de modal (que dependem de foco/scroll não obstruídos pela nav fixa) e os 2 de navegação por teclado da Timeline — nenhuma regressão.

29. **Gerar Cenário:** não alterado (confirmado via `git diff` vazio para `src/app/cenario/`).

30. **Cenários:** não alterado (`src/app/cenario-list/` sem diff).

31. **Chat IA:** não alterado (`src/app/chat-agentes/` sem diff).

32. **`autoqa-artifacts`:** não alterado, não adicionado ao menu.

33. **Testes novos:** `src/app/app.component.spec.ts`, 6 testes — nav landmark nomeado, exatamente 1 `main`, 4 links com nomes/ordem corretos, destinos (`href`) corretos, emojis `aria-hidden` fora do nome acessível, `aria-current="page"` exclusivo no link ativo.

34. **Total unitário:** 418 → **424** (+6, os novos testes do shell).

35. **Resultado unit:** **424/424 SUCCESS**.

36. **Total E2E:** 26 (inalterado — nenhum E2E novo criado; a cobertura existente já exercitava a nav indiretamente em todas as rotas visitadas, e a validação de responsividade foi feita por inspeção direta do DOM renderizado nas 4 larguras, não por um spec Playwright persistido, conforme permitido pela seção 43: "somente se não houver cobertura existente suficiente" — considerou-se suficiente).

37. **Resultado E2E:** **26/26 passed**.

38. **Build:** **PASS**.

39. **Bundle `main` antes/depois:** 1.77 MB / 441.38 kB → **1.78 MB / 441.87 kB** — aumento de ~0.5 kB, correspondente ao markup adicional (spans de emoji/texto, atributos `aria-current`/template refs) — mínimo, esperado, sem warning de budget.

40. **Budgets:** nenhum alterado em `angular.json` (arquivo não tocado); nenhum excedido.

41. **Theme alterado ou não:** **sim**, exclusivamente para adicionar `--aq-nav-height` (seção 18/19) — nenhuma cor/tipografia/spacing pré-existente tocada.

42. **`shared/ui` alterado ou não:** **não** — os 12 primitives da Fase 14.2 não foram tocados.

43. **Rotas alteradas ou não:** **não** — `app.routes.ts` não tocado.

44. **Pipeline alterado ou não:** **não**.

45. **Playwright alterado ou não:** **não** — `playwright.config.ts` e specs não tocados; a checagem de responsividade (itens 23–27) foi feita com um script Node ad-hoc usando a biblioteca `playwright` já instalada, fora do diretório do repositório de testes, sem criar nem alterar nenhum arquivo de spec.

46. **Backend alterado ou não:** **não**.

47. **Dependências novas:** nenhuma.

48. **Riscos encontrados:** nenhum imprevisto — a verificação prévia de que nenhuma rota já possuía `<main>` (item 6) eliminou o principal risco (`main` aninhado) antes da implementação.

49. **Limitações:** a validação de responsividade (itens 23–27) não foi persistida como teste automatizado — é uma inspeção pontual válida para este diagnóstico, mas não protege contra regressão futura automaticamente. Se isso for uma preocupação, um E2E dedicado de responsividade da nav pode ser proposto em fase futura.

50. **FUTURE (explicitamente fora desta fase, registrado):** `ChangeDetectionStrategy` do shell (permanece `Eager`), theme switcher, menu hamburguer, redesign da nav, remoção de Bootstrap/Material Icons, decisão sobre `autoqa-artifacts`, migração de Cenários/Gerar Cenário/Chat IA.

51. **Classificação final:** **FASE_14_3_SHELL_READY**.

52. **Confirmação de nenhum Git de escrita:** nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

53. **Confirmação de que a Fase 14.4 NÃO foi iniciada:** confirmado — `CenarioComponent`, `CenarioListComponent`, `ChatAgentesComponent`, `AutoqaArtifactsComponent` não tocados; nenhuma tela migrada para os primitives globais.

---

## Classificação final

**FASE_14_3_SHELL_READY**

Todos os critérios de aceite das seções 61–65 da aprovação foram atendidos: shell consome tokens onde havia equivalência exata (6 substituições, 2 hex mantidos por ausência de equivalência), exatamente um `main`, nav semântica e funcional, rotas/links/destinos inalterados, responsividade PASS nas 4 larguras sem overflow, 424/424 unit + 26/26 E2E verdes, build verde sem budget alterado, Auto QA/modal/Timeline permanecem funcionais, nenhuma tela legada tocada, nenhum primitive/tema-base/pipeline/Playwright/backend alterado além do estritamente autorizado.

---

**PARE.** Implementação da Fase 14.3 encerrada. Fases 14.4–14.7 não foram iniciadas. Aguardando revisão.
