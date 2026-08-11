# FASE 13.7 — OBSERVABILIDADE, DIAGNÓSTICO E CONFIABILIDADE DO FRONTEND AUTO QA
## Diagnóstico técnico (somente diagnóstico)

**Data:** 2026-08-10
**Natureza:** diagnóstico puro. Nenhum arquivo foi alterado (frontend ou backend). Todas as leituras foram feitas diretamente no código atual, com busca (`grep`) para confirmar ausência/presença de padrões — nada foi inferido pelo nome de arquivo. Nenhum comando Git de escrita foi executado.

---

## 1. Baseline confirmado

Herdado da Fase 13.6, `CI_VALIDATED`: 382 testes unitários, 24 E2E, pipeline `Frontend Unit Tests → Frontend Build → Frontend E2E` validada em execução real no GitHub Actions. Nenhuma mudança de baseline nesta investigação (só leitura).

## 2. Fluxo HTTP atual

```
Component (page)
    ↓ chama método público
AutoQaExecutionStateService (signals, dispatch() central para ações)
    ↓ chama
AutoQaExecutionService (só monta URL/corpo, 1:1 com AutoQaExecutionController)
    ↓
HttpClient (Angular, sem interceptors registrados — confirmado, item 24)
    ↓
Backend
```
`loading`/`creating`/`pendingAction` são setados **antes** da chamada e limpos via `finalize()` do RxJS (roda em sucesso E erro, confirmado lendo `loadList`/`loadExecution`/`createExecution`/`dispatch` linha a linha). Erros HTTP nunca chegam brutos ao componente — sempre passam por `mapHttpErrorToUiError` dentro do próprio `AutoQaExecutionStateService`, que grava a mensagem final em `error()`/`actionError()` (strings, nunca o objeto de erro completo). Os componentes só leem essas strings prontas nos templates.

## 3. Tratamento atual de erros (visão geral)

Único ponto de tradução: `shared/utils/auto-qa-error-mapper.ts`, função `mapHttpErrorToUiError(error: HttpErrorResponse): AutoQaUiError`. Usa uma tabela estática (`STATUS_TO_CODE` + `ERROR_CATALOG`) — nunca interpola `error.error`/`error.message` do backend na mensagem final. Coberto por teste unitário dedicado e explícito (`auto-qa-error-mapper.spec.ts`, 9 testes, incluindo um teste anti-vazamento — ver item 12).

## 4. Comportamento para status 0

Mapeado para `NETWORK_ERROR`: título "Falha de conexão", mensagem "Não foi possível conectar ao servidor. Verifique sua conexão.", `recoverable: true`. **Achado relevante (ver item 10)**: no navegador, uma rejeição de CORS (backend respondeu, mas o browser bloqueou a leitura da resposta por falta de `Access-Control-Allow-Origin`) e uma falha real de rede/backend-fora-do-ar **produzem exatamente o mesmo `status: 0`** no `HttpErrorResponse` do Angular — é uma limitação da própria plataforma (o JavaScript nunca tem acesso ao status code real de uma resposta bloqueada por CORS), não do código do frontend. A mensagem atual ("verifique sua conexão") é tecnicamente imprecisa para o caso de CORS (a conexão do usuário está OK; é uma configuração do servidor), mas não há como o frontend distinguir os dois casos de forma confiável a partir do JavaScript — ver análise detalhada no item 10 e a recomendação FUTURE correspondente.

## 5. Comportamento 400

`BAD_REQUEST` — "Requisição inválida" / "Os dados enviados são inválidos. Revise o formulário e tente novamente.", `recoverable: true`. Coberto por teste unitário.

## 6. Comportamento 401

**Não existe entrada dedicada para 401** em `STATUS_TO_CODE` — cai no fallback `UNKNOWN_ERROR` ("Ocorreu um erro inesperado", `recoverable: true`). Isso é **coerente com o estado atual do sistema**: não há autenticação implementada (dívida já registrada e aceita desde a Fase 13 geral), então o backend nunca emite 401 hoje — não é uma lacuna real, é a ausência de um caso que ainda não existe no contrato. Registrado aqui como observação, não como falha.

