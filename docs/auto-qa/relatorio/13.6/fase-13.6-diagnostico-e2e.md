# FASE 13.6 — FRONTEND E2E HARDENING
## Diagnóstico técnico (Etapa 1 — somente diagnóstico)

**Data:** 2026-08-10
**Natureza:** diagnóstico puro. Nenhum workflow, spec, `playwright.config.ts`, código backend ou código frontend funcional foi alterado. Todas as execuções de teste descritas abaixo foram feitas localmente, sem alterar nenhum arquivo versionado, para observar comportamento real (não inferido). `.env` do backend permanece exatamente no estado aprovado na Fase 13.1B ao final desta investigação. Nenhum comando Git de escrita foi executado.

---

## 1. Arquitetura confirmada

Reconfirmado: dois repositórios Git independentes, sem monorepo, sem submodule — `criar-cenario-testes` (backend) e `gerar-cenario-teste-app` (frontend). Sem mudança desde o diagnóstico da Fase 13.5.

## 2. Baseline unitário backend

`./gradlew test` → **1847/1847**, 0 falhas. `./gradlew build -x test` → sucesso. Inalterado desde a Fase 13.5.

## 3. Baseline unitário frontend

`npx ng test --watch=false --browsers=ChromeHeadless` → **382/382**. `npx ng build` → sucesso, chunks idênticos ao baseline. Inalterado.

## 4. Baseline E2E

**24/24** confirmado novamente — mas com uma descoberta importante e não-óbvia nesta investigação (ver item 10): **18 desses 24 passam mesmo com o backend completamente desligado**, e **4 outros também passam sem backend, mas por um motivo que compromete o que dizem estar testando** (falso-positivo — ver item 10). Só **2 dos 24** (as duas variantes de projeto do mesmo spec, `create-execution.spec.ts`) falham de forma genuína e determinística quando o backend está fora do ar.

## 5. Configuração Playwright

Lida integralmente de `playwright.config.ts` (inalterado desde a Fase 12.3.8, confirmado por comparação com versões anteriores já documentadas):

- `testDir: './e2e'`
- `fullyParallel: true`
- `forbidOnly: !!process.env['CI']`
- `retries: process.env['CI'] ? 1 : 0`
- `workers`: **não definido explicitamente** — usa o default do Playwright (baseado em CPUs do runner; não há redução automática por `CI` a menos que configurado)
- `reporter: [['list']]` — **somente console, sem relatório HTML agregado** (`playwright-report/` não é gerado hoje)
- `use.baseURL`: `process.env['E2E_BASE_URL'] ?? 'http://localhost:4200'`
- `use.screenshot: 'only-on-failure'`
- `use.trace: 'on-first-retry'` (localmente nunca é capturado, já que `retries=0` local; só existiria em CI, após a 1ª falha, na 2ª tentativa)
- `use.video`: **não configurado** (default do Playwright é `'off'`)
- `webServer.command: 'npx ng serve --port 4200'`, `reuseExistingServer: !CI` (em CI **sempre** sobe um processo novo), `timeout: 120_000`

## 6. Projetos Playwright

- `Desktop` — `devices['Desktop Chrome']` (Chromium).
- `Mobile` — Chromium com viewport 390×844 e `userAgent` do `Pixel 7`, **não** o dispositivo `Pixel 7` real (comentário no próprio arquivo já documenta que o modo de emulação completo do device é instável com o dev server do Angular). **Ambos os projetos são Chromium** — nenhum Firefox/WebKit configurado.

## 7. Browsers

Só Chromium é necessário (`npx playwright install --with-deps chromium` seria suficiente para os dois projetos configurados — confirmado pela leitura da config, não presumido).

## 8. Quantidade de specs

8 arquivos `.spec.ts` em `e2e/` (mais 1 arquivo de fixture, `e2e/fixtures/execution-fixture.ts`, sem testes, só helper).

## 9. Quantidade de testes

12 testes únicos (`test(...)`) × 2 projetos (Desktop/Mobile) = **24**, confirmado por contagem programática (`grep -c "test("`) em cada arquivo.

## 10. Classificação de cada spec (comportamento REAL, verificado por execução)

Executei a suíte completa 3 vezes: (a) com backend real rodando e configurado corretamente (CORS + allowed-roots), (b) com o **backend totalmente desligado**, isolando exatamente os 18 testes que não usam `mockExecutionDetail`/`page.route` mas também não dependem de asserção sobre resposta do backend, e (c) rodando especificamente os 3 specs restantes com backend desligado.

