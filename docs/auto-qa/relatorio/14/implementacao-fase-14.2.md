# FASE 14 — Design System Global
## FASE 14.2 — Primitives Globais — Relatório final

**Data:** 2026-08-11
**Pré-condição confirmada:** Fase 14.1 = `FASE_14_1_FOUNDATION_READY` (mergeada, `theme.scss` em `src/app/shared/theme/`).

---

1. **Baseline inicial:** 418/418 unit, 26/26 E2E, build verde (`auto-qa-bmad-routes` 108.20 kB raw / 19.66 kB transfer, `main` 1.77 MB / 441.30 kB transfer).

2. **Arquivos criados:** nenhum arquivo de código novo — os 48 arquivos (12 componentes × `ts`/`html`/`scss`/`spec.ts`) foram **movidos**, não recriados do zero (conteúdo preservado byte a byte, só localização mudou).

3. **Arquivos movidos:** os 12 primitives aprovados, cada um com seus 4 arquivos, de `src/app/features/auto-qa-bmad/shared/ui/<nome>/` para `src/app/shared/ui/<nome>/` — 48 arquivos ao total.

4. **Arquivos removidos do path antigo:** os mesmos 48 (confirmado via `git diff --diff-filter=D`).

5. **Arquivos consumidores alterados:** 19 arquivos dentro de `features/auto-qa-bmad/` (16 componentes/páginas + 3 catálogos de modelo que importam `AqbBadgeTone`), todos **somente na linha de import** (caminho relativo atualizado para apontar ao novo local) — nenhuma lógica, template ou comportamento tocado. Lista completa: `action-bar`, `apply-approval-panel`, `apply-confirm-modal`, `cancel-confirm-modal`, `error-list`, `execute-confirm-modal`, `execution-approval-panel`, `execution-card`, `execution-inspection-panel`, `execution-result-summary`, `execution-summary`, `new-execution-form`, `stage-detail-panel`, `stage-timeline-item`, `warning-list`, `workflow-overview`, `execution-detail-page`, `execution-list-page`, mais `auto-qa-status-catalog.ts`/`execution-ui-status-catalog.ts`/`stage-visual-state-catalog.ts`. Adicionalmente, `aqb-status-chip.component.ts` (que **permanece** dentro do Auto QA) teve seu import de `AqbBadgeComponent` atualizado para apontar ao novo local global, conforme explicitamente permitido pela seção 35 da aprovação.

6. **Estrutura final `shared/ui`:**
   ```
   src/app/shared/ui/
     button/  input/  textarea/  modal/  card/  panel/
     divider/  badge/  page-header/  empty-state/  loading/  skeleton/
   ```
   Mesma organização por-pasta já validada no Auto QA — nenhum diretório plano.

7. **Lista dos 12 primitives:** `AqbButtonComponent`, `AqbInputComponent`, `AqbTextareaComponent`, `AqbModalComponent`, `AqbCardComponent`, `AqbPanelComponent`, `AqbDividerComponent`, `AqbBadgeComponent`, `AqbPageHeaderComponent`, `AqbEmptyStateComponent`, `AqbLoadingComponent`, `AqbSkeletonComponent` — todos movidos.

8. **Componentes que permaneceram Auto QA:** `AqbStatusChipComponent`, `AqbStageIconComponent`, e todos os componentes de domínio (`ExecutionCard`, `StageTimeline`/`StageTimelineItem`, `WorkflowOverview`, `ExecutionInspectionPanel`, `ActionBar`, os 2 approval panels, os 3 confirm modals, `ExecutionStatusHeader`, `ExecutionResultSummary`, etc.) — nenhum tocado além da atualização de import já descrita.

9. **`StatusChip` localização final:** `src/app/features/auto-qa-bmad/shared/ui/status-chip/` (inalterada).

10. **`StageIcon` localização final:** `src/app/features/auto-qa-bmad/shared/ui/stage-icon/` (inalterada).

11. **APIs alteradas ou não:** **não** — nenhum input/output/tipo de nenhum dos 12 componentes foi alterado.

12. **Selectors alterados ou não:** **não** — `aqb-button`, `aqb-input`, `aqb-textarea`, `aqb-modal`, `aqb-card`, `aqb-panel`, `aqb-divider`, `aqb-badge`, `aqb-page-header`, `aqb-empty-state`, `aqb-loading`, `aqb-skeleton` — todos preservados.

13. **Styles alterados ou não:** **não** — os 12 arquivos `.scss` foram movidos sem nenhuma edição de conteúdo.

