# FASE 13.7 — OBSERVABILIDADE, DIAGNÓSTICO E CONFIABILIDADE DO FRONTEND
## Relatório final — Etapa 2 (Hardening M1–M4)

**Data:** 2026-08-10
**Escopo:** exclusivamente frontend, dentro de `src/app/features/auto-qa-bmad/`. Nenhum arquivo backend, nenhum workflow, nenhum `playwright.config.ts` foi tocado. Nenhum comando Git de escrita foi executado.

---

## 1. Baseline inicial

382 testes unitários, build verde, 24/24 E2E (herdado da Fase 13.6, `CI_VALIDATED`).

## 2. Arquivos criados

Nenhum. Todas as correções couberam dentro dos arquivos já existentes e autorizados.

## 3. Arquivos alterados

- `shared/utils/auto-qa-error-mapper.ts` / `.spec.ts` (M1 timeout + M3 mensagem)
- `services/auto-qa-execution.service.ts` / `.spec.ts` (M1 timeout)
- `state/auto-qa-execution-state.service.ts` / `.spec.ts` (M1 tipos + M2 canRefresh)
- `pages/execution-detail-page/execution-detail-page.component.ts` / `.html` / `.spec.ts` (M4 retry)

## 4. Decisão arquitetural do timeout

Aplicado dentro de `AutoQaExecutionService` — o único ponto onde toda chamada HTTP da feature já nasce (11 métodos, todos usando `HttpClient` diretamente). Um método privado `withTimeout<T>()` envolve cada retorno com `.pipe(timeout(AUTO_QA_HTTP_TIMEOUT_MS))`, evitando duplicar a expressão `.pipe(timeout(...))` 11 vezes.

## 5. Por que esse ponto foi escolhido

**Sem interceptor** (proibido sem nova aprovação, respeitado): um interceptor exigiria registrar uma nova peça arquitetural (`provideHttpClient(withInterceptors([...]))`) que hoje não existe em lugar nenhum do projeto — mudança estrutural maior do que o necessário para resolver M1. Aplicar em `AutoQaExecutionStateService.dispatch()` cobriria só as 8 ações despachadas por ali, deixando `loadList`/`loadExecution`/`createExecution` (que não passam por `dispatch()`) sem proteção, exigindo 3 pontos de aplicação adicionais no mesmo arquivo. `AutoQaExecutionService` é o único lugar que garante, de forma естrutural, que **nenhuma chamada HTTP atual ou futura da feature** possa escapar do timeout — é literalmente o limite HTTP da feature, o mesmo papel que um interceptor teria, sem introduzir a camada nova.

## 6. Valor do timeout

`AUTO_QA_HTTP_TIMEOUT_MS = 30_000` (30 segundos), constante exportada e única, sem número mágico duplicado em nenhuma chamada.

## 7. Chamadas protegidas

Todas as 11: `create`, `list`, `get`, `start`, `continueExecution`, `generate`, `registerApplyApproval`, `apply`, `registerExecutionApproval`, `execute`, `cancel`.

## 8. Comportamento em timeout

`timeout()` do RxJS emite `TimeoutError` (não `HttpErrorResponse`) e cancela a subscrição HTTP subjacente (a requisição real é abortada). O `AutoQaExecutionStateService` já tinha `error: (err) => ...` em todos os 4 pontos de tratamento (`loadList`, `loadExecution`, `createExecution`, `dispatch`) — só foi necessário ampliar o tipo do parâmetro para `HttpErrorResponse | TimeoutError` (union tipado, nenhum cast inseguro).

## 9. Mensagem de timeout

Novo item de catálogo `TIMEOUT_ERROR` em `auto-qa-error-mapper.ts`: título "Tempo de resposta excedido", mensagem "O servidor demorou mais que o esperado para responder. Tente novamente." — exatamente o texto sugerido na aprovação. `mapHttpErrorToUiError` agora detecta `error instanceof TimeoutError` **antes** de qualquer acesso a `.status` (que não existe em `TimeoutError`), retornando `status: null` (nunca um cast/valor inventado).

## 10. Limpeza de loading

Automática — `finalize()` já existente em `loadList`/`loadExecution` roda para qualquer terminação (sucesso, erro HTTP ou `TimeoutError`), sem nenhuma mudança de código necessária além do tipo do handler de erro.

## 11. Limpeza de creating

Mesma mecânica — `finalize()` em `createExecution`, inalterada.

## 12. Limpeza de pendingAction

Mesma mecânica — `finalize()` em `dispatch()`, inalterada. Testado explicitamente por `fakeAsync`/`tick` no nível do `AutoQaExecutionService` (item 24).

## 13. Preservação de current

Inalterada — o `tap({ error: ... })` continua só gravando `error()`/`actionError()`, nunca tocando `current()`/`list()`, independentemente do erro ser HTTP ou timeout.

## 14. Implementação M2