## 7. Comportamento 403

`FORBIDDEN` — "Ação não permitida" / "Esta ação não está disponível no momento.", `recoverable: false`. Coberto por teste unitário. **Só é alcançado quando o `HttpErrorResponse.status` chega como 403 de fato** — o que, no navegador real, só acontece se a origem já estiver autorizada pelo CORS (backend respondeu 403 e o browser permitiu a leitura porque o header CORS estava presente); um 403 bloqueado por CORS em si mesmo vira `status: 0` (ver item 4/10).

## 8. Comportamento 404

`NOT_FOUND` — "Execução não encontrada" / "A execução solicitada não existe ou foi removida.", `recoverable: false`. Coberto por teste unitário **e** por E2E real (`execution-not-found.spec.ts`, corrigido na Fase 13.6 para observar o status HTTP real via `page.waitForResponse`, não só a UI).

## 9. Comportamento 409

`CONFLICT` — "Conflito de estado" / "Esta execução foi alterada por outra operação. Atualize e tente novamente.", `recoverable: true`. Coberto por teste unitário do `AutoQaExecutionStateService` (`apply(): em 403/409/422 preserva current()...`). **Sem cobertura E2E** (exigiria provocar um conflito real de versão contra o backend, não implementado em nenhum spec — ver item 32/tabela A–J).

## 10. Análise CORS/403 vs. status 0 (item explicitamente pedido)

Reproduzido o raciocínio com base no incidente real já registrado (Fase 13.1B, `GET /api/agents` → 403 observado durante validação manual): quando uma origem **não está** na allowlist de CORS do backend, o Spring rejeita a requisição (o servidor efetivamente responde com um HTTP 403, confirmado por `curl` nas Fases 13.1B/13.5), mas o **navegador nunca entrega esse 403 ao JavaScript** — o CORS é aplicado pelo próprio browser antes de expor a resposta ao código da página; o que o Angular `HttpClient` recebe é um erro de rede opaco, `HttpErrorResponse.status === 0`. Isso significa que, na prática, **o frontend hoje não tem como diferenciar "CORS bloqueou" de "backend real está fora do ar"** — ambos caem em `NETWORK_ERROR`. Isso não é um defeito de implementação corrigível dentro do frontend (é uma restrição de segurança do próprio navegador, documentada e universal) — é uma limitação de diagnóstico a ser registrada, não corrigida agora.

## 11. Comportamento 422

`UNPROCESSABLE` — "Estado inconsistente" / "O estado atual da execução não permite esta operação.", `recoverable: false`. Coberto por teste unitário (mesmo teste do item 9, `apply()`/`execute(): em 403/409/422...`).

## 12. Comportamento 500

`SERVER_ERROR` — "Erro no servidor" / "Ocorreu um erro inesperado no servidor. Tente novamente mais tarde.", `recoverable: true`. Coberto por teste unitário **e** por E2E mockado (`api-unavailable.spec.ts`, "detalhe: erro 500 mostra estado utilizável, sem stacktrace bruto").

## 13. Proteção contra payload interno/stacktrace

**Confirmada e testada explicitamente.** `auto-qa-error-mapper.spec.ts` tem um teste dedicado (`'nunca repassa mensagem bruta, stacktrace ou payload do backend'`) que monta um `HttpErrorResponse` com um payload realista (`NullPointerException`, stacktrace, path absoluto de filesystem) e confirma, via `JSON.stringify` do resultado, que **nenhum fragmento desse payload** sobrevive ao mapeamento. `mapHttpErrorToUiError` nunca lê `error.error`/`error.message` do backend — só usa o `status` numérico como chave de lookup em uma tabela 100% estática. Este é o mecanismo mais robusto de toda a auditoria: **impossível vazar payload interno por este caminho**, comprovado por teste, não por inspeção de código isolada.

## 14. Comportamento do StateService

