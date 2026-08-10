# FASE 13.1B — BACKEND: CORS HARDENING
## Diagnóstico técnico (B6)

**Data:** 2026-08-10
**Escopo:** exclusivamente diagnóstico de B6 (CORS global aberto). Nenhuma implementação foi feita — nenhum arquivo Java/YAML foi alterado, frontend não foi tocado, nenhum comando Git de escrita foi executado.

---

## 1. Baseline atual

O backend segue no estado deixado pela Fase 13.1A: `allowedRoots` aplicada e testada (1832 testes verdes), `CorsConfig.java` **intocado** desde então. Este diagnóstico confirma, com evidência de código, tudo que é necessário para uma decisão de design segura antes de tocar o CORS.

## 2. Configuração CORS encontrada

Fonte única e ativa: `src/main/java/com/br/criarcenariotestes/business/config/CorsConfig.java` (23 linhas):

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

Nenhuma outra fonte de configuração CORS existe hoje (`grep` amplo por `Cors|@CrossOrigin|Access-Control` em todo `src/main/java` só retorna este próprio arquivo).

## 3. Arquivos envolvidos

- `CorsConfig.java` — única classe ativa.
- Historicamente existiu `SimpleCorsFilter.java`, **removido** no commit `5e00263` ("separado as responsabilidades"). Ver item 5.

## 4. Mappings afetados

Único mapping: `/**` — cobre **literalmente todos os paths** da aplicação, sem exceção, sem mapping mais específico sobrepondo.

## 5. Controllers afetados

| Controller | Base path | Sujeito ao CORS global? | `@CrossOrigin` próprio? | Consumidor conhecido | Risco ao restringir |
|---|---|---|---|---|---|
| `AutoQaExecutionController` | `/api/auto-qa/executions` | Sim | Não | Frontend Angular (feature auto-qa-bmad) | Baixo — origem única e conhecida (dev: `localhost:4200`) |
| `AgentController` | `/api/agents` (inclui `POST /api/agents/chat`) | Sim | Não | Frontend Angular (Chat IA) | Baixo — mesma origem do frontend |
| `JiraController` | `/jira/tasks` | Sim | Não | Frontend Angular (tela de tarefas Jira) | Baixo — mesma origem; consumo do Jira em si é outbound (backend→Jira), não afetado por CORS |
| `CenarioController` | `/cenario` | Sim | Não | Frontend Angular (Gerar Cenário/Cenários), inclui `DELETE` | Baixo — mesma origem, porém é o único a usar `DELETE` hoje |

Nenhum controller tem `@CrossOrigin` próprio — todos dependem 100% da configuração global. Não existe `ChatController` dedicado: o chat com IA é `POST /api/agents/chat` dentro de `AgentController`.

## 6. Presença/ausência de filtros CORS adicionais

**Ausente hoje.** Existiu `SimpleCorsFilter` (`@Component implements Filter`), **removido** no commit `5e00263`, que setava manualmente `Access-Control-Allow-Origin: *` **junto com** `Access-Control-Allow-Credentials: true` — combinação tecnicamente inválida pela spec CORS (navegadores rejeitam `*` quando `allow-credentials=true`), então esse filtro provavelmente nunca funcionou corretamente para requisições com credenciais mesmo enquanto existia. No mesmo commit, `CorsConfig.allowCredentials(true)` também foi removido. O estado atual é o resultado de uma consolidação: uma única fonte (`CorsConfig`), sem `allowCredentials`.

## 7. Presença/ausência de Spring Security

**Ausente.** Nenhuma dependência `spring-boot-starter-security` no `build.gradle`, nenhum `SecurityFilterChain`/`WebSecurityConfig` em `src/main/java`. `CorsConfig.java` é o único mecanismo de CORS de toda a aplicação — não há uma segunda camada (Security) para considerar.

## 8. Origem real do frontend em desenvolvimento

- Porta do `ng serve`: **4200** (default do Angular CLI — `angular.json`/`package.json` não têm `--port` customizado nem `proxyConfig`).
- `enviroment.dev.ts:3` → `apiUrl: 'http://localhost:8089'`.
- Sem proxy Angular configurado → chamadas realmente cross-origin de `http://localhost:4200` para `http://localhost:8089`.
- **Origem de dev confirmada: `http://localhost:4200`.**
- Nota lateral: a porta real do backend é `8089` (`application.yml:15`); vários `.md` de documentação mencionam `8080` — inconsistência de documentação, não de código. Relevante para não configurar CORS baseado na doc desatualizada.

