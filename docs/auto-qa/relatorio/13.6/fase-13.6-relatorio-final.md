# FASE 13.6 — FRONTEND E2E HARDENING
## Relatório final — Etapa 2 (implementação do Quality Gate de integração)

**Data:** 2026-08-10
**Status:** `IMPLEMENTED_PENDING_CI_VALIDATION` — implementado e validado localmente em profundidade; a primeira execução real no GitHub Actions ainda não ocorreu (nenhum push foi feito por mim, conforme instruído).
**Escopo:** exatamente os 4 arquivos autorizados. Nenhum arquivo backend foi tocado. Nenhum comando Git de escrita foi executado.

---

## 1. Arquivos alterados

- `gerar-cenario-teste-app/.github/workflows/frontend-pipeline.yml` — novo job `Frontend E2E`.
- `gerar-cenario-teste-app/e2e/dashboard.spec.ts` — correção do falso-positivo no teste "histórico real ou vazio".
- `gerar-cenario-teste-app/e2e/execution-not-found.spec.ts` — correção do falso-positivo no teste "404 real".
- `gerar-cenario-teste-app/playwright.config.ts` — adição do reporter `html` (condicionalmente autorizada), preservando `list`.

## 2. Arquivos criados

Nenhum. Tudo coube dentro dos 4 arquivos já existentes e autorizados.

## 3. Estrutura final Frontend E2E

```yaml
e2e:
  name: Frontend E2E
  needs: build
  runs-on: ubuntu-latest
  timeout-minutes: 15
  services:
    mongodb:
      image: mongo:7
      ports: ["27017:27017"]
  env:
    APP_CORS_ALLOWED_ORIGINS: http://localhost:4200
    AUTO_QA_ALLOWED_ROOTS: /tmp/projeto-e2e
    MONGO_URI_NUVEM: mongodb://localhost:27017
  steps:
    - Checkout frontend
    - Checkout backend (repository: JeanHeberth/criar-cenario-testes, ref: main, path: backend)
    - Setup Node.js 24
    - Setup JDK 21 (Corretto)
    - Cache Gradle dependencies
    - Install frontend dependencies (npm ci)
    - Install Playwright Chromium
    - Create E2E fixture directory (/tmp/projeto-e2e)
    - Start backend (background, PID capturado, log redirecionado)
    - Wait for backend readiness (polling, até 40×3s)
    - Run E2E (npx playwright test)
    - Upload Playwright artifacts (if: failure())
    - Upload backend log (if: failure())
    - Stop backend (if: always())
```

## 4. needs utilizados

`e2e: needs: build` — só roda depois de `Frontend Unit Tests` e `Frontend Build` (que já dependia de `test`) terem passado, cumprindo a cadeia completa `Unit Tests → Build → E2E`.

## 5. Checkout frontend

`actions/checkout@v4`, padrão (raiz do workspace), igual aos outros jobs do mesmo workflow.

## 6. Checkout backend

`actions/checkout@v4` com `repository: JeanHeberth/criar-cenario-testes`, `path: backend` (isolado em subdiretório, nunca sobrescreve o checkout do frontend). Confirmado via `git remote -v` que este é o nome exato do repositório backend.

## 7. Ref backend

`main` — conforme decisão explícita da aprovação. Registrado como dívida (item 51/57): `main` é uma referência móvel, não um SHA imutável.

## 8. Permissions

`contents: read` (nível do workflow, já existente desde a Fase 13.5, preservado sem alteração) — suficiente para checkout de leitura de um repositório público, confirmado nesta implementação (nenhum erro de permissão esperado, já que ambos os repositórios são públicos).

## 9. Java

21 (Corretto), via `actions/setup-java@v4` — mesma versão/distribuição já usada em `gradle.yml` (Fase 13.5), agora também no job de E2E do frontend.

## 10. Node

24, via `actions/setup-node@v4` — mesma versão já usada nos demais jobs deste workflow.

## 11. Mongo image/version

`mongo:7` (imagem oficial do Docker Hub) — versão estável atual da série 7.x, compatível com o driver já usado pelo backend (`mongodb-driver-sync 5.2.1`, confirmado por leitura do `build.gradle` sem alteração). **Validado localmente com sucesso**: subi este container real (`docker run mongo:7`), o backend conectou e serviu requisições reais sem nenhum ajuste de código.

