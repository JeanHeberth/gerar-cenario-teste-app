# FASE 13.5 — CI/CD E QUALITY GATES
## Diagnóstico técnico (etapa 1 — somente diagnóstico)

**Data:** 2026-08-10
**Natureza:** diagnóstico puro. Nenhum workflow foi criado ou alterado. Nenhum arquivo funcional (Java/TypeScript) foi tocado. `.env`/`.env.example` do backend foram usados apenas para validação empírica local e o `.env` foi restaurado ao estado exatamente aprovado na Fase 13.1B ao final desta investigação. Nenhum comando Git de escrita foi executado. Nenhum deploy foi iniciado.

---

## 1. Arquitetura real

Confirmado por inspeção direta do filesystem: **dois repositórios Git totalmente independentes**, sem monorepo, sem submodule, sem pipeline externo compartilhado:

- Backend: `/Users/jeanheberth/Development/api/criar-cenario-testes` (branch atual: `feature/fase13.5`, criada pelo responsável do projeto).
- Frontend: `/Users/jeanheberth/Development/front/gerar-cenario-teste-app`.

Cada um tem seu próprio `.github/workflows/`. Não há workflow que faça checkout cruzado dos dois repositórios hoje.

## 2. Workflows atuais

**Backend** (3 workflows):
- `.github/workflows/gradle.yml` — trigger `pull_request` → `main`. Único job: checkout, JDK 21 (Corretto), cache Gradle, `./gradlew build -x test` (**testes explicitamente excluídos**), step "Run tests" **comentado**. Um step órfão "Wait for PostgreSQL" (`sleep 10`) — o projeto usa MongoDB, não Postgres.
- `.github/workflows/create-main-pr.yml` — trigger `pull_request` → `develop`, `closed` (só roda se `merged==true`). Cria (via `gh pr create`) um PR `develop` → `main`, se ainda não existir e houver commits à frente.
- `.github/workflows/create-auto-merge-main.yml` — **mesmo trigger exato** do anterior (`pull_request` → `develop`, `closed`, `merged==true`). Faz `git merge origin/develop --no-ff` + `git push origin main --tags` **diretamente**, sem depender do PR criado pelo outro workflow.

**Frontend** (2 workflows):
- `.github/workflows/frontend-pipeline.yml` — trigger `push`/`pull_request` → `main`/`master`/`develop`, mais `workflow_dispatch` e `workflow_call` (reutilizável). Dois jobs: `build` (sempre roda: checkout, Node 24, `npm ci`, `npm run build`, upload do `dist` como artifact) e `test` (**só roda se o evento for `workflow_call` OU `workflow_dispatch` com o checkbox `run_tests` marcado manualmente** — evento comum de PR real: `npm run test` **nunca é executado**).
- `.github/workflows/create-auto-merge-main.yml` — trigger `pull_request` → `develop`, `closed`, `merged==true`. Três jobs **sequenciados via `needs:`**: 1) chama `frontend-pipeline.yml` como reusable (`uses: ./.github/workflows/frontend-pipeline.yml`, o que aciona o job `test` porque o evento é `workflow_call`); 2) cria PR `develop`→`main` (só se o job 1 tiver sucesso); 3) merge direto (só se 1 e 2 tiverem sucesso).

## 3. Problemas encontrados (achados objetivos, não hipóteses)

