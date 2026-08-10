# FASE 13.1A — BACKEND: PROJECT PATH SECURITY
## Relatório final de implementação (B4 + B5 + H7)

**Data:** 2026-08-10
**Escopo:** exclusivamente B4 (allowedRoots não aplicada), B5 (leitura/análise de filesystem sem área autorizada), H7 (working directory do Execute herdando a mesma ausência de allowlist). **B6 (CORS) não foi tocado — permanece pendente para a Fase 13.1B**, conforme instruído.
**Ciclo seguido:** RED → GREEN → REFACTOR → REGRESSION, integralmente no backend `criar-cenario-testes`. Frontend não foi tocado. Nenhum comando Git de escrita foi executado.

---

## 1. Baseline antes da alteração

1808 testes no backend (`./gradlew test` limpo, 0 falhas), build verde. `auto-qa.allowed-roots` declarada em `AutoQaProperties`/`application.yml` mas não lida por nenhum código de produção (confirmado no diagnóstico da 13.1). `ProjectDiscoveryService.normalizeAndValidate` validava apenas existência/tipo/legibilidade, sem allowlist. `CorsConfig` inalterado (fora de escopo).

## 2. Arquivos criados

- `src/main/java/com/br/criarcenariotestes/business/autoqa/security/ProjectPathSecurityValidator.java` — componente central de política de segurança.
- `src/main/java/com/br/criarcenariotestes/business/autoqa/executionapi/exception/AutoQaProjectPathNotAllowedException.java` — exceção dedicada (mapeada para HTTP 403), seguindo o padrão já existente das demais exceções do pacote.
- `src/test/java/com/br/criarcenariotestes/business/autoqa/security/ProjectPathSecurityValidatorTest.java` — 18 testes unitários do componente central.

## 3. Arquivos alterados

- `src/main/java/com/br/criarcenariotestes/business/autoqa/discovery/ProjectDiscoveryService.java` — `normalizeAndValidate` removido; `discover()` delega para `ProjectPathSecurityValidator.validate(...)` (validação autoritativa).
- `src/main/java/com/br/criarcenariotestes/business/autoqa/executionapi/orchestrator/AutoQaExecutionOrchestrator.java` — `create()` passa a chamar `projectPathSecurityValidator.validate(...)` antes de persistir (rejeição antecipada); novo parâmetro de construtor.
- `src/main/java/com/br/criarcenariotestes/controller/AutoQaExecutionExceptionHandler.java` — `AutoQaProjectPathNotAllowedException` mapeada para 403 (reaproveitando `handleForbidden`); novo handler para `IllegalArgumentException` → 400 (necessário porque `create()` agora pode rejeitar path malformado antes mesmo de checar a allowlist).
- `src/test/java/.../discovery/ProjectDiscoveryServiceTest.java` — construtor atualizado (nova dependência) + 4 testes novos de defesa em profundidade.
- `src/test/java/.../orchestrator/AutoQaExecutionOrchestratorTest.java` — construtor atualizado + `@TempDir` + 2 testes novos de rejeição em `create()`.
- `src/test/java/.../orchestrator/AutoQaExecutionConcurrencyTest.java` — construtor atualizado (sem novo teste; este arquivo nunca exercita `create()`).

**Nenhum outro arquivo foi tocado.** `application.yml` permanece idêntico (`allowed-roots: []`, nenhum path pessoal adicionado). `CorsConfig.java`, `ApplyPathResolver.java`, `GeneratedPathResolver.java`, `CommandPolicyService.java`, `CommandResolver.java`, `TestExecutionService.java`, `ProcessExecutionService.java` — nenhum tocado.

## 4. Decisão arquitetural final

Defesa em profundidade com duas validações, uma única fonte de política: `AutoQaExecutionOrchestrator.create()` valida cedo (rejeita antes de persistir no Mongo); `ProjectDiscoveryService.discover()` valida de forma autoritativa (nunca confia na validação anterior, protege mesmo execuções reidratadas do Mongo criadas antes deste hardening). As duas chamadas delegam para a **mesma instância de política** — `ProjectPathSecurityValidator` — sem nenhuma lógica de comparação de root duplicada em nenhum dos dois pontos.