| Spec | Teste | Categoria real | Mock (`page.route`)? | Endpoint real exercitado | Passa sem backend? |
|---|---|---|---|---|---|
| `api-unavailable.spec.ts` | lista: error state | FRONTEND_ONLY | Sim (`route.abort`) | nenhum (interceptado antes da rede) | Sim (por desenho) |
| `api-unavailable.spec.ts` | detalhe: erro 500 | FRONTEND_ONLY | Sim (`route.fulfill 500`) | nenhum | Sim (por desenho) |
| `approval-panel.spec.ts` | abrir aprovação | FRONTEND_ONLY | Sim (`mockExecutionDetail`) | nenhum | Sim |
| `inspection-panel.spec.ts` | navega abas (clique) | FRONTEND_ONLY | Sim | nenhum | Sim |
| `inspection-panel.spec.ts` | navega abas (teclado) | FRONTEND_ONLY | Sim | nenhum | Sim |
| `modal-accessibility.spec.ts` | focus trap + Escape | FRONTEND_ONLY | Sim | nenhum | Sim |
| `modal-accessibility.spec.ts` | Tab último elemento | FRONTEND_ONLY | Sim | nenhum | Sim |
| `workflow-overview-timeline.spec.ts` | overview + timeline | FRONTEND_ONLY | Sim | nenhum | Sim |
| `dashboard.spec.ts` | título/formulário/overflow | FRONTEND_ONLY (na prática) | Não, mas não faz asserção sobre a resposta | `GET /api/auto-qa/executions` (chamada real ocorre, resultado nunca é verificado) | Sim |
| `dashboard.spec.ts` | histórico real ou vazio | **BACKEND_REQUIRED por desenho, mas confirmei que PASSA sem backend** — ver observação abaixo | Não | `GET /api/auto-qa/executions` | **Sim — achado relevante** |
| `execution-not-found.spec.ts` | 404 real sanitizado | **BACKEND_REQUIRED por desenho, mas confirmei que PASSA sem backend** — ver observação abaixo | Não | `GET /api/auto-qa/executions/{id}` | **Sim — achado relevante** |
| `create-execution.spec.ts` | Happy Path real | **BACKEND_AND_FILESYSTEM_REQUIRED** | Não | `POST /api/auto-qa/executions` | **Não — único que falha genuinamente** |

**Totais:** FRONTEND_ONLY = 9 specs únicos (18 testes) · "BACKEND_REQUIRED nominal, mas com passagem indevida sem backend" = 2 specs únicos (4 testes) · BACKEND_AND_FILESYSTEM_REQUIRED = 1 spec único (2 testes).

### Achado crítico: falso-positivo em 2 specs (4 testes) quando o backend está indisponível

Ao rodar `dashboard.spec.ts` ("histórico real ou vazio") e `execution-not-found.spec.ts` ("404 real") com o backend **completamente desligado**, ambos **passaram** — não porque o backend respondeu corretamente, mas porque o frontend trata falha de rede (conexão recusada) com a **mesma UI genérica** usada para "vazio"/"não encontrado" sanitizado. Os dois specs foram escritos para validar um comportamento específico do backend real ("lista vazia real" / "404 real do backend"), mas, na prática, **não distinguem esse cenário de uma falha de infraestrutura** (backend fora do ar). Isso significa que, se esses dois specs forem usados como sinal de "o backend está funcionando" em uma pipeline de CI, eles **não cumprem esse papel** — um backend que falhou ao subir (crash, porta errada, Mongo inacessível) produziria o mesmo verde. **Único teste que realmente comprova que o backend está de pé e funcional é `create-execution.spec.ts`** (falha de forma genuína e reprodutível sem backend, nas duas variantes Desktop/Mobile).

## 11. Matriz FRONTEND/BACKEND/MONGO/FILESYSTEM/MOCK/AÇÃO SENSÍVEL

| Teste | Frontend real | Backend real | Mongo real | Filesystem (projectPath) | Mock | Ação sensível (Apply/Execute) |
|---|---|---|---|---|---|---|
| api-unavailable (2) | Sim | Não | Não | Não | Sim | Não |
| approval-panel (1) | Sim | Não | Não | Não | Sim | Não |
| inspection-panel (2) | Sim | Não | Não | Não | Sim | Não |
| modal-accessibility (2) | Sim | Não | Não | Não | Sim | Não |
| workflow-overview-timeline (1) | Sim | Não | Não | Não | Sim | Não |
| dashboard "título/form" (1) | Sim | Opcional (não verificado) | Opcional | Não | Não | Não |
| dashboard "histórico" (1) | Sim | Nominalmente sim (mas não hard-requerido) | Nominalmente sim | Não | Não | Não |
| execution-not-found (1) | Sim | Nominalmente sim (mas não hard-requerido) | Nominalmente sim | Não | Não | Não |
| **create-execution (1)** | **Sim** | **Sim (hard-requerido)** | **Sim (hard-requerido)** | **Sim (hard-requerido)** | **Não** | **Não** (só `create`, nunca chega a `start`/`apply`/`execute`) |

## 12. Endpoints realmente usados pela suíte E2E (não pelo service Angular em geral)

Apenas três, confirmados pela leitura dos specs (não pela existência no `AutoQaExecutionService`, que expõe mais endpoints não exercitados pelo E2E):
- `POST /api/auto-qa/executions` (criação — único endpoint de escrita)
- `GET /api/auto-qa/executions` (listagem)
- `GET /api/auto-qa/executions/{id}` (detalhe)

**Nenhum outro endpoint** (`start`, `generate`, `apply`, `execute`, aprovações, `cancel`) é chamado de verdade contra o backend por nenhum spec E2E existente — todos os cenários que envolvem esses fluxos usam `mockExecutionDetail` (interceptação, nunca uma chamada real).

## 13. Mocks encontrados

