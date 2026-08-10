# FASE 13.1 — BACKEND: SEGURANÇA CRÍTICA
## Diagnóstico técnico (B4 / B5 / B6 / H7)

**Data:** 2026-08-09
**Escopo:** exclusivamente B4 (allowedRoots), B5 (exposição de filesystem sem gate), B6 (CORS aberto), H7 (working directory do Execute) — nenhum outro achado da Fase 13 foi investigado ou será proposto aqui.
**Regra respeitada:** diagnóstico puro. Nenhum arquivo foi alterado, nenhuma implementação foi iniciada, nenhum teste foi criado, nenhum comando Git de escrita foi executado. Frontend não foi tocado nem investigado além dos arquivos estritamente necessários para responder à pergunta de origem de CORS (item 15).

---

## 1. Baseline

Todo o fluxo de `projectPath` foi relido diretamente no código atual (não a partir do relatório da Fase 13 geral), desde o DTO de entrada até o `ProcessBuilder`, incluindo o binding de `AutoQaProperties`/`application.yml`, os dois scanners (Discovery vs. Knowledge), os resolvers de path de Apply/Generation, o orquestrador completo, o resolver de ações disponíveis, o `CorsConfig`, e os testes existentes relacionados. Os quatro achados (B4, B5, B6, H7) **se confirmam integralmente** no código atual — nenhum foi corrigido ou mudou desde o diagnóstico geral da Fase 13.

---

## 2. Confirmação B4 — `allowedRoots` declarado mas nunca aplicado

**Confirmado.**

- `AutoQaProperties.java:24` — `private List<String> allowedRoots = new ArrayList<>();` — campo tipado, com getter/setter, corretamente bindado do prefixo `auto-qa`.
- `application.yml:52` — `allowed-roots: []` — declarado, vazio por default.
- Busca completa (`grep -rn "allowedRoots|getAllowedRoots|allowed-roots"` em `src/main` e `src/test`) retorna **apenas 6 ocorrências**, todas em `AutoQaProperties.java` (declaração), `application.yml` (declaração) e `AutoQaPropertiesTest.java` (linhas 41, 57, 87-91 — testam **somente o binding** Spring, nunca comportamento de negócio).
- **Nenhuma classe de produção fora de `AutoQaProperties` lê `getAllowedRoots()`.**
- `ProjectDiscoveryService` — o único ponto de validação real de `projectPath` hoje — **não recebe `AutoQaProperties` como dependência** (construtor injeta apenas `ProjectScanner`, `ProjectFilesParser`, `List<FrameworkDetector>`, `ProjectDiscoveryResultBuilder`). É estruturalmente impossível hoje que essa classe consulte `allowedRoots`, porque nem tem acesso a ela.

---

## 3. Confirmação B5 — exposição de filesystem sem gate suficiente

**Confirmado**, com precisão adicional sobre a causa raiz (ver item 15).

- `AutoQaExecutionOrchestrator.start()` (linhas 79-83) **não** chama `requireSensitiveActionEnabled` — só passa por `transitionValidator::validateStart` (máquina de estados, fora de escopo desta subfase). `generate()` (linhas 92-95) também não tem gate de flag sensível.
- Em contraste, `apply()` (linhas 97-102) e `execute()` (linhas 104-109) **têm** gate: `requireSensitiveActionEnabled(properties.isAllowFileApplication()/isAllowCommandExecution(), ...)`.
- `AutoQaAvailableActionResolver.resolve()`: para `workflowStatus == CREATED`, a única condição para oferecer `START` é `properties.isEnabled()` — nunca checa `sensitiveActionsEnabled`/`allowFileApplication`/`allowCommandExecution` (contraste direto com os estados `WAITING_APPLY_APPROVAL`/`WAITING_EXECUTION_APPROVAL`, que checam ambas as flags).
- **Confirmado objetivamente**: hoje é possível chamar `create()` + `start()` apenas com `auto-qa.enabled=true` (default) e **nenhuma** outra flag habilitada. Isso dispara Discovery (leitura de filesystem, sem limite de tamanho/quantidade — ver item 12) e Project Knowledge (leitura de conteúdo de arquivos, prompt enviado a `AiProvider` externo).

A causa raiz real de B5 não é "falta de uma flag de consentimento para IA" — é a ausência de restrição de **qual filesystem** pode ser lido (B4). Ver análise completa no item 15.

---

## 4. Confirmação B6 — CORS aberto globalmente

