# FASE 14.4 — Cenários
## Etapa 2 — Migração Visual — Relatório final

**Data:** 2026-08-11
**Pré-condição confirmada:** Etapa 1 = `FASE_14_4_READY_FOR_VISUAL_MIGRATION` (439/439 unit, 30/30 E2E).

---

1. **Baseline:** 439/439 unit, 30/30 E2E, build verde (`main` 1.78 MB/441.87 kB) antes de qualquer alteração desta etapa.

2. **Arquivos alterados:** `cenario-list.component.ts`, `cenario-list.component.html`, `cenario-list.component.css` — os únicos 3 arquivos de produção autorizados, e nenhum outro foi tocado (confirmado por `git status` — zero diff fora de `cenario-list/`, `e2e/cenarios-list.spec.ts` e este relatório).

3. **Arquivos criados:** nenhum arquivo de produção novo. Os 2 arquivos de teste da Etapa 1 (`cenario-list.component.spec.ts`, `e2e/cenarios-list.spec.ts`) foram **atualizados**, não recriados.

4. **Primitives utilizados:** `AqbPageHeaderComponent`, `AqbButtonComponent`, `AqbInputComponent`, `AqbEmptyStateComponent`, `AqbSkeletonComponent`, `AqbCardComponent` — os 6 previstos no plano da Etapa 1. Nenhum primitive foi alterado (confirmado: zero diff em `src/app/shared/ui/`).

5. **PageHeader:** `.list-header` substituído por `<aqb-page-header title="Lista de Cenários de Teste" subtitle="Acompanhe cenários gerados e exporte no formato desejado.">` — título/subtítulo preservados exatamente como estavam no template original (fonte de verdade usada, nenhuma reinvenção terminológica).

6. **Novo Cenário:** `.btn.btn-primary.btn-sm` → `<aqb-button variant="primary">`, mesma ação (`irParaCriacao()`), mesmo destino (`/`).

7. **Busca:** `onTermoBuscaChange()`, debounce de 200ms, normalização de acento/caixa e o getter `cenariosFiltrados` — **nenhuma linha de lógica alterada**. Só a camada visual/binding (`.form-control` → `<aqb-input>`).

8. **Label da busca:** adicionado `label="Buscar cenário"` (sugestão da aprovação, adotada literalmente) — antes não existia nenhum `<label>`, só `placeholder`. `placeholder="Buscar por título"` preservado.

9. **Limpar:** `.btn.btn-outline-secondary.btn-sm` → `<aqb-button variant="ghost">`, mesma condição de exibição (`@if (termoBuscaDigitado)`), mesma ação (`limparBusca()`). Composição local (elemento irmão do input) — `AqbInputComponent` não foi alterado para incorporar um botão de limpar, conforme vedado.

10. **Loading:** `.skeleton-list` (3 `.skeleton-item` com `@keyframes shimmer` customizado) → `role="status" aria-label="Carregando cenários..."` com `<span class="aq-sr-only">` + `<aqb-skeleton variant="block" [count]="3">`, mesmo padrão já usado no Auto QA. `@keyframes shimmer` e `.skeleton-item` **removidos** (dead CSS, seção 37).

11. **Skeleton:** ver item 10 — `AqbSkeletonComponent` (3 blocos), animação neutralizada globalmente por `prefers-reduced-motion` (tema, Fase 14.1), como em toda a aplicação.

12. **Empty sem dados:** `.empty-state` → `<aqb-empty-state title="Nenhum cenário encontrado" description="Gere um novo cenário para começar.">`, texto idêntico ao original.

13. **Empty busca:** `.filtered-empty-state` → `<aqb-empty-state title="Nenhum resultado para a busca" description="Tente outro termo para localizar os cenários.">`, texto idêntico ao original.

14. **Error:** migrado para `<aqb-empty-state title="Falha ao carregar" [description]="erroCarregamento">`.

15. **Retry:** botão "Tentar novamente" adicionado dentro do `aqb-empty-state` de erro (`ng-content`), chama `carregarCenarios()` — mesma chamada HTTP real, sem `window.location.reload()`.