`e2e/fixtures/execution-fixture.ts` — helper único, usado por 6 dos 8 specs. Intercepta exclusivamente `GET /api/auto-qa/executions/:id` com um payload fixo determinístico (`buildExecutionFixture`), documentado explicitamente no próprio arquivo como "nunca para simular um Happy Path de domínio completo (isso só roda contra o backend real)". `api-unavailable.spec.ts` usa `page.route`/`route.abort`/`route.fulfill` diretamente (sem o helper), para simular falha de rede/500.

## 14. Backend startup

Comando real usado nesta investigação (idêntico ao que um desenvolvedor rodaria): `./gradlew bootRun`, a partir da raiz do repositório backend. Nenhum profile Spring é usado (`No active profile set, falling back to default`, confirmado no log). Tempo até `Started CriarCenarioTestesApplication`: **≈ 0.9-1.0 segundo** (medido em múltiplas execuções nesta sessão) **depois** que o Gradle já compilou/cacheou as classes — não inclui o tempo de `compileJava`/resolução de dependências Gradle na primeira execução.

## 15. Frontend startup

Feito pelo próprio Playwright via `webServer.command: 'npx ng serve --port 4200'` (item 5). Não usa `--configuration` explícito, então usa o `defaultConfiguration` da seção `serve` do `angular.json`, que é **`"development"`** (confirmado lendo `angular.json` diretamente) — ou seja, o E2E sempre testa a aplicação em **modo desenvolvimento** (`enviroment.dev.ts`, sem otimizações de produção), nunca o bundle de produção gerado por `ng build`. `timeout: 120_000` (2 min) para o `ng serve` ficar pronto.

## 16. Backend health check

**Não existe endpoint de health/readiness no backend.** Confirmado por ausência de `spring-boot-starter-actuator` em `build.gradle` (`grep` zero ocorrências) — não há `/actuator/health` nem equivalente. Qualquer estratégia de "esperar o backend ficar pronto" em CI precisará usar um endpoint de negócio real como proxy de prontidão (ex.: `GET /api/auto-qa/executions?page=0&size=1`), já que isso também exercita a conectividade real com o MongoDB (ver item 18) — um simples "porta aberta" (TCP) não seria suficiente, pois o Tomcat sobe e aceita conexões antes mesmo de qualquer verificação de dependência externa acontecer.

## 17. Portas

| Componente | Porta | Origem |
|---|---|---|
| Frontend (`ng serve`) | 4200 | Default do Angular CLI; usado explicitamente em `playwright.config.ts` |
| Backend (`bootRun`) | 8089 | `server.port` em `application.yml`, confirmado nesta sessão |
| MongoDB | Sem porta local — cluster Atlas remoto via SRV (`mongodb+srv://cluster.y2vw5.mongodb.net`, sem porta fixa no connection string) |

## 18. Necessidade de MongoDB — CONFIRMADA E MAIS SEVERA DO QUE O DIAGNÓSTICO ANTERIOR SUGERIA

O diagnóstico da Fase 13.5 já havia confirmado que os **testes unitários** não precisam de MongoDB (sem `@SpringBootTest`). Esta investigação foi além e testou **o app real** (`bootRun`) sem `MONGO_URI_NUVEM`: **o backend falha ao subir**, com `BeanInstantiationException` → `IllegalArgumentException: The connection string is invalid` (a property não tem valor default no `application.yml`: `uri: ${MONGO_URI_NUVEM}`, sem `:`). Ou seja, **MongoDB real (ou uma connection string válida apontando para algum Mongo) é uma dependência de startup do processo inteiro**, não só das rotas do Auto QA — o app não sobe de jeito nenhum sem isso. Confirmado por execução real, não suposição.

## 19. Estratégia MongoDB recomendada (análise, não decisão)

Dado o achado do item 18, qualquer E2E-com-backend-real em CI precisa de um Mongo válido só para o processo iniciar. Duas alternativas reais:
- **Reusar o cluster Atlas real** (`MONGO_URI_NUVEM` como secret de CI) — funciona, mas escreve dados de teste (a execução criada pelo Happy Path) no mesmo cluster usado hoje para desenvolvimento/produção, e exige gerenciar um secret real de credencial de banco no CI.
- **MongoDB efêmero via service container do GitHub Actions** (`services: mongo: image: mongo`) — isolado, descartado a cada execução, **não precisa de secret** (connection string local, sem credencial). Alinhado com a preferência já registrada no diagnóstico da Fase 13.5 e reafirmada na aprovação desta fase ("não depender de banco externo compartilhado se pudermos ter ambiente efêmero e determinístico"). **Recomendação preliminar**, não decisão.

## 20. Necessidade de IA

**Não, confirmado por execução real, não suposição.** Testei o backend real (`bootRun`) sem `OPENAI_API_KEY` nem `GEMINI_API_KEY` — **o app sobe normalmente** ("Started CriarCenarioTestesApplication" sem nenhum erro). Isso é coerente com o achado de que `create-execution.spec.ts` (o único spec que toca o backend de forma hard-requerida) só chama `POST /api/auto-qa/executions` (criação), **nunca chama `start()`** — que é o único ponto do sistema que efetivamente invoca agentes de IA. Nenhum outro spec chega perto disso (todos os outros fluxos que envolveriam IA usam `mockExecutionDetail`).

## 21. Providers envolvidos

Nenhum, no escopo atual do E2E (ver item 20). `OpenAiProvider`/`GeminiProvider` existem no backend mas nunca são exercitados pela suíte E2E como está hoje.

