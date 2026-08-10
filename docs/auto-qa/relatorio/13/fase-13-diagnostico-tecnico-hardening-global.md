# FASE 13 — HARDENING GLOBAL
## Diagnóstico Técnico Integrado do Auto QA BMAD

**Data:** 2026-08-09
**Escopo:** DIAGNÓSTICO PURO — nenhum arquivo foi alterado, nenhum comando Git de escrita foi executado.
**Metodologia:** 6 investigações paralelas (read-only), cada uma cobrindo uma fatia do sistema — backend (arquitetura/máquina de estados, concorrência/idempotência, persistência/crash-recovery/apply/comandos, segurança/config/API/observabilidade/infra), contrato backend↔frontend, e frontend completo (arquitetura/state/a11y/responsividade/performance/testes/E2E) — com leitura direta de código-fonte, execução real (não-destrutiva) de testes existentes, e cruzamento de achados entre investigações independentes.

Repositórios analisados:
- Backend: `/Users/jeanheberth/Development/api/criar-cenario-testes` (pacote `com.br.criarcenariotestes.business.autoqa`)
- Frontend: `/Users/jeanheberth/Development/front/gerar-cenario-teste-app` (feature `src/app/features/auto-qa-bmad`)

---

## 1. Baseline encontrado

Confirmado por leitura E execução real (não apenas documentação):

| Item | Backend | Frontend |
|---|---|---|
| Testes unitários | 163 arquivos de teste no módulo `autoqa` | **382/382 SUCCESS** (execução real, Chrome Headless) |
| E2E | — | **24/24 passed** (execução real, Desktop+Mobile, contra backend real em `localhost:8089`) |
| Build | compila (`build -x test`, ver achado CI-1) | `ng build` produção OK, chunk `auto-qa-bmad-routes` = 105.64 kB raw / 19.09 kB transfer, lazy-loaded |
| Classificação anterior | Backend encerrado na Fase 12 | `RELEASE_CANDIDATE_APPROVED_WITH_KNOWN_LIMITATIONS` (Fase 12.3.9) |

O baseline frontend do ciclo 12.3.x é **real e reconfirmado por execução**. O baseline backend ("encerrado antes do frontend") está funcionalmente correto no caminho feliz, mas esta auditoria encontrou **6 achados BLOCKER** que não eram visíveis nos testes existentes porque residem em caminhos não cobertos por eles (concorrência real multi-thread, crash de processo, ausência de allowlist de filesystem, CORS).

---

## 2. Arquitetura backend

**Pontos fortes (KEEP_AS_IS):**
- `AutoQaExecutionController` não contém lógica de domínio — delega 100% para `AutoQaExecutionOrchestrator`/`AutoQaExecutionQueryService`, fronteira API/domínio limpa.
- `AutoQaExecutionResponseMapper` mapeia campo a campo (sem reflection), nunca expõe `projectPath`.
- Decisões de transição (`AutoQaTransitionValidator`) e ações disponíveis (`AutoQaAvailableActionResolver`) são corretamente delegadas pelo orquestrador, não reimplementadas.

**Achados relevantes:**
- **`AutoQaWorkflowService` é código morto** que duplica quase integralmente a lógica de `AutoQaStageExecutor` (mesmo loop de agentes, mesmo tratamento de erro), mas nunca é injetado por nenhum controller — só é citado em javadoc. Risco real: qualquer correção de regra precisa ser replicada manualmente nos dois lugares, sem teste de contrato entre eles. **(HIGH)**
- **Duplicação estrutural de pré-condições** entre os 8 métodos `registerXxx()` de `AutoQaContext` e entre os agentes BMAD (`ApplyAgent`, `ExecuteAgent`, etc.) — cada um reimplementa manualmente a cadeia de "checar resultado anterior nulo/status ruim". Já existe **inconsistência real comprovada**: `ApplyAgent` usa deny-list para `ReviewStatus` rejeitado, `ExecuteAgent` usa allow-list — hoje equivalentes, mas divergem silenciosamente se um novo valor for adicionado ao enum no futuro. **(MEDIUM-HIGH)**
- **Execução síncrona disfarçada de assíncrona**: os endpoints de ação retornam HTTP `202 Accepted`, mas `AutoQaExecutionOrchestrator.runBlockInternal` executa o bloco de agentes de forma totalmente síncrona na thread HTTP (sem `@Async`/fila/executor em todo o pacote). Semântica enganosa + risco de timeout de proxy/gateway em blocos longos + amplia a janela de corrida de concorrência (achado cross-validado por 3 investigações independentes). **(HIGH)**
- `FailureAnalysisAgent` quebra o padrão defensivo dos demais agentes (lança `IllegalStateException` em vez de `failureSkip` gracioso) — inconsistência de estilo, sem impacto funcional real hoje. **(LOW)**
- `AutoQaExecutionOrchestrator` concentra 9 operações públicas + 7 privadas (~320 linhas) — tendência de "god class", mas delega corretamente as regras de negócio às classes especializadas; monitorar crescimento. **(OBSERVATION)**

---

## 3. Máquina de estados

**Pontos fortes (KEEP_AS_IS):** `AutoQaTransitionValidator` está correto e bem coberto por teste para toda transição de origem exata e para checagem de aprovação prévia (`hasApproval` filtra corretamente por `approved()`). Bloqueio otimista (`@Version`) impede sobrescrita silenciosa de escrita concorrente.

**Achados BLOCKER (o núcleo mais grave deste diagnóstico, confirmado independentemente por 3 investigações diferentes):**

1. **Exceções não capturadas em `runBlockInternal` travam a execução para sempre em `IN_PROGRESS`.** As chamadas `loadSnapshot`, `snapshotMapper.toContext` e `saveSnapshotWithLockHandling` (esta última executada **depois** que os agentes reais já rodaram) estão **fora** do único `try/catch` do método, que cobre apenas `stageExecutor.executeStages(...)`. Qualquer exceção nessas chamadas propaga sem passar por `finalizeFailure` — o documento nunca volta para `FAILED`, ficando `IN_PROGRESS` permanentemente. Se a falha ocorrer após o `Apply` já ter escrito arquivos reais no projeto do usuário, esse efeito colateral irreversível nunca é refletido no estado persistido. `AutoQaExecutionOrchestrator.java:177,178,197,198` (fora do try/catch das linhas 180-185).
2. **Nenhuma recuperação após restart da aplicação.** Não existe `@Scheduled`/`ApplicationRunner`/`@PostConstruct` de reconciliação em todo o pacote `autoqa`. Um crash/deploy/kill durante um bloco `IN_PROGRESS` deixa a execução travada para sempre — a única saída é edição manual direta no MongoDB.
3. **`validateCancel` não respeita o lock `IN_PROGRESS`** — é o único método de `AutoQaTransitionValidator` que não chama `requireNotLocked()`, apesar do próprio docstring da classe prometer essa proteção para toda ação. Isso permite cancelar uma execução enquanto outro bloco sensível (`Apply`/`Execute`) ainda está processando em outra requisição — o resultado é um documento com `workflowStatus=CANCELLED` (terminal) + `operationStatus=IN_PROGRESS` (permanentemente preso), e o efeito colateral real do bloco original (arquivo aplicado, comando executado) pode ter ocorrido sem nunca ser persistido. `AutoQaTransitionValidator.java:68-73` vs. todos os demais métodos (21-66).

