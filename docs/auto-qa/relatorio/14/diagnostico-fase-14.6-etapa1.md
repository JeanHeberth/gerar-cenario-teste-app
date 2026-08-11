# FASE 14.6 — Chat IA
## Etapa 1 — Baseline, Caracterização Funcional e Plano de Migração

**Data:** 2026-08-11
**Pré-condição confirmada:** Fase 14.5 = `FASE_14_5_HARDENED` — reconfirmada nesta sessão com **servidor E2E genuinamente limpo** (processo `ng serve` obsoleto na porta 4200, ativo desde antes da atualização de branch, foi encerrado manualmente antes da validação; o log `[WebServer]` do Playwright confirma um processo novo iniciado pelo próprio test runner). Resultado da reconfirmação: 491/491 unit, 40/40 E2E, build verde.
**Modo:** produção somente leitura — apenas testes de caracterização (unit + E2E) foram criados. Nenhum arquivo de produção da tela foi alterado.

---

## 1. Baseline

491 unit / 40 E2E / build verde, antes de qualquer teste novo desta etapa (herdado do fechamento da Fase 14.5/Etapa 2).

## 2. Rota

`chat-agentes` → `ChatAgentesComponent` (`src/app/chat-agentes/`), registrada em `app.routes.ts`, **eager** (não lazy).

## 3. Componente

`ChatAgentesComponent` — `standalone`, `ChangeDetectionStrategy.Eager`, `imports: [FormsModule]` (formulário **template-driven**, via `[(ngModel)]` — diferente do `ReactiveFormsModule` usado em Gerar Cenário).

## 4. Arquivos

`chat-agentes.component.ts` (147 linhas), `.html` (120 linhas), `.css` (406 linhas). Nenhum service dedicado — `HttpClient` injetado diretamente no componente (mesmo padrão de Gerar Cenário antes da 14.5). Nenhum spec existente antes desta etapa.

## 5. Modelo de mensagens

```ts
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string; // declarado na interface mas NUNCA preenchido pelo frontend
}
```
Sem `id`, sem `status`. O backend retorna `timestamp` em `ChatMessageDto`, mas o frontend não usa esse campo em nenhum lugar (nem exibe, nem ordena por ele).

## 6. Agentes — origem, endpoint, seleção

`GET {apiUrl}/api/agents` (mesmo endpoint do Gerar Cenário). Sucesso com lista não vazia → **primeiro agente da lista** (`agents[0].id`) é selecionado como default — estratégia diferente do Gerar Cenário (que procura um id contendo "gerador"+"cenario"). Lista vazia → `agentsMessage = 'Nenhum agente disponivel no backend.'`. Erro → mesma mensagem genérica do Gerar Cenário + `console.error` + `agents=[]`. Trocar de agente no meio de uma conversa **não reseta nem afeta** o histórico local — só passa a valer para a próxima mensagem enviada (`agentId` vai no payload de cada envio).

## 7–8. User message / Assistant message

**User message:** `sendMessage()` faz `trim()` do `userInput`; se vazio, se `!selectedAgent` ou se `loading`, retorna sem efeito. Se válido: mensagem é adicionada **imediatamente e de forma otimista** ao array `messages` (antes da resposta do backend chegar), `userInput` é limpo, `loading=true`.

**Assistant message:** resposta do `POST /api/agents/sessions/chat` retorna `{sessionId, agentId, messages: ChatMessageDto[]}` (histórico completo da sessão, não só a nova mensagem). O frontend pega **a última posição do array** (`response.messages[response.messages.length - 1]`) e só a adiciona ao histórico local se `role === 'assistant'` — se por algum motivo a última mensagem não for do assistente, nada é adicionado (achado silencioso, ver seção "riscos").

## 9. Endpoints reais consumidos

| Finalidade | Endpoint | Payload | Retorno | Usado pela tela? |
|---|---|---|---|---|
| AGENTS | `GET {apiUrl}/api/agents` | — | `AgentInfoResponse[]` | Sim |
| CHAT | `POST {apiUrl}/api/agents/sessions/chat` | `{sessionId, agentId, message}` | `ChatHistoryResponse` | Sim |
| HISTORY | `GET {apiUrl}/api/agents/sessions/{sessionId}` | — | `ChatHistoryResponse` | **Não** — endpoint existe no backend (`AgentController.getSessionHistory`), mas o frontend nunca o chama |
| OTHER (clear) | `DELETE {apiUrl}/api/agents/sessions/{sessionId}` | — | `204` | **Não** — endpoint existe (`AgentController.clearSession`/`ChatSessionService.clearSession`), mas `newChat()` só reseta estado local, nunca chama o backend para apagar a sessão anterior (sessões antigas ficam órfãs no MongoDB) |