- **Backend nunca executa nenhum teste automatizado em nenhum workflow** — nem no PR gate (`gradle.yml`, `-x test`), nem em nenhum outro lugar. Os 1847 testes existentes nunca rodam no CI hoje.
- **Frontend não executa testes unitários no PR gate padrão** — só no fluxo pós-merge (`workflow_call` a partir de `create-auto-merge-main.yml`) ou manualmente. Ou seja, hoje é possível abrir e mergear um PR para `develop` sem que `npm run test` rode automaticamente naquele PR — só depois, ao promover `develop`→`main`.
- **Corrida real entre `create-main-pr.yml` e `create-auto-merge-main.yml` (backend)** — os dois disparam no mesmo evento, em paralelo, sem `needs:` entre si. `create-auto-merge-main.yml` já faz push direto para `main` independentemente do PR que o outro workflow tenta criar — o PR criado (se criado a tempo) fica sem propósito real, já que o merge já aconteceu por fora dele. Esse padrão já havia sido identificado no diagnóstico geral da Fase 13 (achado CI-37-02); confirmado aqui novamente com leitura completa dos dois arquivos.
- **Nenhum E2E em nenhum workflow, em nenhum dos dois repositórios.**
- **Versões de actions inconsistentes no backend**: `checkout@v2`/`setup-java@v3`/`cache@v3` em `gradle.yml`, mas `checkout@v5` nos outros dois workflows do mesmo repositório.
- **Nenhum `permissions:` explícito em `gradle.yml`** (fica no padrão do repositório, que pode ser mais amplo que o necessário para um job puramente de validação).
- **Nenhum `concurrency:` em nenhum workflow do backend** — o frontend já tem (`cancel-in-progress: true` por ref), backend não.
- **Nenhum `timeout-minutes` em nenhum workflow, em nenhum dos dois repositórios** — default do GitHub Actions é 360 minutos por job, excessivo para jobs que localmente levam segundos.
- **`package.json` do frontend não declara `engines`** — `frontend-pipeline.yml` fixa Node 24 no CI, mas não há nada no repositório garantindo que um Node diferente localmente (a máquina de desenvolvimento atual roda Node v26.3.0) seja sinalizado como incompatível — já registrado como achado F20-1 no diagnóstico geral da Fase 13, reconfirmado aqui sob a ótica de CI.
- **Descoberta nova e não trivial durante esta investigação** (ver item 9): a suíte E2E "Happy Path real" depende de duas configurações operacionais do backend que precisam estar presentes simultaneamente para funcionar — CORS (já resolvido na 13.1B) e `auto-qa.allowed-roots` (introduzido na 13.1A) — e o mecanismo de configuração local (`.env`/spring-dotenv) **não funciona de forma confiável** para a segunda, só para a primeira. Detalhado no item 9.

## 4. Baseline backend

Executado agora, nesta investigação, com o código real do branch `feature/fase13.5`:

- **Testes**: `./gradlew test` → **1847/1847**, 0 falhas, 0 erros, 0 skipped.
- **Build**: `./gradlew build` → **BUILD SUCCESSFUL**.
- **Java**: toolchain do Gradle fixa `JavaLanguageVersion.of(21)` (`build.gradle`) — usado independentemente da JVM local (Homebrew OpenJDK 26.0.1 nesta máquina); Gradle baixa/usa JDK 21 automaticamente. CI já usa Corretto 21 — coerente.
- **Gradle**: wrapper 8.10.2 (`gradle-wrapper.properties`).
- **Tempo aproximado**: `./gradlew test` a frio (após `clean`) ≈ 15s; incremental (sem mudança) < 1s. `./gradlew build` completo a frio, poucos segundos adicionais além dos testes (build inclui `bootWar`).
- **Nenhum teste depende de MongoDB real** — confirmado por ausência de `@SpringBootTest` em todo o projeto (`grep` zero ocorrências); a suíte inteira é testes unitários/slice (`@WebMvcTest`, mocks). Isso significa que **o job de testes do backend no CI não precisa de `MONGO_URI_NUVEM` nem de nenhuma credencial de IA** — só compilação + JDK.

## 5. Baseline frontend

Executado agora, nesta investigação:

- **Testes unitários**: `npx ng test --watch=false --browsers=ChromeHeadless` → **382/382 SUCCESS**.
- **Build de produção**: `npx ng build` → sucesso, sem warnings de budget. Chunk principal 1.77 MB raw / 440.63 kB transfer; `auto-qa-bmad-routes` (lazy) 105.64 kB raw / 19.09 kB transfer — idêntico ao baseline já registrado na Fase 13.
- **Node local**: v26.3.0. **npm local**: 12.0.1. CI usa Node 24 (`setup-node@v4`) — versão diferente da máquina de desenvolvimento atual, mas dentro da faixa suportada pelo Angular 22 até onde este diagnóstico pôde confirmar (não investigado a fundo — está fora do escopo mexer nisso agora).
- **Angular**: `^22.1.0` (`package.json`).
- **E2E**: ver item 9 — **24/24 passed**, mas somente após configuração operacional adicional do backend (não é um resultado "de fábrica").
- **Tempo aproximado**: unit tests ≈ 0.4s de execução real (Karma) após build do bundle de teste; build de produção ≈ 3.5-4.3s; E2E completo (24 specs, Desktop+Mobile) ≈ 19-20s com backend e frontend já de pé.