`AutoQaExecutionStateService` (176 linhas) — auditado linha a linha (novamente, nesta fase). Confirmações:
- `loadList`/`loadExecution`: guard contra chamada duplicada (`if (this._loading()) return;`), `error()` setado só com a mensagem já mapeada, `finalize()` sempre limpa `loading()`.
- `createExecution`: guard via `_creating()`, mesmo padrão.
- Em nenhum caminho de erro o `current()`/`list()` é sobrescrito com dado parcial/fictício — só `tap(response => ...)` no caminho de sucesso.

## 15. Comportamento do dispatch()

Auditado (novamente). Confirmações específicas pedidas:
- **Uma ação em andamento bloqueia outra**: `if (this._pendingAction()) return EMPTY;` — bloqueia qualquer ação nova (não só a mesma), confirmado por teste (`'ignora uma nova ação enquanto outra ainda está em andamento (guard entre ações diferentes)'`).
- **`pendingAction` sempre é limpo**: via `finalize(() => this._pendingAction.set(null))` — cobre sucesso e falha (RxJS `finalize` sempre roda).
- **`current` só muda com resposta válida do backend**: `tap((response) => this._current.set(response))` está no fluxo de sucesso; o `tap({ error: ... })` só grava `actionError()`, nunca toca `current()`.
- **Erro não cria estado fictício**: confirmado — nenhum caminho de erro escreve em `_current`/`_list`.
- **`finalize()` cobre sucesso e falha**: confirmado (propriedade do próprio operador RxJS, não uma implementação customizada sujeita a bug).
- **Nenhuma ação fica permanentemente travada após erro**: confirmado por teste e por leitura — `pendingAction` sempre volta a `null` via `finalize`, mesmo em erro.

## 16. Criação de execução

Fluxo `NewExecutionFormComponent` → `ExecutionListPageComponent.onCreate()` → `state.createExecution()` → `POST /executions`. Proteção contra duplo envio em **duas camadas independentes**: (1) `NewExecutionFormComponent.onSubmit()` verifica `this.submitting()` (passado via `input()` a partir de `state.creating()`) antes de emitir; (2) `AutoQaExecutionStateService.createExecution()` tem seu próprio guard (`if (this._creating()) return EMPTY;`), independente do form. Em sucesso, navega para o detalhe (`router.navigate([created.executionId], ...)`); em erro, `error()` já foi setado pelo state service, e o componente só tem um `error: () => {}` vazio (comentado como intencional — "erro já refletido em state.error()"). **Comportamento em falha de rede**: idêntico a qualquer outro erro — cai em `NETWORK_ERROR` via o mesmo mapeamento (item 4).

## 17. Histórico

`GET /executions?page=&size=`. Loading: skeleton com `role="status"` + texto para leitor de tela (`aq-sr-only`). Lista vazia: `AqbEmptyStateComponent` dedicado. Erro HTTP: bloco `role="alert"` com a mensagem mapeada **e botão "Tentar novamente"** (`onRetryList()`, que rechama `loadList` com a página/tamanho atuais — recuperação manual real, não um retry automático). Paginação: botões "Anterior"/"Próxima" com `disabled` computado (`canGoPrevious`/`canGoNext`) a partir da paginação retornada pelo backend.

## 18. Detalhe

`GET /executions/{id}`. Loading: skeleton só quando `state.loading() && !state.current()` (evita esconder dados já carregados durante um refresh — comportamento correto, dado antigo não é substituído por skeleton). Erros (`error()`/`actionError()`) exibidos em blocos `role="alert"` separados, **acima** do conteúdo — não substituem a página inteira, então a tela nunca fica "presa" mostrando dado obviamente desatualizado como se fosse atual, mas ver ressalva no item 34 sobre o botão "Atualizar" não bloquear durante uma ação em andamento (achado já conhecido, reconfirmado nesta fase).

## 19. Ações

Auditado `ActionBarComponent.isDisabled()`: `!this.isFunctional(action) || this.pendingAction() !== null` — **qualquer** ação fica desabilitada enquanto **qualquer outra** está pendente (não é por-ação, é global), reforçando o guard já existente no `dispatch()` do state service (dupla proteção). Mensagem de erro por ação: `actionError()`, mesmo catálogo do item 3. Recuperação: `pendingAction` sempre volta a `null` (item 15), então a UI nunca fica com um botão perpetuamente desabilitado após um erro.