## 22. Necessidade de API keys

Nenhuma (`OPENAI_API_KEY`, `GEMINI_API_KEY` — não necessárias, confirmado). `JIRA_BASE_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN` também não são tocadas pelo E2E (nenhum spec acessa `/jira/**`) e têm default vazio (`${VAR:}`) no `application.yml`, então nem impedem o startup.

## 23. Necessidade de filesystem

Sim, exclusivamente para `create-execution.spec.ts`: o campo "Caminho do projeto" do formulário é preenchido com `/tmp/projeto-e2e` (valor hardcoded no spec, `e2e/create-execution.spec.ts:15`), que precisa (a) existir como diretório real e legível no sistema de arquivos onde o **backend** roda, e (b) estar dentro de uma raiz autorizada em `auto-qa.allowed-roots` (Fase 13.1A) — confirmado nesta investigação e detalhado no item 24.

## 24. Análise de /tmp/projeto-e2e

Confirmado no spec atual (`e2e/create-execution.spec.ts:15`, valor literal `'/tmp/projeto-e2e'`, sem nenhuma variável de ambiente/configuração). Investigado:
- **Por que está hardcoded**: não há explicação documentada no código; é um valor de conveniência fixo, provavelmente criado manualmente uma vez pelo desenvolvedor durante validação manual em fases anteriores.
- **Usado somente em E2E?** Sim — nenhum outro lugar do frontend ou backend referencia esse path especificamente.
- **Precisa existir antes do teste?** Sim, confirmado — sem o diretório, o backend rejeita com `IllegalArgumentException: projectPath does not exist` antes mesmo de chegar à checagem de allowedRoots.
- **Backend escreve nele?** Não, no escopo atual — `create()` só persiste metadados no Mongo; nenhuma escrita de arquivo ocorre nesse teste (isso só aconteceria em `Apply`, nunca exercitado pelo E2E).
- **Quais arquivos podem ser criados?** Nenhum pelo teste em si. O diretório pode ficar vazio (Discovery classifica como framework `UNKNOWN`, o que é aceitável — não impede a criação da execução).
- **Precisa ser limpo?** Não estritamente (nenhuma escrita ocorre nele), mas o **registro no MongoDB** da execução criada (`AutoQaExecutionDocument`) persiste indefinidamente — ver item 26.
- **Execuções paralelas podem conflitar?** O diretório em si não é um recurso exclusivo (leitura apenas), então múltiplas execuções paralelas do mesmo teste não conflitariam nele — mas cada execução do teste cria um novo documento no Mongo com um novo `executionId` (UUID), então não há conflito de dados também.

## 25. Estratégia de fixture (análise, não implementação)

Para uma futura implementação, o diretório precisaria ser criado como um step do job de CI (`mkdir -p /tmp/projeto-e2e` ou equivalente) antes de subir o backend/rodar o Playwright — trivialmente reproduzível em qualquer runner Linux do GitHub Actions (mesma lógica testada aqui em macOS local). Nenhuma mudança no spec é necessária para isso funcionar em CI — o valor hardcoded `/tmp/projeto-e2e` já é um caminho válido em runners Linux padrão do GitHub Actions (`/tmp` existe universalmente).

## 26. Estratégia de cleanup (análise)

O único dado persistente gerado pelo E2E é o documento da execução no MongoDB (via `create()`). Se o Mongo usado em CI for o **efêmero/container** (item 19), cleanup é automático (o container é destruído ao final do job) — reforça essa opção como mais simples do que gerenciar cleanup manual em um cluster compartilhado real.

## 27. APP_CORS_ALLOWED_ORIGINS necessária

**Sim, reconfirmada diretamente no código atual** (`CorsConfig.java`/`AppCorsProperties.java`, ambos lidos novamente nesta investigação, sem nenhuma alteração desde a Fase 13.1B). A origem que o E2E usaria em CI é `http://localhost:4200` (mesma porta local sempre, já que o Playwright sobe seu próprio `ng serve` no runner — não há origem "de CI" diferente da origem local, ao contrário do que a Fase 13.1B precisou resolver para desenvolvimento humano vs. produção). Isso significa que, ao contrário da preocupação original da Fase 13.1B (múltiplas origens conhecidas), o E2E em CI precisaria de **uma única origem, sempre a mesma**: `http://localhost:4200`.

## 28. AUTO_QA_ALLOWED_ROOTS necessária

**Sim, reconfirmada diretamente no código atual** (`ProjectPathSecurityValidator.java`, `AutoQaProperties.java`, `application.yml` — todos relidos, `auto-qa.allowed-roots: []` continua um valor literal, não um placeholder `${VAR}`). Reconfirmei também, nesta sessão, o achado da Fase 13.5: **`.env`/spring-dotenv não sobrepõe esse valor de forma confiável** — só uma variável de ambiente real do processo funciona (`AUTO_QA_ALLOWED_ROOTS=/tmp/projeto-e2e`, testado novamente com sucesso). Em CI (GitHub Actions `env:`), isso não seria um problema — variáveis de ambiente de job são reais, não dependem de `.env`.