## 9. Origem de destino da API em produção / origem do frontend em produção

- `enviroment.prd.ts:3` → `apiUrl: 'http://100.83.72.100:9999/criar-cenario-testes'` — **isso é só o destino da API**, não a origem de onde o HTML/JS do frontend é servido.
- O IP está na faixa CGNAT `100.64.0.0/10` (indício de rede Tailscale), mas nenhuma menção textual a "Tailscale"/"Funnel" foi encontrada em nenhum `.md` dos dois repositórios.
- `docker-compose.yml` do backend referencia `../../FrontEnd/gerar-cenario-teste-app` como contexto de build do frontend — path que não bate com o nome/caixa real do repositório atual (`gerar-cenario-teste-app`), indício de que esse compose pode estar desatualizado e não ser o método real de deploy.
- `angular.json` define `baseHref: "/gerar-cenario-teste-app/"` para produção — sugere possível path-based routing atrás de proxy, mas não confirma domínio/origem.
- **Classificação: `UNKNOWN_PRODUCTION_ORIGIN`.** A origem real de produção não está documentada em nenhum arquivo acessível nos dois repositórios. Não será inventada.

## 10. Consumidores browser conhecidos

Único: o frontend Angular (`gerar-cenario-teste-app`), via `AutoQaExecutionService` e `AutoQaService` (chamando `AgentController`/`JiraController`/`CenarioController`).

## 11. Consumidores não-browser conhecidos

- `JiraController` chama a API do Jira via `JiraClient` (`RestTemplate`) — é um consumo **outbound** (backend→Jira), não um receptor de webhook; não afetado por CORS de entrada.
- Nenhum `.postman_collection.json` ou suíte real de Robot Framework/RestAssured contra os controllers foi encontrado — os testes que mencionam "Robot"/"RestAssured" são unitários de **parsing de conteúdo .robot como dado de domínio**, não clientes HTTP do backend.
- Testes `MockMvc`/`TestRestTemplate` existentes (`AutoQaExecutionControllerTest`) **não são afetados por CORS** — é uma política de enforcement do navegador, não do protocolo HTTP em si.

## 12. Métodos HTTP realmente usados pelo frontend

Apenas **GET** e **POST** nos services Auto QA/Agent/Jira. `CenarioController` usa **DELETE** (documentado em `docs/guias/GUIA-DE-USO.md`), fora do escopo Auto QA mas dentro do mesmo CORS global. `PUT` está habilitado no CORS atual mas não foi confirmado uso real em nenhum service investigado.

## 13. Headers customizados usados pelo frontend

**Nenhum.** Nenhuma ocorrência de `headers:`/`HttpHeaders`/`setHeader` nos services que chamam o backend — todas as chamadas usam a assinatura padrão do `HttpClient` sem opções de header.

## 14. `allowCredentials` atual

**Ausente** (default Spring = `false`). Já existiu `true` antes do commit `5e00263`, removido junto com a consolidação do `SimpleCorsFilter`.

## 15. `maxAge` atual

**Ausente** — default implícito do Spring (1800s).

## 16. `exposedHeaders` atual

**Ausente** — nenhum header customizado exposto ao JS além dos "safelisted" padrão do CORS.

## 17. Testes existentes relacionados a CORS

**Nenhum.** Único uso de `MockMvc` no projeto (`AutoQaExecutionControllerTest`) não tem nenhuma asserção sobre `Origin`/`Access-Control-*`/preflight.

## 18. Comportamento atual de preflight

Como `allowedMethods` inclui `OPTIONS` explicitamente e `allowedHeaders("*")` cobre qualquer header de preflight, requisições `OPTIONS` de preflight são atendidas pelo mecanismo padrão do `CorsRegistry` do Spring — nenhum tratamento customizado, nenhum bloqueio observado. Não há teste comprovando isso, mas é o comportamento padrão e esperado do Spring MVC com essa configuração.

## 19. Risco real do wildcard (B6)