## 20. availableActions

**Reconfirmado, mais uma vez, sem exceção**: busca ampla (`grep`) por comparações diretas de `status`/`currentStage`/`progress`/`lastStageCompleted` para decidir habilitação de botão retornou vazio em toda a feature. `ActionBarComponent` (item 19) usa exclusivamente o array `availableActions` recebido como `input()`, nunca recalculado. Esta é a auditoria de `availableActions` mais repetida ao longo de todas as fases (13, 13.1, 13.6) — resultado consistente em todas: **disciplina mantida**.

## 21. Feedback visual (inventário)

| Mecanismo | Onde | Uso |
|---|---|---|
| `role="status"` (loading) | `aqb-loading`, skeletons de lista/detalhe, `execution-status-header` | Leitor de tela anuncia carregamento |
| `role="alert"` (erro) | `error-list`, `execution-list-page__error`, `execution-detail-page__error` (×2: `error()` e `actionError()`) | Leitor de tela anuncia erro imediatamente |
| Botão "Tentar novamente" | Só na listagem (`execution-list-page`) | Recuperação manual real |
| Botões desabilitados | `ActionBarComponent`, formulário (`submitting`) | Previne ação inválida/duplicada |
| `aqb-empty-state` | Lista vazia | Diferencia "vazio" de "erro" (visualmente — ver item 10 sobre a limitação de diferenciar na origem do dado) |

**Inconsistência identificada**: a página de **detalhe** não tem um botão de "tentar novamente" equivalente ao da listagem para o erro de carregamento inicial (`state.error()`) — só existe o botão "Atualizar" no cabeçalho, que só aparece **depois** que `state.current()` já existir (ou seja, se o carregamento inicial falhar completamente, não há nenhum botão de retry visível nessa tela, só a mensagem de erro). Classificado no item 34.

## 22. Acessibilidade dos erros

`role="alert"` (implica `aria-live="assertive"` implicitamente, por especificação ARIA) está presente em todos os blocos de erro relevantes (item 21). `role="status"` (implica `aria-live="polite"`) nos loadings. Nenhum uso de `aria-live` explícito adicional foi encontrado nem parece necessário — os *roles* já cobrem a semântica correta para os dois casos (erro = anúncio interruptivo; loading = anúncio não-interruptivo). Nenhum gap de acessibilidade de erro identificado além do já registrado em fases anteriores (Stage Timeline sem roving tabindex — não é sobre erros, fora do escopo desta fase).

## 23. Logging atual

**Zero ocorrências de `console.log`/`console.error`/`console.warn`/`console.debug`** em toda a feature `auto-qa-bmad` — nem em produção, nem em specs. Confirmado por `grep` amplo, sem nenhum resultado. Não há, portanto, nenhum log de frontend hoje (nem "necessário" nem "desnecessário" — simplesmente não existe). Isso é consistente com uma aplicação sem telemetria/observabilidade remota (nenhuma ferramenta configurada, confirmado no `package.json` já auditado em fases anteriores).

## 24. Risco de exposição de dados

`projectPath` (input sensível do usuário) foi auditado especificamente: **nunca aparece em nenhum template fora do próprio campo de formulário onde o usuário o digitou** (`new-execution-form`). `execution-card.component.ts` tem um comentário explícito confirmando essa decisão de design ("nunca mostra projectPath"). Confirmado também que `AutoQaExecutionResponse` (modelo TypeScript, espelhando o DTO público real do backend) **não declara** campo `projectPath` — só `AutoQaCreateExecutionRequest` (o corpo enviado, não recebido) o declara, exatamente como o backend real (`AutoQaExecutionResponseMapper` nunca inclui esse campo na resposta pública, confirmado em fases anteriores). Como não há nenhum `console.*` (item 23), não há também nenhum log de frontend que pudesse vazar `projectPath` ou qualquer outro dado.

## 25. Interceptors