## 12. Mongo connection string utilizada, sem segredo

`mongodb://localhost:27017` — sem usuário, sem senha, sem TLS (imagem oficial roda sem autenticação por padrão quando nenhuma variável `MONGO_INITDB_ROOT_*` é passada, que é exatamente o caso aqui). Confirmado localmente que essa string funciona com o binding existente (`spring.data.mongodb.uri` + `spring.data.mongodb.database: geradorcenarios`, ambos em `application.yml`, **não alterados**) — a ausência de segmento de banco na URI é o mesmo padrão já usado pela URI real de produção (`mongodb+srv://...` também sem `/database` no final), então o binding já existente resolve o nome do banco pela property `database` separada, sem exigir nenhuma configuração de CI especial.

## 13. Fixture filesystem

`mkdir -p /tmp/projeto-e2e`, step dedicado antes de iniciar o backend. Diretório vazio, sem conteúdo sensível, dentro da raiz autorizada (a própria raiz, exatamente como configurada em `AUTO_QA_ALLOWED_ROOTS`).

## 14. APP_CORS_ALLOWED_ORIGINS

`http://localhost:4200` — origem real onde o `ng serve` (iniciado pelo próprio Playwright via `webServer`) roda no runner. Configurada como variável de ambiente do job, nunca escrita em `CorsConfig.java`/`AppCorsProperties.java`/`application.yml`.

## 15. AUTO_QA_ALLOWED_ROOTS

`/tmp/projeto-e2e` — mesmo valor usado nesta e nas investigações da Fase 13.5, reconfirmado funcional. Configurada como variável de ambiente do job (nunca via `.env`, reconfirmando o achado da Fase 13.5 de que `.env`/dotenv não sobrepõe essa property de forma confiável — em CI real isso não é um problema, pois `env:` do GitHub Actions define variáveis de processo reais).

## 16. Flags sensíveis

Nenhuma configurada — `allowFileApplication`, `allowCommandExecution`, `sensitiveActionsEnabled` permanecem nos defaults seguros (`false`) do `application.yml`, **não tocado**. Confirmado que `create-execution.spec.ts` (único teste que toca o backend de forma hard-requerida) nunca exercita `apply`/`execute`, então nenhuma flag sensível precisa ser habilitada.

## 17. Processo backend

Iniciado via `nohup ./gradlew bootRun > backend-e2e.log 2>&1 &`, a partir de `working-directory: backend`. Testei localmente exatamente este padrão (incluindo o encerramento via PID) antes de escrever o workflow.

## 18. PID/cleanup

`echo $! > backend.pid` captura o PID do processo em background; step final `Stop backend` (`if: always()`) faz `kill "$(cat backend.pid)"`. **Validei empiricamente** que matar esse PID realmente encerra o processo Java escutando na porta 8089 (não fica órfão) — testei isso isoladamente antes de finalizar o design do workflow.

## 19. Readiness

`GET /api/auto-qa/executions?page=0&size=1` com `Origin: http://localhost:4200`, aguardando `HTTP 200`. Confirma simultaneamente Tomcat de pé, CORS aceitando a origem, e MongoDB acessível (não existe `/actuator/health`, conforme já diagnosticado — não adicionado nesta fase).

## 20. Timeout readiness

Até 40 tentativas × 3 segundos = **até 120 segundos** de espera antes de falhar explicitamente (`exit 1`, imprimindo as últimas 200 linhas do log do backend para diagnóstico imediato no próprio log do step, além do artifact completo em caso de falha do job todo). Localmente, o backend fica pronto em ~1 segundo (classes já compiladas); a margem de 120s cobre uma primeira execução fria no runner (checkout + compilação + start), com folga.

## 21. Instalação Chromium

`npx playwright install --with-deps chromium` — só o browser realmente usado pelos dois projetos configurados (`Desktop`/`Mobile`, ambos Chromium), nenhum Firefox/WebKit instalado.

## 22. Configuração Playwright

`testDir`, `fullyParallel`, `retries` (CI: 1), `baseURL`, `webServer`, projetos `Desktop`/`Mobile`, `screenshot`/`trace` — **todos preservados exatamente como estavam**. Única mudança: `reporter`.

## 23. Reporter