## 10. Payload/resposta detalhados

Payload: `{ sessionId: string, agentId: string, message: string }`. Resposta: `{ sessionId, agentId, messages: [{role, content, timestamp}] }` — confirmado lendo `ChatHistoryRequest`/`ChatHistoryResponse`/`ChatMessageDto` no backend (somente leitura).

## 11. IA direta ou via backend

**Via backend, sempre.** `ChatSessionService.processMessage()` chama `AiProviderResolver.getActiveProvider().gerarRespostaComHistorico(...)` — o frontend nunca faz nenhuma chamada HTTP a OpenAI/Gemini/outro provedor. Nenhum risco de arquitetura nesse sentido.

## 12. Secrets

Pesquisa por `OPENAI|GEMINI|API_KEY|apikey|secret|Authorization|bearer` em `src/app` (case-insensitive): **nenhuma ocorrência**. Nenhuma API key, token ou credencial hardcoded no frontend.

## 13. HttpClient / service

`HttpClient` injetado diretamente no componente (`private http: HttpClient`), sem service dedicado — mesmo padrão do Gerar Cenário antes da extração (que nem chegou a ser feita lá). Não refatorado nesta etapa (fora de escopo).

## 14. Estados reais observados

`IDLE`, `AGENTS_LOADING`, `AGENTS_ERROR` (`agentsMessage`), `EMPTY` (sem agentes OU sem mensagens ainda), `SENDING`/`WAITING_RESPONSE` (`loading=true`, mensagem otimista já no array, indicador de "digitando" com 3 pontinhos), `SUCCESS` (resposta do assistente adicionada), `CHAT_ERROR` (mensagem de erro adicionada como se fosse do assistente, ver seção 21).

## 15. Empty state

Dois empty states distintos, mesma classe `.empty-state`:
- **Sem agentes** (`agents.length === 0`): ícone ⚠️, título "Nenhum agente disponivel", subtítulo com `agentsMessage` se houver.
- **Sem mensagens ainda, mas com agentes disponíveis** (`messages.length === 0 && !loading && agents.length > 0`): ícone 🤖, título "Como posso ajudar?", subtítulo "Selecione um agente e envie uma mensagem para começar."

## 16. Loading

Loading de agentes (`agentsLoading`) e loading de envio/resposta (`loading`) são **flags separadas**, sem sobreposição. Durante `loading=true`: textarea e select ficam `disabled`, botão enviar fica `disabled`, e aparece uma bolha "digitando" (3 pontos animados, `@keyframes bounce`, já neutralizada por `prefers-reduced-motion` global do tema — Fase 14.1). Nenhum `aria-busy`/`aria-live` associado a esse estado (ver seção acessibilidade).

## 17. Duplo envio — CLASSIFICAÇÃO: **PROTECTED**

Diferente do Gerar Cenário (que era `PARTIAL` antes da 14.5/Etapa 2), aqui o guard já existe **no próprio método**, desde sempre:
```ts
sendMessage(): void {
  const text = this.userInput.trim();
  if (!text || !this.selectedAgent || this.loading) return;
  ...
}
```
Comprovado por teste unitário (`httpMock.match(...)` retorna exatamente 1 requisição após duas chamadas seguidas a `sendMessage()`) e por E2E (dois cliques rápidos no botão enviar resultam em 1 única chamada HTTP e 1 única bolha de usuário no histórico).

## 18. Ordem das mensagens

Mais antiga → mais recente (`messages.push(...)`, iterado com `@for` na ordem natural do array) — sem inversão, diferente da lista de Cenários (`res.reverse()`).

## 19. Scroll

`@ViewChild('messagesEnd')` (uma `<div>` vazia no fim da lista) + `ngAfterViewChecked()` chama `scrollIntoView({behavior:'smooth'})` sobre ela quando a flag privada `shouldScroll` está `true` (setada em `sendMessage()` e no callback de sucesso/erro da resposta). Scroll é do **container interno** `.messages-area` (`overflow-y: auto`), não da página inteira. Comprovado por teste unitário com spy em `Element.prototype.scrollIntoView`.