## 6. Estratégia recomendada para backend CI

Reativar a execução real de testes no job existente (`gradle.yml`), sem introduzir infraestrutura nova:

```
Checkout → Setup Java 21 (Corretto) → Cache Gradle → ./gradlew test → ./gradlew build → (fail se qualquer etapa falhar)
```

Sem necessidade de serviço de banco de dados para este job (item 4). Recomenda-se também: remover o step órfão "Wait for PostgreSQL"; adicionar `permissions: contents: read`; adicionar `concurrency` (mesmo padrão já usado no frontend); adicionar `timeout-minutes` razoável (o job real leva menos de 1 minuto até em CI, mas margem de segurança tipo 10-15 min evita travamento silencioso); atualizar `checkout@v2`→`v5`/`setup-java@v3`→última major/`cache@v3`→última major para consistência com os outros workflows do mesmo repositório — **nenhuma dessas mudanças de action version altera comportamento de build/produção**, é infraestrutura de CI pura.

## 7. Estratégia recomendada para frontend CI

Tornar a execução de testes unitários **incondicional** em `push`/`pull_request` (hoje só roda via `workflow_call`/manual) — esse é o gap mais importante encontrado no frontend:

```
Checkout → Setup Node → npm ci → Unit Tests → Production Build → (fail se qualquer etapa falhar)
```

`npm ci` (já usado) é determinístico via `package-lock.json` — manter. Não propor upgrade de Angular/Node nesta fase.

## 8. Estratégia recomendada para E2E — análise completa

Investiguei e confirmei empiricamente (rodando os 24 specs de verdade, várias vezes, com diferentes configurações) tudo que é necessário para o Happy Path real funcionar:

- **Runner**: Playwright (`@playwright/test ^1.62.1`), configuração em `playwright.config.ts`.
- **Projetos**: `Desktop` (`devices['Desktop Chrome']`) e `Mobile` (viewport 390×844, ainda Chromium — comentário no próprio arquivo já registra que o dispositivo `Pixel 7` real é instável com o dev server; **Safari/WebKit não fazem parte do baseline hoje, e não deve ser ampliado nesta fase**, conforme já era esperado).
- **Frontend dev server**: o próprio `playwright.config.ts` já sobe (`webServer.command: npx ng serve --port 4200`) — `reuseExistingServer: !process.env['CI']`, ou seja, em CI ele **sempre inicia um novo processo**, nunca reaproveita.
- **Backend**: `playwright.config.ts` **não** sobe o backend — o comentário no próprio arquivo já documenta isso ("a mesma origem que o backend real já libera via CORS"). O teste `create-execution.spec.ts` ("Happy Path real... sem interceptação") **depende de um backend real rodando em `http://localhost:8089`**, fora do controle do Playwright.
- **Instalação de browsers**: nenhum step de `npx playwright install` existe em nenhum workflow hoje (porque E2E nunca roda em CI) — seria necessário adicionar (`npx playwright install --with-deps chromium` é suficiente, já que os dois projetos configurados são Chromium-based).

### Dependência crítica descoberta nesta investigação (não estava documentada antes)

Rodei a suíte E2E completa três vezes, variando a configuração do backend, para confirmar exatamente do que o Happy Path real depende:

1. **Backend sem `APP_CORS_ALLOWED_ORIGINS` nem `auto-qa.allowed-roots` configurados**: `create-execution.spec.ts` falha (Desktop + Mobile) — a submissão do formulário não navega para a página de detalhe.
2. **Log do backend nesse momento**: `IllegalArgumentException: projectPath does not exist` — porque o spec usa `projectPath = '/tmp/projeto-e2e'`, um diretório que **não existe por padrão em nenhuma máquina/runner** (não há nenhum setup/fixture no repositório que o crie — `grep` confirma ausência de `globalSetup` ou criação desse diretório em qualquer lugar do projeto).
3. Criei o diretório manualmente (`mkdir -p /tmp/projeto-e2e`) e reconfigurei `auto-qa.allowed-roots` — **primeira tentativa via `.env` falhou** (`AutoQaProjectPathNotAllowedException`, mesmo com a variável aparentemente configurada). Investigando, confirmei que `application.yml` define `auto-qa.allowed-roots: []` como **valor literal explícito**, não como um placeholder `${VAR:}` (diferente de `app.cors.allowed-origins`, que já é um placeholder desde a Fase 13.1B) — então o `.env`/spring-dotenv **não sobrepõe** esse valor de forma confiável.
4. **Confirmei que uma variável de ambiente real do processo (não `.env`) funciona**: com `AUTO_QA_ALLOWED_ROOTS=/tmp/projeto-e2e` exportada no ambiente do processo antes de subir o backend, a criação via `curl` funcionou (`201 Created`) e a suíte E2E completa voltou a **24/24 passed**.

**Implicação direta para o design do CI**: qualquer job de CI que suba o backend real para rodar E2E precisará, no mínimo: (a) criar o diretório-fixture usado pelo(s) spec(s) de Happy Path antes de rodar os testes (hoje `/tmp/projeto-e2e`, um valor hardcoded no spec); (b) definir `AUTO_QA_ALLOWED_ROOTS` como **variável de ambiente real do job** (funciona nativamente em CI, onde `env:` do GitHub Actions define variáveis de processo de verdade — o problema encontrado aqui é específico do mecanismo local `.env`/dotenv, não existiria em CI). Isso **não é um bug de código** — é uma dependência operacional legítima da Fase 13.1A que precisa ser satisfeita pelo ambiente de CI, exatamente como `APP_CORS_ALLOWED_ORIGINS` já precisa ser. Nenhuma alteração de código foi feita ou é necessária para isso — é puramente configuração do job de CI.

### Estratégia para backend disponível ao E2E (opções A/B/C/D avaliadas)

- **A — Job do frontend faz checkout cruzado do repositório backend, sobe MongoDB via service container, roda o backend real (`./gradlew bootRun` ou o jar), configura `APP_CORS_ALLOWED_ORIGINS`/`AUTO_QA_ALLOWED_ROOTS`, cria o diretório-fixture, então roda Playwright.** Tecnicamente comprovada por esta investigação (repliquei exatamente esse fluxo localmente, com sucesso). Exige: checkout de um segundo repositório (mesmo dono, então `actions/checkout` com `repository:`/token funciona sem PAT extra se os repos forem do mesmo owner/org e o token padrão tiver permissão — a confirmar quando for implementar), JDK 21 no job do frontend, um MongoDB descartável via `services:` do GitHub Actions (evitando depender do cluster Atlas real de produção/dev compartilhado para dados de teste efêmeros).
- **B — Manter E2E fora do CI automatizado por enquanto**, com backend/frontend CI cobrindo só unit tests + build nesta subfase; tratar a automação de E2E como uma subfase própria e já prevista no roadmap aprovado da Fase 13 (**13.6 — Frontend: E2E Hardening**, que inclusive já tem pendência conhecida de ampliar a cobertura E2E para Apply/Execute/Cancel).
- **C — Ambiente de integração dedicado já existente**: **não encontrado** nenhum ambiente de staging/integração já provisionado em nenhum dos dois repositórios (nenhuma menção em `docs/`, nenhum `docker-compose` de ambiente de teste dedicado).
- **D — Outra arquitetura já existente**: não encontrada.