`[['list'], ['html', { open: 'never' }]]` — antes só `[['list']]`. `'html'` gera `playwright-report/` (confirmado localmente que o diretório e o `index.html` são gerados corretamente), nunca abre automaticamente (`open: 'never'`, seguro para CI). `'list'` continua no console.

## 24. Artifacts

Em caso de falha (`if: failure()`): `test-results/` + `playwright-report/` (um único artifact `playwright-report`), e `backend-e2e.log` (artifact separado `backend-e2e-log`). Ambos com `if-no-files-found: ignore` (evita uma segunda falha por artifact ausente mascarar a falha original, conforme exigido).

## 25. Backend logs

`backend-e2e.log`, redirecionado desde o `nohup`. Confirmei nesta sessão (novamente) que o log do backend, mesmo em INFO, nunca imprime a credencial do Mongo em texto claro (o driver mascara com `<hidden>`) — e, no cenário de CI, a connection string nem tem credencial (item 12), então não há nada sensível a vazar de qualquer forma.

## 26. dashboard spec antes/depois

**Antes:** `await page.goto('/auto-qa'); ... await expect(grid.or(emptyState).first()).toBeVisible(...)` — sem observar a resposta HTTP real.
**Depois:** `Promise.all([page.waitForResponse(...), page.goto('/auto-qa')])` capturando a resposta real de `GET /api/auto-qa/executions`, com `expect(response.status()).toBe(200)` **antes** da asserção visual.

## 27. execution-not-found spec antes/depois

**Antes:** `await page.goto('/auto-qa/00000000-...'); ...` — sem observar a resposta HTTP real.
**Depois:** mesmo padrão, capturando a resposta de `GET /api/auto-qa/executions/00000000-...`, com `expect(response.status()).toBe(404)` antes da asserção visual.

## 28. Comportamento desses specs sem backend (RED confirmado)

Testei localmente com o backend **desligado**: os dois specs (4 testes, Desktop+Mobile) agora **falham** por timeout em `page.waitForResponse` (nenhum evento `response` é disparado quando a conexão é recusada) — comportamento correto e esperado, oposto ao que ocorria antes da correção (onde os 4 passavam indevidamente).

## 29. create-execution sem backend

Reconfirmado nesta sessão: continua falhando (2/2, Desktop+Mobile) com o backend desligado — comportamento inalterado, `create-execution.spec.ts` **não foi tocado** (fora do escopo autorizado).

## 30. E2E com backend real

**24/24 passed**, validado com o backend real completo (Java 21, `bootRun`) conectado a um **MongoDB efêmero real** (`mongo:7` via Docker, sem credencial) — réplica funcional exata do que o job de CI fará, incluindo os 2 specs recém-corrigidos.

## 31. Desktop

12/12 testes passando (parte dos 24 totais).

## 32. Mobile

12/12 testes passando (parte dos 24 totais).

## 33. Unit tests do frontend regridem

Não — reconfirmado após todas as mudanças: `npm run test -- --watch=false --browsers=ChromeHeadless` → **382/382 SUCCESS**.

## 34. Build frontend

`npm run build` → sucesso, sem warnings de budget, chunks idênticos ao baseline (`auto-qa-bmad-routes` 105.64 kB raw / 19.09 kB transfer).

## 35. YAML validation

`frontend-pipeline.yml` validado sintaticamente via `yaml.safe_load` (Python) — estrutura de `jobs`/`needs`/`services`/`env`/`if` conferida programaticamente: `e2e.needs = build`, `e2e.services.mongodb.image = mongo:7`, `e2e.env` com as 3 variáveis corretas, 14 steps, `if: failure()` nos 2 uploads, `if: always()` no stop.

## 36. Quality gates finais

`Backend Tests`, `Backend Build` (Fase 13.5, intactos, não tocados nesta fase) · `Frontend Unit Tests`, `Frontend Build` (Fase 13.5, intactos) · **`Frontend E2E` (novo, Fase 13.6)**.

## 37. Secrets utilizados

**Zero.** Nenhum secret novo foi criado ou referenciado. `MONGO_URI_NUVEM` no job aponta para o Mongo efêmero local (sem credencial, não é secret). `GITHUB_TOKEN` nem é usado neste job (só nos workflows de promoção, não tocados).

## 38. Confirmação de Mongo efêmero