14. **`OnPush` preservado:** sim, nos 12 componentes (confirmado por inspeção — nenhum arquivo `.ts` teve seu decorator `@Component` alterado, só o import path de dependências quando aplicável, que não existia dentro dos próprios primitives — nenhum deles importava algo de fora da própria pasta).

15. **`standalone` preservado:** sim, nos 12.

16. **Signal APIs preservadas:** sim — `input()`/`output()`/`computed()` inalterados; nenhuma conversão para `@Input()`/`@Output()`.

17–28. **Item por item (Button/Input/Textarea/Modal/Card/Panel/Divider/Badge/PageHeader/EmptyState/Loading/Skeleton):** todos movidos com conteúdo idêntico (`diff` de conteúdo vazio entre versão antiga — recuperável via `git show HEAD:<path-antigo>` — e nova, exceto o próprio arquivo em si ter sido puramente reposicionado). Nenhuma variante nova, nenhuma mudança de cor/token/comportamento em nenhum dos 12. Modal (item de maior risco): `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`, focus trap (`onTab`/`onShiftTab`), foco inicial (`ngAfterViewChecked`/`focusFirstElement`), `Escape` (`onEscape`), retorno de foco (`returnFocus`) e guard de `busy` — todos confirmados intactos por leitura do arquivo pós-movimentação e pelos 2 testes E2E de acessibilidade de modal, que continuam verdes.

29. **Imports atualizados:** 19 arquivos consumidores + 1 (`aqb-status-chip.component.ts`) = 20 arquivos, todos só na(s) linha(s) de `import`.

30. **Imports antigos restantes:** **zero** — validado via `grep -rln "features/auto-qa-bmad/shared/ui/<primitive>"` para cada um dos 12 nomes em todo `src/app`, sem nenhum resultado.

31. **Duplicações restantes:** **zero** — validado via `find src/app -iname "aqb-<nome>.component.ts"` para cada um dos 12: exatamente 1 arquivo por componente.

32. **Models movidos ou não:** **não** — nenhum model do Auto QA foi movido para `shared/`. Os 3 catálogos (`auto-qa-status-catalog.ts` etc.) só tiveram a linha de import de `AqbBadgeTone` (um **tipo**, não um model de domínio) atualizada — o tipo `AqbBadgeTone` em si é exportado pelo próprio `AqbBadgeComponent`, que é um primitive genérico, não um model de domínio.

33. **Services movidos ou não:** **não** — nenhum dos 12 primitives depende de `HttpClient`/state/repository, confirmado antes da movimentação (nenhum `PARE` foi necessário).

34. **Testes dos primitives:** os 12 `.spec.ts` foram movidos junto com seus componentes, sem nenhuma edição de conteúdo — todos continuam verdes na nova localização (rodados como parte da suíte completa, item 37).

35. **Total unitário antes:** 418.

36. **Total unitário depois:** **418** (idêntico — nenhum teste novo, nenhum teste quebrado).

37. **Resultado unit:** **418/418 SUCCESS**.

38. **Total E2E:** 26 (13 specs × 2 projetos).

39. **Resultado E2E:** **26/26 passed**.

40. **Desktop:** 13/13 verdes, incluindo os 2 de acessibilidade de modal e o Happy Path real de criação de execução (que exercita `AqbInputComponent`/`AqbTextareaComponent`/`AqbButtonComponent` na nova localização).

41. **Mobile:** 13/13 verdes, mesma cobertura.

42. **Build:** **PASS**, `Application bundle generation complete.` sem erros.

43. **Chunk Auto QA antes:** `auto-qa-bmad-routes` — 108.20 kB raw / 19.66 kB transfer.

44. **Chunk Auto QA depois:** `auto-qa-bmad-routes` — **108.20 kB raw / 19.67 kB transfer** (variação de 0.01 kB no transfer é diferença de compressão pelo novo hash de conteúdo, não crescimento real — o conteúdo do chunk é byte-idêntico em termos de código-fonte incluído).

45. **Bundle inicial antes:** `main` 1.77 MB raw / 441.30 kB transfer.

46. **Bundle inicial depois:** `main` 1.77 MB raw / **441.38 kB** transfer (variação de 0.08 kB — ruído de hashing/nome de chunk, não crescimento de conteúdo; nenhum primitive foi importado por nenhum arquivo fora de `features/auto-qa-bmad`, então nenhum deles migrou para o bundle inicial).

47. **Impacto de bundling:** **nenhum realista** — como nenhuma tela legada consome os primitives ainda (proibido nesta fase), o Angular/esbuild continua colocando os 12 componentes dentro do chunk lazy `auto-qa-bmad-routes` (só quem os importa hoje é código dentro dessa rota lazy) — a movimentação de pasta não afeta o grafo de import, que é o que determina o chunking.