`auto-qa-execution-state.service.ts`, `canRefresh`:
```ts
readonly canRefresh = computed(
  () => this.hasCurrentExecution() && !this._loading() && !this._pendingAction()
);
```

## 15. Comportamento de canRefresh

`true` somente quando: há execução carregada **E** não há `loading` **E** não há `pendingAction`. Nenhuma regra de `availableActions`/`status`/`currentStage` foi tocada ou inferida — `canRefresh` continua sendo puramente estado de UI, `availableActions` continua a única fonte autoritativa para ações do workflow.

## 16. Implementação M3

`ERROR_CATALOG.NETWORK_ERROR` em `auto-qa-error-mapper.ts` — título e mensagem substituídos.

## 17. Mensagem NETWORK_ERROR final

Título: **"Falha de comunicação"**. Mensagem: **"Não foi possível completar a comunicação com o servidor. Ele pode estar indisponível ou inacessível no momento."** — neutra, não afirma "verifique sua conexão", não menciona CORS, não culpa o usuário. `recoverable` permanece `true`.

## 18. Tratamento status 0

Inalterado no mecanismo (continua mapeado para `NETWORK_ERROR` via `STATUS_TO_CODE[0]`), só o texto final mudou.

## 19. Implementação M4

`execution-detail-page.component.ts`: novo `signal` `executionId` preenchido a partir do parâmetro de rota **sempre** (não só em sucesso, diferente de `state.selectedExecutionId()`, que só é setado dentro do `next()` de `loadExecution`). Novo método `onRetryLoad()` chama `state.loadExecution(this.executionId())`. Template: bloco `@if (!state.current())` dentro do `@if (state.error())` já existente, renderizando `<aqb-button class="execution-detail-page__retry-load">Tentar novamente</aqb-button>`.

## 20. Comportamento do retry

Visível **somente** quando `state.error()` está definido **e** `state.current()` ainda é `null` (carregamento inicial nunca teve sucesso). Desaparece assim que `current()` existir (mesmo que um novo erro apareça depois — nesse caso o "Atualizar" do cabeçalho assume o papel).

## 21. Proteção contra duplo clique

`[disabled]="state.loading()"` no botão — reforça o guard interno já existente em `loadExecution()` (`if (this._loading()) return;`), mesmo padrão de dupla proteção já usado em outros pontos da feature (ex.: criação de execução).

## 22. Comportamento após retry com sucesso

Nenhuma lógica nova: `loadExecution()` já seta `current()`/`selectedExecutionId()` no sucesso e limpa `error()` no início da chamada — o retry reusa 100% o fluxo existente, sem nenhuma atualização manual de Timeline/Overview/Summary/ActionBar (todos já reativos a `current()`).

## 23. Comportamento após retry com falha

Também sem lógica nova: `error()` é resetado no início de cada `loadExecution()` e regravado com a mensagem mapeada em caso de nova falha — o botão de retry continua visível (mesma condição `!state.current()`), sem loop automático (retry é 100% manual, nenhum `retry()`/`retryWhen()` do RxJS foi usado).

## 24. Testes novos por arquivo

| Arquivo | Testes novos |
|---|---|
| `auto-qa-error-mapper.spec.ts` | 3 (NETWORK_ERROR não culpa conexão/CORS; TimeoutError → TIMEOUT_ERROR; TIMEOUT_ERROR nunca expõe `TimeoutError`/`rxjs`) |
| `auto-qa-execution.service.spec.ts` | 2 (`fakeAsync`/`tick`: timeout real dispara `TimeoutError`; resposta antes do timeout não dispara) |
| `auto-qa-execution-state.service.spec.ts` | 1 (`canRefresh` falso durante `pendingAction`, volta a `true` depois) |
| `execution-detail-page.component.spec.ts` | 5 (retry visível sem `current()`; oculto com `current()`; clique chama `loadExecution`; desabilitado durante `loading()`; some após sucesso) |
| **Total** | **11** |

Nenhum teste artificial foi criado apenas para aumentar contagem — cada um cobre exatamente um comportamento pedido nos critérios de aceite (seções 50-53 da aprovação).

## 25. Total unitário final

**393** (382 + 11).

## 26. Resultado unit tests

`npx ng test --watch=false --browsers=ChromeHeadless` → **393/393 SUCCESS**.

## 27. Resultado build

`npx ng build` → sucesso. Chunk `auto-qa-bmad-routes`: 105.64 kB → **106.74 kB** raw (19.09 kB → 19.34 kB transfer) — variação pequena e esperada (100% código novo de tratamento de erro/timeout/retry, nenhum budget excedido, nenhum warning).

## 28. Resultado E2E

**24/24 passed**, validado contra o backend real (com `AUTO_QA_ALLOWED_ROOTS`/`APP_CORS_ALLOWED_ORIGINS` configurados como variáveis de ambiente do processo, mesma técnica já usada nas Fases 13.5/13.6 — nenhuma mudança de código exigida). Confirmei explicitamente que `create-execution.spec.ts` (não alterado nesta fase) continua funcionando sem nenhuma regressão — as mudanças de M1/M2/M4 não tocam o caminho feliz de nenhum fluxo.