16. **Método `carregarCenarios()`:** extraído do `ngOnInit()` (única refatoração funcional autorizada) — `ngOnInit()` agora só chama `this.carregarCenarios()`. O método reseta `carregandoLista = true` e `erroCarregamento = ''` no início (necessário para o retry reativar o loading e limpar o erro anterior), depois executa exatamente o mesmo `GET` + `subscribe` de antes.

17. **Comportamento do GET:** preservado — `GET {apiUrl}/cenario`, sem parâmetro novo, sem endpoint novo.

18. **`reverse()`:** preservado — `this.cenarios = res.reverse()`, sem alteração.

19. **Card:** `<aqb-card class="cenario-card" padding="md">` como casca visual (background `--aq-surface`, borda `--aq-border`, radius `--aq-radius-lg` — já vem do próprio primitive, sem CSS extra necessário).

20. **Estratégia semântica de expansão:** o card inteiro deixou de ser clicável. Criado `<button type="button" class="cenario-card__toggle">` como cabeçalho interativo (título + ícone de dica), conforme recomendado pela aprovação (seção 25) — evita `role="button"` envolvendo outros botões internos (os 4 botões de exportação ficam **fora**, como irmãos, nunca aninhados).

21. **`aria-expanded`:** `[attr.aria-expanded]="estaAberto(cenario)"` no botão de expansão — `"true"`/`"false"` conforme o estado real, confirmado por teste unitário e E2E.

22. **`aria-controls`:** `[attr.aria-controls]="detalhesId(cenario)"`, apontando para o `id` real do bloco de detalhes (novo método `detalhesId()`, sanitiza a chave do cenário para um `id` HTML válido).

23. **Teclado:** `<button>` nativo — `Enter`/`Space` funcionam **sem nenhum handler manual de teclado** (comportamento nativo do browser), confirmado por E2E real (`page.keyboard.press('Enter')`/`'Space'` alternando `aria-expanded` de verdade em Chrome).

24. **HIGH resolvido:** confirmado — o controle de expansão agora é um `<button>` semântico, alcançável e operável 100% por teclado, sem depender de mouse. Este era o único achado HIGH de acessibilidade da Etapa 1.

25. **Botões de exportação:** os 4 (`.doc`/`.xlsx`/`.pdf`/Jira) migrados para `<aqb-button variant="secondary">` (3 primeiros) — textos/emoji/ordem preservados.

26. **Jira:** migrado para `<aqb-button variant="ghost" [disabled]="true">`, com `<span class="cenario-card__jira-hint">Indisponível</span>` ao lado — decisão explicitamente autorizada (seção 31) de não oferecer uma ação silenciosamente inútil. Nenhuma integração Jira foi criada; o botão simplesmente não dispara mais `exportar(cenario, 'jira')` (o guard `isDisabled` do próprio `AqbButtonComponent` impede o clique de emitir `clicked`).

27. **XLSX:** `exportarParaExcel()` **não foi tocado** — mesmo nome de arquivo, mesmo mimetype, confirmado pelo E2E de download real (guarda obrigatória, seção 49) continuando verde.

28. **DOC:** `exportarParaDoc()` não tocado — confirmado por teste unitário (`FileSaver.saveAs` com extensão/mimetype corretos).

29. **PDF:** `exportarParaPDF()` não tocado — confirmado por teste unitário de "não lança exceção" (ver limitação já registrada na Etapa 1 sobre `jsPDF`).

30. **Download real:** o E2E `carrega a lista real (200), expande/recolhe detalhes via teclado e exporta .xlsx com download real` continua passando, agora também cobrindo a navegação por teclado no mesmo fluxo.

31. **Resultado count:** `{{ cenariosFiltrados.length }} de {{ cenarios.length }} cenário(s)` preservado literalmente, agora em `<small class="cenario-list-page__counter">`.