**Recomendação para esta fase**: **B**. A opção A é tecnicamente viável (comprovado aqui) mas adiciona complexidade real de orquestração cross-repo (segredos compartilhados, sincronização de versões entre os dois repositórios, tempo de execução maior, um novo tipo de falha — "E2E vermelho pode ser problema do frontend OU do backend OU da orquestração do CI" — mais difícil de diagnosticar). Como o roadmap da Fase 13 já reservou uma subfase específica para isso (13.6), sugiro que a 13.5 entregue gates confiáveis de unit+build nos dois repositórios agora (baixo risco, alto valor imediato), e que a automação de E2E em CI seja decidida e implementada deliberadamente na 13.6, já com o conhecimento operacional levantado aqui (item acima) pronto para uso. Isso não é uma decisão unilateral — apresento como recomendação para sua aprovação, não como algo já decidido.

## 9. Dependências entre frontend/backend durante E2E

Resumido do item 8: o E2E do frontend depende de um backend real acessível na `baseURL` configurada (`http://localhost:8089` por padrão, `E2E_BASE_URL`/porta do backend não são parametrizados separadamente — só a baseURL do frontend é). O backend, por sua vez, depende de MongoDB real para qualquer operação de `create`/`start`, e das duas configurações operacionais (`APP_CORS_ALLOWED_ORIGINS`, `AUTO_QA_ALLOWED_ROOTS`) para aceitar a requisição do E2E. **Nenhuma chamada de IA real é necessária** para a suíte E2E atual (o único teste que cria uma execução real não chega a chamar `start()`, que é o que dispararia os agentes).

## 10. Estratégia CORS para CI

Se a Fase 13.6 (ou uma futura ampliação da 13.5) decidir subir o backend real durante E2E em CI, a origem do frontend naquele job (provavelmente ainda `http://localhost:4200`, já que o Playwright sobe o `ng serve` na mesma porta local do runner) deve ser passada via `AUTO_QA_ALLOWED_ROOTS`/`APP_CORS_ALLOWED_ORIGINS` como variáveis de ambiente do job, nunca hardcoded no `CorsConfig.java` nem em `application.yml`. A política fail-closed da 13.1B **não precisa de nenhuma alteração de código** para funcionar em CI — só de configuração do job, exatamente como já validado localmente nesta investigação.

## 11. Variáveis necessárias

**Backend — job de testes/build**: nenhuma (confirmado, item 4).
**Backend — se/quando E2E-com-backend-real for implementado (13.6)**: `APP_CORS_ALLOWED_ORIGINS` (origem do frontend no job), `AUTO_QA_ALLOWED_ROOTS` (diretório-fixture do E2E), `MONGO_URI_NUVEM` (apontando para o Mongo do job, container ou real — decisão a aprovar), `SPRING_PROFILES_ACTIVE` não existe no projeto (sem profiles, item já registrado no diagnóstico geral da Fase 13).
**Frontend — job de unit tests/build**: nenhuma.
**Frontend — E2E (quando implementado)**: `E2E_BASE_URL` (opcional, já suportado pelo `playwright.config.ts`, default cobre o caso local/CI-mesma-máquina).

## 12. Secrets necessários (somente nomes)

Hoje, nos workflows existentes: `GITHUB_TOKEN` (automático, já usado por `gh pr create` nos workflows de auto-merge dos dois repositórios — não precisa ser cadastrado manualmente).
Para os gates de teste/build propostos nesta fase (backend e frontend): **nenhum secret novo**.
Para uma futura E2E-com-backend-real (13.6, se optar pela Opção A do item 8): `MONGO_URI_NUVEM` **somente se** optar por reusar o cluster real em vez de um container descartável (recomendo o container descartável exatamente para evitar precisar desse secret e para não escrever dados de teste no cluster compartilhado) — `OPENAI_API_KEY`/`GEMINI_API_KEY` **não são necessários** (item 9).

## 13. Quality gates propostos

| Gate | Job | Nome estável sugerido |
|---|---|---|
| Backend | testes + build | `Backend Tests`, `Backend Build` (ou um único `Backend CI` se preferir consolidar) |
| Frontend | unit tests + build | `Frontend Unit Tests`, `Frontend Build` |
| Frontend | E2E (fase futura) | `Frontend E2E` |