**Comportamento verificado (não presumido) desta subfase:**
- Ausente/vazia → todo `projectPath` rejeitado (fail-closed, comportamento já coberto por 18 testes dedicados na Fase 13.1A).
- Formato aceito: string única ou lista via `[0]`, `[1]`... (mesmo binding de `AutoQaProperties.allowedRoots`, `List<String>`); confirmado que uma variável de ambiente única com o path funciona.
- Nenhuma normalização adicional precisa ser feita pelo job de CI além de fornecer o path absoluto real (`/tmp/projeto-e2e`) — a normalização/canonicalização já é feita inteiramente por `ProjectPathSecurityValidator`.

## 29. Demais variáveis

Ver tabela completa no item 50.

## 30. Secrets necessários

Para o **escopo mínimo** que faria `create-execution.spec.ts` funcionar em CI: **apenas os necessários para o backend subir e responder** — isto é, uma connection string de MongoDB válida. Se a estratégia escolhida for o Mongo efêmero (item 19), **nenhum secret é necessário** (a connection string de um container local não é sensível). Se for o cluster real, `MONGO_URI_NUVEM` precisaria ser um secret do repositório backend... mas como o job rodaria no repositório **frontend** (é lá que o Playwright roda), precisaria ser um secret **também configurado no repositório frontend** — uma duplicação de credencial entre os dois repositórios, mais um motivo a favor do Mongo efêmero. `APP_CORS_ALLOWED_ORIGINS`/`AUTO_QA_ALLOWED_ROOTS` **não são secrets** (não são credenciais, são apenas configuração — origem e path, ambos com valores fixos e não sensíveis).

## 31. Flags sensíveis

`auto-qa.allowFileApplication`, `auto-qa.allowCommandExecution`, `auto-qa.sensitiveActionsEnabled` — **nenhuma é necessária**, confirmado: `create-execution.spec.ts` nunca chama `apply()`/`execute()` (item 12), então essas flags podem (e devem) permanecer nos seus defaults seguros (`false`), exatamente como já estão em `application.yml`. Nenhuma ação sensível precisa ser habilitada para o E2E atual funcionar em CI.

## 32. Paralelismo atual

`fullyParallel: true`, `workers` não definido (default do Playwright). Como o único teste que grava dado real (`create-execution`) usa um `scenario` com timestamp (`Cenário E2E ${Date.now()}`) tornando cada execução única no Mongo, e o `executionId` é sempre um novo UUID gerado pelo backend — não há colisão de dados entre execuções paralelas do mesmo spec, mesmo rodando Desktop+Mobile simultaneamente (confirmado: já rodam em paralelo hoje, localmente, sem conflito).

## 33. Riscos de concorrência

Nenhum identificado no escopo atual do E2E — cada teste que cria dado real gera um recurso novo e isolado (novo `executionId`). Se no futuro mais specs passarem a criar execuções reais, o mesmo padrão (dado sempre novo, nunca reaproveitado entre testes) precisaria ser mantido para continuar seguro em paralelo.

## 34. Retries

`process.env['CI'] ? 1 : 0` — já configurado, sem necessidade de alteração. Isso significa que, em CI, um teste que falhar será tentado novamente uma vez antes de ser considerado falha definitiva — relevante para tolerância a flakiness genuína (ex.: timing), mas **não deve ser usado como bengala** para mascarar os 2 specs identificados no item 10 como falso-positivo (retry não muda esse comportamento, já que eles "passam" de qualquer forma).

## 35. Timeouts

`webServer.timeout: 120_000` (2 min, para o `ng serve` ficar pronto) já configurado. Não há timeout configurado no nível do teste individual além dos `timeout: 15_000`/`10_000` explícitos usados em alguns `expect(...)` dentro dos specs (não no `playwright.config.ts` global). Nenhum timeout para "backend ficar pronto" existe hoje, porque hoje o backend nunca é subido pelo Playwright ou por CI — isso precisaria ser desenhado na implementação futura.

## 36. Artifacts atuais

Nenhum artifact é publicado hoje em nenhum workflow (E2E não roda em CI). Localmente, o Playwright já gera `test-results/` (screenshots de falha, `error-context.md`) por causa de `screenshot: 'only-on-failure'` — mas nada disso é enviado a lugar nenhum hoje.

## 37. Artifacts recomendados (análise, não implementação)

Em caso de falha: `test-results/` (screenshots + trace, já gerado pela config atual), e um relatório Playwright navegável exigiria adicionar o reporter `'html'` à lista de `reporter` (hoje só `'list'`) — mudança pequena em `playwright.config.ts`, não feita nesta etapa de diagnóstico. Em caso de sucesso: nenhum artifact necessário (evitar poluir o histórico de runs).

## 38. Logs backend recomendados

Se o backend for iniciado em background durante o job (`nohup ./gradlew bootRun > backend-e2e.log 2>&1 &`, mesma técnica usada manualmente nesta investigação), recomenda-se publicar esse log como artifact **somente em caso de falha** — confirmei nesta sessão que os logs do backend, mesmo no nível INFO default, **não imprimem a MongoCredential em texto claro** (o driver já mascara com `<hidden>`, confirmado visualmente nos logs reais capturados durante esta investigação) — mas ainda assim a recomendação de "só em falha" é a postura mais conservadora.

## 39. Estratégia de readiness