**Achados adicionais:**
- `CONTINUE` pode ser oferecido pelo `AutoQaAvailableActionResolver` em estado `FAILED` mesmo quando `lastStageStarted` é nulo (janela estreita, mas o caminho de código existe), garantindo `AutoQaInvalidTransitionException` se usado — availableActions incompatível com o estado real. **(MEDIUM, YES)**
- Dois vocabulários distintos para "nenhuma ação disponível": `Set.of()` vazio (lock `IN_PROGRESS`) vs. `Set.of(NONE)` (módulo desabilitado/`CANCELLED`) — ambíguo para o consumidor da API. **(MEDIUM, FUTURE)**
- `currentStage` nunca diverge de `lastStageCompleted` em nenhum caminho real de código — é campo redundante que não reflete progresso em tempo real durante um bloco em andamento. **(MEDIUM, FUTURE)**
- `AutoQaWorkflowStatus.RUNNING` é um estado inalcançável em produção (nunca atribuído). **(LOW/OBSERVATION)**
- Gaps de teste de integração: os três BLOCKERs acima **não são cobertos por nenhum teste existente** — a suíte testa `AutoQaTransitionValidator`/`AutoQaAvailableActionResolver` isoladamente, não a integração real com `AutoQaExecutionOrchestrator` nesses cenários combinados. **(MEDIUM, YES — pré-requisito para corrigir com segurança)**

---

## 4. Concorrência

**Mecanismo existente confirmado sólido para 6 dos 7 cenários pedidos:** o par `requireNotLocked` (checagem de negócio) + `@Version` (optimistic lock físico do Mongo) protege corretamente START/CONTINUE/GENERATE/APPLY/EXECUTE duplos e aprovação duplicada — comprovado por 7 testes reais em `AutoQaExecutionConcurrencyTest`. Duas requisições concorrentes nunca produzem execução duplicada de agentes nesses seis endpoints.

**O único cenário sem proteção é exatamente o mesmo achado #3 da Seção 3: CANCEL durante operação em andamento.** Isso confirma, por uma segunda linha de investigação independente, que é o achado mais crítico do diagnóstico.

**Retry do cliente após 409:** seguro quando o conflito ocorre no primeiro save (nada aconteceu ainda); **arriscado** se ocorrer no save final após `Apply`/`Execute` já terem rodado (só possível via o bug do CANCEL) — o cliente não tem como distinguir "nada aconteceu" de "aconteceu mas não foi salvo", podendo duplicar a aplicação/execução ao tentar de novo.

