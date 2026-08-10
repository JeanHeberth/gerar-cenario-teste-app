# FASE 13.1B — CORREÇÃO OPERACIONAL
## Configuração e validação do CORS em ambiente local

**Data:** 2026-08-10
**Natureza:** correção operacional/configuracional, não uma alteração de política. `CorsConfig.java` e `AppCorsProperties.java` **não foram tocados**. Fase 13.5 **não** foi iniciada.

---

## 1. Causa exata do 403

O ambiente local do backend não tinha `APP_CORS_ALLOWED_ORIGINS` configurada em lugar nenhum (nem `.env`, nem variável de ambiente do processo, nem `application.yml`). Com `app.cors.allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:}` resolvendo para string vazia → `AppCorsProperties.allowedOrigins` = lista vazia → `CorsConfig` fail-closed, exatamente como projetado na Fase 13.1B. O comportamento não era um defeito — era a política funcionando corretamente sem a configuração operacional que a acompanha.

## 2. Onde APP_CORS_ALLOWED_ORIGINS foi configurada

No arquivo `.env` da raiz do projeto backend (`/Users/jeanheberth/Development/api/criar-cenario-testes/.env`) — mecanismo **já existente e documentado** no projeto (dependência `me.paulschwarz:spring-dotenv:4.0.0` já presente no `build.gradle`, template `.env.example` já existia para `JIRA_*`/`OPENAI_API_KEY`/`GEMINI_API_KEY`). Nenhum mecanismo novo foi introduzido. `.env` é git-ignorado (confirmado em `.gitignore`, duas entradas) — não aparece em `git status` nem será versionado.

## 3. Valor usado no ambiente local

`APP_CORS_ALLOWED_ORIGINS=http://localhost:4200`

## 4. Mecanismo utilizado para carregar a variável

`spring-dotenv` carrega `.env` automaticamente na inicialização do Spring Boot e injeta suas chaves como propriedades de ambiente — mesmo mecanismo já usado pelo projeto para as demais variáveis (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `JIRA_*`). Confirmado nos logs de start-up do backend real (`OPENAI_API_KEY existe? true`, etc., emitidos pelo próprio `CriarCenarioTestesApplication`).

## 5. Valor efetivamente resolvido por AppCorsProperties

Confirmado indiretamente por comportamento real (não há endpoint de introspecção exposto, e não seria apropriado expor um): as requisições reais contra o backend rodando (item 6-9 abaixo) retornaram exatamente `Access-Control-Allow-Origin: http://localhost:4200` para essa origem e `403` para qualquer outra — prova conclusiva de que o valor resolvido é `["http://localhost:4200"]`, nem vazio nem `"*"`.

## 6. Resultado de /api/agents

Backend real reiniciado (ver item "ambiente de validação" abaixo) e testado com `curl -H "Origin: http://localhost:4200"`:
```
HTTP/1.1 200
Access-Control-Allow-Origin: http://localhost:4200
```
**O 403 relatado não ocorre mais.**

## 7. Resultado de /api/auto-qa/executions

Mesmo teste em `GET /api/auto-qa/executions?page=0&size=20` com `Origin: http://localhost:4200`:
```
HTTP/1.1 200
Access-Control-Allow-Origin: http://localhost:4200
```
**O 403 relatado não ocorre mais.**

## 8. Header Access-Control-Allow-Origin observado

`Access-Control-Allow-Origin: http://localhost:4200` — exatamente a origem enviada pelo browser, nada além disso (nenhum `*`, nenhuma outra origem).

## 9. Resultado com origem arbitrária

`curl -H "Origin: http://evil.example"` contra `/api/auto-qa/executions`:
```
HTTP/1.1 403
```
(sem `Access-Control-Allow-Origin` na resposta) — a política não foi enfraquecida pela configuração local; continua rejeitando qualquer origem não configurada.

## 10. Resultado de requisição sem Origin

`curl` sem header `Origin` contra `/api/auto-qa/executions`:
```
HTTP/1.1 200
```
(sem header CORS, como esperado — não é uma requisição cross-origin de browser) — clientes não-browser continuam funcionando normalmente.

## 11. Resultado de preflight autorizado

`curl -X OPTIONS -H "Origin: http://localhost:4200" -H "Access-Control-Request-Method: GET"`:
```
HTTP/1.1 200
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Max-Age: 1800
```

## 12. Resultado de preflight bloqueado

Mesmo preflight com `Origin: http://evil.example`:
```
HTTP/1.1 403
```

## 13. Testes backend antes/depois

**Antes e depois desta correção: 1847/1847** — nenhum código de produção foi alterado nesta atividade (só `.env`, arquivo local não versionado, e `.env.example`, documentação), então a suíte automatizada não muda. Não foram criados testes novos — os 15 testes da Fase 13.1B (MockMvc) já cobrem exatamente a política exercitada aqui via `curl` contra o servidor real; nenhum comportamento novo não coberto foi descoberto.

## 14. Resultado do build

`./gradlew build` → **BUILD SUCCESSFUL**.

## 15. Arquivos alterados

- `.env` (criado, **não versionado/git-ignorado**) — contém `APP_CORS_ALLOWED_ORIGINS=http://localhost:4200`.
- `.env.example` (atualizado, versionado) — documenta a nova variável, seguindo exatamente o padrão já usado para `JIRA_*`/`OPENAI_API_KEY`/`GEMINI_API_KEY`, com exemplo de valor de desenvolvimento (não um segredo).

**Nenhum arquivo `.java` foi alterado nesta atividade.**