**Confirmado, escopo global, todos os controllers do sistema.**

`src/main/java/com/br/criarcenariotestes/business/config/CorsConfig.java` (arquivo completo):
```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOriginPatterns("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }
}
```
- Mapping `/**` (todos os paths), origem `*`, headers `*`. Sem `allowCredentials`, `exposedHeaders` ou `maxAge`.
- Não há Spring Security nem qualquer outro `CorsConfigurationSource`/`@CrossOrigin` no projeto — este é o **único** ponto de configuração CORS de todo o sistema.
- Afeta igualmente `AutoQaExecutionController`, `AgentController`, `JiraController`, `CenarioController` — nenhum tem `@CrossOrigin` próprio para sobrepor a config global.

---

## 5. Confirmação H7 — working directory do Execute sem restrição

**Confirmado.**

`TestExecutionService.java:90`:
```java
outcome = processExecutionService.execute(command, discovery.getNormalizedProjectPath());
```
`ProcessExecutionService.java:93`: `processBuilder.directory(workingDirectory.toFile());`

O working directory real do processo é exatamente o `Path` que saiu de `ProjectDiscoveryService.normalizeAndValidate()` — o mesmo path sem allowlist do item 2.

**Observação relevante para o design da correção:** `CommandSpecification.workingDirectoryReference` (populado por `CommandResolver.sanitizeWorkingDirectory`) é **apenas um campo decorativo** — seu próprio comentário no código diz explicitamente "nunca o path absoluto real" — usado só para logging/exibição. Ele **não tem nenhum efeito de segurança**: o path que efetivamente vira working directory do `ProcessBuilder` vem por outro caminho (`discovery.getNormalizedProjectPath()`, direto). Corrigir apenas esse campo não resolveria H7; a raiz do problema é a mesma de B4.

---

## 6. Fluxo completo do projectPath

1. `AutoQaCreateExecutionRequest.java:5-8` — DTO de entrada, `@NotBlank String projectPath` (só valida não-vazio).
2. `AutoQaExecutionController.java:41-42` — `create()` repassa a string crua para `orchestrator.create(...)`.
3. `AutoQaExecutionOrchestrator.java:61-77` — `create()`: checa só `properties.isEnabled()` (linha 64); persiste a string crua no `AutoQaExecutionDocument` (linha 70), **sem qualquer validação de path nesse ponto**.
4. `AutoQaExecutionDocument` — campo `projectPath` persistido como `String` no Mongo.
5. `AutoQaExecutionOrchestrator.java:178` (`runBlockInternal`) — a string volta do Mongo e entra em `snapshotMapper.toContext(...)`, sem normalização intermediária.
6. `AutoQaContext.java` — `create(scenario, projectPath)` só valida texto não-vazio (`requireText`), guarda como `String` cru.
7. Agente de Discovery converte a `String` em `Path` e chama `ProjectDiscoveryService.discover(Path)`.
8. `ProjectDiscoveryService.java:37-46` — `discover()` chama `normalizeAndValidate(projectPath)`.
9. `ProjectDiscoveryService.java:48-65` — **único ponto de validação real hoje**:
   ```java
   private Path normalizeAndValidate(Path projectPath) {
       Objects.requireNonNull(projectPath, "projectPath must not be null");
       if (projectPath.toString().trim().isEmpty()) {
           throw new IllegalArgumentException("projectPath must not be blank");
       }
       Path normalized = projectPath.toAbsolutePath().normalize();
       if (!Files.exists(normalized, LinkOption.NOFOLLOW_LINKS)) {
           throw new IllegalArgumentException("projectPath does not exist");
       }
       if (!Files.isDirectory(normalized, LinkOption.NOFOLLOW_LINKS)) {
           throw new IllegalArgumentException("projectPath must be a directory");
       }
       if (!Files.isReadable(normalized)) {
           throw new IllegalArgumentException("projectPath must be readable");
       }
       return normalized;
   }
   ```
   Valida: não-nulo, não-vazio, existência, é-diretório, legibilidade. **Não valida pertencimento a nenhuma allowlist.**
