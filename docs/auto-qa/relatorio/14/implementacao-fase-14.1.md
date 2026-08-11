# FASE 14 — Design System Global
## FASE 14.1 — Fundação Visual e Tokens Globais — Relatório final (Etapa 2)

**Data:** 2026-08-10
**Escopo autorizado:** movimentação do `theme.scss` para local global + normalização de tipografia. Nenhum primitive/tela/shell migrado.

---

1. **Baseline inicial:** 418/418 testes unitários, 26/26 E2E, build de produção verde (`styles-*.css` 2.09 kB raw / 713 bytes transfer).

2. **Arquivos criados:** `src/app/shared/theme/theme.scss` (novo destino global).

3. **Arquivos movidos:** `src/app/features/auto-qa-bmad/shared/theme/theme.scss` → `src/app/shared/theme/theme.scss` (conteúdo idêntico, só o comentário de cabeçalho foi atualizado para refletir que o tema deixou de ser exclusivo do Auto QA — permitido pela seção 36 da aprovação).

4. **Arquivos alterados:** `angular.json` (2 ocorrências: `build.options.styles` e `test.options.styles`), `src/styles.css` (regra `body { font-family }`), `src/index.html` (remoção do `<link>` do Google Fonts Roboto).

5. **Local antigo do tema:** `src/app/features/auto-qa-bmad/shared/theme/theme.scss` — removido; o diretório `features/auto-qa-bmad/shared/theme/` ficou vazio e foi removido junto (nenhum outro diretório compartilhado do Auto QA foi tocado).

6. **Local novo:** `src/app/shared/theme/theme.scss`.

7. **Referências atualizadas:** somente `angular.json` referenciava o caminho do arquivo (confirmado via `grep -rn "shared/theme/theme"` em todo o repositório antes da mudança — nenhum `@import`/`url()` em componentes). As 2 ocorrências foram atualizadas.

8. **Configuração build:** `architect.build.options.styles` agora `["src/styles.css", "src/app/shared/theme/theme.scss"]`.

9. **Configuração test:** `architect.test.options.styles` agora `["src/styles.css", "src/app/shared/theme/theme.scss"]` — mesma alteração, mantendo paridade build/test.

10. **Quantidade de definições de tokens antes/depois:** idêntica — todas as variáveis `--aq-*` (cor, espaçamento, radius, tipografia, foco) foram copiadas sem adição/remoção/alteração de valor. Confirmado por diff do conteúdo (só o comentário de cabeçalho mudou).

11. **Confirmação de fonte única:** `find src -iname "theme.scss"` retorna exatamente 1 resultado (`src/app/shared/theme/theme.scss`) após a movimentação — nenhuma duplicação.

12. **Tokens renomeados ou não:** **não**. Todos os nomes `--aq-*` preservados exatamente como estavam (`--aq-background`, `--aq-surface`, `--aq-panel`, `--aq-border`, `--aq-primary`, `--aq-success`, `--aq-warning`, `--aq-danger`, `--aq-text-primary/secondary/muted`, `--aq-space-*`, `--aq-radius-*`, `--aq-font-*`, `--aq-focus-*`, etc.).

13. **Motivo de manter `--aq-*`:** renomear agora geraria churn em todos os consumidores dentro do Auto QA sem nenhum ganho funcional nesta subfase — decisão já travada na aprovação (seção 3).