Confirmado no diagnóstico geral da Fase 13 e reconfirmado aqui: qualquer página web arbitrária carregada no navegador de alguém com acesso de rede ao host pode disparar chamadas cross-origin diretas contra os 4 controllers (incluindo `AutoQaExecutionController`, que já tem proteção de `allowedRoots` desde a 13.1A, mas ainda sem autenticação). CORS aberto não é, por si só, uma falha de autenticação — mas remove a única barreira de origem que existe hoje, já que não há Spring Security.

## 20. Impacto da restrição (visão geral, detalhado por estratégia abaixo)

Restringir para `http://localhost:4200` (dev) + uma origem de produção **ainda não confirmada** cobriria o único consumidor browser conhecido, sem quebrar nenhuma feature — desde que a origem de produção seja corretamente configurada antes do deploy. O maior risco de regressão não é técnico, é operacional: esquecer de configurar a origem de produção quebraria o frontend em produção imediatamente (todas as 4 features, não só Auto QA, já que o CORS é global).

## 21. Estratégia A — origem fixa no código

`allowedOrigins("http://localhost:4200")` hardcoded. **Avaliação: inadequada.** Não cobre produção (origem desconhecida, e hardcoding de produção é proibido pela instrução) nem múltiplos ambientes. Exigiria recompilar/alterar código para cada mudança de origem — rígido demais para um projeto com origem de produção ainda não determinada.

## 22. Estratégia B — origem configurável via application.yml/env var

Lista de origens lida de uma property (ex.: variável de ambiente), sem valor hardcoded no código. **Avaliação: adequada.** Resolve o problema da origem de produção desconhecida (quem faz o deploy configura a variável de ambiente correta no momento do deploy, sem o código precisar saber o valor antecipadamente) e cobre múltiplos ambientes sem duplicar `CorsConfig`. Consistente com o padrão já usado no projeto para outros valores sensíveis a ambiente (`MONGO_URI_NUVEM`, `OPENAI_API_KEY`, etc., todos via `${VAR}` no `application.yml`).

## 23. Estratégia C — configuração global compartilhada entre controllers

Manter um único `CorsConfig` cobrindo todos os controllers (como é hoje), só trocando a origem wildcard por uma lista configurável. **Avaliação: adequada e recomendada manter o escopo global.** Não há nenhuma evidência de que os 4 controllers tenham consumidores com origens diferentes entre si — todos são consumidos pelo mesmo frontend Angular único. Não há Spring Security nem necessidade arquitetural de segmentar por controller.

## 24. Estratégia D — CORS específico por módulo/controller

`@CrossOrigin` individual por controller, ou múltiplos `CorsRegistry.addMapping()` com regras diferentes por prefixo de path. **Avaliação: não justificada.** Adicionaria complexidade (4 configurações a manter em sincronia, risco de divergência) sem nenhum benefício comprovado, já que todos os controllers compartilham o mesmo consumidor. Não recomendada, salvo se no futuro surgir um consumidor real com origem diferente para um controller específico.

## 25. Estratégia recomendada

**B + C combinadas**: manter o escopo global de `CorsConfig` (um único ponto de configuração, cobrindo os 4 controllers), mas substituir `allowedOriginPatterns("*")` por uma lista de origens explícitas, lida de configuração externa (variável de ambiente/`application.yml`), nunca hardcoded no código-fonte. Esta é uma recomendação de diagnóstico, não uma implementação — aguarda aprovação.

## 26. Escopo recomendado da configuração

**Global, não sob o namespace `auto-qa.*`.** O CORS afeta a aplicação inteira (4 controllers de features distintas: Auto QA, Chat IA, Jira, Cenários), não é uma preocupação exclusiva do módulo Auto QA. Colocar a propriedade sob `auto-qa.allowed-origins` seria semanticamente incorreto e confundiria o verdadeiro escopo do mecanismo — a decisão deve ser baseada no escopo real (aplicação inteira), não no nome da fase que motivou a correção.

## 27. Nome proposto da propriedade (se aprovado futuramente)

Sugestão conceitual, não implementada: algo como `app.cors.allowed-origins` (ou `security.cors.allowed-origins`, dado que trata de uma preocupação de segurança transversal). Tipo: `List<String>`. **Esta é uma sugestão para avaliação, não uma decisão — o nome final deve ser aprovado explicitamente antes de qualquer implementação, conforme instruído.**