10. `ProjectDiscoveryResult.getNormalizedProjectPath()` passa a ser a **fonte de verdade única** para todo o resto do pipeline.
11. `FileApplicationService.java:111` — Apply usa `discovery.getNormalizedProjectPath()` diretamente, **sem revalidação de allowlist**.
12. `ApplyPathResolver.resolve(projectRoot, relativePath)` — usa esse `projectRoot` como raiz confiável para checar traversal/symlink apenas **do que está dentro dela**, nunca questiona se a raiz em si é permitida.
13. `CommandResolver.resolve(discovery, ...)` (linha 67) — mesma fonte, usada para resolver candidatos de comando; `isValidProjectRoot` (linhas 146-151) checa existe/é-diretório/não-é-symlink, também sem allowlist.
14. `TestExecutionService.java:90` — ponto final: vira o working directory real do processo.
15. `ProcessExecutionService.java:93` — `processBuilder.directory(...)`.

**Confirmado**: `GenerationService`/`GeneratedPathResolver` **não usam `projectPath`** — usam área própria da aplicação (`.auto-qa/generated`), fora do raio de ataque deste diagnóstico.

Nenhum outro serviço lê `projectPath` diretamente além dos listados — os detectores de framework (`RobotFrameworkDetector`, `SeleniumDetector`) e parsers de manifesto consomem apenas resultados já derivados do path normalizado, não introduzem novo ponto de entrada.

---

## 7. Ponto ideal para validação central

Dois pontos estruturais concorrem — nenhum foi escolhido nesta etapa, apenas descritos:

**Opção A — dentro de `ProjectDiscoveryService.normalizeAndValidate`.** Intercepta o `Path` já normalizado, antes de ser devolvido como `getNormalizedProjectPath()` — a fonte usada por Discovery, Apply e Execute. Uma validação aqui protegeria transitivamente os três, sem duplicação. Exigiria injetar `AutoQaProperties` (ou só a lista de raízes) no construtor da classe, hoje ausente.

**Opção B — dentro de `AutoQaExecutionOrchestrator.create()`.** Interceptaria a string crua na porta de entrada, antes mesmo de persistir no Mongo — mais cedo no fluxo. `AutoQaProperties` já está disponível aqui (já injetado no orquestrador), não exigiria nova dependência.

As duas opções não são mutuamente exclusivas (defesa em profundidade combinando as duas é possível). `ApplyPathResolver`/`GeneratedPathResolver` **não** são candidatos a validar a raiz em si — seu papel já é validar o que está *dentro* de uma raiz assumida como confiável; são preocupações diferentes e complementares, não substitutas.

---

## 8. Comportamento atual de `allowedRoots` (hoje, de fato)

Popular `auto-qa.allowed-roots` no `application.yml` hoje **não tem nenhum efeito observável em runtime** — é configuração morta. `AutoQaPropertiesTest` prova que o binding Spring funciona (a lista é populada corretamente a partir do yml), mas nenhum código de negócio a lê. Um operador que preenche essa lista acreditando estar restringindo o sistema está, na prática, apenas documentando uma intenção não aplicada.

---

## 9. Proposta de política fail-closed (para aprovação, não implementada)

Recomendação a ser avaliada na etapa de design/implementação (não decidida nem codificada aqui):

- **Lista vazia (`allowedRoots = []`, default atual) → rejeitar tudo.** Não é aceitável manter o comportamento atual de "aceita qualquer diretório" quando a lista está vazia — isso re-introduziria silenciosamente o mesmo risco de B4 assim que a config for esquecida/omitida em um ambiente. Fail-closed significa: sem lista configurada, nenhum `projectPath` é aceito, com uma mensagem de erro clara indicando que `auto-qa.allowed-roots` precisa ser configurada.
- **Uma ou mais raízes configuradas → aceitar somente `projectPath` cujo caminho canonicalizado esteja dentro de (ou seja igual a) uma das raízes, também canonicalizadas.**
- Comparação deve ser feita após canonicalização de **ambos os lados** (raiz configurada e `projectPath` recebido) — não comparação textual de prefixo (`startsWith` ingênuo é vulnerável a casos como `/allowed-root-2` "começar com" `/allowed-root` sem ser um subdiretório real; a comparação correta é por segmentos de path, não por caracteres).
- A raiz configurada, ela mesma, deve ser um `projectPath` válido (caso trivial de igualdade).

Este é o desenho recomendado a ser validado na fase de implementação — nenhuma decisão foi tomada como final nesta etapa de diagnóstico.

---

## 10. Estratégia contra traversal