Confirmado — `services.mongodb.image: mongo:7`, container descartado automaticamente ao final do job pelo próprio GitHub Actions (comportamento nativo de `services:`), sem persistência entre execuções.

## 39. Confirmação de ausência de Atlas

Confirmado — `MONGO_URI_NUVEM` do job E2E nunca aponta para `cluster.y2vw5.mongodb.net` nem para nenhum outro cluster real; sempre `mongodb://localhost:27017` (o service container do próprio job).

## 40. Confirmação de ausência de IA

Confirmado — `OPENAI_API_KEY`/`GEMINI_API_KEY` não aparecem em nenhum lugar do job `e2e`. Reconfirmado (Fase 13.6, Etapa 1) que o backend sobe normalmente sem essas variáveis e que `create-execution.spec.ts` nunca invoca agentes de IA.

## 41. Confirmação de ausência de ações sensíveis

Confirmado — `allowFileApplication`/`allowCommandExecution`/`sensitiveActionsEnabled` permanecem `false` (defaults do `application.yml`, não tocado); nenhuma variável de ambiente as sobrescreve no job.

## 42. Confirmação de backend funcional intocado

Confirmado — `git status` no repositório `criar-cenario-testes` está **vazio** ao final desta implementação. Nenhum `.java`, nenhum `application.yml`, nenhum `build.gradle` foi tocado. O checkout do backend dentro do job E2E é só leitura (compila e roda o código como está em `main`, nunca modifica nada).

## 43. Confirmação de frontend funcional intocado

Confirmado — nenhum arquivo em `src/app/` foi alterado. `git diff --stat` mostra apenas os 4 arquivos autorizados (workflow, 2 specs, playwright config).

## 44. Confirmação de CORS intocado

Confirmado — `CorsConfig.java`/`AppCorsProperties.java` não aparecem em nenhum diff. A origem é passada só como variável de ambiente do job.

## 45. Confirmação de allowed-roots intocado

Confirmado — `ProjectPathSecurityValidator.java`/`AutoQaProperties.java` não aparecem em nenhum diff. O path é passado só como variável de ambiente do job.

## 46. Confirmação de workflows backend 13.5 intactos

Confirmado — `gradle.yml` não foi tocado nesta fase.

## 47. Confirmação de workflows de promoção intactos

Confirmado — `create-main-pr.yml`/`create-auto-merge-main.yml` (backend e frontend) não foram tocados. A corrida conhecida do backend permanece dívida separada, não resolvida aqui.

## 48. Limitações

- **Validação local não é validação real do GitHub Actions** (item 72 da aprovação, respeitado): o comportamento de `actions/checkout` cross-repo, do `services:` do Actions, e da rede entre steps de um runner real do GitHub **não foram literalmente exercitados** — só reproduzidos localmente de forma funcionalmente equivalente (Docker real para o Mongo, checkout real do backend via `git`, mesmos comandos). A primeira execução real no GitHub Actions é necessária para confirmar `CI_VALIDATED`.
- Sem acesso a `gh`/API do GitHub nesta sessão — não consegui disparar essa primeira execução real eu mesmo (nem deveria, dado que push é proibido).

## 49. Riscos

- **Cold start no runner real pode ser mais lento** que os ambientes locais desta validação (checkout de dois repositórios, download de imagem Docker do Mongo, resolução de dependências Gradle sem cache pré-aquecido na primeira execução) — o timeout de readiness (120s) e o timeout do job (15 min) foram dimensionados com folga, mas a primeira execução real é o teste definitivo.
- Se o repositório backend mudar em `main` de forma incompatível com o frontend `main`/`develop` sendo testado, o E2E pode quebrar por uma causa alheia ao PR do frontend (risco já registrado na Etapa 1, item 41/42 do diagnóstico — dívida de versionamento, não resolvida aqui por decisão explícita da aprovação).

## 50. Dívidas técnicas

- `main` do backend é referência móvel, não SHA fixo (item 7).
- `/tmp/projeto-e2e` continua hardcoded no spec, não parametrizado (autorizado manter assim nesta fase).
- `run_tests`/`workflow_dispatch` continua redundante (dívida da Fase 13.5, não tocada).
- Corrida `create-main-pr.yml`/`create-auto-merge-main.yml` no backend (dívida da Fase 13, não tocada).
- Nenhum "Integration Gate" disparado pelo repositório backend existe ainda (cenário inverso, item 42 da Etapa 1 — registrado, não implementado).

