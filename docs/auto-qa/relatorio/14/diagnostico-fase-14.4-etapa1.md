# FASE 14.4 — Cenários
## Etapa 1 — Baseline, Caracterização e Plano de Migração

**Data:** 2026-08-11
**Pré-condição confirmada:** Fase 14.3 = `FASE_14_3_SHELL_READY` (sem regressão pendente).
**Modo:** produção somente leitura — apenas testes de caracterização (unit + E2E) foram criados. Nenhum arquivo de produção da tela foi alterado.

---

## 1. Baseline

Antes de qualquer teste novo: **424/424** unit, **26/26** E2E, build verde (`main` 1.78 MB / 441.87 kB, `auto-qa-bmad-routes` 108.20 kB — herdado da Fase 14.3, nada mudou aqui).

## 2. Rota da tela

`/cenarios` → `CenarioListComponent` (`src/app/cenario-list/`), registrada em `app.routes.ts`, **eager** (não lazy).

## 3. Componente principal

`CenarioListComponent` (`cenario-list.component.ts`, 669 linhas) — `standalone`, `ChangeDetectionStrategy.Eager`, `imports: [RouterModule, FormsModule]`.

## 4. Arquivos relacionados

`cenario-list.component.html` (102 linhas), `cenario-list.component.css` (226 linhas), `doc-export.styles.ts` (string CSS usada só na exportação `.doc`, não afeta a tela).

## 5. Services

**Nenhum service dedicado** — `HttpClient` injetado e chamado diretamente no componente (`this.http.get<any[]>(...)` em `ngOnInit`). Sem camada de abstração (diferente do padrão `AutoQaExecutionService` do Auto QA).

## 6. Models

**Nenhuma interface TypeScript própria** — `cenarios: any[]`, tipagem fraca em toda a tela. Contrato real do backend (verificado por leitura direta do código-fonte do backend, read-only, sem alteração):
```java
// Cenario.java
{ id: string, titulo: string, regraDeNegocio: string, criteriosAceitacao: string, cenarios: CenarioItem[] }
// CenarioItem.java
{ nome, objetivo, precondicao, scriptTeste, resultadoEsperado, variaveis, componente, rotulos, proposito, pasta, proprietario, cobertura, status } // todos string
```

## 7. Endpoints consumidos

`GET {apiUrl}/cenario` (`CenarioController.listarCenarios()`, `@RequestMapping("/cenario")`) — sem paginação, sem parâmetros de query. Retorna `List<Cenario>` completa. Nenhum outro endpoint é chamado por esta tela (criação/exclusão/detalhe por id existem no controller mas não são usados aqui).

## 8. Funcionalidades (comportamento real, confirmado por leitura de código)

- Listar todos os cenários (`ngOnInit`), exibidos em ordem invertida (`res.reverse()` — mais recente primeiro, assumindo que o backend retorna em ordem de inserção).
- Buscar por título, client-side, debounced 200ms, normalizado (sem acento, case-insensitive).
- Expandir/recolher a regra de negócio completa de um cenário (clique no card inteiro).
- Exportar um cenário para `.xlsx`, `.doc` ou `.pdf` (gera o arquivo 100% no navegador — `xlsx-js-style`, `jspdf`, `file-saver` — nenhuma chamada HTTP de exportação).
- Botão "Jira" existe na UI mas **não tem implementação** — cai no `default` do `switch`, só `console.warn`, nenhum efeito visível.
- Navegar para `/` (Gerar Cenário) via botão "Novo Cenário".

## 9. Ações

`irParaCriacao()`, `toggleDetalhes()`, `onTermoBuscaChange()`/`limparBusca()`, `exportar(cenario, formato)`.

## 10. LOADING

Condição: `carregandoLista === true` (estado inicial, até a resposta HTTP chegar). Conteúdo: `.skeleton-list` com 3 `.skeleton-item` (gradiente animado `@keyframes shimmer`), `aria-hidden="true"` no container. Sem texto `aq-sr-only` equivalente (achado já registrado no diagnóstico da Fase 14, reconfirmado aqui). Nenhuma ação disponível.

## 11. SUCCESS

Condição: `!carregandoLista && !erroCarregamento && cenariosFiltrados.length > 0`. Conteúdo: 1 `.cenario-card` por item, com título, ícone de clique (`🖱️`, só aparece no hover), e 4 botões de exportação. Ações: expandir, exportar, buscar, criar novo.

## 12. EMPTY