`toAbsolutePath().normalize()` (já usado hoje) resolve estruturalmente `../` no nível textual, mas **normalize() não é suficiente sozinho** para garantir que o resultado final realmente está dentro da raiz permitida — é necessário, depois de normalizar, comparar o resultado contra a allowlist por segmentos completos de path (não prefixo de string), usando a mesma técnica já validada e testada em `ApplyPathResolver` para o caso análogo de paths relativos dentro de uma raiz (`resolved.startsWith(normalizedRoot)` após normalização — esse padrão já existe no código e pode ser reaproveitado como referência de implementação, sem necessidade de inventar uma técnica nova).

---

## 11. Estratégia contra symlink escape

Achado importante do diagnóstico: o tratamento de symlink hoje é **fragmentado e inconsistente** entre `ProjectDiscoveryService` (usa `LinkOption.NOFOLLOW_LINKS` nos checks de existência/tipo, mas **nunca chama `toRealPath()`**, então o `Path` normalizado que segue para todo o pipeline continua sendo o caminho do symlink, não o alvo real resolvido), `ProjectScanner` (mistura uso com e sem `NOFOLLOW_LINKS` em pontos diferentes do mesmo método) e `CommandResolver.isValidProjectRoot` (checagem própria e independente de `Files.isSymbolicLink`).

Para a raiz do `projectPath` especificamente (diferente do caso já bem resolvido de symlinks *dentro* da raiz, coberto por `ApplyPathResolver`/`GeneratedPathResolver`), a estratégia correta precisa **resolver o link real (`toRealPath()`)** antes de comparar contra a allowlist — comparar o caminho aparente (que pode ser um link) contra a allowlist não é suficiente, pois o alvo real pode estar fora dela mesmo que o link em si esteja "dentro" nominalmente. Esta é uma lacuna real que a correção precisa fechar, não apenas reaproveitar o padrão de `ApplyPathResolver` cegamente (que resolve um problema ligeiramente diferente).

---

## 12. Impacto sobre Discovery

Se a validação central for aplicada (Opção A ou B da seção 7), o Discovery passaria a rejeitar qualquer `projectPath` fora da allowlist antes de `ProjectScanner.scan` ser sequer chamado — cortando o problema na raiz do pipeline, já que todo consumidor downstream depende de `getNormalizedProjectPath()`. Fica pendente, como decisão de implementação, o comportamento para lista vazia (recomendado fail-closed, item 9).

Achado colateral confirmado (relevante para dimensionar B5, não para corrigir nesta subfase): Discovery não tem limite de quantidade/tamanho de arquivo — só profundidade máxima (4) — diferente do scanner de Knowledge, que tem `maxFiles=250`, `maxFileBytes=32KB`, `maxTotalBytes=256KB` efetivamente aplicados. Isso significa que, mesmo após restringir a allowlist, uma raiz permitida muito grande ainda pode ser varrida sem limite de volume. **Isso é H8/dívida de configuração já registrada na Fase 13 geral — fora do escopo desta subfase, apenas citado como contexto.**

---

## 13. Impacto sobre Apply

`FileApplicationService` obtém `projectRoot` da mesma instância de `getNormalizedProjectPath()` que passaria pela validação central. O Apply **herdaria a proteção automaticamente**, sem necessidade de alteração própria, desde que a validação ocorra em Discovery (Opção A) ou na entrada do `create()` (Opção B) — ambas anteriores à execução do Apply no pipeline. `ApplyPathResolver` continuaria seu papel atual sem mudança (path traversal/symlink relativos dentro da raiz já validada — já classificado KEEP_AS_IS no diagnóstico geral e não deve ser enfraquecido).

---

## 14. Impacto sobre Execute

Mesma lógica: `TestExecutionService.java:90` usa `discovery.getNormalizedProjectPath()` diretamente como working directory. A validação central protegeria automaticamente o `ProcessBuilder`, sem duplicar a checagem em `CommandResolver`/`TestExecutionService`. `CommandResolver.isValidProjectRoot` continuaria como checagem estrutural independente e complementar (não redundante) — allowlist de raiz e "existe/é diretório/não é symlink" são preocupações diferentes, ambas devem permanecer.

---

## 15. Um novo gate no START é necessário, ou a validação central de allowedRoots resolve B5 sozinha?

**Análise (não decisão de implementação):**

`allowedRoots` e um eventual "gate de consentimento para envio a IA" cobrem ameaças diferentes:
- A allowlist resolve **qual filesystem** pode ser lido — impede que alguém aponte `projectPath` para `/etc`, o home de outro usuário, ou qualquer diretório fora do que o operador autorizou.
- Um gate de flag em `start()` resolveria uma preocupação distinta: "consentimento explícito para enviar dados a um provedor de IA externo", mesmo dentro de um projeto já autorizado.