## 20. setTimeout/setInterval/RAF

**Nenhum** no componente — só a animação CSS (`@keyframes bounce`) dos pontinhos de "digitando", que roda via CSS puro, não via JS.

## 21. Subscriptions

Um único `subscribe()` (no `sendMessage()`, HTTP POST). Sem `ngOnDestroy`, sem unsubscribe manual — mas como é um `HttpClient` (observable que completa após 1 emissão), não há vazamento real de memória; classificado como `OBSERVATION`, não como bug.

## 22. Markdown / innerHTML / DomSanitizer

`formatContent(content)` faz uma série de `.replace()` com regex para simular markdown básico (blocos de código, código inline, negrito, itálico, listas, quebras de linha) e o resultado é injetado via `[innerHTML]="formatContent(msg.content)"` no template — **aplicado tanto para mensagens do usuário quanto do assistente** (mesmo bloco HTML para as duas roles). **Nenhum `DomSanitizer`/`bypassSecurityTrustHtml` é usado** — o binding `[innerHTML]` passa pelo sanitizer HTML **padrão e automático** do Angular.

## 23. Achado de segurança — XSS

**Severidade: MEDIUM** (não BLOCKER/HIGH). `formatContent()` **não escapa** `<`, `>`, `&` antes de aplicar as regras de formatação — comprovado por teste unitário (`formatContent('1 < 2 && 3 > 1')` retorna a string idêntica, sem nenhum escaping). Isso significa que HTML bruto vindo da resposta da IA (ou do próprio texto digitado pelo usuário) passa **literalmente** para dentro do `[innerHTML]`. A única camada de proteção real hoje é o **sanitizer automático do Angular** (que roda implicitamente em todo binding `[innerHTML]`, já que `bypassSecurityTrustHtml` nunca é chamado). Provado empiricamente (unit **e** E2E, browser real):
- Uma resposta contendo `<img src="x" onerror="window.__xssFired=true">` é renderizada, mas o atributo `onerror` é **removido** pelo sanitizer (console emite o warning nativo do Angular: `"WARNING: sanitizing HTML stripped some content"`), e `window.__xssFired` nunca é definido.
- Uma resposta contendo `<script>...</script>` não executa (script via `innerHTML` nunca executa em nenhum navegador, independente de sanitizer — comportamento padrão da spec HTML).

**Conclusão:** não há exploração funcional comprovada hoje (nenhum `bypassSecurityTrustHtml`, sanitizer ativo e didaticamente confirmado), mas o padrão de código é frágil — depende 100% de uma proteção implícita do framework em vez de escaping explícito, e caracteres HTML legítimos em mensagens (ex.: usuário digita `1 < 2`) quebram a renderização de forma imprevisível. Registrado como `FUTURE` (não `FIX_NOW`), mas com prioridade alta na lista de dívidas por ser área de segurança.

## 24. Code blocks

` ```codigo``` ` → `<pre><code class="code-block">codigo</code></pre>`; `` `codigo` `` → `<code class="inline-code">codigo</code>`. Sem syntax highlighting (sem biblioteca — puro CSS monoespaçado).

## 25. Links

Nenhum tratamento especial de links/URLs em `formatContent()` — se a resposta contiver uma URL em texto puro, ela não vira `<a href>` automaticamente (sem auto-linkificação). Se a IA já retornar HTML `<a href="...">`, esse HTML passa pelo sanitizer padrão do Angular como qualquer outro conteúdo (mesma análise da seção 23).

## 26. Composer

`<textarea class="input-textarea" [(ngModel)]="userInput" (keydown)="onKeyDown($event)" rows="1" [disabled]="loading || agents.length === 0">`. Sem auto-resize real via JS (só `min-height`/`max-height` + `overflow-y:auto` no CSS — cresce até 160px e depois cria scroll interno).

## 27. Enter / Shift+Enter

```ts
onKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    this.sendMessage();
  }
}
```
Enter puro envia (com `preventDefault()`, evitando quebra de linha); Shift+Enter não é interceptado, então o comportamento nativo do `<textarea>` (nova linha) ocorre normalmente. Confirmado por unit test (spy em `sendMessage`/`preventDefault`) **e** E2E real no navegador (`textarea.press('Enter')` vs `press('Shift+Enter')` + digitação).

## 28. Acessibilidade — gaps registrados (não corrigidos)