48. **Budgets:** nenhum alterado em `angular.json` (arquivo não tocado nesta fase); nenhum budget excedido.

49. **Acessibilidade preservada:** sim — `ACCESSIBILITY_SUFFICIENT` mantido; nenhum atributo ARIA/comportamento de teclado alterado em nenhum dos 12 primitives.

50. **Modal hardening preservado:** confirmado (ver item 17–28) — focus trap, retorno de foco, Escape, busy guard, todos intactos e validados por E2E real.

51. **`aria-describedby` preservado:** confirmado em `AqbInputComponent`/`AqbTextareaComponent` (hardening da Fase 13.8) — nenhuma linha de código alterada, só a pasta.

52. **`reduced-motion` preservado:** não aplicável a nível de primitive individual (a regra vive em `theme.scss`, Fase 14.1, não tocado nesta fase) — os primitives continuam sob o mesmo `@media (prefers-reduced-motion: reduce)` global.

53. **`focus-visible` preservado:** idem — regra global em `theme.scss`, não tocada; os seletores `[tabindex]`/`button`/etc. continuam cobrindo os primitives movidos.

54. **Telas legadas alteradas ou não:** **não** — `CenarioComponent`, `CenarioListComponent`, `ChatAgentesComponent` não tocados.

55. **Shell alterado ou não:** **não** — `app.component.*` não tocado.

56. **Theme alterado ou não:** **não** — `src/app/shared/theme/theme.scss` não tocado (Fase 14.1 permanece congelada).

57. **`angular.json` alterado ou não:** **não**.

58. **`tsconfig*` alterado ou não:** **não**.

59. **Package files alterados ou não:** **não** — `package.json`/`package-lock.json` sem diff.

60. **Pipeline alterado ou não:** **não** — `.github/workflows/` sem diff.

61. **Playwright alterado ou não:** **não** — `playwright.config.ts` e specs não tocados, só executados.

62. **Backend alterado ou não:** **não**.

63. **`autoqa-artifacts` alterado ou não:** **não**.

64. **Dependências novas:** nenhuma.

65. **Riscos encontrados:** durante a extração, o script de atualização automática de imports (regex por `shared/ui/<nome>/`) inicialmente reescreveu, por engano, também os imports de `AqbStatusChipComponent`/`AqbStageIconComponent` em 5 arquivos consumidores (`workflow-overview`, `stage-timeline-item`, `execution-summary`, `execution-card`, `execution-detail-page`) — esses dois **não deveriam** ter seus caminhos alterados, pois permanecem dentro do Auto QA. Identificado antes de rodar qualquer teste (via grep de verificação), corrigido revertendo os 5 imports para o caminho relativo correto dentro de `features/auto-qa-bmad/shared/ui/`, e só então a suíte foi executada — build e testes confirmaram a correção (nenhuma referência quebrada chegou a ser validada como "passando" por engano).

66. **Limitações:** a comprovação de bundling (itens 43–47) se apoiou na leitura do relatório de tamanho do `ng build`, não em uma ferramenta de análise de grafo de dependências dedicada (ex. `webpack-bundle-analyzer` — não instalada, fora do escopo autorizado).

67. **Dívidas técnicas:** nenhuma nova. As já conhecidas (StatusChip/StageIcon acoplados a domínio, telas legadas ainda não consumindo os primitives) permanecem exatamente como estavam, para tratamento nas Fases 14.4–14.6.

68. **Classificação final:** **FASE_14_2_PRIMITIVES_GLOBAL_READY**.

69. **Confirmação de nenhum Git de escrita:** nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

70. **Confirmação de que a Fase 14.3 NÃO foi iniciada:** confirmado — `app.component.*` não tocado, nenhuma tela migrada, nenhum outro passo além do escopo dos 12 primitives.

---

## Classificação final

**FASE_14_2_PRIMITIVES_GLOBAL_READY**

Todos os critérios de aceite das seções 72–76 da aprovação foram atendidos: `src/app/shared/ui/` criado com os 12 primitives + specs, zero cópia duplicada, `StatusChip`/`StageIcon` permaneceram locais, nenhum model/service movido, API/selectors/CSS/OnPush/standalone/signals/acessibilidade idênticos, Auto QA compila e funciona (418/418 unit + 26/26 E2E), nenhum arquivo fora do escopo autorizado tocado.

---

**PARE.** Implementação da Fase 14.2 encerrada. Fases 14.3–14.7 não foram iniciadas. Aguardando revisão.