## 5. Descrição do componente central de segurança

`ProjectPathSecurityValidator` (`@Component`, único ponto de dependência: `AutoQaProperties`). Método público: `Path validate(Path projectPath)`. Sequência: (1) rejeita nulo/vazio; (2) resolve `toAbsolutePath().normalize()`; (3) resolve o **caminho real** (`toRealPath()`, segue symlinks) — se não existir, rejeita; (4) confirma que o real é diretório legível; (5) resolve cada `auto-qa.allowed-roots` configurada da mesma forma (absoluto + normalizado + real), descartando silenciosamente qualquer root inválida; (6) aceita somente se o real do `projectPath` for igual a uma raiz autorizada ou estiver estruturalmente contido nela (`Path.equals`/`Path.startsWith`, nunca comparação de `String`); caso contrário, lança `AutoQaProjectPathNotAllowedException`. Não conhece HTTP, Controller, DTO público, Mongo, `WorkflowStatus`, `availableActions`, agentes, comandos ou aplicação de arquivos — é exclusivamente política de filesystem, como instruído.

## 6. Comportamento final — allowedRoots vazia

`auto-qa.allowed-roots: []` (default, inalterado) → `resolveAuthorizedRoots()` retorna lista vazia → nenhum `projectPath` passa no `anyMatch` → **todo** `projectPath` é rejeitado com `AutoQaProjectPathNotAllowedException`, sem nenhum fallback implícito para diretório atual, home ou `/tmp`. Comprovado por `allowedRootsVaziaDeveRejeitarQualquerProjectPath` e `createDeveRejeitarQuandoAllowedRootsVazia`.

## 7. Comportamento com uma root

Aceita a própria root e qualquer descendente real dela; rejeita qualquer path fora, incluindo paths com prefixo textual parecido mas não estrutural (`allowed-root-malicioso` ao lado de `allowed-root` é corretamente rejeitado — comprovado por `naoDeveConsiderarPrefixoTextualParecidoComoAutorizado`).

## 8. Comportamento com múltiplas roots

Aceita se o path estiver dentro de **qualquer uma** das roots configuradas (não exige estar em todas) — comprovado por `pathValidoEmUmaDeMultiplasRootsDeveSerAceito`.

## 9. Comportamento da própria root como projectPath

`projectPath == allowedRoot` é aceito sem exigir subdiretório — comprovado por `aPropriaRootAutorizadaDeveSerAceita`.

## 10. Comportamento de subdiretório

Subdiretório real de uma root autorizada é aceito — comprovado por `subdiretorioDeRootAutorizadaDeveSerAceito`.

## 11. Comportamento fora da root

Rejeitado com `AutoQaProjectPathNotAllowedException` — comprovado por `pathForaDeTodasAsRootsDeveSerRejeitado`.

## 12. Traversal interno (permanece dentro da root)

`<root>/foo/../bar`, quando `bar` existe dentro da root, resolve para dentro dela e é **aceito** — a decisão é baseada no destino real resolvido, não em regex sobre a string de entrada. Comprovado por `traversalQuePermaneceDentroDaRootDeveSerAceito`.

## 13. Traversal externo (escapa da root)

`<root>/../outside-root` resolve para fora e é rejeitado. Comprovado por `traversalQueEscapaDaRootDeveSerRejeitado`.

## 14. Symlink interno

Um symlink dentro da root apontando para outro diretório real **dentro da mesma root** é aceito (resolvido para o alvo real, ainda contido na root). Comprovado por `symlinkApontandoParaDentroDeveSerAceito`.

## 15. Symlink externo (escape)

Um symlink dentro da root apontando para fora dela é **rejeitado** — a comparação usa o destino real (`toRealPath()`), não a localização aparente do link. Também coberto o caso da **própria root** ser um symlink apontando para fora (`rootQueESymlinkApontandoParaForaDeveSerRejeitada`). Ambos comprovados por teste, incluindo um teste de defesa em profundidade equivalente diretamente em `ProjectDiscoveryServiceTest.deveRejeitarSymlinkEscapandoDaRootAutorizada`.