**Nenhum `HttpInterceptor`/`HTTP_INTERCEPTORS`/`withInterceptors` existe em todo o projeto** (não só na feature Auto QA — busca em `src/app` inteiro). Não há duplicação relevante de tratamento HTTP entre os poucos consumidores (`AutoQaExecutionService`, `AutoQaService` legado) que justificasse discutir um interceptor agora — o tratamento de erro já está centralizado corretamente em `auto-qa-error-mapper.ts`, consumido de um único lugar (`AutoQaExecutionStateService`). Nenhuma criação de interceptor recomendada nesta fase.

## 26. Configuração Playwright

Reconfirmada, sem alteração desde a Fase 13.6: `screenshot: 'only-on-failure'`, `trace: 'on-first-retry'`, `retries` (1 em CI, 0 local), `reporter: [['list'], ['html', { open: 'never' }]]` (o `'html'` foi adicionado na própria Fase 13.6), `video`: **não configurado** (default `'off'` — nenhum vídeo é gravado, nem em falha).

## 27. Evidências E2E

Classificação pedida — **PARTIAL**: `screenshot: 'only-on-failure'` garante uma imagem estática do momento exato da falha (forte); `trace: 'on-first-retry'` só captura o trace **na segunda tentativa** (já que `retries: 1` em CI) — se a falha for determinística (falha igual nas duas tentativas), há trace; mas o comportamento da 1ª tentativa (que pode ser a única informação útil se a 2ª tentativa "passar por acaso" e mascarar um problema intermitente) não gera trace algum. `video` nunca é capturado. Reporter `html` (adicionado na 13.6) + artifacts publicados no CI (`if: failure()`) tornam essas evidências **recuperáveis** depois de uma falha real — mas a ausência de vídeo e a captura de trace só-na-segunda-tentativa deixam a reconstrução de falhas *intermitentes* (que passam no retry) mais pobre do que poderia ser. Classificação: **PARTIAL** (suficiente para a maioria das falhas determinísticas; incompleta para falhas intermitentes).

## 28. Diagnóstico do pipeline

`frontend-pipeline.yml` (Fase 13.6, só releitura nesta fase): job `Frontend E2E` publica `test-results/` + `playwright-report/` (artifact único) e `backend-e2e.log` (artifact separado) **só em falha**, com `if-no-files-found: ignore` (evita mascarar a falha original com uma segunda falha de "artifact ausente"). Passo de readiness já imprime as últimas 200 linhas do log do backend diretamente no output do step antes de `exit 1`, dando diagnóstico imediato mesmo sem precisar baixar o artifact.

## 29. Startup backend (no CI)

Se o MongoDB efêmero não subir, ou o backend não compilar, ou não ficar pronto na porta 8089: o step "Wait for backend readiness" (Fase 13.6) faz *polling* por até 120s e, se falhar, imprime as últimas 200 linhas do log **no próprio output do step** e retorna `exit 1` explicitamente — o job falha de forma clara e imediata, nunca silenciosamente. Se o backend não compilar, o próprio comando `./gradlew bootRun` em background escreveria o erro de compilação em `backend-e2e.log`, e o readiness nunca chegaria a 200 — mesmo caminho de diagnóstico (log + timeout + exit 1). **Suficiente** para os cenários testados (confirmado por leitura do workflow, não por reprodução de falha real nesta sessão — reprodução de falha real está fora do escopo de um diagnóstico read-only).

## 30. Startup Angular

Gerenciado pelo próprio Playwright (`webServer.command: npx ng serve --port 4200`, `timeout: 120_000`). Se o Angular não subir a tempo, o Playwright falha com uma mensagem própria e específica de timeout do `webServer` (comportamento nativo e documentado da ferramenta) — nenhum tratamento customizado necessário ou ausente.

## 31. Cobertura unitária de falhas

Muito boa (reconfirmada nesta fase): `auto-qa-error-mapper.spec.ts` cobre todos os status catalogados + status desconhecido + o teste anti-vazamento (item 13). `auto-qa-execution-state.service.spec.ts` cobre erro em `loadList`/`loadExecution`/`createExecution`, preservação de `current()` em 403/409/422 para `apply`/`execute`, guard de ação concorrente, `pendingAction`/`actionError` sempre limpos. **Gap pontual identificado**: nenhum teste do state service usa especificamente `status: 0` (só os testes do mapper cobrem isso diretamente) — funcionalmente coberto por extensão (mesma função de mapeamento), mas não testado explicitamente nesse nível. Classificado como LOW/OBSERVATION, não um gap real de comportamento.