14. **Tipografia antes:** 3 fontes de verdade conflitantes — `index.html` carregava Google Fonts Roboto; `src/styles.css` declarava `Inter, -apple-system, ..., Roboto, Arial, sans-serif` (Inter nunca era de fato baixada); `theme.scss` usava `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (pilha de sistema, sem download).

15. **Tipografia depois:** `body` global consome `var(--aq-font-family)` — pilha única de sistema, mesma já usada e validada pelo Auto QA (e coincidentemente já duplicada no Chat IA, que continua com sua própria cópia hardcoded — Chat IA não foi tocado, fica para a Fase 14.6).

16. **Valor final de `--aq-font-family`:** inalterado — `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` (Roboto permanece como fallback dentro da pilha, não como download).

17. **`body` font-family final:** `var(--aq-font-family)`.

18. **Google Fonts Roboto:** **removido** de `src/index.html`.

19. **Justificativa da remoção:** `grep -rn "Roboto"` em todo `src/app`+`src/*.css`+`src/index.html` antes da mudança mostrou Roboto usado **somente como fallback dentro de pilhas de fonte** (em `theme.scss`, `chat-agentes.component.css` e `styles.css`) — nenhum `font-family: 'Roboto'` isolado nem uso de pesos específicos (300/400/500) que dependesse do arquivo baixado. Nenhuma dependência explícita encontrada → remoção autorizada pela seção 12 da aprovação.

20. **Material Icons:** preservados — `<link>` do Google Fonts Material Icons não foi tocado (classificado `UNCERTAIN` no diagnóstico, vedado remover sem prova de ausência total).

21. **Bootstrap:** preservado — CDN em `index.html` não tocado; divergência de versão (`package.json` `^5.3.5` vs CDN `5.3.3`) não resolvida, conforme vedado (seção 33).

22. **Background global preservado:** `html, body { background:#f1f5f9; color:#0f172a }` em `src/styles.css` — nenhuma linha alterada.

23. **Estratégia mixed theme preservada:** nenhuma tela mudou de claro para escuro ou vice-versa; Auto QA e Chat IA continuam definindo dark em seus próprios containers.

24. **`focus-visible` preservado:** regra global (`button/a/input/textarea/select/[role=tab]/[role=button]/[tabindex]:focus-visible`) copiada integralmente para o novo arquivo, sem nenhuma alteração de seletor ou valor.

25. **`reduced-motion` preservado:** bloco `@media (prefers-reduced-motion: reduce)` copiado integralmente, na mesma posição relativa dentro do arquivo (não movido para arquivo separado).

26. **`.aq-sr-only` preservado:** classe utilitária copiada integralmente, mesmo nome, mesmas propriedades.

27. **Auto QA visualmente preservado:** confirmado via 26/26 E2E verdes (incluindo os 2 testes de acessibilidade de modal, os 2 de navegação por teclado da Timeline, e o Happy Path real de criação de execução) — nenhuma diferença de comportamento detectada. Validação adicional: os 6 tokens-chave pedidos pela aprovação (`--aq-background`, `--aq-primary`, `--aq-text-primary`, `--aq-space-4`, `--aq-radius-md`, `--aq-font-family`) foram confirmados presentes no CSS compilado de produção (`dist/gerar-cenario-teste-app/browser/styles-*.css`) após o build, via inspeção direta do artefato gerado — sem necessidade de criar um novo arquivo de teste fora da lista autorizada (conforme seção 23, que veda teste frágil só para aumentar cobertura, e a seção 46, que não incluía nenhum `.spec.ts` novo na lista de arquivos autorizados).

28. **Componentes AQB movidos ou não:** **não movidos**. `AqbButtonComponent`, `AqbInputComponent`, `AqbTextareaComponent`, `AqbModalComponent`, `AqbCardComponent`, `AqbPanelComponent`, `AqbDividerComponent`, `AqbBadgeComponent`, `AqbPageHeaderComponent`, `AqbEmptyStateComponent`, `AqbLoadingComponent`, `AqbSkeletonComponent` — todos permanecem em `features/auto-qa-bmad/shared/ui/`. `AqbStatusChipComponent`/`AqbStageIconComponent` também não tocados.

29. **`shared/ui` criado ou não:** **não criado**. Só `src/app/shared/theme/` existe agora; `src/app/shared/ui/` fica para a Fase 14.2.

30. **Unit tests:** executados após cada mudança estrutural (movimentação do tema, alteração de `angular.json`, alteração de `styles.css`) — sempre verdes.

31. **Total unitário final:** **418/418 SUCCESS** (idêntico à baseline — nenhum teste novo, nenhum teste quebrado, conforme esperado para uma mudança estrutural/configuracional).

32. **E2E:** executado 1 vez completo após todas as mudanças (movimentação + tipografia + remoção do link).

33. **Total E2E final:** **26/26 passed** (13 specs × Desktop + Mobile, idêntico à baseline).

34. **Build:** **PASS** — `Application bundle generation complete.` sem erros.

35. **Warnings:** nenhum warning novo no output do build (nem de budget, nem de CSS, nem de TypeScript).

36. **Budgets:** não alterados em `angular.json` (só o array `styles` mudou); nenhum budget excedido — bundle de estilos globais até **diminuiu** ligeiramente (2.09 kB → 2.04 kB raw), consistente com a remoção de uma linha de CSS e nenhuma adição de conteúdo.

37. **Dependências alteradas:** nenhuma (nenhum pacote npm instalado/removido/atualizado).

38. **`package.json` alterado ou não:** **não** — confirmado via `git diff --stat -- package.json` (vazio).

39. **`package-lock.json` alterado ou não:** **não** — confirmado da mesma forma.

40. **Backend alterado ou não:** **não** — nenhum arquivo do repositório `criar-cenario-testes` foi lido ou alterado nesta etapa.

41. **Pipeline alterado ou não:** **não** — `.github/workflows/*.yml` não tocados.

42. **`playwright.config.ts` alterado ou não:** **não** — só a suíte existente foi executada, nenhuma config/spec alterada.

43. **Telas legadas alteradas ou não:** **não** — `cenario.component.*`, `cenario-list.component.*`, `chat-agentes.component.*` não tocados (a remoção do link Roboto em `index.html` os afeta apenas indiretamente, pela pilha de fallback já existente — nenhum CSS próprio dessas telas foi alterado).

44. **`autoqa-artifacts` alterado ou não:** **não** — não tocado, permanece `UNCERTAIN` conforme mandato.

45. **Riscos encontrados:** nenhum risco não previsto. A validação de que só `angular.json` referenciava o caminho antigo (item 7) eliminou o risco principal (referência quebrada pós-movimentação) antes mesmo de mover o arquivo.

46. **Limitações:** a comprovação de "Auto QA visualmente preservado" (item 27) se apoiou em E2E funcional + inspeção do CSS compilado, não em comparação de screenshot pixel-a-pixel (nenhuma ferramenta de diff visual foi instalada, conforme vedado no diagnóstico da Fase 14). Ambiente local não foi aberto manualmente no browser para inspeção humana nesta etapa.

47. **Dívidas mantidas:** shell global (`app.component.css`) e Chat IA continuam duplicando hex idênticos aos tokens em vez de consumi-los — tratamento explicitamente adiado para as Fases 14.3/14.6, conforme aprovado.

48. **Confirmação de nenhum Git de escrita:** nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` foi executado nesta etapa.

49. **Confirmação de que 14.2 NÃO foi iniciada:** confirmado — nenhum componente `Aqb*` foi movido, nenhum diretório `src/app/shared/ui/` foi criado, nenhuma tela foi migrada.

---

## Classificação final

**FASE_14_1_FOUNDATION_READY**

Todos os critérios de aceite das seções 50–52 da aprovação foram atendidos: tema movido para `src/app/shared/theme/`, sem duplicação, `angular.json` build/test atualizados, zero mudança visual/funcional detectada no Auto QA, tipografia normalizada para o token único, Google Fonts Roboto removido com segurança comprovada, Material Icons/Bootstrap/background global/mixed strategy/backend/pipeline/Playwright/dependências npm — todos intocados.

---

**PARE.** Implementação da Fase 14.1 encerrada. Fase 14.2 (Primitives Globais) não foi iniciada. Aguardando revisão.
