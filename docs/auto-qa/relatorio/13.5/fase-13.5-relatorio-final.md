# FASE 13.5 — CI/CD E QUALITY GATES
## Relatório final — Etapa 2 (implementação dos Quality Gates)

**Data:** 2026-08-10
**Escopo:** exclusivamente os dois arquivos autorizados. Nenhum código funcional, CORS, allowed-roots, workflow de promoção de branch, ou E2E foi tocado. Nenhum comando Git de escrita foi executado.

---

## 1. Resumo da implementação

Backend: `gradle.yml` deixou de excluir testes (`-x test`) e passou a ter dois jobs sequenciados — `Backend Tests` (obrigatório) → `Backend Build` (depende do primeiro via `needs:`). Trigger ampliado de `pull_request → main` para `pull_request → develop, main` (o fluxo real do projeto é `feature → develop → main`; sem isso, PRs de feature para develop continuariam sem gate de backend). Step órfão "Wait for PostgreSQL" removido. Actions atualizadas para consistência com os demais workflows do repositório. `permissions`/`concurrency`/`timeout-minutes` adicionados.

Frontend: `frontend-pipeline.yml` — o job de testes deixou de depender de `workflow_call`/checkbox manual e passou a rodar sempre que o workflow é acionado (incluindo `push`/`pull_request` normais). `Frontend Build` passou a depender de `Frontend Unit Tests` via `needs:`. `permissions`/`timeout-minutes` adicionados; `concurrency` já existente foi preservada sem alteração.

## 2. Arquivos alterados backend

`criar-cenario-testes/.github/workflows/gradle.yml` (único arquivo tocado no backend).

## 3. Arquivos alterados frontend

`gerar-cenario-teste-app/.github/workflows/frontend-pipeline.yml` (único arquivo tocado no frontend).

## 4. Arquivos criados

Nenhum. Ambas as mudanças coube inteiramente dentro dos dois arquivos já existentes e autorizados.

## 5. Trigger backend — antes

```yaml
on:
  pull_request:
    branches:
      - main
    types: [opened, synchronize, reopened]
```

## 6. Trigger backend — depois

```yaml
on:
  pull_request:
    branches:
      - develop
      - main
    types: [opened, synchronize, reopened]
```

## 7. Trigger frontend — antes

```yaml
on:
  push: { branches: ["main","master","develop"] }
  pull_request: { branches: ["main","master","develop"] }
  workflow_dispatch: { inputs: { run_tests: ... } }
  workflow_call: {}
```

## 8. Trigger frontend — depois

Idêntico ao anterior — **nenhum evento foi removido ou adicionado**. A mudança não foi no trigger do workflow, foi na condição interna do job `test` (ver item 12).

## 9. Estrutura final Backend Tests

```yaml
test:
  name: Backend Tests
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - checkout (actions/checkout@v5)
    - setup-java 21 corretto (actions/setup-java@v4)
    - cache Gradle (actions/cache@v4)
    - chmod +x gradlew
    - ./gradlew test
    - upload-artifact (relatório de testes, só se failure())
```

## 10. Estrutura final Backend Build

```yaml
build:
  name: Backend Build
  needs: test
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - checkout, setup-java, cache (mesmos de Backend Tests)
    - ./gradlew build -x test
```

## 11. Dependência entre Backend Tests e Backend Build

`needs: test` explícito. Comportamento padrão do GitHub Actions: `build` só é executado se `test` **suceder**; se `test` falhar, `build` é automaticamente pulado (nunca fica verde com testes vermelhos). `-x test` no job `build` é intencional e seguro aqui — os testes já foram executados e aprovados pelo job anterior; repeti-los duplicaria ~15s sem nenhum ganho de proteção real, exatamente como autorizado (item 10 da aprovação).

## 12. Estrutura final Frontend Unit Tests

```yaml
test:
  name: Frontend Unit Tests
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - checkout, setup-node 24, npm ci
    - npm run test -- --watch=false --browsers=ChromeHeadless
```