## 16. Path inexistente

Preservado: rejeitado com `IllegalArgumentException("projectPath does not exist")`, mesma categoria de erro de antes desta subfase. Comprovado por `deveRejeitarProjectPathInexistente` e pelo teste pré-existente `deveRejeitarPastaInexistente` (permanece verde, sem alteração de comportamento observável).

## 17. Arquivo em vez de diretório

Preservado: rejeitado com `IllegalArgumentException("projectPath must be a directory")`. Comprovado por `deveRejeitarProjectPathQueSejaArquivo` e pelo teste pré-existente `deveRejeitarCaminhoQueNaoSejaDiretorio` (permanece verde).

## 18. Canonicalização

Segmentos redundantes (`/./`, resolução de `..`) são normalizados antes de qualquer comparação, e o resultado final é sempre o caminho **real** (symlinks resolvidos) — nunca comparação de `String`. Comprovado por `deveNormalizarSegmentosRedundantes`. Como efeito colateral correto (não um bug): uma root configurada que aponta para um arquivo (não diretório) é tratada como inválida e ignorada, nunca amplia permissão — comprovado por `rootConfiguradaApontandoParaArquivoDeveSerIgnorada` e pelo equivalente para root inexistente (`rootConfiguradaInexistenteDeveSerIgnorada`).

## 19. Integração no create()

`AutoQaExecutionOrchestrator.create()` chama `projectPathSecurityValidator.validate(Path.of(projectPath))` logo após a checagem de `auto-qa.enabled`, antes de qualquer persistência. Nenhuma lógica de canonicalização/traversal/symlink foi reimplementada no orquestrador — é delegação pura.

## 20. Integração no Discovery

`ProjectDiscoveryService.discover()` delega para a mesma política antes de chamar `projectScanner.scan(...)` — independente de `create()` já ter validado (defesa em profundidade real: comprovado com um `ProjectDiscoveryService` instanciado com uma allowlist diferente da usada no `create()` do orquestrador, rejeitando mesmo um diretório válido e legível que não esteja na allowlist específica do Discovery).

## 21. Comprovação de que repository.save não ocorre para path inválido

`createDeveRejeitarProjectPathForaDeAllowedRoots` e `createDeveRejeitarQuandoAllowedRootsVazia` chamam explicitamente `verifyNoInteractions(executionRepository)` (e o primeiro também `verifyNoInteractions(snapshotRepository)`) — comprovado que nenhum save ocorre quando a validação rejeita.

## 22. Impacto sobre Apply

Nenhum arquivo do pacote `apply` foi alterado. `FileApplicationService` continua obtendo `projectRoot` de `discovery.getNormalizedProjectPath()` — como esse `Path` agora é sempre um resultado já autorizado (resolvido pela mesma política central dentro de `discover()`), o Apply herda a proteção automaticamente, sem nenhuma mudança de código. `ApplyPathResolver` (traversal/symlink interno) permanece intocado e sua suíde de testes (não alterada) segue verde.

## 23. Impacto sobre Execute

Nenhum arquivo dos pacotes `execution`/`apply/exception` foi alterado. `TestExecutionService.execute(command, discovery.getNormalizedProjectPath())` recebe o mesmo `Path` já autorizado — H7 é resolvido inteiramente por consequência da correção em Discovery, sem segunda allowlist em `ProcessExecutionService`/`TestExecutionService`/`CommandResolver`.

## 24. Confirmação de que ProcessBuilder recebe working directory autorizado

`ProcessExecutionService.buildProcessBuilder` (linha inalterada) continua fazendo `processBuilder.directory(workingDirectory.toFile())`, onde `workingDirectory` é, transitivamente, o `Path` real retornado por `ProjectPathSecurityValidator.validate(...)` dentro de `ProjectDiscoveryService.discover()`. Nenhum caminho alternativo (bypass) foi identificado ou introduzido — `CommandSpecification.workingDirectoryReference` (campo decorativo já identificado no diagnóstico) permanece decorativo e não foi tocado, mas deixou de ser um risco real porque o valor que efetivamente chega ao `ProcessBuilder` agora é sempre autorizado.