Todos com resultado binário PASS/FAIL, sem `continue-on-error`, sem `|| true` em nenhum comando obrigatório.

## 14. Artifacts recomendados

**Frontend**: já existe upload do `dist` (manter). Para E2E futuro: Playwright report/screenshots/traces **somente em caso de falha** (já configurado no `playwright.config.ts`: `screenshot: 'only-on-failure'`, `trace: 'on-first-retry'` — falta só o step de upload no workflow quando E2E for adicionado).
**Backend**: relatório de testes (`build/reports/tests`) como artifact **somente em caso de falha**, para facilitar diagnóstico sem poluir runs verdes.

## 15. Cache recomendado

**Backend**: cache Gradle (`~/.gradle/caches`, já existe em `gradle.yml`, manter a chave baseada em hash dos arquivos `*.gradle*`/`gradle-wrapper.properties`).
**Backend**: nenhum outro cache necessário — sem `node_modules` no backend.
**Frontend**: cache npm já configurado via `setup-node@v4` com `cache: npm` (usa `package-lock.json` como chave) — manter, é compatível com lockfile e não compromete determinismo.

## 16. Permissions recomendadas

Para os jobs de validação (testes/build, backend e frontend): `permissions: contents: read` — suficiente, sem escrita em PR/repositório. Os workflows de auto-merge/criação de PR já declaram `contents: write`/`pull-requests: write` explicitamente onde precisam — não mexer nisso nesta fase (fora do escopo: "não misturar CI com automação de promoção de branch").

## 17. Concurrency recomendada

Adicionar ao backend o mesmo padrão já usado no frontend: `concurrency: group: backend-ci-${{ github.ref }}, cancel-in-progress: true` para PRs (evita empilhar execuções obsoletas da mesma branch). Não alterar o comportamento dos workflows de auto-merge/main (fora do escopo desta fase).

## 18. Timeouts recomendados

Baseado no tempo real observado (item 4/5): `timeout-minutes: 15` para os jobs de teste/build de cada repositório é uma margem confortável (execução real leva segundos a ~1 minuto em CI, considerando cache frio na primeira execução) sem ser tão curto a ponto de gerar flakiness em um runner mais lento.

## 19. Arquivos que seriam criados

Nenhum arquivo novo é estritamente necessário para os gates de teste/build (backend e frontend) — as mudanças cabem dentro dos workflows já existentes (`gradle.yml`, `frontend-pipeline.yml`). Se, na implementação, preferir separar o job de teste em um workflow dedicado (ex.: `backend-ci.yml` substituindo/complementando `gradle.yml`), isso seria uma decisão de nomenclatura a aprovar, não uma necessidade técnica.

## 20. Arquivos que seriam alterados

- `criar-cenario-testes/.github/workflows/gradle.yml` — reativar testes, remover step órfão, adicionar `permissions`/`concurrency`/`timeout-minutes`, atualizar versões de actions.
- `gerar-cenario-teste-app/.github/workflows/frontend-pipeline.yml` — tornar o job `test` incondicional em `push`/`pull_request`, adicionar `permissions`/`timeout-minutes` (concurrency já existe).

**Nenhum arquivo `.java`/`.ts` de produção precisaria ser alterado** para esses dois gates. Se a Fase 13.6 (ou uma ampliação futura desta fase) decidir implementar E2E-com-backend-real em CI (Opção A do item 8), aí sim um novo workflow (ou job adicional) precisaria ser criado — não proposto agora.

## 21. Workflows que seriam mantidos

- `criar-cenario-testes/.github/workflows/create-main-pr.yml` — **KEEP** por ora (fora do escopo desta fase alterar automação de promoção de branch), mas com a corrida documentada no item 3 como dívida conhecida a resolver em uma fase própria, se e quando aprovado.
- `criar-cenario-testes/.github/workflows/create-auto-merge-main.yml` — **KEEP**, mesma ressalva.
- `gerar-cenario-teste-app/.github/workflows/create-auto-merge-main.yml` — **KEEP** — estrutura já correta (sequenciada via `needs:`), poderia servir de referência para uma futura correção da versão do backend, mas isso é uma mudança estrutural fora do escopo desta fase.