## 32. Cobertura E2E de falhas — tabela dos cenários A–J

| # | Cenário | Classificação | Evidência |
|---|---|---|---|
| A | Backend indisponível | **PARTIAL** | `api-unavailable.spec.ts` simula via `route.abort('failed')` (mock) — exercita o caminho de código real de erro de rede na UI, mas não é uma integração contra um backend genuinamente fora do ar. Cobertura unitária do mapper (status 0) é real e direta. |
| B | 403 | **NOT_COVERED** (E2E) / COVERED (unitário) | Nenhum spec E2E provoca um 403 real. `auto-qa-error-mapper.spec.ts` cobre a tradução isoladamente. |
| C | 404 detail | **COVERED** | `execution-not-found.spec.ts` (corrigido na Fase 13.6) observa o status HTTP real via `page.waitForResponse` contra o backend real. |
| D | 409 action | **NOT_COVERED** (E2E) / COVERED (unitário) | `auto-qa-execution-state.service.spec.ts` cobre preservação de `current()`/`actionError()` em 409 para `apply`/`execute`. Nenhum E2E provoca conflito real. |
| E | 422 action | **NOT_COVERED** (E2E) / COVERED (unitário) | Mesmo teste unitário do item D cobre 422 junto. Nenhum E2E dedicado. |
| F | 500 | **PARTIAL** | `api-unavailable.spec.ts` mocka 500 no detalhe (`route.fulfill`) — exercita a UI real, mas não é uma resposta 500 genuína do backend. Cobertura unitária real e direta (mapper). |
| G | Criação duplicada/duplo clique | **NOT_COVERED** (E2E) / COVERED (unitário) | `createExecution(): ignora uma segunda chamada enquanto a primeira ainda está em andamento` (unitário). Nenhum E2E clica duas vezes no submit para confirmar visualmente. |
| H | Ação concorrente (pendingAction bloqueia outra ação) | **NOT_COVERED** (E2E) / COVERED (unitário) | `'ignora uma nova ação enquanto outra ainda está em andamento (guard entre ações diferentes)'` (unitário). Nenhum E2E clica duas ações diferentes em sequência rápida. |
| I | Falha E2E com evidência suficiente | **PARTIAL** | Ver item 27 — screenshot sempre; trace só na 2ª tentativa; sem vídeo; artifacts publicados no CI só em falha (Fase 13.6). |
| J | Readiness do backend falhando no CI | **COVERED** | Implementado na própria Fase 13.6: polling com timeout explícito, log do backend impresso no step + artifact em falha, `exit 1` claro (não mascarado). |

**Resumo:** dos 10 cenários, 3 são `COVERED` (C, J, e parcialmente os cobertos por unitário puro em D/E/G/H que são reais mas não E2E), 3 são `PARTIAL` (A, F, I), e B/D/E/G/H são `NOT_COVERED` especificamente **no nível E2E** (mas D/E/G/H têm cobertura unitária real e robusta — a lacuna é só de integração ponta-a-ponta, não de comportamento verificado). A maioria dos 24 testes E2E existentes (18 dos 24) são "Happy Path de UI" com dados mockados (`mockExecutionDetail`) — cobrem *apresentação*, não *falha de integração*.

## 33. Polling/retries/subscriptions