## 25. Confirmação de que nenhuma nova flag START foi criada

Confirmado — nenhuma propriedade nova, nenhum enum novo, nenhum estado novo. `AutoQaExecutionOrchestrator.start()`/`generate()` permanecem exatamente como antes (nenhuma linha alterada nesses métodos). A causa raiz de B5 foi resolvida inteiramente pela allowlist fail-closed, conforme concluído no diagnóstico da 13.1 e reafirmado na aprovação.

## 26. Confirmação de que nenhum contrato público mudou

Confirmado — `AutoQaExecutionResponse`, `AutoQaExecutionListResponse`, `availableActions`, `AutoQaWorkflowStatus`, `AutoQaStage`, `AutoQaOperationStatus`, `ApplyApproval`, `ExecutionApproval` e todos os DTOs/endpoints existentes permanecem inalterados. A única mudança observável pelo cliente HTTP é: `create()` agora pode retornar **403** (path fora da allowlist ou allowlist vazia) ou **400** (path malformado/inexistente/não-diretório) em vez de aceitar silenciosamente qualquer path — que é exatamente o comportamento pretendido pela subfase, não uma mudança de contrato de dados.

## 27. Testes novos por classe

| Classe | Testes novos |
|---|---|
| `ProjectPathSecurityValidatorTest` (nova) | 18 |
| `ProjectDiscoveryServiceTest` | 4 |
| `AutoQaExecutionOrchestratorTest` | 2 |
| `AutoQaExecutionConcurrencyTest` | 0 (só ajuste de construtor) |
| **Total** | **24** |

## 28. Total de testes antes/depois

**Antes:** 1808. **Depois:** 1832. Nenhum teste pré-existente foi removido, desabilitado ou alterado em sua asserção original — os três arquivos de teste pré-existentes tocados só tiveram (a) ajuste de construtor/setUp para a nova dependência e (b) no caso do `AutoQaExecutionOrchestratorTest`, troca do path fictício `"/projeto"` por `tempDir.toString()` nos dois testes que chamam `create()` com sucesso esperado (necessário porque `"/projeto"` não existe de verdade e agora é validado).

## 29. Resultado da suíte Auto QA

`./gradlew test --tests "com.br.criarcenariotestes.business.autoqa.*"` → **BUILD SUCCESSFUL**, 0 falhas.

## 30. Resultado da suíte completa

`./gradlew test` → **BUILD SUCCESSFUL**, **1832/1832**, 0 falhas, 0 erros, 0 skipped.

## 31. Resultado do build

`./gradlew build` → **BUILD SUCCESSFUL** (compilação, testes, `bootWar`, `check`, `assemble` — tudo verde).

## 32. Riscos encontrados durante implementação

- Confirmado empiricamente (não por suposição) que `Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS)` retorna **`false`** para um path que é ele mesmo um symlink — ou seja, o código *anterior* a esta subfase já rejeitava (por efeito colateral acidental, não por design) qualquer `projectPath` raiz que fosse um symlink, mesmo apontando para um diretório legítimo. A nova implementação corrige isso deliberadamente: resolve o caminho real primeiro (`toRealPath()`) e só then aplica as checagens de diretório/legibilidade — um symlink raiz legítimo (apontando para dentro de uma root autorizada) passa a funcionar corretamente, e um symlink malicioso (apontando para fora) é rejeitado de forma determinística e testada, em vez de acidental.
- `ProjectDiscoveryServiceTest` e `AutoQaExecutionOrchestratorTest` instanciam a classe real diretamente (não via Spring), então a mudança de assinatura de construtor exigiu tocar esses dois arquivos de teste — risco antecipado e aceito na aprovação do diagnóstico.

## 33. Limitações

- A validação de `allowedRoots` ocorre em Java a cada chamada (sem cache) — não é um problema de performance real dado o volume de chamadas (criação/discovery de execução, não um hot path), mas registrado por completude.
- `AutoQaExecutionExceptionHandler.handleBadRequest` captura `IllegalArgumentException` de forma genérica, escopado apenas a `AutoQaExecutionController` (via `assignableTypes`) — não afeta nenhum outro controller do sistema, mas qualquer futuro `IllegalArgumentException` não relacionado a path, lançado dentro do fluxo de `create()`, também seria mapeado para 400 (comportamento considerado correto e desejável, não uma limitação real).