## 22. Workflows que poderiam ser substituídos

Nenhum precisa ser **substituído** (`REPLACE`) — todos são **`UPDATE`** (gradle.yml, frontend-pipeline.yml) ou **`KEEP`** (os três workflows de automação de branch), conforme classificação consolidada abaixo.

### Classificação final

| Workflow | Classificação |
|---|---|
| `criar-cenario-testes/gradle.yml` | UPDATE |
| `criar-cenario-testes/create-main-pr.yml` | KEEP (dívida documentada, não resolvida agora) |
| `criar-cenario-testes/create-auto-merge-main.yml` | KEEP (dívida documentada, não resolvida agora) |
| `gerar-cenario-teste-app/frontend-pipeline.yml` | UPDATE |
| `gerar-cenario-teste-app/create-auto-merge-main.yml` | KEEP |

Nenhum `DEPRECATE`, nenhum `UNKNOWN` (todos os workflows encontrados tiveram sua função identificada com clareza pela leitura direta do YAML).

## 23. Riscos

- Reativar testes no backend (`gradle.yml`) pode, em tese, revelar alguma diferença sutil entre o ambiente local (onde 1847/1847 passam agora) e o runner do GitHub Actions (SO, locale, timezone) — nenhuma evidência concreta disso foi encontrada (os testes não dependem de rede/Mongo/IA), mas é uma possibilidade genérica de qualquer CI que nunca rodou testes antes.
- Tornar o teste unitário do frontend obrigatório em todo PR pode atrasar levemente o feedback de PRs que hoje só esperam o build — impacto esperado é pequeno (~0.4s de execução real do Karma, mas hoje espera-se overhead de start-up do Chrome headless em CI, possivelmente 10-30s no total).
- A dependência descoberta no item 8 (diretório-fixture + `AUTO_QA_ALLOWED_ROOTS`) é **exclusiva de uma futura automação de E2E-com-backend-real** — não afeta os gates de teste/build propostos para esta fase, mas precisa ser lembrada quando a 13.6 for planejada.

## 24. Limitações

- Não há acesso a `gh` CLI nem à API do GitHub nesta sessão — não foi possível inspecionar a configuração atual de Branch Protection nem confirmar quais checks já estão marcados como obrigatórios hoje. A seção 13 lista os nomes recomendados para marcação manual, mas o estado atual não pôde ser confirmado programaticamente.
- Não investiguei a fundo a compatibilidade exata entre Angular 22/Node 24 (CI) vs Node 26 (máquina local) além de constatar a divergência e a ausência de `engines` — aprofundar isso seria escopo de dependências, não de CI/CD.

## 25. Confirmação de que nenhum arquivo foi alterado

Confirmado — nenhum workflow, nenhum arquivo `.java`/`.ts` foi criado ou alterado nesta investigação. `.env`/`.env.example` do backend (usados só para a validação empírica descrita no item 8) foram deixados exatamente no estado aprovado pela Fase 13.1B (`.env` contém somente `APP_CORS_ALLOWED_ORIGINS=http://localhost:4200`; `.env.example` documenta a mesma variável, sem nenhuma menção a `AUTO_QA_ALLOWED_ROOTS` adicionada por engano). `git status` de ambos os repositórios confirma isso.

## 26. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado — apenas `git status`, `git log --oneline`, `git branch --show-current` (leitura) foram usados em ambos os repositórios.

## 27. Confirmação de que nenhum deploy foi iniciado

Confirmado — nenhuma alteração de pipeline de deploy, Docker, Tomcat, ou publicação de artefato foi proposta ou executada. As instâncias de backend/frontend que subi nesta sessão foram exclusivamente para validação local empírica (mesma prática já usada na correção operacional da 13.1B), não deploy.

## 28. Confirmação de que aguardará nova aprovação

Confirmado. **PARADO aqui.** Nenhum workflow foi criado ou alterado. Aguardando aprovação explícita antes de implementar qualquer parte desta proposta.