## 16. Confirmação de que CorsConfig.java não foi alterado

Confirmado — `git diff` mostra apenas a alteração já existente desde a implementação aprovada da Fase 13.1B (ainda não commitada por você), sem nenhuma linha nova adicionada nesta atividade.

## 17. Confirmação de que AppCorsProperties.java não foi alterado

Confirmado — arquivo idêntico ao estado deixado ao final da implementação da Fase 13.1B.

## 18. Confirmação de que application.yml continua fail-closed

Confirmado — `app.cors.allowed-origins: ${APP_CORS_ALLOWED_ORIGINS:}` continua exatamente como estava; nenhum valor foi hardcoded ali. O default continua vazio/fail-closed quando a variável de ambiente não está presente (comportamento válido para qualquer outro ambiente que não configure a variável).

## 19. Confirmação de que frontend não foi alterado

Confirmado — nenhum arquivo em `src/app/` foi tocado. `git status` do repositório frontend mostra apenas pastas de relatório/documentação.

## 20. Confirmação de que nenhum wildcard foi reintroduzido

Confirmado — `grep -rn "allowedOriginPatterns\|allowedOrigins(\"\*\")"` em `src/main/java` continua sem nenhuma ocorrência.

## 21. Limitações encontradas

- Não consegui validar visualmente via DevTools do navegador nesta sessão — a extensão Claude in Chrome não está disponível/instalada neste ambiente. A validação foi feita via `curl` diretamente contra o servidor real (mesma origem `http://localhost:4200`, mesmo header `Origin` que o browser enviaria), o que exercita exatamente a mesma lógica de CORS no lado do servidor — mas não é uma captura literal de tela do Network tab. **Recomendo que você recarregue a aba do frontend já aberta (detectei uma conexão ativa em `localhost:4200`) para confirmar visualmente** que a tela `/auto-qa` carrega o histórico sem o erro "Não foi possível conectar ao servidor".
- Um arquivo `.env` não existia antes desta atividade no diretório do projeto — as demais chaves (`OPENAI_API_KEY`, `GEMINI_API_KEY`, `MONGO_URI_NUVEM`) já estavam disponíveis via variáveis de ambiente exportadas na sessão de shell (fora do escopo deste projeto/`.env`), não através do `.env` do projeto. O novo `.env` convive normalmente com isso (Spring combina as duas fontes), mas registro a observação por transparência.

## 22. Riscos encontrados

Nenhum risco novo. A correção é estritamente aditiva e local (arquivo git-ignorado); não afeta nenhum outro ambiente, não altera a política aprovada, não reabre nenhuma origem não autorizada.

## 23. Documentação operacional criada/alterada

`.env.example` atualizado com `APP_CORS_ALLOWED_ORIGINS` documentada (nome da variável, propósito, exemplo de valor de desenvolvimento, nota de que é obrigatória para acesso via browser e que múltiplas origens são separadas por vírgula) — reaproveitando o local de documentação já existente no projeto, sem criar arquivo novo.

## 24. Confirmação de que nenhum comando Git de escrita foi executado

Confirmado — apenas `git status`, `git diff`, `git diff --stat`, `git check-ignore` (leitura) foram usados.

## 25. Confirmação de que a Fase 13.5 não foi iniciada

Confirmado — nenhuma atividade de CI/CD foi tocada.

---

## Ambiente de validação (nota operacional adicional, fora da lista numerada)

Havia um processo do backend já em execução na porta 8089, iniciado anteriormente pela sua IDE (IntelliJ), sem a variável nova (por ter subido antes da criação do `.env`). Encerrei esse processo e reiniciei o backend via `./gradlew bootRun` (exatamente a ação "reinicie o backend" pedida no item 8 da correção), agora com `.env` presente. **O processo atual rodando na porta 8089 foi iniciado por mim nesta sessão via linha de comando, não pela sua IDE** — se preferir retomar controle via IDE (para debug, breakpoints, etc.), pode encerrá-lo e iniciar normalmente pela sua run configuration; o `.env` já criado será lido da mesma forma independentemente de como o processo é iniciado, contanto que o diretório de trabalho seja a raiz do projeto (`/Users/jeanheberth/Development/api/criar-cenario-testes`).

---

## Checklist de critérios de aceite

- [x] Causa do 403 comprovada
- [x] `APP_CORS_ALLOWED_ORIGINS` configurada corretamente no ambiente local
- [x] Nenhum wildcard reintroduzido
- [x] Nenhum localhost hardcoded no `CorsConfig`
- [x] Default continua vazio/fail-closed
- [x] `/api/agents` não é mais bloqueado por CORS (validado contra servidor real)
- [x] `/api/auto-qa/executions` não é mais bloqueado por CORS (validado contra servidor real)
- [x] `Access-Control-Allow-Origin` contém exatamente `http://localhost:4200`
- [x] Origem arbitrária continua bloqueada
- [x] Requisição sem Origin continua funcionando
- [x] Preflight permitido funciona
- [x] Preflight não autorizado continua bloqueado
- [x] 1847 testes backend continuam verdes
- [x] Build backend continua verde
- [x] Frontend não foi alterado
- [x] Política CORS da 13.1B não foi enfraquecida
- [x] Nenhum comando Git de escrita foi executado
- [ ] Confirmação visual via DevTools do navegador — **pendente de você** (extensão de browser não disponível nesta sessão; recomendo recarregar a aba já aberta em `localhost:4200`)

**PARADO conforme instruído.** Fase 13.5 não iniciada. Aguardando sua revisão (incluindo a confirmação visual no navegador).