**Restart durante operação `IN_PROGRESS`:** mesmo achado da Seção 3 (#2), sem mecanismo de detecção.

**Achado adicional:** não-atomicidade entre `AutoQaExecutionDocument` e `AutoQaExecutionSnapshot` (duas coleções Mongo, sem `@Transactional`/`ClientSession`) — janela de inconsistência recuperável, amplifica os BLOCKERs acima. **(MEDIUM, FUTURE)**

---

## 5. Idempotência

| Operação | Idempotente? | Proteção atual | Risco | Recomendação |
|---|---|---|---|---|
| START | Não, mas safe-guarded (409 na repetição) | `requireNotLocked` + `requireStatus` + `@Version` | Baixo | Manter |
| CONTINUE | Não, mas safe-guarded | idem + `requireStatus(FAILED)` | Baixo | Manter |
| GENERATE | Não, mas safe-guarded | idem | Baixo | Manter |
| APPROVE_FILE_UPDATE | Não (mas 2ª chamada rejeitada) | `hasApproval` + lock otimista do snapshot | Baixo | Manter |
| APPLY | Não, mas safe-guarded na quase totalidade dos casos | `requireNotLocked` + `hasApproval` + `@Version` | **Baixo isolado; ALTO combinado com o bug do CANCEL** | Resolver Seção 3 primeiro |
| APPROVE_EXECUTION | Não (2ª chamada rejeitada) | idem a APPROVE_FILE_UPDATE | Baixo | Manter |
| EXECUTE | Não, mas safe-guarded na quase totalidade | idem a APPLY | **Baixo isolado; ALTO combinado com o bug do CANCEL — pior caso do sistema (comando de shell duplicado)** | Resolver Seção 3 primeiro |
| CANCEL | Idempotente entre si mesmo | Apenas `terminal()`, **sem `requireNotLocked`** | **ALTO/BLOCKER** | Ver Seção 3 |

Adicionalmente: reaplicação do bloco **Execute** após uma eventual intervenção manual (reset de `operationStatus`) **não tem nenhuma proteção de idempotência** (diferente do Apply, que tem verificação de hash) — um comando de teste com efeitos colaterais reais (chamada a API externa, seed de dados) pode rodar duas vezes sem detecção. **(HIGH, YES)**

---

## 6. Persistência

**Pontos fortes (KEEP_AS_IS):** `@Version` usado corretamente nas duas coleções; índice único em `executionId`; paginação feita no servidor Mongo (não em memória).

**Achados:**
- **Múltiplos saves não atômicos por operação lógica** — cada ação sensível faz 3 saves sequenciais e independentes (documento com lock → snapshot → documento final), sem transação Mongo. Crash entre eles gera inconsistência. **(HIGH, YES)**
- **Documento pode ficar órfão sem Snapshot correspondente** — `create()` salva o Document antes do Snapshot; um crash nesse intervalo deixa uma execução visível na listagem mas inutilizável para sempre (`AutoQaExecutionNotFoundException` em qualquer ação subsequente). **(HIGH, YES)**
- **Configuração morta gerando falsa sensação de controle operacional**: `retentionDays`, `generatedDirectory`, `backupDirectory`, `maxExecutionMinutes`, `maxConcurrentExecutions` estão todos declarados em `AutoQaProperties`/`application.yml`, documentados, mas **nenhum é lido em produção** — editar esses valores não tem efeito algum. Este é um padrão recorrente que apareceu em 5 propriedades diferentes. **(MEDIUM, YES — é uma correção barata: ou conectar, ou remover a configuração enganosa)**
- Crescimento indefinido de coleção/diretórios sem TTL/archive — dívida real, mas não crítica no volume atual. **(FUTURE)**

---

## 7. Recuperação após crash

Confirmado por código, estágio a estágio (não suposição):

| Estágio | Escreve fora da própria API? | Retomada automática após crash? | Risco de duplicar efeito colateral |
|---|---|---|---|
| Discovery / ScenarioAnalysis / ProjectKnowledge / Planning | Não (leitura + IA) | Não | Baixo — idempotente por natureza |
| Generation / Review | Só na área própria da API (`.auto-qa/generated/<id>`) | Não | Baixo |
| **Apply** | **Sim — escreve no projeto real do usuário** | Não | Médio — mitigado por verificação de hash |
| **Execute** | **Sim — dispara processo externo (testes, build)** | Não | **Alto — sem nenhuma mitigação** |
| FailureAnalysis / Learning | Não (leitura + IA) | Não | Baixo |

Toda a execução do bloco é síncrona na thread HTTP (nenhum `@Async`/fila em todo o sistema) — "crash no meio de um estágio" significa literalmente o processo da API morrendo durante aquela requisição específica.

**Achado adicional grave:** mesmo que um operador resete manualmente `operationStatus` após um crash, `continueExecution` decide qual bloco retomar usando `lastStageStarted`, que **só é atualizado ao final de um bloco bem-sucedido** — não reflete o bloco realmente truncado pelo crash. Um `continue` pós-reset pode re-executar o bloco anterior (já concluído) em vez do bloco interrompido. **(HIGH, YES)**

`CONTINUE` só é aceito com `workflowStatus=FAILED` — não há re-trigger automático oculto. **(KEEP_AS_IS)**

---

## 8. File application

**Pontos fortes (KEEP_AS_IS) — mitigações robustas e testadas:**
- Path traversal bloqueado (`../`, absoluto, `file://`) com testes dedicados (`ApplyPathResolverTest`).
- Symlinks em qualquer segmento do caminho individual rejeitados.
- CREATE nunca sobrescreve; UPDATE sempre passa por backup antes de escrever.
- TOCTOU mitigado: hash capturado na detecção, revalidado imediatamente antes da escrita, validado após.
- Rollback parcial é sinalizado como `FAILED`/`ROLLBACK_INCONSISTENT_STATE`, nunca mascarado como sucesso.

**Achado BLOCKER — confirma e detalha a dívida já conhecida de fases anteriores:**
`auto-qa.allowed-roots` está declarado em `AutoQaProperties`/`application.yml`, mas **não é lido em nenhum lugar do código-fonte** (confirmado por grep completo). `ProjectDiscoveryService.normalizeAndValidate` — único ponto de validação de `projectPath` em todo o sistema — só checa existência/tipo/legibilidade, **nunca contra uma lista de raízes permitidas**. Isso significa: **qualquer chamador pode apontar `projectPath` para qualquer diretório legível pelo processo** (incluindo fora do escopo pretendido de "projetos de teste"), e o `Apply` escreverá de fato nesse diretório. **A dívida conhecida AINDA EXISTE, confirmada pelo código atual.** **(BLOCKER, YES — prioridade máxima da Fase 13)**

**Achado adicional:** rollback não sobrevive a `kill -9`/OOM no meio do laço de aplicação de múltiplos arquivos — os já escritos ficam aplicados, sem qualquer registro que um processo de reconciliação futuro possa usar automaticamente (o `backup-manifest.json` existe, mas nada o lê para reconciliar). **(HIGH, YES)**

---

## 9. Command execution

**Pontos fortes (KEEP_AS_IS) — a camada mais robusta do backend:**
- `ProcessBuilder` com lista de argumentos, nunca concatenação de string nem `bash -c`/`Runtime.exec(String)` — sem shell injection.
- Universo de comandos fechado em enum (`ExecutionCommandId`) com allowlist de executável + prefixo obrigatório de argumento por comando.
- Rejeição adicional (redundante, defesa em profundidade) de metacaracteres de shell.
- `allowCommandExecution` **E** `sensitiveActionsEnabled` exigidos simultaneamente — nenhum bypass encontrado.
- Ambiente do processo filho é `clear()` + allowlist de 8 chaves não sensíveis — não herda env completo do pai.
- `CommandSpecification` rejeita estruturalmente qualquer chave que combine com regex de segredo (key/token/secret/password/credential/auth).

**Achados:**
- **Working directory herda a mesma ausência de allowlist do `projectPath`** (Seção 8) — a política de *qual comando* rodar é sólida, mas *onde* ele roda é irrestrito. Resolvido automaticamente ao corrigir a Seção 8. **(HIGH, decorrência direta)**
- Redação de segredos em stdout/stderr é regex best-effort (padrões `Bearer <token>`, `chave: valor`) — mitigação real, mas não é garantia absoluta (não cobre segredo em JSON aninhado ou base64 sem padrão reconhecível). **(MEDIUM, FUTURE)**
- Timeout de comando (10 min) é hardcoded no código, ignorando `AutoQaProperties.maxExecutionMinutes` (mesmo valor por coincidência, não por leitura real). **(LOW, mesmo padrão de config morta da Seção 6)**

---

## 10. Segurança backend

**Achados BLOCKER:**
1. **Combinado com a Seção 8**: leitura arbitrária de filesystem do servidor **sem nenhum gate de flag sensível no estágio `start`** (diferente de `apply`/`execute`, que exigem flags). O `Discovery` varre recursivamente (profundidade 4, **sem limite de arquivos/tamanho** — diferente do scanner de Knowledge, que tem limites configuráveis) e envia metadados estruturados do projeto (nomes, estrutura, regras de negócio extraídas) para provedores de IA externos (OpenAI/Gemini) configurados. Sem autenticação, sem allowlist de raiz, funciona com a configuração padrão de fábrica. **(YES, antes de qualquer exposição fora de localhost)**
2. **CORS aberto globalmente** (`allowedOriginPatterns("*")` em `/**`, incluindo os endpoints do Auto QA) — já registrado como risco conhecido na Fase 12.1 e **ainda não corrigido**. Combinado com o achado acima, qualquer página web arbitrária carregada no navegador de alguém com acesso de rede ao host pode disparar chamadas cross-origin diretas. **(YES, antes de produção)**

**Achados adicionais:**
- Ausência de autenticação real é dívida **já aceita como fora de escopo** em fases anteriores — não é reproposta aqui. Porém, os dois BLOCKERs acima são agravantes concretos que tornam essa ausência mais grave do que "CRUD comum sem login". **(OBSERVATION sobre a dívida em si, mas os agravantes são YES)**
- `approvedBy` é texto livre sem verificação de identidade — "o próprio ato de chamar o endpoint é a aprovação" (documentado assim intencionalmente). Risco real de personificação, mas consistente com a decisão de não ter auth. **(MEDIUM, FUTURE)**
- Mensagens de exceção não previstas (fora das 4 famílias tratadas por `AutoQaExecutionExceptionHandler`) caem no handler genérico da aplicação, que devolve `ex.getMessage()` cru em HTTP 500 — stacktrace não vaza, mas mensagem de exceção interna sim. **(LOW/MEDIUM, FUTURE)**
- `server.error.include-message: always` no `application.yml` expõe nome de classe de exceção + mensagem na rota de erro padrão do Spring. **(LOW, FUTURE)**

**KEEP_AS_IS confirmado:** `ProjectScanPolicy` já exclui `.env`/`.pem`/`.key`/`.crt` da varredura; logs de comando nunca imprimem stdout/stderr completo nem path absoluto; duas flags exigidas para ação sensível.

---

## 11. Configuração

**KEEP_AS_IS confirmado:** `allowFileApplication`, `allowCommandExecution`, `sensitiveActionsEnabled` têm default `false` de forma **coerente** entre `application.yml` e `AutoQaProperties.java` — nenhum default inseguro "por engano".

**Achado HIGH:** o mesmo padrão de "configuração morta" identificado nas Seções 6 e 9 se repete para `allowedRoots` (o mais crítico, Seção 8), `retentionDays`, `maxConcurrentExecutions`, `generatedDirectory`, `backupDirectory`, `maxExecutionMinutes` — todos declarados e documentados no `application.yml`, nenhum efetivamente lido pelo código de produção. Isso já era um risco identificado na documentação da Fase 12.1 ("bloco `auto-qa:` do yml morto — falsa sensação de segurança") e a reconexão planejada não foi feita. **(YES para `allowedRoots`; FUTURE para os demais, mas recomenda-se resolver todos juntos por serem a mesma causa raiz)**

**Achado adicional:** limites de tamanho/quantidade de arquivo (`maxFileSizeKb`/`maxFiles`/`maxTotalContentKb`) só são aplicados no scanner de Knowledge, não no de Discovery (que roda primeiro e tem alcance maior dado o achado da Seção 10). **(YES, alinhar os dois scanners)**

---

## 12. API pública

**KEEP_AS_IS confirmado:** semântica HTTP bem aplicada — `POST` cria (201 + Location), ações de transição retornam 202, mudanças de estado imediatas retornam 200; mapeamento de erro correto e completo (400/403/404/409/422). DTOs públicos bem definidos, sem exposição de `projectPath` ou campos internos (mapeamento campo a campo, nunca reflection).

**Achados menores:** sem prefixo de versionamento (`/v1/`) e inconsistência de convenção entre controllers do sistema mais amplo (não específico do Auto QA); resposta de listagem não expõe `totalPages`; documentação de fase anterior descreve endpoints (`generated-files`, SSE, `DELETE`) que não existem no controller atual — indica documentação desatualizada, não bug. **(FUTURE/OBSERVATION)**

---

## 13. Contrato backend/frontend

**Resultado da comparação campo a campo** entre `AutoQaExecutionResponse`/DTOs/mappers/enums do backend e `auto-qa-execution.model.ts`/catálogos do frontend: **coerente e sincronizado 1:1**. Todos os campos existentes nos dois lados batem em nome, tipo e nullability (`executionId`, `scenario`, `status`, `currentStage`, `lastStageStarted`, `lastStageCompleted`, `attempt`, `progress`, `availableActions`, `warnings`, `errors`, timestamps). Todos os enums (`AutoQaWorkflowStatus` 8 valores, `AutoQaStage` 10 valores, `AutoQaAvailableAction` 14 valores) são idênticos valor a valor, inclusive ordem. **Nenhum bug real de contrato encontrado.**

Campos que existem no domínio/documento mas não são expostos publicamente (`approvals`, `stages` detalhados) — o frontend corretamente não os assume; representam perda de granularidade de auditoria/timeline na UI, não bug. **(LOW, FUTURE)**

---

## 14. AvailableActions

**Confirmado rigorosamente: o frontend NÃO deriva permissão de ação por heurística local em nenhum ponto.** Busca ampla por comparações diretas de `status`/`currentStage` para habilitar/desabilitar botões retornou vazio. `ActionBarComponent`, os painéis de aprovação, a Stage Timeline e `execution-detail-page` consomem exclusivamente o array `availableActions` vindo do backend; as únicas comparações de status/stage encontradas são estritamente cosméticas (cor da timeline). **(KEEP_AS_IS — disciplina exemplar, manter)**

Único ponto de atenção: `RETRY` é enum público nos dois lados, mas o backend **nunca o produz** (`AutoQaAvailableActionResolver` não tem nenhum `case` que o adicione) e não há endpoint `/retry` — o frontend corretamente o trata como não-funcional. Comportamento consistente, não é bug. **(OBSERVATION / CONTRACT GAP)**

---

## 15. Gaps conhecidos de contrato

Revalidados no código atual — todos **AINDA EXISTEM**, nenhum foi resolvido ou mudou:

| Item | Situação | Backend expõe? |
|---|---|---|
| Generated Files / Preview | `content` é explicitamente removido (`null`) antes de persistir no snapshot; sem endpoint | NÃO |
| Diff | Nenhum campo/endpoint em nenhum DTO | NÃO |
| Logs (stdout/stderr) | `ExecutionResult` nunca chega ao snapshot nem ao DTO público (único estágio sem `set`/`get` no mapper de snapshot) | NÃO |
| Retry | Enum existe, resolver nunca o produz, sem endpoint | NÃO (enum morto) |
| Failure Analysis detalhado | `FailureAnalysisResult` existe no domínio, não é persistido no snapshot nem exposto | NÃO |
| Learning detalhado | `LearningResult` existe no domínio, mesma ausência | NÃO |
| ApplyOperation (resultado de arquivos) | Persistido **sem sanitização** no snapshot interno, mas nunca chega ao DTO público | NÃO (dado sensível não sanitizado no Mongo — ver achado abaixo) |
| ExecutionCommandId executado | Não retorna em nenhum DTO público | NÃO |

Todos classificados corretamente como **CONTRACT GAP / FUTURE CAPABILITY**, não bugs — conforme a regra do projeto.

**Achado adicional (não previsto na lista original, encontrado durante a comparação):** `ApplyResult` é persistido **sem a mesma sanitização** aplicada a discovery/knowledge/generation no snapshot Mongo interno — risco de dado sensível (paths, conteúdo indireto) em texto não sanitizado no banco, mesmo não sendo exposto via API. **(MEDIUM, FUTURE)**

---

## 16. Arquitetura frontend

**Nenhum problema estrutural relevante encontrado — resultado muito positivo.** Componentes de página (`execution-detail-page`, `execution-list-page`) delegam corretamente lógica de domínio para `models/*catalog*`/`shared/utils`, HTTP fica exclusivamente no service, estado fica exclusivamente no state service. Nenhuma duplicação de estado real (padrão "controlled component" consistente). Nenhum `effect()` com side-effect HTTP. `computed()` usado de forma leve e correta em todos os pontos. Único ponto estilístico: dois `.subscribe()` dentro do state service sem `takeUntilDestroyed` — irrelevante na prática (serviço singleton, Observable do HttpClient completa sozinho). **(KEEP_AS_IS predominante; LOW/FUTURE no ponto estilístico)**

---

## 17. Angular/Node/TypeScript/RxJS

Versões reais confirmadas: `@angular/core` 22.1.0, `@angular/cli` 22.1.3, `typescript` 6.0.3, `rxjs` 7.8.2, `zone.js` 0.15.1, `@playwright/test` 1.62.1, Node de execução v26.3.0. `package.json`/`package-lock.json` coerentes. **Nenhuma versão desatualizada de forma preocupante.** Ausência de `engines.node` em `package.json` e de `.nvmrc` — sem pin de versão de Node para CI/onboarding. **(LOW/OBSERVATION, FUTURE)**

---

## 18. State management

`AutoQaExecutionStateService` (176 linhas, lido integralmente): guards corretos contra ação reentrante (`dispatch()` ignora nova ação enquanto `pendingAction()` ativo), sem atualização otimista indevida (`_current` só muda após resposta real do backend), erro preserva `current()` anterior (testado explicitamente), `finalize()` limpa `pendingAction()` em sucesso E erro (testado), nenhuma mutação direta de signal, duplo-clique protegido em múltiplas camadas.

**Achado real (MEDIUM):** `loadExecution()`/`loadList()` (refresh manual) e `dispatch()` (ações) usam **guards independentes, não coordenados**. O botão "Atualizar" não é desabilitado quando há uma ação em andamento (`canRefresh` não checa `pendingAction()`). Um clique quase simultâneo em "Atualizar" + uma ação pode fazer a resposta do GET (capturada antes da ação completar) sobrescrever `_current()` com dado desatualizado, sem qualquer indicação de erro — a tela "parece" funcionar mas mostra estado obsoleto até o próximo refresh. **(MEDIUM, FUTURE)**

---

## 19. HTTP

Confirmado: nenhum componente usa `HttpClient` diretamente — está isolado no service. Tratamento de erro centralizado no state service via mapeamento estático (nunca repassa `error.error` cru do backend — trade-off consciente segurança vs. detalhamento, documentado e testado). Sem `switchMap`/cancelamento necessário (não há polling).

**Achado real (MEDIUM/HIGH):** **nenhum timeout HTTP configurado** em nenhum ponto (nem no service, nem via interceptor global). Se uma chamada de ação travar por rede lenta/backend não respondendo, `pendingAction()` fica preso indefinidamente, bloqueando toda a Action Bar sem qualquer feedback de erro — pior experiência que um erro explícito, sem rota de recuperação exceto reload manual da página. **(MEDIUM/HIGH, FUTURE)**

---

## 20. Segurança frontend

**Nenhum vetor de XSS encontrado.** Zero ocorrências reais de `innerHTML`/`bypassSecurityTrustHtml`/`eval` na feature (só comentários JSDoc reforçando a proibição). Todo conteúdo vindo do backend (mensagens de erro, warnings, scenario) é renderizado via interpolação `{{ }}`, que o Angular sanitiza automaticamente. **(KEEP_AS_IS)**

---

## 21. Acessibilidade

**Pontos fortes confirmados:** modais (`AqbModalComponent`, reutilizado por todos os modais de confirmação) têm `role="dialog"`/`aria-modal`, focus trap real, retorno de foco, Escape funcional — validado inclusive por E2E real. Action Bar com `role="group"`/labels acessíveis. Formulário de nova execução com labels corretamente associados.

**Achado real (MEDIUM):** `StageTimelineComponent` anuncia `role="listbox"` (ARIA), mas **todos os itens têm `tabindex="0"` simultaneamente** — não implementa roving tabindex nem navegação por seta (padrão ARIA APG para listbox), diferente do `ExecutionInspectionPanelComponent` (abas), que implementa esse padrão corretamente e tem E2E cobrindo. Inconsistência real entre dois componentes de navegação por teclado da mesma feature. **(MEDIUM, FUTURE)**

**Achado menor:** mensagem de erro de campo de formulário não está associada ao input via `aria-describedby` (só `aria-invalid` genérico). **(LOW/MEDIUM, FUTURE)**

---

## 22. Responsividade

As correções H1 (overflow) e H2 (contraste) da Fase 12.3.9 **seguem presentes e corretas** no código atual, comentários originais intactos. Stage Timeline e Inspection Panel já tratam corretamente overflow horizontal em mobile.

**Achado menor:** `ExecutionSummaryComponent` não tem `overflow-wrap`/`word-break` nas células de dados — `executionId` (UUID) e principalmente `cancellationReason` (texto livre sem limite) podem, em telas de 390px, ultrapassar a largura do container dependendo do motor de renderização. **(LOW/MEDIUM, FUTURE)**

---

## 23. Performance

**100% de cobertura** de `ChangeDetectionStrategy.OnPush` (34 de 34 componentes). **100%** dos `@for` usam `track` com chave estável. Rota lazy-loaded corretamente configurada. Chunk da feature é pequeno (105.64 kB) e não é responsável pelo tamanho do bundle inicial da aplicação (1.77 MB, mas isso pertence a outras features fora do escopo). **(KEEP_AS_IS — nenhuma otimização necessária)**

---

## 24. Testes backend

163 arquivos de teste no módulo `autoqa`. Cobertura qualitativamente boa e não superficial nas áreas centrais: orchestrator (422 linhas de teste), transitions (207 linhas), concurrency (199 linhas, 7 cenários reais), apply (9 arquivos incluindo path traversal e rollback), execution/command (`CommandPolicyServiceTest` com 316 linhas), failure analysis (6 arquivos) e learning (13 arquivos, muito granular).

**Gap real identificado (cruzando com as Seções 3/6/7):** nenhum teste cobre (a) exceção não capturada dentro de `runBlockInternal` deixando lock órfão; (b) `cancel()` concorrente com operação `IN_PROGRESS`; (c) `FAILED` com `lastStageStarted` nulo. Os três BLOCKERs/HIGH mais graves deste diagnóstico existem exatamente nos pontos de **integração** entre componentes bem testados isoladamente — um "falso senso de segurança" real (suíte passa 100%, mas não exercita esses caminhos). **(MEDIUM/HIGH, YES — adicionar antes de corrigir)**

Também não foi localizado teste específico de path traversal para o `projectPath` de entrada (só há cobertura para paths *internos* pós-resolução em apply/generation). **(MEDIUM, YES)**

---

## 25. Testes frontend

49 arquivos de spec, **382/382 SUCCESS confirmado por execução real**. Qualidade alta, não superficial: `auto-qa-execution-state.service.spec.ts` (426 linhas) testa explicitamente reentrância, preservação de estado em erro 403/409/422, limpeza de `pendingAction` em sucesso e erro. Painéis puramente apresentacionais (`apply-approval-panel`, `execution-approval-panel`) corretamente não têm teste de erro HTTP próprio, pois não fazem HTTP — o padrão de erro já é coberto no state service. **(KEEP_AS_IS)**

---

## 26. E2E

24/24 passando, confirmado por execução real contra backend real. 8 arquivos de spec cobrindo: Create (fluxo completo real), Dashboard, estrutura visual do painel de aprovação de arquivo, navegação do Inspection Panel (incluindo teclado), Workflow Overview/Timeline, acessibilidade de modal (genérica), erro 500/404 sanitizados.

**Achado HIGH real:** dos 11 fluxos críticos pedidos (Create, Start, Continue, Generate, Approval-file, Apply, Approval-execution, Execute, Cancel, Failure, Recovery), **apenas Create tem E2E de ponta a ponta real contra o backend**; Approval-file tem E2E parcial (só estrutura visual do painel, não o submit real). **Os outros 9 fluxos — incluindo os operacionalmente mais sensíveis (Apply, Execute, Cancel) — dependem inteiramente de testes unitários com mock**, sem rede de segurança de integração real. Regressões nesses fluxos só seriam detectadas por teste unitário isolado (que mocka o service) ou em produção. **(HIGH, FUTURE — mas recomendado priorizar Apply/Execute primeiro por serem as ações mutáveis/perigosas)**

---

## 27. Integração real

Caminho `Angular → Execution API → Orchestrator → Agents → Persistence → Filesystem → Command execution → Response → Frontend` mapeado. Pontos de falha identificados e já detalhados: execução síncrona bloqueante (Seção 2), ausência de allowlist de filesystem (Seção 8/10), ausência de recovery pós-crash (Seção 7), ausência de timeout HTTP no cliente (Seção 19), ausência de idempotência no Execute em retomada manual (Seção 5/9). Ausência de observabilidade suficiente para diagnosticar esses pontos de falha em produção — ver Seção 28.

---

## 28. Observabilidade

**Ponto forte confirmado:** a grande maioria dos logs em agentes/apply/execution/review inclui `executionId={}` de forma consistente — permite reconstruir a timeline de uma execução específica via grep.

**Achado real e de correção trivial:** `logging.level.br.com: DEBUG` no `application.yml` **não corresponde ao pacote real da aplicação** (`com.br.criarcenariotestes`) — a diretiva de DEBUG é efetivamente **inoperante**, todo log.debug() espalhado pelo código (incluindo qual provedor de IA respondeu, detalhes de fallback) nunca aparece em produção com a config atual. **(HIGH de impacto, mas correção de 1 linha — YES)**

Recuperação de startup/rehidratação de snapshot não é logada de forma distinguível de uma execução nova. **(LOW, FUTURE)**

---

## 29. MongoDB

Índice único em `executionId`, paginação real no servidor, `@Version` corretamente usado e efetivamente aplicado (confirmado por comportamento observado em testes de concorrência). Sem índice para ordenação por `createdAt`/`updatedAt` — irrelevante no volume atual, relevante conforme a coleção cresce. **(LOW, FUTURE)** `projectPath` (caminho absoluto do servidor) é armazenado no Mongo, nunca exposto via API — risco baixo, mas registrado.

---

## 30. Escalabilidade

**Classificação: NOT_ADEQUATE para 100 execuções simultâneas; LIMITED para ~10; ADEQUATE_NOW apenas para 1.**

Justificativa concreta: toda a orquestração roda de forma síncrona na própria thread HTTP (sem `@Async`/fila/executor em todo o sistema — confirmado por grep). Cada chamada de agente pode envolver requisição HTTP síncrona a provedor de IA externo, e o Execute pode rodar processos externos por até 10 minutos, tudo consumindo uma thread do pool do Tomcat pela duração inteira. `maxConcurrentExecutions=5` existe na config mas **não é aplicado em lugar nenhum** (mesmo padrão de config morta). Não é uma arquitetura distribuída necessária hoje — mas o modelo atual não escala além de poucas execuções simultâneas sem enfileiramento real.

---

## 31. Deploy

`docker-compose.yml` define backend (porta 8089) e frontend (porta 4200); **não há MongoDB no compose** — depende de `MONGO_URI_NUVEM` (Mongo gerenciado externo). Sem healthcheck configurado. Sem `SPRING_PROFILES_ACTIVE`/perfis de ambiente — mesma configuração para todos os ambientes. `Dockerfile` multi-stage correto, mas sem `HEALTHCHECK` e sem usuário não-root explícito. **(FUTURE — nenhum bloqueante para o diagnóstico de segurança do módulo Auto QA em si)**

---

## 32. CI/CD

**Achado HIGH — correção de baixo risco e alto valor:** `.github/workflows/gradle.yml` executa `./gradlew build -x test` (flag que **exclui explicitamente** os testes) e o step "Run tests" está **inteiramente comentado**. Apesar de existirem 163 arquivos de teste no módulo `autoqa`, **nenhum roda no CI** antes de merge — não há gate de qualidade baseado em testes. **(YES — reativar é uma correção trivial)**

Achado adicional: merge automático para `main` (`create-auto-merge-main.yml`) faz push direto (não PR) no mesmo evento que dispara a criação de um PR concorrente, sem esperar resultado de CI algum. **(MEDIUM, FUTURE — questão de processo, fora do escopo estrito de segurança do módulo)** Um step órfão "Wait for PostgreSQL" (o projeto usa MongoDB) indica que o pipeline não é revisado a fundo há tempo. **(OBSERVATION)**

---

## 33. Dependências

**Backend:** nenhuma dependência classificada como `SECURITY_RISK`/`INCOMPATIBLE` com base no conhecimento disponível sem acesso à internet. Único ponto de atenção: `spring-ai-bom` está fixado em `1.0.0-M7` — uma **milestone pré-GA**, não uma release estável, prática de risco moderado para produção independente de CVE específico. **(OUTDATED_NON_CRITICAL, FUTURE)**

**Frontend:** `@angular/core` 22.1.0, `typescript` 6.0.3, `rxjs` 7.8.2 — todas atuais, `package.json`/`package-lock.json` coerentes. Nenhuma dependência classificada como risco. **(OK)**

---

## 34. Dívidas técnicas consolidadas

**DÍVIDA DE SEGURANÇA:**
- `allowedRoots` nunca aplicado — leitura arbitrária de filesystem (Seções 8, 10)
- CORS `*` global (Seção 10)
- Discovery sem limite de tamanho/quantidade de arquivo, diferente de Knowledge (Seções 10, 11)
- Ausência de autenticação (já aceita como fora de escopo, mas agravada pelos itens acima)

**DÍVIDA DE ARQUITETURA:**
- `AutoQaWorkflowService` código morto duplicando `AutoQaStageExecutor` (Seção 2)
- Execução síncrona disfarçada de assíncrona (202 Accepted, mas bloqueante) (Seção 2)
- Duplicação de pré-condições entre agentes, com inconsistência real já comprovada (Seção 2)
- `currentStage` redundante e sem granularidade real (Seção 3)

**DÍVIDA DE CONTRATO:**
- Generated Files/Preview/Diff/Logs/Retry/Failure Analysis/Learning detalhado — todos CONTRACT GAP / FUTURE CAPABILITY (Seção 15)
- `ApplyResult` sem sanitização no snapshot interno (Seção 15)

**DÍVIDA DE TESTE:**
- Cenários de integração para os BLOCKERs de máquina de estados não cobertos (Seção 24)
- Path traversal de `projectPath` de entrada não testado (Seção 24)
- 9 de 11 fluxos críticos frontend sem E2E real (Seção 26)
- CI nunca executa os testes existentes (Seção 32)

**DÍVIDA DE UX:**
- Sem timeout HTTP no frontend — ação pode travar indefinidamente (Seção 19)
- Sem atualização em tempo real — usuário precisa dar refresh manual em execuções longas (observação, não bug)
- Stage Timeline sem roving tabindex, inconsistente com padrão já usado no Inspection Panel (Seção 21)

**DÍVIDA OPERACIONAL:**
- Configuração morta em 6+ propriedades (`allowedRoots`, `retentionDays`, `maxConcurrentExecutions`, `generatedDirectory`, `backupDirectory`, `maxExecutionMinutes`) — falsa sensação de controle (Seções 6, 9, 11)
- Logger de DEBUG inoperante por pacote incorreto (Seção 28)
- Sem recovery de execuções travadas após crash/restart (Seção 7)

**DÍVIDA DE ESCALABILIDADE:**
- Modelo síncrono single-JVM sem fila — NOT_ADEQUATE além de poucas execuções simultâneas (Seção 30)

---

## 35. BLOCKER

| ID | Área | Achado |
|---|---|---|
| B1 | Backend / Máquina de estados | Exceções não capturadas em `runBlockInternal` deixam a execução travada para sempre em `operationStatus=IN_PROGRESS` |
| B2 | Backend / Máquina de estados | Nenhuma recuperação/reconciliação de execuções `IN_PROGRESS` após restart da aplicação |
| B3 | Backend / Máquina de estados + Concorrência | `validateCancel` não respeita o lock `IN_PROGRESS` — permite cancelar durante Apply/Execute em andamento, gerando estado permanente `CANCELLED + IN_PROGRESS` sem rastro do efeito colateral real já ocorrido |
| B4 | Backend / File Application + Segurança | `allowed-roots` declarado mas nunca aplicado — `projectPath` sem qualquer restrição de raiz, permitindo leitura/escrita/execução em diretório arbitrário legível pelo processo |
| B5 | Backend / Segurança | Discovery/Apply/Execute sem gate de flag no estágio `start`, combinado com B4, permite exfiltração de metadados de qualquer diretório legível para provedores de IA externos, sem autenticação |
| B6 | Backend / Segurança | CORS aberto globalmente (`allowedOriginPatterns("*")`) em toda a API, incluindo endpoints do Auto QA |

Todos os 6 BLOCKERs são do **backend**. Nenhum BLOCKER foi encontrado no frontend.

---

## 36. HIGH

- H1 — `AutoQaWorkflowService` código morto duplicando lógica real de `AutoQaStageExecutor` (Seção 2)
- H2 — Execução síncrona disfarçada de HTTP 202 Accepted (Seções 2, 4, 32 — achado cross-validado por 3 investigações)
- H3 — Reaplicação do bloco Execute sem idempotência após intervenção manual pós-crash (Seções 5, 7)
- H4 — Múltiplos saves não atômicos Document/Snapshot; Document pode ficar órfão sem Snapshot (Seção 6)
- H5 — Rollback do Apply não sobrevive a crash de processo real (Seção 8)
- H6 — `continueExecution` decide o bloco a retomar por campo (`lastStageStarted`) que pode não refletir o bloco realmente truncado pelo crash (Seção 7)
- H7 — Working directory do Execute herda a ausência de allowlist do `projectPath` (Seção 9, decorrência de B4)
- H8 — Configuração morta (`allowedRoots`, `retentionDays`, `maxConcurrentExecutions`, `generatedDirectory`, `backupDirectory`, `maxExecutionMinutes`) gerando falsa sensação de controle operacional (Seções 6, 9, 11)
- H9 — CI nunca executa os testes automatizados existentes (`-x test`, step comentado) (Seção 32)
- H10 — Logger `br.com` não corresponde ao pacote real, DEBUG inoperante em produção (Seção 28)
- H11 — Gaps de teste de integração para os cenários dos BLOCKERs B1/B3 (Seção 24)
- H12 — 9 de 11 fluxos críticos do frontend sem E2E de integração real (apenas testes unitários com mock) (Seção 26)
- H13 — Ausência de timeout HTTP no frontend — Action Bar pode travar indefinidamente sem feedback de erro (Seção 19)

---

## 37. MEDIUM

Inconsistência real de allow/deny-list entre `ApplyAgent`/`ExecuteAgent` para `ReviewStatus`; não-atomicidade Document/Snapshot em aprovações; `CONTINUE` oferecido em `FAILED` com `lastStageStarted` nulo; dois vocabulários para "nenhuma ação" (`Set.of()` vs `Set.of(NONE)`); `currentStage` redundante sem granularidade real; Discovery sem limites de tamanho/quantidade (diferente de Knowledge); `approvedBy` sem verificação de identidade; vazamento de mensagem de exceção não sanitizada em caminhos não previstos; preview de resposta de IA logado em INFO; redação de segredos em stdout/stderr é regex best-effort; `ApplyResult` sem sanitização no snapshot interno; race condition entre "Atualizar" e ação em andamento no frontend; Stage Timeline sem roving tabindex; auto-merge para `main` sem gate de CI; `ExecutionSummaryComponent` sem `overflow-wrap`.

## 38. LOW

Duplicação de pré-condições em `AutoQaContext`/agentes (sem inconsistência comprovada além do já citado em MEDIUM); `FailureAnalysisAgent` quebra padrão defensivo dos demais agentes; organização de campos em `AutoQaContext` evidencia crescimento sem reorganização; `RUNNING`/`RETRY` enums mortos; timeout de comando hardcoded ignorando config; sem prefixo de versionamento de API; resposta de listagem sem `totalPages`; `System.out.println` de diagnóstico de env vars na inicialização; ausência de `engines`/`.nvmrc` no frontend; `aria-describedby` ausente em mensagens de erro de formulário; subscriptions sem `takeUntilDestroyed` no state service (baixo risco real).

## 39. OBSERVATIONS

`AutoQaExecutionOrchestrator` como classe concentradora (ainda saudável, monitorar); documentação de fase anterior descreve endpoints não implementados; step de CI órfão referenciando PostgreSQL (projeto usa MongoDB); ausência de atualização em tempo real (polling/SSE) — aceitável para ferramenta interna hoje; recuperação de startup não logada de forma distinguível.

---

## 40. KEEP AS IS

**Backend:** optimistic locking (`@Version`) em ambas as coleções; proteção contra START/CONTINUE/GENERATE/APPLY/EXECUTE duplos e aprovação duplicada; `AutoQaTransitionValidator` para todas as transições de origem exata; path traversal e symlink bloqueados em Apply/Generation; TOCTOU mitigado por hash antes/depois; rollback parcial sinalizado corretamente como falha; `ProcessBuilder` sem shell injection; allowlist de comando fechada; duas flags exigidas para ação sensível; allowlist de variáveis de ambiente do processo filho; DTOs públicos sem exposição de campos internos; semântica HTTP bem aplicada; controller sem lógica de domínio.

**Frontend:** arquitetura sem god components, sem duplicação de estado, sem `effect()` perigoso; `availableActions` como fonte única de permissão, sem heurística local em nenhum ponto (disciplina exemplar); guards contra ação reentrante e duplo-clique; sem atualização otimista indevida; sem vetor de XSS; modais com focus trap/retorno de foco/Escape corretos; `OnPush` em 100% dos componentes; `track` em 100% dos `@for`; lazy loading correto; correções de responsividade da Fase 12.3.9 preservadas; testes unitários e E2E existentes de alta qualidade, não superficiais.

---

## 41. QUICK WINS

Baixo risco, baixo esforço, benefício concreto:

- Reativar execução de testes no CI (remover `-x test`, descomentar step) — H9
- Corrigir `logging.level.br.com` → `logging.level.com.br.criarcenariotestes` — H10
- Remover ou implementar de fato as properties mortas (`allowedRoots`, `retentionDays`, `maxConcurrentExecutions`, `generatedDirectory`, `backupDirectory`, `maxExecutionMinutes`) — H8
- Remover step órfão "Wait for PostgreSQL" do CI
- Adicionar `overflow-wrap: anywhere` em `execution-summary` (frontend)
- Adicionar `engines.node`/`.nvmrc` (frontend)

---

## 42. HARDENING REQUIRED

Problemas que justificam alteração real antes de considerar o sistema robusto para uso real (todos os BLOCKER + a maioria dos HIGH das Seções 35/36):

1. Corrigir `validateCancel` para respeitar o lock `IN_PROGRESS` (B3)
2. Garantir que `runBlockInternal` sempre finalize o estado (nunca deixar `IN_PROGRESS` órfão por exceção não capturada) (B1)
3. Implementar mecanismo de reconciliação/recovery para execuções travadas após restart (B2)
4. Implementar allowlist real de `projectPath` (`allowedRoots` efetivo) (B4, B5, H7)
5. Restringir CORS a origens conhecidas antes de qualquer exposição fora de localhost (B6)
6. Adicionar idempotência ao bloco Execute para cenários de retomada pós-incidente (H3)
7. Corrigir a base de decisão de `continueExecution` para refletir o bloco realmente truncado (H6)
8. Adicionar testes de integração cobrindo os cenários acima antes/junto da correção (H11)
9. Cobrir com E2E real os fluxos Apply e Execute no frontend, no mínimo (H12, priorizado)
10. Adicionar timeout HTTP no frontend (H13)

## 43. FUTURE EVOLUTION

Não pertence ao Hardening da Fase 13 — registrar como backlog:

- Generated Files, Preview, Diff, Logs detalhados, Retry real, Failure Analysis/Learning detalhado no contrato público
- Atualização em tempo real (polling leve ou SSE)
- Execução verdadeiramente assíncrona com fila/worker (resolve a semântica 202 enganosa de forma definitiva, além do mínimo do item 1 de Hardening)
- Escalabilidade distribuída (só se o uso deixar de ser predominantemente local/single-operador)
- Migração de `spring-ai-bom` para release GA
- **Fase 14 — Design System Global** (unificar identidade visual entre Gerar Cenário, Chat IA, Cenários e Auto QA) — explicitamente fora da Fase 13, conforme instrução

---

## 44. Matriz de risco

| ID | Área | Achado | Severidade | Impacto | Probabilidade | Alteração necessária? | Fase sugerida |
|---|---|---|---|---|---|---|---|
| B1 | Backend/Estados | Exceção não capturada trava `IN_PROGRESS` | BLOCKER | Alto | Média | YES | 13.2 |
| B2 | Backend/Estados | Sem recovery pós-restart | BLOCKER | Alto | Baixa-Média | YES | 13.2 |
| B3 | Backend/Estados+Concorrência | CANCEL ignora lock | BLOCKER | Alto | Baixa-Média | YES | 13.2 |
| B4 | Backend/Segurança | `allowedRoots` nunca aplicado | BLOCKER | Alto | Alta | YES | 13.1 |
| B5 | Backend/Segurança | Exfiltração de FS p/ IA externa sem gate | BLOCKER | Alto | Alta | YES | 13.1 |
| B6 | Backend/Segurança | CORS `*` global | BLOCKER | Alto | Alta (se exposto) | YES | 13.1 |
| H1 | Backend/Arquitetura | `AutoQaWorkflowService` código morto | HIGH | Médio | Alta (divergência futura) | FUTURE | 13.2/backlog |
| H2 | Backend/Arquitetura | 202 síncrono enganoso | HIGH | Médio | Certa | FUTURE | backlog |
| H3 | Backend/Idempotência | Execute sem idempotência em retomada | HIGH | Alto | Baixa | YES | 13.3 |
| H4 | Backend/Persistência | Saves não atômicos, Document órfão | HIGH | Médio | Baixa-Média | YES | 13.3 |
| H5 | Backend/Apply | Rollback não sobrevive a crash | HIGH | Médio | Baixa | YES | 13.3 |
| H6 | Backend/Recovery | `continueExecution` usa campo desatualizado | HIGH | Alto | Baixa | YES | 13.3 |
| H7 | Backend/Execute | Working dir sem allowlist | HIGH | Alto | Alta | YES (decorre de B4) | 13.1 |
| H8 | Backend/Config | Config morta (6 properties) | HIGH | Médio | Certa | YES/FUTURE | 13.4 |
| H9 | Backend/CI | Testes nunca rodam no CI | HIGH | Alto | Certa | YES | 13.5 |
| H10 | Backend/Observabilidade | Logger de pacote errado | HIGH | Baixo | Certa | YES | 13.4 |
| H11 | Backend/Testes | Gap de teste de integração p/ BLOCKERs | HIGH | Alto | N/A | YES | 13.2/13.3 |
| H12 | Frontend/E2E | 9/11 fluxos críticos sem E2E real | HIGH | Médio-Alto | Média-Alta | FUTURE | 13.6 |
| H13 | Frontend/HTTP | Sem timeout, Action Bar pode travar | HIGH | Médio | Baixa | FUTURE | 13.7 |

(Achados MEDIUM/LOW/OBSERVATION detalhados nas Seções 6-33; omitidos da matriz para manter foco nos itens acionáveis.)

---

## 45. Proposta de subfases da Fase 13

1. **13.1 — Backend: Segurança Crítica** — allowlist real de `projectPath` (B4, H7) + restrição de CORS (B6) + gate de flag no `start` (B5). Prioridade máxima; bloqueia qualquer exposição fora de localhost.
2. **13.2 — Backend: Máquina de Estados / Concorrência** — corrigir `validateCancel` (B3), garantir finalização de estado em `runBlockInternal` (B1), implementar reconciliação pós-restart (B2), adicionar testes de integração para esses cenários (H11) antes/junto da correção. Depende de nada, mas é a base para 13.3.
3. **13.3 — Backend: Persistência & Crash Recovery** — atomicidade dos saves (H4), idempotência do Execute (H3), sobrevivência do rollback a crash (H5), correção da base de decisão do `continue` (H6). Depende conceitualmente de 13.2 (mesmo domínio de "o que acontece quando o processo morre no meio").
4. **13.4 — Backend: Configuração & Observabilidade** — conectar ou remover properties mortas (H8), corrigir logger (H10). Baixo risco, pode rodar em paralelo a 13.2/13.3.
5. **13.5 — Backend: CI/CD** — reativar testes no pipeline (H9). Trivial, baixíssimo risco, altíssimo valor — recomendo fazer cedo.
6. **13.6 — Frontend: E2E Hardening** — cobrir Apply e Execute primeiro (ações mutáveis/perigosas), depois Cancel/Failure/Recovery (H12). Independente do backend, mas mais valioso após 13.2/13.3 estarem corrigidos (evita testar E2E contra um backend que será alterado).
7. **13.7 — Frontend: Resiliência de Rede & State** — timeout HTTP (H13) + unificar guard de refresh com pendingAction. Independente.
8. **13.8 — Frontend: Acessibilidade pontual** — roving tabindex na Stage Timeline, `aria-describedby` em erros de formulário. Baixo risco, pode ser feito a qualquer momento.

Regra respeitada: nenhuma subfase mistura alteração de backend e frontend simultaneamente.

## 46. Ordem recomendada das subfases

**13.1 → 13.5 → 13.2 → 13.3 → 13.4 → 13.6 → 13.7 → 13.8**

Justificativa: 13.1 (segurança) vem primeiro por ser BLOCKER de maior exposição externa. 13.5 (CI) é trivial e barato — fazer cedo garante que as próximas correções (13.2/13.3) já sejam validadas automaticamente. 13.2 antes de 13.3 porque persistência/crash-recovery depende conceitualmente da máquina de estados estar correta primeiro. 13.4 pode intercalar a qualquer momento (baixo acoplamento). Frontend (13.6-13.8) só depois do backend crítico (13.1-13.3) para não gerar E2E contra comportamento que ainda vai mudar.

## 47. Critério para considerar Hardening concluído

A Fase 13 pode ser considerada concluída quando:
- Todos os 6 BLOCKERs (B1-B6) estiverem corrigidos e cobertos por teste de integração real (não apenas unitário isolado).
- `allowedRoots` estiver efetivamente aplicado e testado com caso de rejeição real.
- CI executar a suíte de testes existente em todo PR para `main`/`develop`.
- Pelo menos os fluxos Apply e Execute tiverem E2E real no frontend.
- Nenhum novo BLOCKER for introduzido pelas próprias correções (validado por reexecução completa de 382 testes unitários + 24 E2E + suíte backend).
- Os achados MEDIUM/LOW remanescentes estiverem conscientemente registrados como backlog (não é necessário zerá-los para encerrar a fase).

## 48. Arquivos que provavelmente seriam afetados futuramente

**Backend (13.1-13.5):** `AutoQaTransitionValidator.java`, `AutoQaExecutionOrchestrator.java`, `AutoQaAvailableActionResolver.java`, `AutoQaProperties.java`, `application.yml`, `ProjectDiscoveryService.java`, `CorsConfig.java`, `.github/workflows/gradle.yml`, `TestExecutionService.java`/`ProcessExecutionService.java`, novo componente de reconciliação (a criar), novos testes de integração em `executionapi/orchestrator/`.

**Frontend (13.6-13.8):** novos arquivos `e2e/apply-execution.spec.ts`, `e2e/execute-tests.spec.ts`, `e2e/cancel-execution.spec.ts` (a criar); `services/auto-qa-execution.service.ts` ou `app.config.ts` (timeout); `state/auto-qa-execution-state.service.ts` (guard unificado); `components/stage-timeline/stage-timeline.component.ts` e `components/stage-timeline-item/stage-timeline-item.component.ts` (roving tabindex); `shared/ui/input/aqb-input.component.html`, `shared/ui/textarea/aqb-textarea.component.html` (`aria-describedby`).

Nenhum desses arquivos foi tocado nesta etapa de diagnóstico.

## 49. Confirmação de que nenhum arquivo foi alterado

Confirmado. As 6 investigações desta auditoria foram estritamente read-only (leitura de código-fonte, grep, e — no caso do frontend — execução real e não-destrutiva dos testes/build já existentes, sem qualquer escrita). `git status` no backend e no frontend permanece limpo em relação ao início desta análise.

## 50. Confirmação de que nenhuma implementação foi iniciada

Confirmado. Nenhuma correção foi aplicada. A subfase 13.1 não foi iniciada. Nenhum comando `git add`/`commit`/`push` foi executado. Este relatório aguarda aprovação explícita antes de qualquer início de implementação.