Dois casos distintos, mesma classe visual (`.empty-state`):
- **Sem nenhum cenário no backend**: `cenarios.length === 0` → "Nenhum cenário encontrado" / "Gere um novo cenário para começar."
- **Busca sem resultado**: `cenarios.length > 0 && cenariosFiltrados.length === 0` → "Nenhum resultado para a busca" / "Tente outro termo para localizar os cenários." (classe extra `.filtered-empty-state`).

## 13. ERROR

Condição: `erroCarregamento` truthy (setado no `error` do `subscribe` do `ngOnInit`). Mensagem fixa: "Nao foi possivel carregar a lista de cenarios." (sic — sem acentos, inconsistente com o resto da UI). `console.error` disparado. **Sem botão de retry** — diferente do padrão já implementado no Auto QA (`onRetryList`) — usuário precisa recarregar a página manualmente para tentar de novo. Registrado como GAP, não corrigido nesta etapa.

## 14. Paginação

**Não existe.** Toda a lista é carregada de uma vez (`GET /cenario` sem parâmetros), filtro é 100% client-side via getter `cenariosFiltrados`. Diferente do Auto QA (paginação server-side).

## 15. Exportação

3 formatos funcionais (`.xlsx`, `.doc`, `.pdf`) + 1 não implementado (`jira`, silencioso). Toda a lógica de formatação de texto BDD (`formatarBDD`, `formatarResultadoEsperado`, `extrairCampoTexto`, etc.) é local ao componente, não testada exaustivamente nesta etapa (ver seção 16) — só o efeito observável (nome de arquivo, mimetype, disparo do download) foi caracterizado.

## 16. Download

Confirmado via **E2E real** (não mock) que o clique em "Exportar para .xlsx" aciona um download de verdade no browser, com `suggestedFilename()` igual a `Login_com_credenciais_vlidas_fixture_E2E_ZephyrScale.xlsx` — nome derivado do título via `nomeArquivo()` (remove tudo que não é `\w`/espaço, troca espaço por `_`; note que caracteres acentuados são removidos, não convertidos — ex.: "válidas" → "vlidas", sem o "á"). Comportamento documentado como está, não alterado.

## 17. Bootstrap utilizado

| Classe | Classificação |
|---|---|
| `.container`, `.list-shell` (custom) | REPLACE_WITH_LOCAL_LAYOUT — já é majoritariamente CSS próprio, `max-width` fixo |
| `.btn`, `.btn-primary`, `.btn-sm`, `.btn-outline-success/info/danger/secondary` | REPLACE_WITH_PRIMITIVE (`AqbButtonComponent`) |
| `.form-control` (input de busca) | REPLACE_WITH_PRIMITIVE (`AqbInputComponent`) |
| `.d-flex`, `.justify-content-between`, `.align-items-center`, `.gap-2` | REPLACE_WITH_LOCAL_LAYOUT (flex puro em SCSS local, mesmo padrão do Auto QA — sem classes utilitárias soltas) |
| `.mb-3`, `.mt-3` | REPLACE_WITH_LOCAL_LAYOUT (tokens `--aq-space-*`) |

Nenhuma classe Bootstrap de grid (`row`/`col-*`) é usada nesta tela.

## 18. CSS hardcoded

226 linhas de CSS próprio, 100% hex hardcoded (nenhum token `--aq-*` consumido) — paleta clara (`#fff`, `#0f172a`, `#475569`, `#64748b`, `#cbd5e1`, `#dbe4f0`, `#6ea8fe`), `border-radius` entre 8–14px (próximo, mas não igual, a `--aq-radius-md`/`--aq-radius-lg`), `box-shadow` em cards (conceito ausente no Auto QA, que não usa sombra).

## 19. Cores

Ver seção 18 — nenhuma reaproveita os tokens do tema global (já carregado, disponível, mas não usado por esta tela).

## 20. Tipografia

`font-size` em `rem` (1.5rem título, 0.95rem subtítulo, 1.1rem título do card) — escala diferente de `--aq-font-size-*` (que usa `px`). `font-family` **não declarada localmente** — herda `var(--aq-font-family)` do `body` global (Fase 14.1), então já está alinhada ao Auto QA nesse ponto específico, sem necessidade de migração.

## 21. Spacing

`padding`/`margin`/`gap` em `px` soltos (8, 12, 14, 16, 18, 24) — coincidem parcialmente com `--aq-space-*` (4/8/12/16/20/24/32...) mas não são consumidos via token.

## 22. Cards