Removida a condição `if: ${{ github.event_name == 'workflow_call' || (github.event_name == 'workflow_dispatch' && inputs.run_tests == true) }}` — o job agora roda incondicionalmente em qualquer acionamento do workflow (`push`, `pull_request`, `workflow_call`, `workflow_dispatch`), que é exatamente o objetivo (item 24/25 da aprovação: testes obrigatórios em todo PR/push comum).

## 13. Estrutura final Frontend Build

```yaml
build:
  name: Frontend Build
  needs: test
  runs-on: ubuntu-latest
  timeout-minutes: 15
  steps:
    - checkout, setup-node 24, npm ci
    - npm run build
    - upload-artifact (dist, sempre)
```

## 14. Dependência entre Frontend Unit Tests e Frontend Build

`needs: test` adicionado (não existia antes — os dois jobs eram totalmente independentes). Mesma semântica do backend: build nunca aprova com testes reprovados.

## 15. Java utilizado

21 (Corretto) — inalterado.

## 16. Gradle utilizado

Wrapper 8.10.2 — inalterado.

## 17. Node utilizado

24 no CI (inalterado) — divergência já registrada no diagnóstico frente ao Node local (v26.3.0); não foi tocada, conforme instruído.

## 18. Angular utilizado

`^22.1.0` — inalterado.

## 19. npm utilizado

`npm ci` (determinístico via lockfile) — inalterado. Versão do npm segue a que acompanha o Node 24 do runner (não fixada explicitamente, como já era o caso antes).

## 20. Testes backend executados

`./gradlew test` (comando real do job `Backend Tests`), executado localmente para validação após a mudança.

## 21. Total backend

1847 testes descobertos e executados.

## 22. Resultado backend

**1847/1847 SUCCESS**, 0 falhas, 0 erros, 0 skipped.

## 23. Build backend

`./gradlew build -x test` (comando real do job `Backend Build`) — **BUILD SUCCESSFUL**.

## 24. Testes frontend executados

`npm run test -- --watch=false --browsers=ChromeHeadless` (comando real do job `Frontend Unit Tests`), executado localmente.

## 25. Total frontend

382 testes.

## 26. Resultado frontend

**382/382 SUCCESS**.

## 27. Build frontend

`npm run build` (comando real do job `Frontend Build`) — sucesso, sem warnings de budget. Chunks idênticos ao baseline (`auto-qa-bmad-routes` 105.64 kB raw / 19.09 kB transfer).

## 28. E2E executado ou não, e por quê

**Não executado no CI, intencionalmente.** Conforme decisão arquitetural aprovada (Etapa 2, seção 2): E2E-com-backend-real fica reservado para a Fase 13.6, para não introduzir checkout cross-repository, MongoDB efêmero e orquestração backend/frontend dentro desta fase de CI/CD. Localmente, fora do escopo desta implementação (só como regressão informal, sem exigir nenhuma mudança de ambiente/código), a suíte E2E completa (24 specs) segue validada a partir do diagnóstico anterior — baseline preservado, não uma exigência desta etapa.

## 29. Permissions backend

```yaml
permissions:
  contents: read
```
No nível do workflow — aplica-se a ambos os jobs (`test`, `build`).

## 30. Permissions frontend

```yaml
permissions:
  contents: read
```
No nível do workflow. Validado que isso não quebra o uso como `workflow_call`: `create-auto-merge-main.yml` (repositório frontend) declara suas próprias `permissions: contents: write / pull-requests: write` nos SEUS jobs (`criar-pr`, `merge-main`), que são jobs separados do workflow chamador, não afetados pelo `permissions:` interno de `frontend-pipeline.yml` — o reusable workflow só precisa ler o repositório para buildar/testar, nunca escrever.

## 31. Concurrency backend

Adicionada (não existia antes):
```yaml
concurrency:
  group: backend-ci-${{ github.ref }}
  cancel-in-progress: true
```