**Polling**: confirmado ausente (nenhum `setInterval`/`interval()`/`timer()`/`poll()` na feature, só o comentário de documentação que afirma essa ausência). **Retries**: nenhum retry automático de requisição HTTP existe no código (RxJS `retry()`/`retryWhen()` não é usado em nenhum lugar da feature) — toda recuperação é manual (botão "Tentar novamente"), o que é uma escolha de design consciente e correta (evita mascarar falhas persistentes com retries silenciosos). **Subscriptions**: nos componentes, sempre com `takeUntilDestroyed(destroyRef)` (confirmado em `execution-list-page`, `execution-detail-page`). No próprio `AutoQaExecutionStateService` (`loadList`/`loadExecution`), os `.subscribe()` **não** usam `takeUntilDestroyed` — mas o serviço é `providedIn: 'root'` (vive por toda a aplicação) e os Observables do `HttpClient` completam sozinhos após uma emissão (não são streams infinitos), então não há memory leak real — já registrado como achado LOW estilístico em fase anterior (Fase 13 geral, F19-4), reconfirmado aqui sem mudança.

## 34. Achados BLOCKER

Nenhum.

## 35. Achados HIGH

Nenhum novo. (A ausência de timeout HTTP, já registrada como MEDIUM/HIGH na Fase 13 geral, F21-4/H13, é reconfirmada no item 37 — não elevada nem rebaixada nesta fase, mantida na classificação original.)

## 36. Achados MEDIUM

- **M1 — Ausência de timeout HTTP explícito** (reconfirmado, já conhecido como F21-4/H13 da Fase 13 geral): nenhum `timeout()` operator, nenhum interceptor. Uma chamada que trava (nem sucesso nem erro, ex.: backend aceita a conexão mas nunca responde) deixa `pendingAction`/`loading` presos indefinidamente, sem qualquer mensagem de erro — pior experiência que uma falha explícita. Relevante para esta fase porque afeta diretamente "confiabilidade operacional".
- **M2 — Botão "Atualizar" não é bloqueado durante `pendingAction`** (reconfirmado, já conhecido como F21-3 da Fase 13 geral): `canRefresh = hasCurrentExecution() && !loading()` não verifica `pendingAction()`. Um clique em "Atualizar" enquanto uma ação está em andamento pode sobrescrever `current()` com um estado pré-ação, sem erro visível — a tela "parece" funcionar mas mostra dado desatualizado até o próximo refresh.
- **M3 — Mensagem de `NETWORK_ERROR` presume erro do lado do usuário** (novo achado desta fase, item 4/10): "Verifique sua conexão" é impreciso quando a causa real é CORS/configuração do servidor — limitação de diagnóstico do browser, não corrigível sem mudar a mensagem para algo mais neutro.
- **M4 — Sem botão de retry na página de detalhe para falha de carregamento inicial** (novo achado desta fase, item 21): só a listagem tem "Tentar novamente"; o detalhe só tem "Atualizar", que fica indisponível se `current()` nunca chegou a carregar.

## 37. Achados LOW

- **L1 — `.subscribe()` sem `takeUntilDestroyed` no state service** (reconfirmado, F19-4) — risco teórico, não real (singleton `root`, Observable finito).
- **L2 — Gap de teste unitário explícito para status 0 no state service** (item 31) — coberto por extensão via mapper, não testado diretamente nesse nível.
- **L3 — Trace do Playwright só na 2ª tentativa (CI)** (item 27) — falhas intermitentes que "passam no retry" não deixam trace.
- **L4 — Sem vídeo do Playwright em nenhuma configuração** (item 26/27).

## 38. Observations

- 401 sem entrada dedicada no mapper (item 6) — coerente com a ausência de autenticação, não uma lacuna real hoje.
- `AutoQaExecutionResponse` (modelo TS) corretamente **não** declara `projectPath`, espelhando a sanitização real do backend — ponto forte confirmado, não um achado a corrigir (item 24).
- Separação `AutoQaPublicWarning`/`AutoQaPublicError` (dados estruturados) vs. qualquer noção de "log/terminal" está correta — nenhum componente os apresenta como se fossem stdout/stderr (confirmado por leitura de `error-list`/`warning-list`, que só renderizam `code`/`message`/`description` como texto estruturado, nunca em um bloco estilo console).

## 39. Recomendações FIX_NOW

**Nenhuma.** Nenhum achado desta fase atende ao critério explícito de `FIX_NOW` (impacto concreto em diagnóstico de falhas, segurança, confiabilidade, recuperação após erro, CI, ou acessibilidade crítica) a ponto de justificar interromper a regra de "somente diagnóstico" desta etapa. Os achados MEDIUM (M1-M4) são reais, mas nenhum é um bloqueio operacional agora — são candidatos a uma futura implementação aprovada separadamente.