- Textarea sem `<label>` associado (só `placeholder`).
- Select de agente sem `<label>` (só `title="Selecionar agente"`, que não é um substituto acessível equivalente a label).
- Nenhuma nova mensagem é anunciada a leitor de tela — sem `aria-live`/`role="log"`/`role="status"` na área de mensagens.
- Loading (bolha "digitando") não tem `aria-live`/texto equivalente para leitor de tela.
- Botão enviar (`<button class="send-button">`) não tem `aria-label` — só `title="Enviar (Enter)"` (não é lido de forma consistente por todos os leitores de tela como nome acessível).
- Foco não é gerenciado explicitamente após enviar/receber mensagem.

## 29. Live region / semântica da conversa

**Não existe** nenhuma `aria-live`, `role="status"` ou `role="log"` na `.messages-area` hoje. Não é papel desta etapa decidir automaticamente qual estratégia adotar (`role="log"` é a mais comum para chats, mas precisa avaliação cuidadosa para não gerar excesso de anúncios) — registrado como gap real, classificação a definir na Etapa 2.

## 30. Erros

Erro de agentes: `agentsMessage` inline (mesmo padrão do Gerar Cenário). Erro de envio: **mensagem de erro inserida diretamente no histórico da conversa como se fosse uma resposta do assistente** (`role: 'assistant', content: '❌ Erro ao processar mensagem...'`) — **não usa `window.alert()`** (diferente do Gerar Cenário antes da correção). Não há retry automático nem botão de "tentar novamente" dedicado — o usuário só pode digitar a mensagem de novo manualmente.

## 31. Console

Um único `console.error('Erro ao carregar agentes:', err)` — classificado `ERROR_DIAGNOSTIC`. Nenhum `console.log`/`console.warn`/`console.debug` no componente.

## 32. Logs sensíveis

Nenhum log expõe conteúdo de mensagem, prompt, resposta da IA, token ou payload completo — o único log existente é o de erro de carregamento de agentes (`err` do HttpErrorResponse, sem dado de negócio).

## 33–34. Design atual e tema

A tela **já usa fundo escuro** (`#0d0d0d`/`#1a1a1a`/`#2d2d2d`) — confirmado visualmente (screenshot 1440/390) que a aparência já é consistente em tom com `/cenarios`/`/` (Gerar Cenário), mesmo sem consumir os tokens `--aq-*` (ver seção 35). Bubbles de mensagem, header fixo, composer com borda arredondada, seletor de agente customizado (`appearance:none` + seta unicode) — tudo já visualmente "dark mode", mas com paleta e valores próprios, não herdados do Design System.

## 35. Tokens

**Zero tokens `--aq-*` consumidos** — toda a paleta é hex hardcoded local (`#0d0d0d`, `#1a1a1a`, `#ececec`, `#9ca3af`, `#3f3f3f`, `#2d2d2d`, `#10a37f` etc.), coincidentemente muito próxima da paleta do tema global (`--aq-background: #131313` vs `#0d0d0d`; `--aq-primary: #10a37f` — **valor idêntico**), mas sem nenhuma referência real ao arquivo de tema. `top: 48px`/`margin-top: 48px` (posicionamento sob a nav fixa) usa o número mágico `48px` em vez de `--aq-nav-height`.

## 36. Bootstrap

**Nenhuma classe Bootstrap real** encontrada (`.btn-new-chat` é uma classe própria, não a utilitária `.btn` do Bootstrap). Classificação: `NOT_APPLICABLE` — Chat IA nunca usou Bootstrap, ao contrário do Gerar Cenário original.

## 37. Primitives candidatos (avaliação, não implementada)

`AqbPageHeaderComponent` (para `.chat-header`, com "Novo Chat" como ação projetada), `AqbButtonComponent` (botão "Novo Chat", botão enviar), `AqbEmptyStateComponent` (os dois empty states). `AqbTextareaComponent`/select nativo: ver seções 39–40.

## 38. KEEP_LOCAL

Conceitos específicos de chat — `MessageBubble` (estrutura `.message-row`/`.message-bubble`), `ChatComposer` (textarea+select+botão integrados), `Conversation` (lista de mensagens + scroll), `AgentSelector` (select customizado com seta) — todos permanecem `KEEP_LOCAL` nesta avaliação inicial; nenhuma evidência de reuso genérico em outras telas que justifique promovê-los a primitive global agora.

## 39. Select de agente