## 32. Concurrency frontend

Preservada sem alteração (já existia):
```yaml
concurrency:
  group: frontend-pipeline-${{ github.ref }}
  cancel-in-progress: true
```

## 33. Timeout backend

`timeout-minutes: 15` em ambos os jobs (`test`, `build`) — não existia antes.

## 34. Timeout frontend

`timeout-minutes: 15` em ambos os jobs (`test`, `build`) — não existia antes.

## 35. Caches

Backend: cache Gradle preservado (`~/.gradle/caches`, chave por hash de `*.gradle*`/`gradle-wrapper.properties`), agora presente em ambos os jobs (`test` e `build`), já que os dois precisam resolver dependências independentemente (jobs rodam em runners/VMs separadas). Frontend: cache npm via `setup-node@v4` (`cache: npm`) preservado, já compatível com `package-lock.json`. Nenhum cache de `node_modules` foi adicionado (evitado deliberadamente, conforme instruído).

## 36. Artifacts

Backend: **novo** — relatório de testes (`build/reports/tests/test`) enviado como artifact **somente em caso de falha** (`if: failure()`), via `actions/upload-artifact@v4`, action oficial já usada no frontend. Frontend: `dist/gerar-cenario-teste-app` preservado como artifact sempre (comportamento já existente, inalterado).

## 37. Actions atualizadas

Backend (`gradle.yml`): `actions/checkout@v2 → v5`, `actions/setup-java@v3 → v4`, `actions/cache@v3 → v4` — agora consistentes com as versões já usadas nos outros dois workflows do mesmo repositório (`checkout@v5`). Frontend: nenhuma atualização de versão foi necessária — `checkout@v4`, `setup-node@v4`, `upload-artifact@v4` já estavam em versões atuais e consistentes entre os dois workflows do repositório.

## 38. Step PostgreSQL removido

Confirmado — o step `"Wait for PostgreSQL"` (`sleep 10`) foi removido de `gradle.yml`. O projeto usa MongoDB e a suíte de testes não depende de nenhum banco real (nenhum `@SpringBootTest` no projeto), então nenhum substituto ("Wait for MongoDB" ou serviço de banco) foi adicionado, exatamente como autorizado.

## 39. Secrets utilizados

**Nenhum secret novo em nenhum dos dois workflows alterados.** `GITHUB_TOKEN` continua sendo usado apenas nos workflows de promoção de branch (não tocados nesta implementação), não nos dois workflows de CI/validação.

## 40. Quality gates finais

| Gate | Repositório | Nome exibido no GitHub |
|---|---|---|
| Testes backend | `criar-cenario-testes` | **Backend Tests** |
| Build backend | `criar-cenario-testes` | **Backend Build** |
| Testes unitários frontend | `gerar-cenario-teste-app` | **Frontend Unit Tests** |
| Build frontend | `gerar-cenario-teste-app` | **Frontend Build** |

## 41. Checks recomendados para Branch Protection

No repositório backend, marcar como obrigatórios: `Backend Tests`, `Backend Build` — para PRs com base `develop` e `main` (o trigger agora cobre ambas). No repositório frontend, marcar como obrigatórios: `Frontend Unit Tests`, `Frontend Build` — para PRs com base `main`, `master`, `develop` (trigger inalterado). **Não configurei isso via API** — é uma recomendação para configuração manual, conforme instruído.

## 42. Validação do workflow_call

Estrutura validada: `on.workflow_call: {}` preservado sem nenhuma alteração em `frontend-pipeline.yml`. `create-auto-merge-main.yml` continua chamando `uses: ./.github/workflows/frontend-pipeline.yml` sem parâmetros — compatível, já que não alterei nenhum input/output declarado. Nesse modo de invocação, `github.event_name == 'workflow_call'`, então o job `test` (agora incondicional) roda normalmente, seguido de `build` via `needs: test` — o comportamento pós-merge (gate antes de promover `develop→main`) fica **mais rigoroso** do que antes (antes, `build` não dependia de `test` mesmo dentro do `workflow_call`; agora depende). YAML validado sintaticamente com parser Python (`yaml.safe_load`), sem erros, estrutura de `jobs`/`needs`/`permissions`/`concurrency` conferida programaticamente.