32. **Detail box:** mantido `KEEP_LOCAL` — `.cenario-card__details` (antes `.detail-box`/`.cenario-detalhes`) com fundo `--aq-panel`, borda `--aq-border`, radius `--aq-radius-md` — não usa `AqbPanelComponent` (decisão consciente, não obrigatória, conforme aprovação seção 46).

33. **Tokens utilizados:** `--aq-background`, `--aq-surface` (via `AqbCardComponent`), `--aq-panel`, `--aq-border`, `--aq-text-primary`, `--aq-text-secondary` (via primitives), `--aq-text-muted`, `--aq-space-1/2/3/4/6`, `--aq-radius-md/lg` (via primitives), `--aq-font-size-lg/sm`, `--aq-line-height-normal`, `--aq-transition-fast`, `--aq-nav-height`, `--aq-content-max-width`.

34. **Cores hardcoded restantes:** nenhuma cor hardcoded no CSS local (`cenario-list.component.css`) — 100% via token ou herdada dos primitives.

35. **Justificativa dos hardcodes:** não se aplica — nenhum hex restante nesta tela.

36. **Bootstrap restante:** nenhum — `.container`, `.btn*`, `.form-control`, `.d-flex`, `.justify-content-between`, `.align-items-center`, `.gap-2`, `.mb-3`, `.mt-3` — todos removidos do template desta tela (Bootstrap **continua instalado/carregado globalmente** para as demais telas, conforme vedado remover).

37. **CSS removido:** `.list-shell`, `.list-header`, `.list-title`, `.list-subtitle`, `.create-btn`, `.toolbar`, `.search-wrap`, `.search-input`, `.clear-search`, `.results-counter`, `.empty-state`, `.empty-state h3`, `.skeleton-list`, `.skeleton-item`, `@keyframes shimmer`, `.filtered-empty-state`, `.cenario-card` (regras antigas de border/shadow/hover), `.cenario-title`, `.cenario-toggle`, `.click-hint`, `.cenario-rule`, `.cenario-detalhes`, `.detail-box`, `.detail-box h3`, `.rule-text`, `.export-buttons`/`.export-buttons .btn` — CSS reduzido de 226 para 155 linhas.

38. **Dead CSS:** nenhum resíduo — confirmado por grep (`btn-outline`, `form-control`, `skeleton-item`, `shimmer`, nomes de classe antigos) sem nenhuma ocorrência no HTML/CSS final.

39. **Typography:** `font-family` já vinha do global (Fase 14.1, não recisou mudar); `font-size` do título do card migrado para `var(--aq-font-size-lg)` (antes `1.1rem` solto); contador e demais textos auxiliares usam `var(--aq-font-size-sm)`.

40. **Spacing:** `gap`/`padding`/`margin` soltos (8/12/14/16/18/24px) substituídos pelos tokens mais próximos (`--aq-space-1` a `--aq-space-6`), sem criar equivalência artificial.

41. **Radius:** `border-radius` 10–14px → `var(--aq-radius-md)`/`var(--aq-radius-lg)` (herdados de `AqbCardComponent`, mais os detalhes internos usando `--aq-radius-md`).

42. **Shadow:** removido — `box-shadow` do card antigo eliminado; `AqbCardComponent` estrutura a superfície via `background`/`border`, sem sombra, igual ao padrão Auto QA.

43. **Tema escuro:** adotado — `.cenario-list-page { background: var(--aq-background); color: var(--aq-text-primary); min-height: calc(100vh - var(--aq-nav-height)) }`, mesmo padrão já usado em `execution-detail-page` do Auto QA. Confirmado visualmente (`rgb(19, 19, 19)` = `#131313` = `--aq-background`, medido diretamente no browser).

44–47. **Responsividade (medição real, Chromium via Playwright, não só leitura de CSS):**

| Largura | Resultado |
|---|---|
| 1440 | **PASS** — toolbar em `row`, 4 botões de exportação visíveis, zero overflow |
| 1280 | **PASS** — idem |
| 768 | **PASS** — toolbar empilha em `column` (breakpoint preservado), zero overflow |
| 390 | **PASS** — toolbar empilhada, 4 botões continuam visíveis (sem ícone-only, sem corte), zero overflow |