Sem `AqbSelect` no Design System (mesma conclusão do Gerar Cenário). Estratégia futura: `native select + tokens` (mesmo padrão já aplicado em Gerar Cenário na Fase 14.4.1) — **não** `PRIMITIVE_GAP` bloqueante, só decisão de manter nativo.

## 40. Textarea

`AqbTextareaComponent` usa `value`/`valueChange` (sem `ControlValueAccessor`) — não é trivial trocar sem alterar o binding `[(ngModel)]` atual nem o `(keydown)` de Enter/Shift+Enter. Mesma conclusão já registrada para Gerar Cenário: viável só como composição local com tokens, não substituição direta do primitive.

## 41. Testes existentes antes desta etapa

**Zero** (nenhum `.spec.ts` para `chat-agentes`, nenhum E2E).

## 42–43. Testes criados nesta etapa

**Unit novos:** 29 (`chat-agentes.component.spec.ts`) — agentes (loading/sucesso/vazio/erro/seleção do primeiro da lista), empty states (sem agentes / sem mensagens / com mensagens), `sendMessage` (vazio, sem agente, válido com push otimista, payload exato, sucesso extraindo última mensagem, achado da última mensagem não-assistant, erro inline sem alert), duplo envio (1 única requisição, classificação PROTECTED), teclado (Enter/Shift+Enter/outras teclas), `newChat()` (reset + novo sessionId), `getAgentLabel()`, `formatContent()` (5 casos de formatação + 1 achado de não-escaping), segurança (2 provas de sanitização real via `[innerHTML]` renderizado), scroll automático.

**E2E novos:** 6 testes × 2 projetos = 12 execuções (`e2e/chat-agentes.spec.ts`) — golden path (agente default + envio com Enter + resposta), Shift+Enter (nova linha, sem envio), empty state sem agentes (campos desabilitados), erro no envio (mensagem inline, sem `window.alert`, prova via `page.on('dialog')`, e retentativa bem-sucedida), duplo envio (clique duplo → 1 única requisição), segurança XSS (prova em browser real que `window.__xssFired` nunca é definido).

## 44. Endpoints mockados no E2E

`**/api/agents`, `**/api/agents/sessions/chat` — **nenhuma chamada real a IA** (classificação: `UI E2E WITH API MOCK`).

## 45. Fixtures

Nenhum arquivo em disco — todos os payloads são objetos inline determinísticos.

## 46. IA real utilizada

**Não.**

## 47–50. Responsividade e overflow

| Largura | Resultado |
|---|---|
| 1440 | **PASS** |
| 1280 | **PASS** |
| 768 | **PASS** |
| 390 | **PASS** (nav do shell já tinha leve aperto visual pré-existente, fora de escopo desta tela) |

Overflow: zero nas 4 larguras (`scrollWidth === innerWidth`), medido via Playwright.

## 51. Altura/layout

`.chat-page { height: 100vh; }` + `.chat-header` fixo com `top: 48px` + `.messages-area { margin-top: 48px; }` — funciona corretamente na prática (confirmado nos 4 screenshots, sem sobreposição com a nav), mas usa o número mágico `48px` em vez do token `--aq-nav-height` (mesma observação já feita para outras telas antes da migração).

## 52. Servidor limpo confirmado

Antes de validar os E2E finais desta etapa, foi identificado e **encerrado manualmente** um processo `ng serve` obsoleto ainda rodando na porta 4200 (herdado de uma verificação anterior da pré-condição da Fase 14.5). A suíte E2E completa foi então reexecutada e o log `[WebServer]` do Playwright confirma que um processo **novo** foi iniciado pelo próprio test runner para essa execução — nenhum resultado foi aceito de servidor potencialmente desatualizado. `playwright.config.ts` não foi alterado.

## 53–54. Totais finais

Unit: 491 → **520** (+29), todos verdes. E2E: 40 → **52** (+12), todos verdes.

## 55. Build

Verde, **idêntico** ao anterior (`main` 1,79 MB / 443,29 kB) — nenhuma alteração de produção nesta etapa.

## 56. Bundle

Sem mudança (esperado, já que nenhum arquivo de produção foi tocado).

---

## Classificação de achados

**BLOCKER:** nenhum.

**HIGH:** nenhum.