## 40. Recomendações FUTURE

- Adicionar timeout HTTP (M1) — ex.: `timeout(30_000)` na camada de service ou um interceptor dedicado (decisão de onde, não tomada aqui).
- Fazer `canRefresh` também considerar `pendingAction()` (M2) — mudança pequena e localizada.
- Revisar o texto de `NETWORK_ERROR` para algo mais neutro quanto à causa (M3) — ex.: "Não foi possível completar a requisição. O servidor pode estar indisponível ou inacessível." (sugestão de texto, não uma implementação).
- Adicionar retry manual na página de detalhe para falha de carregamento inicial (M4), espelhando o padrão já existente na listagem.
- Testes unitários explícitos com `status: 0` no `AutoQaExecutionStateService` (L2), não só no mapper.
- Avaliar `video: 'retain-on-failure'` no Playwright para complementar screenshot+trace em falhas intermitentes (L3/L4).
- E2E dedicado para 403 (com CORS já autorizado, então status real chega como 403) e para 409 (ação concorrente real).

## 41. Arquivos que precisariam ser alterados, se aprovado no futuro

`auto-qa-error-mapper.ts` (M3, texto), `auto-qa-execution-state.service.ts` (M1, se timeout for aqui), `execution-detail-page.component.ts`/`.html` (M2, M4), `playwright.config.ts` (L3/L4, se `video` for adicionado). Nenhum arquivo backend.

## 42. Testes que deveriam ser criados, se aprovado no futuro

Unitário: `status: 0` explícito no state service (L2); comportamento de `canRefresh` com `pendingAction` ativo (M2, RED antes da correção). E2E: 403 real (origem autorizada, backend genuinamente recusando por falta de permissão de negócio — não há esse caso hoje no domínio, mas o padrão de teste ficaria pronto para quando existir); 409 real (dois clientes tentando a mesma ação).

## 43. Classificação final

## **OBSERVABILITY_HARDENING_REQUIRED**

Justificativa: não há nenhum `BLOCKER`/`HIGH` novo, e os mecanismos fundamentais (mapeamento de erro centralizado e testado contra vazamento, `dispatch()` com guards corretos, `finalize()` sempre limpando estado pendente, acessibilidade de erro via `role="alert"`/`role="status"`, ausência total de logging problemático) estão sólidos — isso afasta `CRITICAL_DIAGNOSTIC_GAP`. Mas os 4 achados MEDIUM (M1-M4) são reais e afetam diretamente a capacidade de diagnosticar/recuperar de falhas em produção (timeout ausente pode travar a UI silenciosamente; botão de refresh pode mascarar estado desatualizado; mensagem de rede pode confundir CORS com falha de conexão; falta retry na tela mais importante do fluxo) — isso afasta `OBSERVABILITY_SUFFICIENT`. O meio-termo correto é `OBSERVABILITY_HARDENING_REQUIRED`: a base é boa, mas há trabalho concreto e justificado a fazer antes de considerar a observabilidade do frontend madura.

## 44. Confirmação de backend intocado

Confirmado — `git status` no repositório `criar-cenario-testes` está vazio ao final desta investigação. Nenhum arquivo `.java` foi lido para além do já documentado em fases anteriores (nenhuma nova leitura de backend foi necessária nesta fase, escopo é frontend).

## 45. Confirmação de nenhum arquivo alterado

Confirmado — `git status` em ambos os repositórios permanece idêntico ao início desta investigação (frontend só com a nova pasta de relatório `docs/auto-qa/relatorio/13.7/`, sem nenhum código tocado).

## 46. Confirmação de que aguardará nova aprovação

Confirmado. **PARADO aqui.** Nenhuma correção foi implementada, nem mesmo as classificadas como MEDIUM. Nenhum teste foi criado. Nenhuma dependência foi instalada. Nenhum arquivo de configuração foi alterado. Aguardando aprovação explícita antes de qualquer implementação.