Dado que não existe `/actuator/health` (item 16), a estratégia mais confiável é fazer polling em um endpoint de negócio real (`GET /api/auto-qa/executions?page=0&size=1`, com `Origin` configurado) até receber `200`, com timeout controlado — isso teria a vantagem adicional de já confirmar que o Mongo está acessível (ver item 18), não só que a porta HTTP está aberta.

## 40. Alternativas de orquestração (comparadas, não escolhidas)

- **A — Checkout do backend dentro do job E2E do frontend**: tecnicamente comprovada nesta e na investigação da Fase 13.5 (rodei o fluxo completo localmente com sucesso). Exige: os dois repositórios pertencerem ao mesmo dono/organização para o `GITHUB_TOKEN` padrão poder fazer `actions/checkout` de um repositório diferente **sem token adicional apenas se ambos forem públicos, ou se for o mesmo dono E o token tiver escopo suficiente** — não confirmei a visibilidade real dos repositórios (público/privado) nesta sessão (não tenho acesso a `gh`/API do GitHub); isso precisa ser confirmado antes de decidir se um PAT adicional seria necessário (ver item 41/44).
- **B — Backend disponibilizado como artifact reutilizável**: o backend precisaria ser buildado (`bootWar`/`jar`) em um workflow separado e publicado como artifact para o job do frontend baixar. Adiciona uma etapa a mais (build do backend fora do próprio job de teste) e um novo ponto de sincronização (quando o artifact foi gerado vs. quando o frontend testa contra ele) — mais complexo que A sem benefício claro, dado que o backend já compila em segundos.
- **C — Workflow reutilizável entre repositórios**: GitHub Actions permite `uses: owner/repo/.github/workflows/arquivo.yml@ref` como workflow reutilizável cross-repo (mecanismo diferente do artifact) — tecnicamente possível, mas exige que o workflow reutilizável do backend seja desenhado para produzir "backend rodando e pronto", o que é incomum para reusable workflows (normalmente eles fazem uma tarefa e terminam, não deixam um processo em background acessível ao chamador). Mais complexo e menos testado que A.
- **D — Imagem/container pré-construída**: exigiria manter um `Dockerfile`/pipeline de publicação de imagem do backend (não existe hoje, nenhum registry configurado em nenhum dos dois repositórios) — introduziria infraestrutura nova (registry de containers) só para isso, desproporcional ao problema.
- **E — Ambiente de integração externo já existente**: **não encontrado**, reconfirmado (nenhum staging/ambiente compartilhado documentado em nenhum dos dois repositórios).
- **F — Outra possibilidade**: não identificada.

**Nenhuma alternativa foi escolhida nesta etapa.** A. continua sendo a mais simples tecnicamente (já comprovada empiricamente, sem infraestrutura nova como registry ou artifact-sync), mas depende de confirmar a visibilidade dos repositórios (item 44) antes de ser aprovada.

## 41. Estratégia de versionamento backend/frontend (análise)

Não existe hoje nenhum mecanismo de tags/releases semânticas em nenhum dos dois repositórios (confirmado — nenhuma menção a `git tag`/GitHub Releases em nenhum workflow ou documentação lida ao longo de todas as fases). As opções reais:
- **`develop`** do backend: branch "atual" mais próxima do dia a dia — mas móvel; um PR de frontend testado hoje contra `develop` pode se comportar diferente amanhã se `develop` do backend mudar sem relação com aquele PR (teste não-reprodutível no sentido estrito).
- **`main`** do backend: mais estável (só recebe promoções já validadas), mas depende da automação de promoção `develop→main` (que tem a corrida conhecida, documentada e fora de escopo) ter rodado corretamente.
- **SHA fixo/tag**: mais determinístico, mas exigiria um processo de versionamento que não existe hoje — criar isso é uma mudança de processo maior, não uma decisão de CI isolada.
- **Input manual**: adiciona fricção operacional sem resolver o problema de reprodutibilidade automática.

**Recomendação preliminar (não decisão)**: começar apontando para `main` do backend (mais estável, já passou pela promoção), aceitando a limitação de que ainda não é um SHA imutável — e registrar como possível evolução futura fixar por SHA/tag se a reprodutibilidade exata se tornar um problema real observado (não resolver um problema hipotético agora).

## 42. Cenário inverso (registrado, não implementado)

Sim — uma mudança no backend (`develop`/`main`) pode quebrar o E2E do frontend sem que nenhum PR do frontend tenha sido aberto. Hoje, **nenhum mecanismo detectaria isso automaticamente** (o E2E só rodaria disparado por eventos do repositório frontend). Registro como recomendação arquitetural para avaliação futura: um "Integration Gate" disparado pelo repositório **backend** (rodando o mesmo E2E do frontend contra o backend recém-alterado) seria o complemento natural — mas isso é uma decisão de escopo maior (envolve o repositório backend rodando testes de outro repositório), não proposta para implementação nesta fase.

## 43. Impacto para PRs de fork

Não avaliado como bloqueante nesta etapa porque não identifiquei uso de fork neste projeto (repositórios pessoais, colaborador único observado em todo o histórico de commits). Registro a limitação genérica: se algum dia PRs de fork forem aceitos, e a estratégia A (item 40) exigir token adicional para checkout cross-repo, PRs de fork não teriam acesso a esse secret por padrão (comportamento de segurança padrão do GitHub Actions) — o job de E2E falharia ou precisaria de tratamento condicional. Não resolvido nesta etapa, apenas registrado.