## 43. Situação do workflow_dispatch / run_tests

O input `run_tests` (`workflow_dispatch.inputs.run_tests`) foi **preservado** na declaração do workflow, conforme instruído (mudança mínima, não remover sem necessidade). Porém, como o job `test` agora roda incondicionalmente em qualquer acionamento (incluindo `workflow_dispatch` sem marcar o checkbox), esse input **ficou funcionalmente redundante** — marcá-lo ou não já não muda mais o comportamento (os testes sempre rodam). Registrado aqui como pequena dívida técnica, exatamente como a aprovação previu como alternativa aceitável (item 43: "manter nesta fase e registrar como dívida pequena").

## 44. Situação da corrida create-main-pr/create-auto-merge-main

**Intocada.** `criar-cenario-testes/.github/workflows/create-main-pr.yml` e `create-auto-merge-main.yml` continuam disparando no mesmo evento (`pull_request` → `develop`, `closed`, `merged==true`), sem `needs:` entre si — a corrida estrutural documentada no diagnóstico da Fase 13.5 e no diagnóstico geral da Fase 13 (achado CI-37-02) **persiste, sem alteração**, conforme explicitamente fora do escopo desta implementação.

## 45. Dependência E2E descoberta para AUTO_QA_ALLOWED_ROOTS

Preservada apenas como documentação (não incorporada a nenhum workflow): o Happy Path E2E real depende de `APP_CORS_ALLOWED_ORIGINS` **e** `AUTO_QA_ALLOWED_ROOTS` configuradas simultaneamente no backend, além do diretório-fixture `/tmp/projeto-e2e` (hoje hardcoded no spec `create-execution.spec.ts`) precisar existir. Nenhuma dessas três coisas foi tocada ou configurada em nenhum workflow — ficam registradas aqui e no relatório de diagnóstico anterior para uso na Fase 13.6.

## 46. Limitações

- Sem acesso a `gh`/API do GitHub nesta sessão — não foi possível confirmar programaticamente o estado atual de Branch Protection nem simular a execução real do workflow no runner do GitHub Actions (a validação foi feita executando localmente os comandos reais que os jobs executam, mais checagem sintática do YAML — não uma execução ponta a ponta no Actions).
- A execução real do job `Backend Build` em CI incluirá o tempo de resolução de dependências Gradle "a frio" na primeira vez (cache ainda não populado) — tempo local medido (< 1s) não reflete isso; ainda assim, `timeout-minutes: 15` oferece margem ampla.

## 47. Riscos

- Baixo: como nenhum dos dois repositórios nunca rodou testes automaticamente em CI antes, existe uma possibilidade genérica (não evidenciada por nada concreto) de o runner do GitHub Actions revelar alguma diferença de ambiente (locale, timezone, encoding) não visível localmente — mitigado por não haver nenhuma dependência de rede/banco real nos testes de ambos os projetos.
- Baixo: `run_tests` redundante (item 43) pode confundir quem configurar `workflow_dispatch` manualmente esperando que desmarcar o checkbox pule os testes — não pula mais. Puramente cosmético, sem risco funcional.

## 48. Dívidas técnicas

- Corrida `create-main-pr.yml`/`create-auto-merge-main.yml` no backend (item 44) — já conhecida, não resolvida nesta fase.
- Input `run_tests` do frontend agora redundante (item 43).
- Divergência Node 24 (CI) vs Node 26.3.0 (local), sem `engines` no `package.json` — já registrada, não tocada.
- E2E ainda fora do CI — endereçada deliberadamente na Fase 13.6.