**MEDIUM:**
- `[innerHTML]` sem escaping manual antes da formatação markdown-like (`formatContent()`) — mitigado hoje pelo sanitizer automático do Angular (comprovado por teste), mas é um padrão frágil sem defesa em profundidade. Prioridade alta dentro do MEDIUM por ser área de segurança.
- Ausência de `aria-live`/anúncio de novas mensagens — acessibilidade real, não crítica para funcionamento.

**LOW:**
- `newChat()` não chama `DELETE /api/agents/sessions/{sessionId}` — sessões órfãs se acumulam no MongoDB (higiene de dados, não afeta o usuário).
- Textarea/select sem `<label>` associado.
- Botão enviar sem `aria-label`.
- `48px` hardcoded em vez de `--aq-nav-height`.
- `timestamp` declarado na interface mas nunca usado.

**OBSERVATION:**
- Subscription sem cleanup explícito (inofensivo — observable HTTP completa sozinho).
- Última mensagem da resposta não sendo `role="assistant"` é ignorada silenciosamente (edge case do contrato, nunca observado no fluxo real hoje).

## FIX_NOW

Nenhum — nada bloqueia o uso real da tela hoje, e a Etapa 1 é somente diagnóstico.

## FUTURE (candidatos à Etapa 2, mediante aprovação)

1. Escapar HTML antes de `formatContent()` (defesa em profundidade, independente do sanitizer do Angular).
2. `role="log"`/`aria-live="polite"` na área de mensagens (com cuidado para não gerar anúncios excessivos).
3. `<label>` para textarea e select; `aria-label` no botão enviar.
4. Trocar `48px` hardcoded por `--aq-nav-height`.
5. Avaliar chamar `DELETE /api/agents/sessions/{sessionId}` em `newChat()` (decisão de produto/backend, não só frontend).
6. Migração visual para tokens `--aq-*` + primitives (`AqbPageHeaderComponent`, `AqbButtonComponent`, `AqbEmptyStateComponent`) — mesma abordagem já aplicada em Cenários e Gerar Cenário.

## KEEP_AS_IS

- Estratégia de seleção de agente (primeiro da lista) — funcional, decisão de produto.
- Ausência de histórico persistido entre reloads — decisão de produto, não bug.
- Ausência de syntax highlighting em code blocks — suficiente para o caso de uso atual.
- Guard de duplo envio (`PROTECTED`) — já correto, não precisa de hardening.

## Plano da Etapa 2 (proposta, não aprovada aqui)

Migração visual (tokens + primitives) seguindo o padrão já validado em Cenários/Gerar Cenário, e — se aprovado separadamente — os itens de acessibilidade e o escaping defensivo de HTML. Arquivos de produção que seriam necessários: `chat-agentes.component.ts`, `.html`, `.css` (mesmo padrão de autorização das fases anteriores).

---

## Confirmações de escopo

- **Backend:** intocado (só leitura — `AgentController`, `ChatHistoryRequest`/`Response`, `ChatMessageDto`, `ChatSessionService`).
- **Theme:** intocado.
- **Primitives:** intactos.
- **Shell:** intocado.
- **Cenários:** intocado.
- **Gerar Cenário:** intocado (congelado após `FASE_14_5_HARDENED`).
- **Auto QA:** intocado — regressão completa rodou junto da suíte geral, sem falhas.
- **Pipeline:** intocado.
- **`playwright.config.ts`:** intocado (só o novo spec `e2e/chat-agentes.spec.ts` foi adicionado).
- **Package files/`angular.json`:** intactos. Nenhuma dependência nova.

## Confirmação de nenhum Git de escrita

Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

## Confirmação de que a Fase 14.7 NÃO foi iniciada

Confirmado.

---

## Classificação final

**FASE_14_6_READY_FOR_MIGRATION**

Justificativa: o comportamento real da tela está integralmente caracterizado (agentes, envio, resposta, erro, scroll, teclado, duplo envio já `PROTECTED`) e protegido por 29 testes unitários + 12 execuções E2E (incluindo prova concreta, em browser real, de que a sanitização de HTML está ativa). Responsividade PASS nas 4 larguras, zero overflow. O único achado de severidade real (`MEDIUM`, innerHTML sem escaping manual) já está mitigado pelo comportamento padrão do Angular hoje — não bloqueia avanço, mas deve ser considerado na Etapa 2 junto da migração visual.

---

**PARE.** Não implementar migração visual. Fase 14.6/Etapa 2 e Fase 14.7 não foram iniciadas. Aguardando aprovação.