## 28. Default recomendado / comportamento com configuração vazia

Três opções foram pedidas para comparação:

- **Opção A — nenhuma origem browser permitida por default (fail-closed).** Consistente com o precedente já estabelecido na Fase 13.1A (`allowedRoots` vazia = nenhum path autorizado). Mais seguro; custo: desenvolvimento local **para de funcionar** (frontend em `localhost:4200` seria bloqueado) até que o desenvolvedor configure explicitamente a origem local — exatamente o mesmo tipo de aviso operacional que já foi necessário para `allowedRoots` na 13.1A.
- **Opção B — permitir `localhost` apenas em profile de desenvolvimento.** **Não há profiles Spring hoje** (confirmado: único `application.yml`, sem `application-dev.yml`/`spring.profiles`) — implementar esta opção exigiria criar uma arquitetura de profiles inteira só para resolver B6, o que a própria instrução veda explicitamente ("não criar uma arquitetura inteira de profiles apenas para resolver B6 sem justificar"). **Não recomendada no estado atual do projeto.**
- **Opção C — falhar o startup se a configuração estiver vazia.** Mais rígido que fail-closed silencioso; garante que ninguém suba a aplicação sem configurar CORS conscientemente, mas é uma mudança de comportamento operacional (a aplicação hoje sempre sobe) que merece decisão explícita, não assumida por mim.

**Nenhuma das três foi escolhida nesta etapa — fica para aprovação.** Dado o precedente da 13.1A, a Opção A (fail-closed silencioso, sem derrubar o startup) parece a mais coerente com o padrão já adotado no projeto, mas a decisão final não é minha.

## 29. Impacto em desenvolvimento local

Com fail-closed (Opção A) e nenhuma origem pré-configurada: o frontend local **deixaria de conseguir chamar o backend** assim que a correção fosse implementada, até que `http://localhost:4200` fosse explicitamente adicionado à configuração local (variável de ambiente ou `application.yml` local, nunca commitado como valor fixo de produção). Isso precisa ser comunicado antes da implementação, exatamente como ocorreu com `allowedRoots`.

## 30. Impacto em deploy

**Bloqueado por informação ausente**: a origem real de produção do frontend não é conhecida por nenhum dos dois repositórios (item 9). Qualquer implementação que exija essa origem para funcionar em produção precisa que ela seja fornecida explicitamente por quem administra o deploy antes (ou no momento) da implementação — não pode ser inferida do código.

## 31. Impacto em outras features

`AgentController` (chat com IA), `JiraController` e `CenarioController` seriam afetados igualmente, já que o CORS é global. Nenhuma evidência de que essas features tenham consumidores com origem diferente do frontend Angular único — risco de regressão nelas classificado como **LOW**, desde que a lista de origens configurada inclua corretamente a(s) origem(ns) real(is) do frontend em cada ambiente.

## 32. Testes existentes

Nenhum teste relacionado a CORS existe hoje (item 17) — confirmado por busca ampla.

## 33. Testes RED planejados (não criados nesta etapa)

Conforme pedido, no mínimo:
- Origem explicitamente permitida → aceita (header `Access-Control-Allow-Origin` presente e correto na resposta).
- Origem não permitida → não recebe autorização CORS (header ausente ou preflight rejeitado).
- Preflight (`OPTIONS`) de origem permitida → funciona.
- Preflight de origem bloqueada → bloqueado.
- Método permitido (GET/POST, e DELETE para o caso do CenarioController) → funciona para origem permitida.
- Header permitido → funciona (dado que hoje nenhum header customizado é usado, este caso é menos crítico, mas deve ser mantido coerente com `allowedHeaders`).
- Configuração com múltiplas origens (ex.: dev + produção simultaneamente configuradas) → ambas funcionam.
- Configuração vazia → comportamento conforme a opção de default que for aprovada (item 28).
- Regressão: os 4 controllers (`AutoQaExecutionController`, `AgentController`, `JiraController`, `CenarioController`) continuam acessíveis pela(s) origem(ns) autorizada(s) — não testar só Auto QA, dado que o CORS é global.