## 49. Confirmação de frontend funcional intocado

Confirmado — `git diff --stat` mostra apenas `.github/workflows/frontend-pipeline.yml`. Nenhum arquivo em `src/app/` foi tocado.

## 50. Confirmação de backend funcional intocado

Confirmado — `git diff --stat` mostra apenas `.github/workflows/gradle.yml`. Nenhum arquivo `.java` foi tocado.

## 51. Confirmação de CORS intocado

Confirmado — `CorsConfig.java`, `AppCorsProperties.java`, `application.yml` (bloco `app.cors`) não aparecem em nenhum diff desta implementação.

## 52. Confirmação de allowed-roots intocado

Confirmado — `ProjectPathSecurityValidator`, `AutoQaProperties`, `application.yml` (bloco `auto-qa`) não aparecem em nenhum diff desta implementação. `AUTO_QA_ALLOWED_ROOTS` não foi adicionada a nenhum workflow.

## 53. Confirmação de workflows de promoção intactos

Confirmado — `create-main-pr.yml` e `create-auto-merge-main.yml` (backend) e `create-auto-merge-main.yml` (frontend) não aparecem em nenhum diff.

## 54. Confirmação de ausência de deploy

Confirmado — nenhum step de deploy, Docker, publicação ou release foi adicionado a nenhum workflow.

## 55. Confirmação de ausência de E2E novo no CI

Confirmado — `npx playwright test`/`playwright install` não aparecem em nenhum dos dois workflows alterados.

## 56. Confirmação de ausência de secrets hardcoded

Confirmado — nenhum valor de credencial, token ou string sensível foi escrito em nenhum dos dois arquivos YAML.

## 57. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado — apenas `git status`, `git diff --stat`, `git log` (leitura) foram usados em ambos os repositórios durante esta implementação.

## 58. Confirmação de que a Fase 13.6 não foi iniciada

Confirmado — nenhum trabalho de integração E2E-com-backend-real em CI foi iniciado.

---

## Checklist de critérios de aceite

**Backend:** gradle.yml atualizado ✓ · testes não excluídos ✓ · Backend Tests como gate claro ✓ · Backend Build como gate claro ✓ · build depende dos testes ✓ · Java 21 ✓ · Gradle 8.10.2 ✓ · PostgreSQL órfão removido ✓ · nenhuma dependência de MongoDB adicionada ✓ · nenhum secret novo ✓ · permissions mínimas ✓ · concurrency ✓ · timeout ✓ · PR para develop protegido ✓ · 1847/1847 ✓ · build verde ✓

**Frontend:** frontend-pipeline.yml atualizado ✓ · Frontend Unit Tests roda automaticamente ✓ · roda em PR comum ✓ · roda em push ✓ · workflow_call preservado ✓ · workflow_dispatch preservado ✓ · Frontend Build obrigatório ✓ · build depende dos testes ✓ · Node 24 mantido ✓ · npm ci preservado ✓ · cache npm preservado ✓ · artifact dist preservado ✓ · concurrency preservada ✓ · timeout ✓ · permissions mínimas ✓ · 382/382 ✓ · build verde ✓

**Escopo:** nenhum E2E adicionado ✓ · nenhum checkout cross-repo ✓ · nenhum MongoDB no CI ✓ · nenhum backend iniciado pelo frontend CI ✓ · nenhum código funcional alterado (backend/frontend) ✓ · nenhum endpoint/DTO/agente/regra BMAD alterado ✓ · nenhum CORS/allowed-root alterado ✓ · nenhum deploy ✓ · workflows de promoção intactos ✓ · nenhum secret hardcoded ✓ · nenhum comando Git de escrita ✓

**PARADO conforme instruído.** Fase 13.6 não iniciada. Corrida dos workflows backend não corrigida. Branch Protection não alterada. Nenhum PR criado, nenhum commit, nenhum push. Aguardando sua revisão.