**Porém**, a própria função do Auto QA BMAD é analisar o projeto do usuário com IA para gerar cenários de teste — enviar o conteúdo de um projeto legitimamente autorizado (que passou pela allowlist) para o provedor de IA configurado **é o propósito central da ferramenta**, não um efeito colateral indesejado. Uma vez que `projectPath` só pode apontar para uma raiz que o operador **já** colocou explicitamente na allowlist de `application.yml` (uma decisão de configuração, feita conscientemente por quem administra o backend), o consentimento para análise por IA já está implícito nessa mesma decisão de infraestrutura — não é uma ação por-requisição que precise de um segundo gate.

**Conclusão da análise:** a causa raiz de B5, tal como descrita no escopo desta subfase ("possibilidade de leitura/exposição de dados de filesystem através do fluxo iniciado por projectPath sem proteção suficiente"), é a ausência de restrição de filesystem (B4) — **não** a ausência de um gate de flag separado em `start()`. Uma validação central de `allowedRoots`, fail-closed, aplicada antes de Discovery, **elimina B5 por completo dentro do escopo desta subfase**, sem necessidade de introduzir uma nova flag/estado/enum. Isso está alinhado à instrução recebida de não criar configuração nova sem necessidade comprovada. Nenhuma flag nova é proposta.

---

## 16. Configuração CORS atual

Já reproduzida integralmente no item 4. Resumo: `WebMvcConfigurer` global, mapping `/**`, `allowedOriginPatterns("*")`, métodos `GET/POST/PUT/DELETE/OPTIONS`, headers `*`, sem `allowCredentials`/`exposedHeaders`/`maxAge`.

---

## 17. Configuração CORS proposta (para aprovação, não implementada)

Origens confirmadas no código:
- **Desenvolvimento**: `src/app/enviroment/enviroment.dev.ts:3` → `apiUrl: 'http://localhost:8089'`; o frontend roda via `ng serve` em `http://localhost:4200` (porta default do Angular CLI — não há `proxy.conf.json` no projeto, então as chamadas realmente saem cross-origin de `localhost:4200` para `localhost:8089`, exigindo CORS habilitado para essa origem).
- **Produção**: `src/app/enviroment/enviroment.prd.ts:3` → `apiUrl: 'http://100.83.72.100:9999/criar-cenario-testes'` — essa é a URL de **destino** (a API), não a origem de onde o frontend de produção é servido. **Não foi encontrada, em nenhum dos dois repositórios, a origem real onde o frontend de produção é hospedado** (não há domínio declarado, `docker-compose.yml` só mostra o mapeamento de porta local `4200:80`, que não corresponde necessariamente à origem pública real).

**Item em aberto, não resolvido por este diagnóstico:** a origem de produção do frontend precisa ser confirmada por quem administra o deploy antes de qualquer restrição de CORS ser implementada — conforme instruído, esta análise não hardcoda uma origem de produção inventada. Recomenda-se que a lista de origens permitidas seja externalizada em configuração (`application.yml`/variável de ambiente), com `http://localhost:4200` (e possivelmente `http://localhost:4201`/portas alternativas de dev, se usadas) como valor de desenvolvimento, e a origem de produção real preenchida no momento do deploy — não decidida ou adivinhada nesta etapa.

Comportamento proposto para origem não autorizada: rejeição pelo mecanismo padrão do Spring (preflight `OPTIONS` falha, sem header `Access-Control-Allow-Origin` na resposta) — comportamento nativo do `CorsRegistry`, sem necessidade de exception handling customizado.

---

## 18. Impacto da mudança de CORS nas outras features

Como o `CorsConfig` é **global** (`/**`), restringir a allowlist de origens afetaria igualmente `AgentController`, `JiraController` e `CenarioController` — não é possível hoje restringir CORS apenas para o Auto QA sem reestruturar o `CorsRegistry` (ex.: mappings separados por prefixo de path com regras diferentes). **Não foi investigado neste diagnóstico** (fora de escopo desta subfase) se esses outros três controllers têm consumidores com origens diferentes das do Auto QA — isso é um risco a ser levantado e confirmado antes de qualquer restrição de CORS ser implementada, para não quebrar integrações não mapeadas aqui. Recomenda-se checar isso explicitamente na fase de implementação, não assumir que só o Auto QA usa esses controllers.