`.cenario-card`: div clicável (ver achado de acessibilidade, seção 33), borda 1px, radius 14px, `box-shadow`, fundo branco, hover eleva sombra e destaca borda.

## 23. Buttons

Botão "Novo Cenário" (`.btn.btn-primary.btn-sm`), botão "Limpar" busca (`.btn.btn-outline-secondary.btn-sm`), 4 botões de exportação por card (`.btn.btn-outline-{success,info,danger,primary}`).

## 24. Page header

`.list-header` — `<h1 class="list-title">` + `<p class="list-subtitle">` + botão de ação — estrutura conceitualmente **idêntica** à API de `AqbPageHeaderComponent` (`title`/`subtitle`/`ng-content` para ações).

## 25. Alerts

**Nenhum** nesta tela (diferente de Gerar Cenário, que tem `.alert`/`role="alert"` para feedback Jira/upload — fora do escopo desta subfase).

## 26. Loading visual

Skeleton com gradiente animado (`@keyframes shimmer`) — animação já neutralizada por `prefers-reduced-motion` (regra global do tema, Fase 14.1, já se aplica aqui mesmo sem migração).

## 27. Empty state visual

3 variações textuais sobre a mesma classe `.empty-state`/`.filtered-empty-state` — ver seção 12.

## 28–31. Responsividade

Medido diretamente no DOM renderizado (Chromium via Playwright, mock determinístico de 1 cenário), não apenas por leitura de CSS como no diagnóstico da Fase 14:

| Largura | Resultado | Observações |
|---|---|---|
| 1440 | **PASS** | `.list-header` em `row`, sem overflow |
| 1280 | **PASS** | idem |
| 768 | **PASS** | `.list-header` empilha em `column` (breakpoint `max-width:768px` ativo), sem overflow |
| 390 | **PASS** | mesmo empilhamento, 4 botões de exportação continuam visíveis, sem overflow |

**Correção em relação ao diagnóstico da Fase 14**: aquele diagnóstico havia classificado 768/390 como `PARTIAL` por inferência de CSS, sem teste real. Com medição direta agora, o resultado é **PASS** nas 4 larguras — atualizado aqui como a fonte de verdade mais recente.

## 32. Overflow

Zero overflow horizontal em todas as 4 larguras testadas (`scrollWidth <= clientWidth + 1`), confirmado também pelo teste E2E de caracterização (`busca filtra por título... sem overflow horizontal`).

## 33. Acessibilidade aparente (baseline, não corrigida nesta etapa)

- **HIGH, reconfirmado**: `.cenario-card` é uma `<div>` com `(click)`, **sem `role`, sem `tabindex`, sem handler de teclado** — confirmado por grep (`role=`/`tabindex` não aparecem em nenhum ponto do template). Totalmente inacessível via teclado.
- Input de busca sem `<label>` (só `placeholder`).
- Heading hierarchy: `h1` (`.list-title`) → `h2` (`.cenario-title`, por card) → `h3` (`.detail-box h3`, `.empty-state h3`) — **sem salto**, correta (positivo, diferente do padrão h1→h3 do Auto QA apontado no diagnóstico global).
- Contraste: texto escuro sobre fundo claro/branco em todos os pontos observados — alto contraste, sem problema aparente.
- Botões de exportação têm nome acessível pelo próprio texto visível (`📄 .doc` etc.) — emoji não marcado `aria-hidden`, mas não compromete o nome acessível (texto sempre presente).

## 34. Testes existentes antes desta etapa

**Zero** (`0` arquivos `.spec.ts` para `cenario-list`).

## 35. Testes de caracterização criados

`cenario-list.component.spec.ts` (15 testes unitários) + `e2e/cenarios-list.spec.ts` (2 testes × 2 projetos = 4 execuções E2E).

## 36. Unit tests novos

15 — cobrindo: GET disparado + skeleton (loading), inversão de ordem + renderização (success), estado vazio real, estado de erro (com `console.error` espiado), busca debounced com normalização de acento/caixa, estado vazio filtrado, botão "Limpar", expandir/recolher, navegação para criação, exportação `.xlsx` (nome+mimetype via spy em `FileSaver.saveAs`), `.xlsx` sem itens (alert, sem export), exportação `.doc` (nome+mimetype), exportação `.pdf` (smoke — sem lançar exceção; efeito real de download coberto pelo E2E, já que `jsPDF` anexa `.save()` dinamicamente à instância, sem ponto estável para `spyOn`), formato não suportado (`jira` — sem exceção, sem download, com warning).