## 29. Total E2E

24 (12 specs únicos × Desktop/Mobile) — inalterado.

## 30. Confirmação de ausência de polling

Confirmado — nenhum `setInterval`/`interval()`/`timer()`/`repeat()`/`poll()` foi introduzido. O retry de M4 é 100% acionado por clique do usuário.

## 31. Confirmação de ausência de retry automático

Confirmado — nenhum `retry()`/`retryWhen()` do RxJS foi adicionado a nenhuma chamada HTTP. Timeout produz erro controlado; a decisão de tentar de novo é sempre do usuário (clique).

## 32. Confirmação de ausência de interceptor novo

Confirmado — `grep -rn "HttpInterceptor\|HTTP_INTERCEPTORS\|withInterceptors"` em todo `src/app` continua sem nenhuma ocorrência.

## 33. Confirmação de ausência de logging novo

Confirmado — `grep -rn "console\.(log|error|warn|debug)"` na feature continua sem nenhuma ocorrência.

## 34. Confirmação de backend intocado

Confirmado — `git status` no repositório `criar-cenario-testes` está vazio ao final desta implementação.

## 35. Confirmação de contrato intocado

Confirmado — nenhum modelo TypeScript (`auto-qa-execution.model.ts`), nenhuma URL, nenhum payload de request foi alterado. As mudanças são inteiramente do lado do tratamento de erro/timeout/UI, não do contrato com o backend.

## 36. Confirmação de pipeline intocado

Confirmado — `frontend-pipeline.yml`/`gradle.yml`/workflows de promoção não aparecem em nenhum diff.

## 37. Confirmação de playwright.config intocado

Confirmado — `playwright.config.ts` não aparece em nenhum diff (L3/L4 permanecem FUTURE, conforme instruído).

## 38. Confirmação de ausência de dependência nova

Confirmado — `package.json`/`package-lock.json` não foram tocados; `timeout`/`TimeoutError` já fazem parte do RxJS já instalado (`rxjs@7.8.2`, confirmado antes de usar).

## 39. Confirmação de segurança/anti-vazamento

Confirmado por teste explícito: `TIMEOUT_ERROR` nunca expõe o nome da classe `TimeoutError` nem menciona `rxjs` na mensagem pública (novo teste, item 24). O teste anti-vazamento pré-existente do mapper (payload/stacktrace do backend) continua verde, sem nenhuma alteração de comportamento.

## 40. Limitações

- O teste de timeout (`fakeAsync`/`tick`) valida a mecânica RxJS de forma determinística e rápida, mas não é uma prova de que 30s é o valor "certo" para produção — é um valor inicial razoável, conforme a aprovação já antecipava.
- M3 resolve a *mensagem* apresentada para status 0, mas a limitação de diagnóstico em si (impossibilidade de distinguir CORS de backend-fora-do-ar a partir do JavaScript) continua sendo uma restrição de plataforma, não algo que este hardening pudesse eliminar.

## 41. Dívidas técnicas restantes

Inalteradas desde o diagnóstico: L1 (subscribe sem `takeUntilDestroyed` no state service, singleton `root`, risco teórico), L3 (trace do Playwright só na 2ª tentativa), L4 (sem vídeo Playwright), E2E real para 403/409, Generated Files/Preview/Diff/Logs/Retry/Failure/Learning detalhados — todas explicitamente fora do escopo desta etapa (seção 58 da aprovação), não tocadas.

## 42. Classificação final da observabilidade

## **OBSERVABILITY_SUFFICIENT**

Justificativa: os 4 achados MEDIUM que sustentavam `OBSERVABILITY_HARDENING_REQUIRED` foram resolvidos e validados (M1 com teste determinístico de timeout real via `fakeAsync`; M2 com teste explícito de bloqueio/liberação; M3 com teste anti-culpabilização; M4 com 5 testes cobrindo visibilidade/ocultação/clique/proteção/recuperação). A suíte completa permanece verde (393/393 unitários, 24/24 E2E, build limpo) — nenhuma regressão introduzida. Os itens restantes (L1, L3, L4, E2E 403/409, contract gaps) são `LOW`/`FUTURE`, explicitamente aceitos pela própria aprovação como não-bloqueantes para esta classificação (seção 57: "Os LOW/FUTURE restantes não impedem necessariamente essa classificação"). Não há mais nenhum achado `MEDIUM` ou superior em aberto para a observabilidade do frontend Auto QA.

## 43. Confirmação de nenhum Git de escrita

Confirmado — apenas `git status`, `git diff --stat` (leitura) foram usados em ambos os repositórios.

## 44. Confirmação de que nenhuma próxima fase foi iniciada

Confirmado. **PARADO aqui.** Fase 13.8 não iniciada. Nenhuma nova feature. Nenhuma alteração backend. Nenhuma alteração de CI. Nenhum commit, nenhum push.