Nota técnica adicional: como `allowCredentials` não está configurado hoje (ausente do bean), cookies/credenciais não são enviados por padrão em requests cross-origin mesmo com origem `*` — isso reduz (mas não elimina) a severidade prática de B6 se a API não depender de autenticação baseada em cookie. Não foi investigado neste diagnóstico como a API autentica (fora de escopo desta subfase).

---

## 19. Testes existentes relevantes

- `ProjectDiscoveryServiceTest.java` — cobre rejeição de path nulo/vazio/inexistente/não-diretório (linhas ~476-506). **Não cobre**: traversal, symlink na raiz, allowlist (porque não existe ainda).
- `ApplyPathResolverTest.java` — cobertura extensa (13 ocorrências de symlink/traversal) para paths *relativos dentro* de uma raiz já confiável — não testa se a própria raiz é legítima.
- `GeneratedPathResolverTest.java` — mesma lógica, para a área própria `.auto-qa/generated` (não `projectPath`).
- `AutoQaPropertiesTest.java` — cobre apenas binding Spring de `allowedRoots` (linhas 41, 57, 87-91), nenhum teste de comportamento/enforcement.
- CORS: **nenhum teste existente** (busca por arquivos `*Cors*` em `src/test` não retornou nada).

---

## 20. Testes RED necessários (planejamento, não criados nesta etapa)

Conforme pedido pelo usuário, no mínimo:
- `projectPath` dentro de uma raiz permitida → aceito
- Subdiretório de uma raiz permitida → aceito
- `projectPath` fora de todas as raízes permitidas → rejeitado
- Traversal (`../`) tentando escapar de uma raiz permitida, mesmo resolvendo para um diretório existente → rejeitado
- Symlink na raiz apontando para fora de qualquer raiz permitida → rejeitado
- `projectPath` inexistente → rejeitado (comportamento já existente, não deve regredir)
- Arquivo (não diretório) como `projectPath` → rejeitado (comportamento já existente, não deve regredir)
- `allowedRoots` vazia → rejeitado (fail-closed), incluindo o caso de a config estar totalmente ausente
- Múltiplas `allowedRoots` configuradas, path válido em uma delas → aceito
- Normalização/canonicalização — path com `//` duplicado, `.` redundante etc. resolvendo corretamente para dentro/fora da raiz
- `Apply` usando um projeto autorizado → comportamento inalterado (regressão)
- `Execute` usando working directory autorizado → comportamento inalterado (regressão)
- CORS: origem permitida (ex. `localhost:4200`) → preflight aceito
- CORS: origem não permitida → preflight rejeitado

Nenhum desses testes foi criado nesta etapa — apenas listados, conforme instruído.

---

## 21. Arquivos que precisariam ser criados

Nenhum arquivo novo é estritamente indispensável para B4/B5/H7 — a validação pode ser adicionada dentro de classes já existentes (`ProjectDiscoveryService` e/ou `AutoQaExecutionOrchestrator`, conforme decisão entre Opção A/B da seção 7). Se, na fase de implementação, optar-se por extrair a lógica de comparação de path canonicalizado para uma classe dedicada (para reuso e teste isolado, e para não duplicar a técnica de comparação em dois pontos), isso seria uma decisão de design a ser aprovada separadamente, não assumida aqui.

Para CORS, nenhum arquivo novo é necessário — a mudança ocorre dentro de `CorsConfig.java` existente, possivelmente lendo uma nova propriedade de configuração (origens permitidas) do `application.yml`.

## 22. Arquivos que precisariam ser alterados

- `ProjectDiscoveryService.java` (se Opção A) — injeção de `AutoQaProperties`/raízes permitidas + lógica de validação em `normalizeAndValidate`
- `AutoQaExecutionOrchestrator.java` (se Opção B, ou complementarmente à Opção A) — validação em `create()`
- `AutoQaProperties.java` — possivelmente nenhuma mudança estrutural (o campo `allowedRoots` já existe), mas revisão do Javadoc/default se a semântica de "vazio = fail-closed" for adotada
- `application.yml` — nenhuma mudança de schema, só necessidade de documentar melhor o comportamento fail-closed do campo já existente
- `CorsConfig.java` — trocar `allowedOriginPatterns("*")` por lista explícita configurável
- Novos testes em `ProjectDiscoveryServiceTest.java`, `AutoQaExecutionOrchestratorTest.java` (ou equivalente), e um novo teste de CORS (arquivo a definir na implementação)