## 44. Permissions necessárias (análise)

Se a Alternativa A for aprovada futuramente, o job de E2E precisaria, no mínimo, de permissão de leitura no repositório backend via `actions/checkout` com `repository: <owner>/criar-cenario-testes`. **Não confirmei nesta sessão se os dois repositórios são públicos ou privados** (sem acesso a `gh`/API do GitHub) — se ambos forem públicos, o `GITHUB_TOKEN` padrão do job (com `contents: read`, já o padrão que teríamos) provavelmente é suficiente para checkout de leitura cross-repo dentro da mesma conta; se o backend for privado, seria necessário um PAT (Personal Access Token) ou GitHub App token com acesso de leitura a esse repositório específico, armazenado como secret no repositório frontend — **isso precisaria ser confirmado antes de qualquer implementação**, é um ponto de parada explícito se descoberto tardiamente.

## 45. Posição proposta do Frontend E2E (análise)

Comparei as duas topologias pedidas:
- **Sequencial** (`Unit Tests → Build → E2E`): mais lento no total (E2E só começa depois do build terminar), mas fail-fast real — se os testes unitários ou o build falharem, o E2E (a etapa mais cara: ~20s hoje, tende a crescer, mais o tempo de subir backend/Mongo) nunca chega a rodar, economizando tempo de runner no caminho de falha mais comum.
- **Paralela** (`Unit Tests` e `E2E` como filhos independentes de um ponto comum): mais rápido no caminho feliz (roda tudo ao mesmo tempo), mas desperdiça tempo de runner em E2E quando os testes unitários (muito mais rápidos, ~0.4s) já teriam detectado o problema primeiro; além disso, o Build hoje já é pré-requisito conceitual do E2E (o `webServer` do Playwright builda/serve a aplicação de qualquer forma via `ng serve`, então não haveria economia real de "pular o build", já que o dev server já compila).

**Recomendação preliminar**: manter sequencial, consistente com a estrutura já aprovada e implementada na Fase 13.5 (`Frontend Unit Tests → Frontend Build`), estendendo para `→ Frontend E2E` como terceiro estágio dependente. Isso preserva fail-fast e reaproveita a disciplina já estabelecida.

## 46. Nome proposto do Quality Gate

`Frontend E2E` — mesmo nome já usado como referência em toda a documentação das Fases 13.5/13.6, consistente com o padrão `Frontend Unit Tests`/`Frontend Build` já em produção.

## 47. Arquivos que seriam alterados (se/quando aprovado)

`gerar-cenario-teste-app/.github/workflows/frontend-pipeline.yml` (adicionar o job `Frontend E2E`) seria o único arquivo com alteração forte candidata. Possivelmente `playwright.config.ts` (adicionar reporter `'html'` para artifact navegável — item 37) — mudança pequena e opcional, a avaliar separadamente. **Nenhum arquivo backend precisaria ser alterado** (confirmado: toda a configuração necessária — CORS, allowed-roots — já é 100% externalizada via variável de ambiente desde as Fases 13.1B/13.1A; nenhuma mudança de código Java é necessária, só configuração do job).

## 48. Arquivos que seriam criados (se/quando aprovado)

Nenhum novo arquivo é estritamente necessário — tudo cabe dentro do workflow já existente do frontend, mais possivelmente um step inline de criação do diretório-fixture (não precisa de um script separado).

## 49. Alterações que NÃO serão necessárias

Nenhuma alteração em: `CorsConfig.java`, `AppCorsProperties.java`, `ProjectPathSecurityValidator.java`, `AutoQaProperties.java`, `application.yml`, qualquer spec E2E existente, `src/app/` (frontend funcional), workflows de promoção de branch (`create-main-pr.yml`, `create-auto-merge-main.yml` dos dois repositórios), `Backend Tests`/`Backend Build` (Fase 13.5, intactos).

## 50. Tabela completa de variáveis

| Variável | Obrigatória para E2E-CI? | Sensível? | Origem atual | Uso | Necessária no CI futuro? |
|---|---|---|---|---|---|
| `APP_CORS_ALLOWED_ORIGINS` | Sim | Não | `.env` local / env var (Fase 13.1B) | `CorsConfig` | Sim, `http://localhost:4200` fixo |
| `AUTO_QA_ALLOWED_ROOTS` | Sim (só p/ `create-execution`) | Não | env var real do processo (Fase 13.1A) | `ProjectPathSecurityValidator` | Sim, apontando para o diretório-fixture do runner |
| `MONGO_URI_NUVEM` | Sim, sempre (app não sobe sem isso) | **Sim** | env var / `.env` | Spring Data MongoDB | Sim — recomendado usar Mongo efêmero de CI (sem secret) em vez do cluster real |
| `OPENAI_API_KEY` | **Não** (confirmado por execução real) | Sim | env var / `.env` | `AiProvider` (OpenAI) | Não |
| `GEMINI_API_KEY` | **Não** (confirmado por execução real) | Sim | env var / `.env` | `AiProvider` (Gemini) | Não |
| `AI_ACTIVE_PROVIDER` | Não (tem default `openai`) | Não | `application.yml` | seleção de provider | Não |
| `JIRA_BASE_URL`/`JIRA_EMAIL`/`JIRA_API_TOKEN` | Não (default vazio, não usadas pelo E2E) | Sim se preenchidas | env var / `.env` | `JiraClient` | Não |