Nenhum viewport regrediu em relação ao baseline da Etapa 1.

48. **Overflow:** zero overflow horizontal confirmado nas 4 larguras e também pelo E2E (`document.documentElement.scrollWidth <= innerWidth + 1`).

49. **Acessibilidade:** HIGH da Etapa 1 resolvido (itens 20–24). Input de busca ganhou `label`. Nenhuma regressão nos pontos já corretos (contraste alto herdado do tema escuro do Auto QA; botões de exportação mantêm nome acessível pelo texto visível).

50. **Headings:** `AqbPageHeaderComponent` renderiza `<h1>` (mesmo nível que `.list-title` antes) → `<h2 class="cenario-card__title">` por card → `<h3>` no detalhe expandido e nos empty states (via `AqbEmptyStateComponent`, que usa `<p>` para o título, não heading — verificado no DOM final, não introduz heading extra). Hierarquia `h1`→`h2`→`h3` **preservada**, sem salto.

51. **Focus visible:** herdado das regras globais do tema (`:focus-visible` cobre `button`/`input`/`[tabindex]`) — nenhum override local adicionado; confirmado visualmente que o botão de expansão e os botões de ação recebem o anel de foco padrão.

52. **Reduced motion:** preservado — regra global (`prefers-reduced-motion`) neutraliza qualquer transição/animação remanescente (hover do ícone de dica, transições de borda), sem exceção local.

53. **Testes novos:** 5 novos testes unitários (retry sucesso, retry com nova falha, controle de expansão semântico, `aria-expanded` acompanhando o estado, ausência de `<button>` aninhado, label da busca) além dos 15 adaptados da Etapa 1; E2E: os 2 specs existentes foram adaptados e o primeiro ganhou cobertura de teclado (Enter/Space) incorporada ao mesmo teste (conforme preferência da aprovação de não criar spec separado).

54. **Unit baseline:** 439.

55. **Unit final:** **444** (439 − 15 antigos + 20 novos/adaptados = 444; líquido +5).

56. **Resultado unit:** **444/444 SUCCESS**.

57. **E2E baseline:** 30.

58. **E2E final:** **30** (2 specs × 2 projetos — mesma contagem, specs adaptados/fortalecidos, não duplicados).

59. **Resultado E2E:** **30/30 passed**, incluindo toda a suíte pré-existente do Auto QA sem nenhuma regressão.

60. **E2E XLSX:** continua verde — download real, mesmo nome de arquivo (`Login_com_credenciais_vlidas_fixture_E2E_ZephyrScale.xlsx`).

61. **E2E teclado:** novo — `Enter` expande (`aria-expanded="true"`, detalhe visível), `Space` recolhe (`aria-expanded="false"`), validado em browser real (Chromium), não simulado.

62. **Build:** **PASS**, sem erro, sem warning novo.

63. **Main bundle antes:** 1.78 MB / 441.87 kB (herdado da Fase 14.3).

64. **Main bundle depois:** **1.78 MB / 443.43 kB** (+1.56 kB transfer) — aumento pequeno e esperado: `CenarioListComponent` (eager) agora importa os 6 primitives diretamente.

65. **Budgets:** nenhum alterado, nenhum excedido.

66. **Primitives alterados ou não:** **não** — `git diff` vazio em `src/app/shared/ui/`.

67. **Theme alterado ou não:** **não** — `src/app/shared/theme/theme.scss` sem diff (nenhum token novo foi necessário).

68. **Shell alterado ou não:** **não** — `app.component.*` sem diff.

69. **Routes alteradas ou não:** **não** — `app.routes.ts` sem diff, URL `/cenarios` inalterada.

70. **Gerar Cenário alterado ou não:** **não**.

71. **Chat IA alterado ou não:** **não**.

