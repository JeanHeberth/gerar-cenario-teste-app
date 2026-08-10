# FASE 13.1B — BACKEND: CORS HARDENING
## Relatório final de implementação (B6)

**Data:** 2026-08-10
**Escopo:** exclusivamente B6 (CORS global aberto). Ciclo RED → GREEN → REFACTOR → REGRESSION. Frontend não foi tocado. Nenhum comando Git de escrita foi executado.

---

## 1. Baseline

1832 testes (herdados da Fase 13.1A, já mergeada — PR #135). `CorsConfig.java` com `allowedOriginPatterns("*")` global, sem `AppCorsProperties`, `application.yml` sem bloco `app.cors`.

## 2. Arquivos criados

- `src/main/java/com/br/criarcenariotestes/business/config/AppCorsProperties.java` — propriedades tipadas globais (`app.cors.allowed-origins`, `List<String>`, default vazio).
- `src/test/java/com/br/criarcenariotestes/business/config/AppCorsPropertiesTest.java` — 5 testes de binding.
- `src/test/java/com/br/criarcenariotestes/business/config/CorsConfigAllowedOriginsTest.java` — 6 testes de comportamento real com as duas origens conhecidas configuradas.
- `src/test/java/com/br/criarcenariotestes/business/config/CorsConfigEmptyOriginsTest.java` — 2 testes de fail-closed com config vazia.
- `src/test/java/com/br/criarcenariotestes/business/config/CorsConfigRegressionTest.java` — 2 testes de regressão em `CenarioController` (controller fora do Auto QA).

## 3. Arquivos alterados

- `src/main/java/com/br/criarcenariotestes/business/config/CorsConfig.java` — `allowedOriginPatterns("*")` substituído por `allowedOrigins(...)` lido de `AppCorsProperties`.
- `src/main/resources/application.yml` — novo bloco `app.cors.allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:}` (default vazio, fail-closed), com comentário explicando o porquê do escopo global e um exemplo (não um valor default) das duas origens conhecidas.

**Nenhum outro arquivo foi tocado.** Confirmado por `git diff --stat` que nenhum arquivo da Fase 13.1A (`ProjectPathSecurityValidator`, `ProjectDiscoveryService`, `AutoQaExecutionOrchestrator`, `AutoQaExecutionExceptionHandler`) foi alterado nesta subfase. Nenhum controller foi alterado — o próprio `CorsConfig` é a única classe de infraestrutura HTTP tocada.

## 4. Arquitetura final do CORS

Fluxo exatamente como desenhado na aprovação: `application.yml`/variável de ambiente → `AppCorsProperties` (tipada) → `CorsConfig` (consome a lista, nunca lê environment diretamente) → `allowedOrigins(...)` explícitas → mapping global `/**`. Fonte única, sem filtro CORS paralelo, sem `@CrossOrigin` em nenhum controller.

## 5. Propriedade criada/reutilizada

Nova: `app.cors.allowed-origins` (`List<String>`, default `[]`). Não reaproveitei `auto-qa.allowed-roots` nem criei `auto-qa.allowed-origins` — são conceitos diferentes (um é filesystem, outro é HTTP/browser) e escopos diferentes (um é exclusivo do módulo Auto QA, o outro é da aplicação inteira).

## 6. Escopo global da propriedade

Confirmado: `app.cors`, não `auto-qa.cors`. `AppCorsProperties` vive em `business.config`, mesmo pacote de `CorsConfig`, fora do pacote `business.autoqa`.

## 7. Default final

`allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:}` — string vazia se a variável de ambiente não estiver setada, que o Spring Boot converte para lista vazia (comprovado pelo teste `valorEmBrancoDeveResultarEmListaVazia`, que testa exatamente esse cenário).

## 8. Comportamento com lista vazia

Fail-closed comprovado por `CorsConfigEmptyOriginsTest`: uma requisição `GET` com `Origin: http://localhost:4200` retorna **403**, sem o header `Access-Control-Allow-Origin`, mesmo essa sendo uma origem "razoável"/conhecida — nenhum fallback implícito.

## 9. Comportamento localhost:4200

Comprovado por `CorsConfigAllowedOriginsTest.origemDesenvolvimentoDeveReceberAutorizacao`: com `app.cors.allowed-origins` contendo essa origem, `GET`/preflight retornam **200** com `Access-Control-Allow-Origin: http://localhost:4200`.

## 10. Comportamento produção 100.83.72.100:9999

Comprovado por `CorsConfigAllowedOriginsTest.origemProducaoDeveReceberAutorizacao` — mesmo padrão, origem exata (esquema+host+porta) configurada e aceita.

## 11. Comportamento origem arbitrária

Comprovado por `origemArbitrariaNaoDeveReceberAutorizacao` (`http://evil.example`): **403**, sem header de autorização — mesmo com as duas origens legítimas configuradas simultaneamente, uma terceira origem não configurada é sempre rejeitada.

## 12. Múltiplas origens

Comprovado: as duas origens (dev + produção) configuradas na mesma lista funcionam **ambas**, independentemente da ordem — cada teste (`origemDesenvolvimentoDeveReceberAutorizacao`/`origemProducaoDeveReceberAutorizacao`) valida uma delas isoladamente contra a mesma configuração compartilhada.

## 13. Requisição sem Origin

Comprovado por `requisicaoSemOriginNaoDeveSerQuebrada` (com origens configuradas) e `requisicaoSemOriginContinuaFuncionandoComListaVazia` (mesmo com a lista vazia): status **200**, sem header CORS (não é uma requisição cross-origin de browser, o mecanismo de CORS nem é acionado) — clientes não-browser (curl, Postman, RestAssured, health checks) continuam funcionando normalmente em qualquer configuração.

## 14. Preflight permitido

Comprovado por `preflightDeOrigemPermitidaDeveFuncionar`: `OPTIONS` com `Origin` autorizado + `Access-Control-Request-Method: GET` retorna **200** com o header de autorização.

## 15. Preflight bloqueado

Comprovado por `preflightDeOrigemBloqueadaNaoDeveAutorizar`: `OPTIONS` de origem não configurada retorna **403**, sem header.

## 16. Métodos permitidos

Preservados exatamente como estavam: `GET, POST, PUT, DELETE, OPTIONS` — nenhum método adicionado nem removido, conforme instruído (o objetivo da subfase é a origem, não os métodos).

## 17. Headers permitidos

Preservado `allowedHeaders("*")` — decisão documentada (não no código, aqui no relatório): como nenhum header customizado é usado hoje pelo frontend (confirmado no diagnóstico) e o objetivo principal de B6 é a origem, restringir headers não traria benefício concreto nesta subfase e foi deixado de fora do escopo, exatamente como instruído.

## 18. allowCredentials

Preservado ausente (default `false`). Não habilitado — nenhuma necessidade de cookies/credenciais CORS surgiu nesta subfase.

## 19. maxAge

Preservado ausente (default implícito do Spring, 1800s) — não alterado.

## 20. exposedHeaders

Preservado ausente — não alterado.

## 21. Controllers afetados

Os 4 mesmos de antes (`AutoQaExecutionController`, `AgentController`, `JiraController`, `CenarioController`) — nenhum teve seu código alterado; todos continuam sujeitos à mesma configuração global, agora restritiva.

## 22. Regressão Auto QA

`CorsConfigAllowedOriginsTest` e `CorsConfigEmptyOriginsTest` usam `AutoQaExecutionController` como alvo — 8 testes comprovando que a nova política funciona corretamente neste controller específico, sem quebrar nenhum comportamento HTTP existente (endpoints continuam retornando os mesmos status/bodies quando a origem é autorizada ou ausente).

## 23. Regressão de feature não Auto QA

`CorsConfigRegressionTest` usa `CenarioController` (`GET /cenario/workflows`) — 2 testes comprovando que a mesma política global também protege/autoriza corretamente um controller totalmente fora do módulo Auto QA, confirmando o escopo verdadeiramente global da correção.

## 24. Testes novos

| Classe | Testes novos |
|---|---|
| `AppCorsPropertiesTest` (nova) | 5 |
| `CorsConfigAllowedOriginsTest` (nova) | 6 |
| `CorsConfigEmptyOriginsTest` (nova) | 2 |
| `CorsConfigRegressionTest` (nova) | 2 |
| **Total** | **15** |

## 25. Total de testes antes/depois

**Antes:** 1832. **Depois:** 1847. Nenhum teste pré-existente foi alterado, removido ou desabilitado.

## 26. Suíte backend

`./gradlew test` → **BUILD SUCCESSFUL**, **1847/1847**, 0 falhas, 0 erros, 0 skipped.

## 27. Build

`./gradlew build` → **BUILD SUCCESSFUL** (compilação, testes, `bootWar`, `check`, `assemble`).

## 28. Busca por wildcard

`grep -rn "allowedOriginPatterns\|allowedOrigins(\"\*\")\|origins.*\"\*\""` em todo `src/main/java` → **nenhuma ocorrência**.

## 29. Confirmação de ausência de allowedOriginPatterns("*")

Confirmado — a chamada foi completamente removida de `CorsConfig.java`, substituída por `allowedOrigins(corsProperties.getAllowedOrigins().toArray(new String[0]))`.

## 30. Confirmação de ausência de allowedOrigins("*")

Confirmado — nenhum literal `"*"` aparece em nenhum ponto da configuração CORS; a lista vem inteiramente de `AppCorsProperties`, e o valor default é lista vazia, nunca `"*"`.

## 31. Confirmação de que não foi criado @CrossOrigin

Confirmado — `grep -rn "@CrossOrigin" src/main/java` → nenhuma ocorrência. Política permanece centralizada em `CorsConfig`.

## 32. Confirmação de que não há CORS filter duplicado

Confirmado — `grep -rln "CorsFilter\|SimpleCorsFilter" src/main/java` → nenhuma ocorrência. `SimpleCorsFilter` continua removido (não foi recriado); `CorsConfig` é a única fonte.

## 33. Frontend intocado

Confirmado — `git status` no repositório `gerar-cenario-teste-app` mostra apenas pastas de relatório/documentação (`docs/auto-qa/relatorio/13`, `13.1`, `13.1b`), nenhum arquivo de código.

## 34. Controllers sem alteração de contrato

Confirmado — nenhum controller teve endpoint, DTO, status code de sucesso ou payload alterado. A única mudança observável pelo cliente HTTP é: requisições cross-origin de browser vindas de uma origem não autorizada agora recebem **403** em vez de serem silenciosamente permitidas — comportamento pretendido, não uma mudança de contrato de dados.

## 35. Riscos encontrados

- **Confirmado empiricamente** (não assumido): `@WebMvcTest` **não** carrega automaticamente uma classe `@Configuration` comum como `CorsConfig`/`AppCorsProperties` — foi necessário `@Import({CorsConfig.class, AppCorsProperties.class})` explícito em cada teste de comportamento CORS. Sem isso, os primeiros testes falharam de forma reveladora: origens "autorizadas" não recebiam o header (porque a config real nunca era carregada) e a origem "não autorizada" retornava 200 em vez de 403 (porque não havia CORS configurado de fato no contexto de teste) — um lembrete concreto de por que o ciclo RED→GREEN é valioso: o RED aqui não testava a política, testava a ausência de wiring.
- Confirmado por teste (`preflightDeOrigemBloqueadaNaoDeveAutorizar`/`origemArbitrariaNaoDeveReceberAutorizacao`) que o Spring, ao rejeitar uma origem não autorizada, responde com **403 Forbidden** tanto para requisições normais quanto para preflight — comportamento nativo do `DefaultCorsProcessor`, não uma decisão de código nossa.

## 36. Limitações

- CORS restringe apenas acesso **via browser cross-origin** — não protege contra `curl`/Postman/scripts/serviços maliciosos, que nunca dependeram de CORS. Isso já era esperado e está documentado no diagnóstico.
- A origem de produção configurada (`http://100.83.72.100:9999`) é tratada como uma string exata (esquema+host+porta) — qualquer variação futura (HTTPS, outro domínio, outra porta) exigirá reconfigurar a variável de ambiente; isso é intencional (fail-closed), não uma limitação a corrigir.
- Nenhuma variável de ambiente foi efetivamente setada em nenhum ambiente real por esta implementação — isso é responsabilidade operacional de quem administra cada ambiente (ver item 35 do diagnóstico anterior, reafirmado aqui).

## 37. Dívida de autenticação mantida

Confirmado — nenhuma tentativa de compensar a ausência de autenticação foi feita. Nenhum Spring Security, JWT, login, roles, API key ou CSRF foi introduzido.

## 38. Confirmação de que CORS não é tratado como autenticação

Confirmado — o relatório de diagnóstico já registrou essa distinção, e a implementação não introduziu nada que sugira o contrário. CORS aqui reduz estritamente a superfície de acesso cross-origin via browser.

## 39. Confirmação de que nenhuma outra subfase foi iniciada

Confirmado — 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8 e Fase 14 não foram tocadas.

## 40. Confirmação de que nenhum comando Git foi executado

Confirmado — apenas `git status`, `git diff`, `git diff --stat` (leitura) foram usados em ambos os repositórios. Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`clean`.

---

## Critério de aceite (seção 49 da aprovação) — status

- ✅ Wildcard global deixou de existir (comprovado por busca estática, item 28-30).
- ✅ Origens permitidas vêm de configuração explícita (`AppCorsProperties`, nunca hardcoded).
- ✅ Configuração vazia é fail-closed (comprovado por teste).
- ✅ `localhost:4200` autorizado funciona quando configurado (comprovado por teste).
- ✅ `100.83.72.100:9999` autorizado funciona quando configurado (comprovado por teste).
- ✅ Origem arbitrária não recebe autorização (comprovado por teste).
- ✅ Preflight legítimo funciona (comprovado por teste).
- ✅ Outras features legítimas (`CenarioController`) não sofreram regressão (comprovado por teste dedicado).
- ✅ Testes cobrem a política (15 testes novos, 1847/1847 na suíte completa).

**PARADO conforme instruído.** Aguardando revisão e aprovação antes de qualquer outra subfase (13.2 em diante).