## 51. Resultado da validação local

Todos os itens do checklist "Critérios de aceite — Test Quality" (seção 74 da aprovação) confirmados por execução real nesta sessão:
- `dashboard` (histórico) não passa com backend desligado — **confirmado (RED)**.
- `execution-not-found` não passa com backend desligado — **confirmado (RED)**.
- `create-execution` continua backend-dependent — **confirmado, inalterado**.
- Testes mockados permanecem determinísticos e passam sem backend (18/18) — **confirmado**.
- Nenhum mock transforma o Happy Path real em falso sucesso — **confirmado** (`create-execution.spec.ts` não foi tocado).
- Com backend real + Mongo efêmero: **24/24** — **confirmado**.
- Unit tests: **382/382** — **confirmado**.
- Build: verde — **confirmado**.
- YAML: válido — **confirmado**.

## 52. Status antes da execução real do GitHub

**`IMPLEMENTED_PENDING_CI_VALIDATION`**, conforme instruído.

## 53. Instrução do que deve ser observado na primeira execução real

Ao publicar esta mudança e disparar o workflow de verdade, observar especificamente:
1. Se o step "Checkout backend" consegue de fato acessar `JeanHeberth/criar-cenario-testes` sem erro de permissão (esperado: sim, repositório público, `contents: read` já configurado).
2. Se o `services.mongodb` sobe corretamente e fica acessível em `localhost:27017` a partir dos steps do job (comportamento documentado do GitHub Actions, mas nunca exercitado neste projeto antes).
3. O tempo real até o backend ficar pronto no runner (comparar com o orçamento de 120s) — se estourar, reportar antes de simplesmente aumentar o número às cegas.
4. Se o `kill` do PID capturado realmente encerra o processo no ambiente do runner (mesma mecânica validada localmente em macOS, mas o runner é Linux — comportamento de sinais deve ser equivalente, porém não idêntico byte a byte).
5. Se os artifacts (`playwright-report`, `backend-e2e-log`) aparecem corretamente **apenas quando há falha real** (testar propositalmente quebrando algo, se desejado, ou aguardar a primeira falha genuína).

## 54. Instrução adicional

Nenhuma — os pontos acima cobrem o essencial. Caso a primeira execução falhe por diferença de ambiente (não por bug de lógica), a recomendação é diagnosticar a diferença específica (runner Linux vs. macOS local, cache frio, etc.) antes de qualquer ajuste, exatamente como instruído.

## 55. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado — apenas `git status`, `git diff --stat`, `git remote -v` (leitura) foram usados em ambos os repositórios durante toda esta implementação.

## 56. Confirmação de que nenhuma próxima fase foi iniciada

Confirmado. **PARADO aqui.** Fase 13.7 não iniciada. Nenhuma alteração backend. Nenhuma ampliação do E2E para `start`/`apply`/`execute`. Nenhum Firefox/WebKit adicionado. Nenhum "Integration Gate" backend criado. Corrida de promoção não resolvida. Nenhum commit, nenhum push realizado.

---

## Checklist de critérios de aceite (seções 75-76 da aprovação)

**CI:** Frontend E2E criado ✓ · depende de Frontend Build ✓ · checkout backend público ✓ · ref = main ✓ · Java 21 ✓ · MongoDB efêmero ✓ · nenhum Atlas ✓ · nenhum secret novo ✓ · fixture criada ✓ · CORS externo ✓ · allowed-root externo ✓ · backend iniciado ✓ · readiness real ✓ · Chromium instalado ✓ · Playwright executado ✓ · artifacts em falha ✓ · backend encerrado ✓ · timeout ✓ · permissions read-only ✓ · Quality Gates 13.5 preservados ✓

**Segurança:** wildcard CORS não introduzido ✓ · CORS fail-closed preservado ✓ · ProjectPathPolicy preservada ✓ · `/tmp/projeto-e2e` explicitamente autorizado ✓ · sensitiveActions continuam false ✓ · OpenAI/Gemini não configurados ✓ · Jira não configurado ✓ · Mongo real não utilizado ✓ · nenhum secret hardcoded ✓

**PARADO conforme instruído.** Aguardando sua revisão e, quando publicado manualmente, a primeira execução real no GitHub Actions para confirmar `CI_VALIDATED`.