## 37. E2E novo

`e2e/cenarios-list.spec.ts` — golden path com interceptação determinística do contrato real (`Cenario`/`CenarioItem`): carrega lista (200 real observado via `waitForResponse`), expande/recolve detalhes, **aciona download real de `.xlsx` via evento nativo do Playwright** (`page.waitForEvent('download')`, sem mock de `FileSaver`/`jsPDF` — validação mais forte que a unitária), busca filtra e "Limpar" restaura, sem overflow horizontal.

## 38. Total unitário

424 → **439** (+15).

## 39. Total E2E

26 → **30** (+2 specs × 2 projetos).

## 40. Build

Verde, **idêntico** ao anterior (`main` 1.78 MB / 441.87 kB) — nenhuma alteração de produção nesta etapa, então nenhuma mudança de bundle era esperada, e nenhuma ocorreu.

## 41. Primitives candidatos (avaliação, não implementada)

`AqbPageHeaderComponent`, `AqbButtonComponent`, `AqbInputComponent`, `AqbEmptyStateComponent`, `AqbSkeletonComponent`, `AqbCardComponent` (como casca visual, não como substituto da interatividade).

## 42. `DIRECT_REPLACEMENT`

- Page header (`.list-header` → `AqbPageHeaderComponent`, com o botão "Novo Cenário" projetado via `ng-content`).
- Botão "Novo Cenário" e botão "Limpar" busca → `AqbButtonComponent`.
- Botões de exportação (4) → `AqbButtonComponent` (variant a definir — provavelmente `secondary`/`ghost`, mantendo os 4 rótulos/emoji atuais como conteúdo).
- Skeleton de loading → `AqbSkeletonComponent`.
- Empty states "Nenhum cenário encontrado" e "Nenhum resultado para a busca" → `AqbEmptyStateComponent`.
- Input de busca → `AqbInputComponent` (ganha `label`/`aria-describedby` que hoje não existem — melhoria incidental, não migração "neutra").

## 43. `REQUIRES_ADAPTER`

- Empty state de **erro** (`erroCarregamento`) → `AqbEmptyStateComponent` cobre o texto, mas hoje não há botão de retry; adicionar um (via `ng-content`, mesmo padrão do Auto QA) é uma decisão de escopo a confirmar explicitamente na aprovação da Etapa 2 (não é migração 1:1, é uma pequena melhoria funcional).
- Card do cenário (`.cenario-card`) → a casca visual pode usar `AqbCardComponent`, mas a interatividade de expandir/recolher (clique + estado aberto/fechado) **não é** algo que o primitive resolve sozinho — precisa de wrapper local com `role="button"`/`tabindex="0"`/handler de teclado (correção do HIGH da seção 33), que é comportamento de domínio, não do primitive.

## 44. `KEEP_LOCAL`

- Lógica de expandir/recolher por cenário (`toggleDetalhes`/`estaAberto`/`cenariosAbertos`).
- Contador de resultados (`{{ cenariosFiltrados.length }} de {{ cenarios.length }} cenário(s)`) — texto específico do domínio.
- Botão/ícone de "clique aqui" (`🖱️`) — específico desta tela.
- Toda a lógica de exportação (`exportar*`, `normalizarCenario`, `formatarBDD`, etc.) — regra de negócio, não Design System.
- Bloco de detalhe expandido (`.detail-box`) — simples o bastante para não precisar de `AqbPanel`; decisão de estética na Etapa 2, não obrigatória.

## 45. `KEEP_TEMPORARILY`

- Botão "Jira" sem implementação real — mantido como está (não é dívida desta subfase corrigir uma funcionalidade ausente).
- Ausência de paginação — mantida como está; migrar para server-side seria mudança de contrato/comportamento, fora do escopo de uma migração visual.

## 46. `DO_NOT_MIGRATE`

- `AqbModalComponent`, `AqbTextareaComponent`, `AqbDividerComponent`, `AqbLoadingComponent`, `AqbPanelComponent`, `AqbBadgeComponent` — nenhum elemento equivalente existe hoje na tela de Cenários; não há o que substituir.

## 47. Gaps dos primitives (nenhum primitive foi alterado)

- Nenhum primitive genérico cobre "input de busca com botão de limpar embutido" — a Etapa 2 precisará compor `AqbInputComponent` + um botão local, ou aceitar manter o "Limpar" como elemento irmão fora do primitive (mais simples, recomendado).
- Nenhum primitive cobre "card inteiramente clicável com expand/collapse" — comportamento precisa ser implementado localmente (com a correção de acessibilidade HIGH embutida), não é uma lacuna a preencher no Design System global (é específico de domínio, ver seção 44).