Nenhum desses arquivos foi alterado nesta etapa de diagnóstico.

---

## 23. Riscos de regressão

- Qualquer execução real hoje em ambiente local (ex.: E2E do frontend, que roda `Apply`/`Execute` contra um `projectPath` real de teste) deixará de funcionar assim que a allowlist fail-closed entrar em vigor, **a menos que** a raiz usada nesses testes seja explicitamente adicionada a `auto-qa.allowed-roots` na configuração local/CI. Isso precisa ser coordenado antes de ativar a validação (não é um bug da correção, é uma consequência esperada do fail-closed) — importante avisar antes de implementar, para não quebrar o Happy Path E2E real do frontend (que depende do backend em `localhost:8089`) sem aviso.
- Symlinks legítimos usados hoje intencionalmente (se houver, não confirmado) dentro de alguma raiz permitida podem passar a ser tratados de forma mais restritiva se a resolução de `toRealPath()` for aplicada também a subcaminhos — mas o escopo desta subfase é a raiz do `projectPath`, não os caminhos internos já cobertos por `ApplyPathResolver`/`GeneratedPathResolver` (que não devem ser tocados/enfraquecidos).
- Se `AutoQaProperties` precisar ser injetada em `ProjectDiscoveryService` (Opção A), isso muda a assinatura do construtor — qualquer teste que instancie a classe diretamente (não via Spring) precisará ser ajustado para passar o novo parâmetro. `ProjectDiscoveryServiceTest.java` precisará ser revisado por esse motivo, mesmo nos testes que não testam allowlist diretamente.
- Restringir CORS globalmente arrisca quebrar consumidores desconhecidos de `AgentController`/`JiraController`/`CenarioController` (ver item 18) — risco real que precisa ser levantado com o responsável pelo projeto antes da implementação, não assumido como seguro.

---

## 24. Compatibilidade com configuração local atual

`application.yml` local hoje tem `allowed-roots: []`. Sob a política fail-closed proposta (item 9), isso passaria a **rejeitar todo `projectPath`** até que ao menos uma raiz seja explicitamente configurada — incluindo o ambiente de desenvolvimento local usado para os E2E do frontend. Isso é intencional (é o próprio objetivo do fail-closed), mas precisa ser comunicado antes da implementação: o `docker-compose.yml`/ambiente local precisará declarar `auto-qa.allowed-roots` com o(s) diretório(s) de projeto usados em desenvolvimento/E2E, senão o sistema para de funcionar localmente assim que a correção for aplicada.

---

## 25. Confirmação de que frontend não será tocado

Confirmado. Nenhum arquivo em `src/app/features/auto-qa-bmad/` ou qualquer outro caminho Angular foi alterado nesta etapa. Os únicos arquivos frontend lidos (não alterados) foram `src/app/enviroment/enviroment.dev.ts` e `src/app/enviroment/enviroment.prd.ts`, estritamente para responder à pergunta de origem de CORS pedida no item 8 da solicitação original — leitura, não escrita.

## 26. Confirmação de que nenhuma implementação foi iniciada

Confirmado. Nenhuma correção foi aplicada, nenhum teste foi criado, nenhuma classe foi modificada. Este documento é exclusivamente diagnóstico.

## 27. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado. Nenhum `git add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`clean` foi executado em nenhum dos dois repositórios durante esta investigação.

---

## Itens em aberto que precisam de decisão antes da implementação (não respondidos por este diagnóstico)

1. **Opção A vs. B vs. ambas** para o ponto de validação central (item 7) — decisão de design pendente de aprovação.
2. **Origem de produção real do frontend** (item 17) — não encontrada em nenhum dos dois repositórios; necessária para a lista de CORS de produção.
3. **Confirmação de que `AgentController`/`JiraController`/`CenarioController` não têm consumidores com origens diferentes** (item 18) — precisa ser levantado com o responsável antes de restringir CORS globalmente.
4. **Raiz(es) a configurar em `auto-qa.allowed-roots` para desenvolvimento/CI local** (item 24) — necessária para não quebrar o ambiente local ao ativar fail-closed.

Conforme instruído: **PARADO aqui.** Nenhum teste RED será criado, nenhum arquivo será alterado, até aprovação explícita para iniciar a implementação da Fase 13.1.