## 34. Arquivos que provavelmente seriam criados

Nenhum estritamente necessário — a mudança cabe dentro de `CorsConfig.java` existente, lendo uma nova property. Se a decisão for extrair a lista de origens para uma classe de configuração tipada (padrão já usado no projeto via `AutoQaProperties`), poderia ser criada uma classe equivalente (ex.: algo como `CorsProperties`) — decisão de implementação, não tomada aqui.

## 35. Arquivos que provavelmente seriam alterados

- `CorsConfig.java` — trocar `allowedOriginPatterns("*")` por lista configurável.
- `application.yml` — adicionar a nova property (nome a definir, item 27), sem nenhum valor de produção hardcoded.
- Novo(s) teste(s) de CORS (arquivo a criar, provavelmente via `@WebMvcTest`/`MockMvc` simulando header `Origin`).

## 36. Riscos de regressão

| Risco | Severidade |
|---|---|
| Frontend local deixa de carregar/chamar o backend se `localhost:4200` não for configurado explicitamente após a mudança | HIGH (certo de ocorrer se não comunicado antes) |
| Deploy de produção quebra se a origem real de produção não for configurada (hoje desconhecida) | HIGH (bloqueado até a origem ser informada) |
| Outra tela Angular ou build usando porta diferente de 4200 (não identificada nesta investigação) | LOW (nenhuma evidência encontrada, mas não pode ser 100% descartada sem inventário externo ao repositório) |
| Integração Jira via webhook externo dependendo de CORS aberto | Não aplicável — Jira é consumido outbound pelo backend, não é um consumidor de entrada sujeito a CORS |
| Deploy via Funnel/Tailscale com origem/path routing não documentado | MEDIUM — não é possível avaliar o impacto real sem confirmar a topologia de produção |

## 37. Limitações da correção de CORS

Restringir CORS **não resolve**: autenticação, autorização, exposição de endpoints públicos, CSRF, ou segurança de rede em geral. CORS é uma política aplicada pelo **navegador** — não impede `curl`, Postman, RestAssured, Robot Framework, ou qualquer serviço backend malicioso de acessar os endpoints diretamente (esses clientes nunca foram, e continuarão não sendo, barrados por CORS). A correção de B6 reduz especificamente a superfície de ataque via **browser cross-origin**, nada além disso.

## 38. Confirmação de que autenticação não será implementada

Confirmado. Nenhuma menção a JWT, Spring Security, login, roles ou API key foi proposta ou implementada nesta subfase. A ausência de autenticação continua sendo dívida separada, já registrada no diagnóstico geral da Fase 13.

## 39. Confirmação de que frontend não será alterado

Confirmado. Toda leitura no repositório frontend (`enviroment.dev.ts`, `enviroment.prd.ts`, `angular.json`, `package.json`) foi estritamente somente-leitura. Nenhum arquivo do frontend foi modificado.

## 40. Confirmação de que nenhum arquivo foi alterado

Confirmado. `git status` em ambos os repositórios permanece idêntico ao estado deixado ao final da Fase 13.1A (backend com as alterações já aprovadas da 13.1A; frontend só com os relatórios de documentação, nenhum código).

## 41. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado. Apenas leitura de histórico (`git show`/`git log` para recuperar o conteúdo do `SimpleCorsFilter` removido) e `git status`/`git diff` foram usados — nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`clean`.

## 42. Confirmação de que aguardará nova aprovação antes da implementação

Confirmado. Nenhuma implementação de CORS foi iniciada. Nenhuma property foi criada. `CorsConfig.java` e `application.yml` permanecem exatamente como estavam. Aguardando aprovação explícita, incluindo especificamente a definição de:
1. Qual das 3 opções do item 28 (default com configuração vazia) será adotada.
2. O nome final da propriedade (item 27).
3. **A origem real de produção do frontend** (item 9), sem a qual a implementação não pode ser configurada corretamente para produção — este é o item que mais precisa da sua confirmação direta, pois não existe em nenhum repositório.

---

**PARADO conforme instruído.** Não implementei CORS, não alterei `allowedOriginPatterns("*")`, não criei propriedade, não alterei `application.yml`, não iniciei testes RED, não alterei frontend, não iniciei 13.2 nem 13.5.