## 48. Riscos

- A suíte de exportação (`.xlsx`/`.doc`/`.pdf`) é o comportamento de maior risco de regressão silenciosa numa migração futura, pois depende de manipulação de DOM/Blob que não é trivial de proteger 100% via unit test (ver limitação do `.pdf` na seção 36) — mitigado nesta etapa com o E2E de download real para `.xlsx`; recomenda-se manter esse E2E como guarda permanente antes/depois da Etapa 2.
- Nenhum outro risco técnico identificado que bloqueie uma migração visual incremental.

## 49. Plano exato da Etapa 2 (proposta, não aprovada aqui)

1. Substituir `.list-header` por `AqbPageHeaderComponent` (título + subtítulo + botão via `ng-content`).
2. Substituir botão "Novo Cenário" e "Limpar" por `AqbButtonComponent`.
3. Substituir input de busca por `AqbInputComponent` (adicionar `label` — hoje ausente).
4. Substituir skeleton por `AqbSkeletonComponent`.
5. Substituir os 2 empty states "sem dados"/"sem resultado" por `AqbEmptyStateComponent`; decidir (aprovação explícita) se o empty state de erro ganha botão de retry.
6. Envolver o card em `AqbCardComponent` como casca visual; implementar `role="button"`/`tabindex="0"`/`(keydown.enter)`/`(keydown.space)` no elemento interativo (correção do HIGH de acessibilidade, DEVE fazer parte da Etapa 2 nesta migração, não é opcional).
7. Substituir os 4 botões de exportação por `AqbButtonComponent`.
8. Avaliar adoção do tema escuro (tokens de cor) nesta tela — decisão explícita de negócio/produto a confirmar na aprovação da Etapa 2 (o diagnóstico da Fase 14 já indicou tendência de alinhamento, mas não decide sozinho).
9. Substituir spacing/radius hardcoded pelos tokens `--aq-space-*`/`--aq-radius-*` equivalentes mais próximos.

## 50. Arquivos que a Etapa 2 precisará alterar

`cenario-list.component.html`, `cenario-list.component.css`, `cenario-list.component.ts` (imports dos primitives; possível ajuste de bindings, sem mudança de lógica de domínio) — nenhum outro arquivo de produção deveria precisar mudar.

## 51–60. Confirmações de escopo

- **Backend**: intocado.
- **Theme**: intocado (`src/app/shared/theme/theme.scss` sem diff).
- **Shell**: intocado (Fase 14.3 congelada).
- **Primitives**: intactos (nenhum arquivo em `src/app/shared/ui/` tocado).
- **Gerar Cenário**: intocado.
- **Chat IA**: intocado.
- **Auto QA**: preservado — 424+15 unit / 26+4 E2E todos verdes, incluindo toda a suíte pré-existente do Auto QA sem nenhuma regressão.
- **Pipeline**: intocado.
- **`playwright.config.ts`**: intocado (só o novo spec `e2e/cenarios-list.spec.ts` foi adicionado).
- **Dependências**: intactas (`package.json`/`package-lock.json` sem diff).

## 61. Confirmação de nenhum Git de escrita

Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

## 62. Confirmação de que a migração visual NÃO foi iniciada

Confirmado — `cenario-list.component.ts`/`.html`/`.css` permanecem **byte a byte idênticos** ao estado anterior a esta etapa (nenhum diff em nenhum arquivo de produção, só os 2 arquivos de teste novos).

---

## Classificação final

**FASE_14_4_READY_FOR_VISUAL_MIGRATION**

Justificativa: o comportamento real da tela está integralmente caracterizado (funcional, estados, exportação, paginação inexistente, contrato de backend) e protegido por 15 testes unitários + 2 E2E (incluindo download real de arquivo, o comportamento de maior risco). Responsividade confirmada PASS nas 4 larguras por medição direta. O único achado HIGH de acessibilidade (card sem semântica de teclado) está claramente registrado e será corrigido como parte obrigatória do plano da Etapa 2, não como bloqueio a este diagnóstico. Nenhum gap de primitive impede a migração — os dois gaps identificados (busca com clear embutido, card expansível) têm solução local simples já mapeada.

---

**PARE.** Não implementar a migração visual. Fase 14.4/Etapa 2 e Fase 14.5 não foram iniciadas. Aguardando aprovação.