72. **Auto QA alterado ou não:** **não** — nenhum arquivo de `features/auto-qa-bmad/` tocado; 30/30 E2E do Auto QA + todos os specs unitários correspondentes continuam verdes.

73. **`autoqa-artifacts` alterado ou não:** **não**.

74. **Backend alterado ou não:** **não**.

75. **Pipeline alterado ou não:** **não**.

76. **Playwright config alterado ou não:** **não** — só o spec `e2e/cenarios-list.spec.ts` foi atualizado (arquivo já autorizado desde a Etapa 1).

77. **Package files alterados ou não:** **não**.

78. **Dependências novas:** nenhuma.

79. **Service criado ou não:** **não criado** — `HttpClient` continua injetado diretamente no componente, exatamente como vedado alterar (a única extração autorizada foi o método local `carregarCenarios()`, não um service).

80. **Models alterados ou não:** **não** — `cenarios: any[]` permanece como estava, dívida técnica registrada, não tocada.

81. **Paginação alterada ou não:** **não implementada** — lista continua carregando tudo de uma vez, filtro client-side.

82. **Riscos:** nenhum novo identificado. O maior risco conhecido (exportação `.xlsx`/`.doc`/`.pdf`) permanece coberto pelas mesmas guardas da Etapa 1, agora validadas contra a nova estrutura de DOM.

83. **Limitações:** a mesma limitação já registrada na Etapa 1 permanece — `.pdf` não tem verificação unitária do nome de arquivo/mimetype (só "não lança exceção"), compensada pelo E2E real de `.xlsx` (mesmo mecanismo de exportação, risco equivalente coberto por amostragem).

84. **Dívidas técnicas:** as mesmas já conhecidas e explicitamente preservadas por decisão desta etapa — componente com ~670 linhas não decomposto, `HttpClient` direto sem service, `cenarios: any[]` sem tipagem, sem paginação, botão Jira sem funcionalidade real (agora ao menos não finge estar disponível).

85. **Classificação final:** **FASE_14_4_CENARIOS_MIGRATED**.

86. **Confirmação de nenhum Git de escrita:** nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

87. **Confirmação de que a Fase 14.5 NÃO foi iniciada:** confirmado — `CenarioComponent` (Gerar Cenário) não tocado, nenhuma outra tela migrada.

---

## Nota operacional (transparência)

Durante a validação E2E, o primeiro `ng serve` reaproveitado pelo Playwright (`reuseExistingServer`) estava com um processo **anterior à migração** ainda rodando (iniciado numa checagem de responsividade da Fase 14.3), o que fez os 2 testes E2E antigos "passarem" contra a marcação **antiga** sem eu perceber de imediato — um falso positivo. Identifiquei a inconsistência antes de reportar (o resultado não batia com as classes já removidas do HTML), matei o processo obsoleto, deixei o Playwright subir um servidor limpo, e só então validei de verdade — os 2 specs precisaram ser atualizados para os novos seletores (e foram). Reportado aqui por transparência, já que a suíte final está correta e verde, mas o caminho até lá teve esse alerta.

---

## Classificação final

**FASE_14_4_CENARIOS_MIGRATED**

Todos os critérios de aceite das seções 83–89 da aprovação foram atendidos: visual alinhado ao Design System global (tema escuro, tokens, primitives), comportamento funcional 100% preservado (GET/reverse/busca/debounce/normalização/expand-collapse/XLSX/DOC/PDF/Novo Cenário, Jira sem integração fictícia), acessibilidade com o HIGH da Etapa 1 resolvido (botão semântico, aria-expanded, teclado nativo, label na busca), erro com mensagem correta e retry funcional, responsividade PASS nas 4 larguras, 444/444 unit e 30/30 E2E (incluindo download real e navegação por teclado), build verde sem budget alterado, e escopo restrito exatamente aos 3 arquivos de produção autorizados — backend, tema, shell, primitives, demais telas, pipeline, Playwright config e dependências permanecem intocados.

---

**PARE.** Não iniciar Fase 14.5. Aguardando revisão.