## 51-53. (endpoints, mocks, matriz)

Ver itens 12, 13 e 11, respectivamente — consolidados ali para evitar repetição.

## 54. Proposta de implementação (preliminar, sujeita a aprovação separada)

Estrutura conceitual validada por esta investigação (todos os passos abaixo foram executados manualmente com sucesso nesta sessão, um a um):

```
Frontend Unit Tests
        ↓
Frontend Build
        ↓
Frontend E2E
           ├── checkout backend (Alternativa A — pendente confirmar visibilidade do repo)
           ├── setup Java 21
           ├── start MongoDB efêmero (service container)
           ├── mkdir -p /tmp/projeto-e2e
           ├── start backend em background (env: APP_CORS_ALLOWED_ORIGINS, AUTO_QA_ALLOWED_ROOTS, MONGO_URI_NUVEM apontando pro Mongo efêmero)
           ├── poll GET /api/auto-qa/executions até 200 (readiness real, sem actuator)
           ├── npx playwright install --with-deps chromium
           ├── npx playwright test (Playwright sobe o próprio ng serve)
           └── upload test-results/ + backend-e2e.log somente em failure()
```

**Esta é uma proposta para avaliação, não uma implementação — nenhum destes passos foi adicionado a nenhum workflow.**

## 55. Riscos

- **Achado do item 10 (falso-positivo em 2 specs)** é o risco mais importante desta investigação: se a decisão futura for "24/24 verde = backend funcionando", isso é **falso** — só 2 dos 24 realmente comprovam isso. Recomendo fortemente que a Fase 13.6 (Etapa 2, se aprovada) trate isso explicitamente — seja fortalecendo a asserção desses 2 specs (fora do escopo desta etapa: alterar spec exige aprovação separada, item 58 da aprovação), seja documentando o gate como "valida `create-execution` como sinal primário de saúde do backend".
- Visibilidade dos repositórios (público/privado) não confirmada — pode bloquear a Alternativa A sem um PAT adicional.
- `create-execution.spec.ts` grava um documento real no Mongo a cada execução — sem estratégia de retenção/expurgo (já era uma dívida conhecida da Fase 13 geral, H8), isso se torna mais relevante se rodar a cada PR.

## 56. Limitações

Sem acesso a `gh`/API do GitHub nesta sessão (mesma limitação já registrada nas Fases 13.5/13.1B) — não foi possível confirmar visibilidade dos repositórios nem simular o comportamento exato de `actions/checkout` cross-repo dentro do ambiente real do GitHub Actions; a Alternativa A foi validada apenas localmente (equivalente funcional, não uma prova no runner real).

## 57. Dívidas técnicas

- Falso-positivo dos 2 specs (item 10/55) — dívida de qualidade de teste, não de infraestrutura.
- Ausência de `/actuator/health` — dívida de observabilidade (H10-adjacente, já registrada na Fase 13 geral).
- `/tmp/projeto-e2e` hardcoded no spec, sem setup automatizado — funciona, mas é frágil (depende de alguém/algo criar o diretório).
- Falta de estratégia de retenção Mongo para dados gerados por E2E repetido (se optar pelo cluster real em vez do efêmero).

## 58. Confirmação de que gates 13.5 não foram alterados

Confirmado — `Backend Tests`, `Backend Build`, `Frontend Unit Tests`, `Frontend Build` permanecem exatamente como implementados e aprovados na Fase 13.5.

## 59. Confirmação de backend funcional intocado

Confirmado — todas as execuções desta investigação (`bootRun` com/sem variáveis) foram feitas sem alterar nenhum arquivo `.java`. `git status` do backend permanece limpo.

## 60. Confirmação de frontend funcional intocado

Confirmado — nenhum arquivo em `src/app/` foi alterado.

## 61. Confirmação de CORS intocado

Confirmado — `CorsConfig.java`/`AppCorsProperties.java` relidos, não alterados.

## 62. Confirmação de allowed-roots intocado

Confirmado — `ProjectPathSecurityValidator.java`/`AutoQaProperties.java` relidos, não alterados.

## 63. Confirmação de workflows de promoção intactos

Confirmado — `create-main-pr.yml`/`create-auto-merge-main.yml` (backend e frontend) não tocados.

## 64. Confirmação de que nenhum arquivo foi alterado

Confirmado por `git status --short` em ambos os repositórios ao final desta investigação (backend limpo; frontend só com pastas de relatório/documentação, nenhum código).

## 65. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado — apenas `git status`, `git diff --stat` (leitura) foram usados.

## 66. Confirmação de que a implementação ainda não começou

Confirmado. **PARADO aqui.** Nenhum job `Frontend E2E` foi criado. Nenhum workflow foi alterado. Nenhum MongoDB foi adicionado a nenhum pipeline. Nenhum checkout cross-repository foi configurado. Nenhum browser adicional foi instalado em CI. Nenhum spec ou `playwright.config.ts` foi alterado. Aguardando aprovação explícita para a Fase 13.6 — Etapa 2.