## 34. Dívidas técnicas mantidas (fora de escopo, não tocadas)

B1, B2, B3, B6 (CORS), H1 a H6, H8 a H13, e todos os achados MEDIUM/LOW/OBSERVATION do relatório geral da Fase 13 — nenhum foi tocado, conforme instruído.

## 35. Orientação necessária para configurar allowedRoots nos ambientes

**`auto-qa.allowed-roots` precisa ser explicitamente configurada em todo ambiente que for usar o Auto QA a partir de agora — sem isso, toda criação de execução (`POST /api/auto-qa/executions` seguido de `start`) será rejeitada com 403.** Isso vale para: ambiente de desenvolvimento local de quem for rodar o backend, ambiente de CI (se algum teste de integração real vier a depender de `create()`/`start()` contra filesystem real fora dos testes unitários já ajustados nesta subfase) e qualquer ambiente de deploy. Nenhum valor foi pré-configurado por esta implementação — `application.yml` permanece com `allowed-roots: []` (fail-closed by default, intencional). A decisão de qual(is) raiz(es) configurar é operacional e deve ser tomada por quem administra cada ambiente.

## 36. Confirmação de que nenhum path pessoal foi hardcoded

Confirmado por busca automatizada (`grep` por `/Users/<nome>/`, `/home/<nome>/`) em todos os arquivos novos e alterados — nenhuma ocorrência. `application.yml` não foi tocado. Todos os paths usados nos testes são gerados dinamicamente via `@TempDir`/`Files.createTempDirectory` (diretórios temporários reais do SO, não paths fixos de máquina de desenvolvedor).

## 37. Confirmação de que frontend não foi alterado

Confirmado — `git status` no repositório `gerar-cenario-teste-app` mostra apenas os relatórios desta e da fase anterior (não código); nenhum arquivo em `src/app/` foi tocado.

## 38. Confirmação de que CORS não foi alterado

Confirmado — `git diff` não mostra nenhuma alteração em `CorsConfig.java`; comando `git diff -- src/main/resources/application.yml` retorna vazio (nenhuma linha de CORS/allowed-origins adicionada).

## 39. Confirmação de que B6 continua pendente para 13.1B

Confirmado. `allowedOriginPatterns("*")` permanece exatamente como estava. B6 não foi classificado, redesenhado nem corrigido nesta subfase.

## 40. Confirmação de que nenhuma próxima subfase foi iniciada

Confirmado. Nenhum trabalho de 13.1B (CORS), 13.2 (máquina de estados/concorrência), CI/CD, recovery, ou qualquer mudança frontend foi iniciado.

## 41. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado. Apenas `git status`, `git diff` e `git diff --stat` (todos somente-leitura) foram executados, em ambos os repositórios. Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`clean`.

---

## Critérios de aceite (seções 47-49 da aprovação) — status

- **B4**: ✅ `allowedRoots` deixou de ser configuração morta; lista vazia bloqueia acesso; roots configuradas são efetivamente aplicadas; paths externos são rejeitados; coberto por 18 testes dedicados + regressão.
- **B5**: ✅ Nenhum usuário consegue iniciar Discovery/Knowledge sobre filesystem arbitrário; somente `projectPath`s explicitamente autorizados alcançam os scanners (validação autoritativa em Discovery, independente de `create()`); symlink/traversal não permitem escapar da root; nenhuma flag nova foi criada.
- **H7**: ✅ O working directory real usado pelo Execute deriva de um `projectPath` que passou pela política central autoritativa (via `ProjectDiscoveryResult.getNormalizedProjectPath()`); nenhum caminho alternativo identificado; proteções existentes de comando permanecem intactas e com suíte verde.

**PARADO conforme instruído.** Aguardando revisão e aprovação explícita antes de iniciar qualquer outra subfase (13.1B ou 13.2).
