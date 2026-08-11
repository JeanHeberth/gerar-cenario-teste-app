# FASE 14.6 — Chat IA
## Etapa 2 — Migração Visual + Hardening Pontual

**Data:** 2026-08-11
**Pré-condição confirmada:** Etapa 1 = `FASE_14_6_READY_FOR_MIGRATION` (520/520 unit, 52/52 E2E, build verde).

---

## 1. Baseline

520 unit / 52 E2E / build verde, antes de qualquer alteração desta etapa (reconfirmado com servidor E2E limpo — ver seção 55).

## 2. Arquivos alterados

Produção: `chat-agentes.component.ts`, `.html`, `.css` (os 3 únicos autorizados). Testes: `chat-agentes.component.spec.ts`, `e2e/chat-agentes.spec.ts`. Nenhum outro arquivo tocado.

## 3. Primitives utilizados

`AqbButtonComponent` — só no botão "Novo Chat" (`variant="secondary"`). Nenhum outro primitive foi usado (ver justificativas nas seções 7 e 11).

## 4–6. Tokens utilizados / hardcodes removidos / hardcodes restantes

**Tokens consumidos:** `--aq-background`, `--aq-surface`, `--aq-panel`, `--aq-border`, `--aq-primary`, `--aq-text-primary`, `--aq-text-secondary`, `--aq-text-muted`, `--aq-space-*`, `--aq-radius-sm/md/lg`, `--aq-font-family`, `--aq-font-size-xs/sm/md/lg`, `--aq-line-height-normal`, `--aq-transition-fast`, `--aq-nav-height`, `--aq-border-width`.

**Mapeamento exato (hex → token):**
| Hex original | Token | Observação |
|---|---|---|
| `#0d0d0d` | `--aq-background` | aproximação (tema usa #131313) |
| `#1a1a1a` | `--aq-surface` | exato |
| `#ececec` | `--aq-text-primary` | exato |
| `#9ca3af` | `--aq-text-secondary` | aproximação semântica |
| `#3f3f3f` | `--aq-border` | exato |
| `#2d2d2d` | `--aq-panel` | aproximação (slot "superfície elevada") |
| `#5a5a5a` | `--aq-text-muted` (texto) / `--aq-border` (hover) | aproximação |
| `#10a37f` | `--aq-primary` | **exato** — já era o mesmo valor |
| `#0d8b6e` (hover do send-button) | removido, substituído por `opacity:0.9` | mesmo padrão de hover já usado por `AqbButtonComponent` |
| `top:48px`/`margin-top:48px` | `var(--aq-nav-height)` | valor idêntico (48px), agora via token |
| `border-radius: 8px` (header/select) | `--aq-radius-md` | exato |
| `border-radius: 12px` (input-wrapper) | `--aq-radius-lg` | exato |
| `border-radius: 16px`/`4px` (bubbles) | `--aq-radius-lg`/`--aq-radius-sm` | aproximação (16→12) e exato (4) |

**Hardcodes restantes (intencionais, documentados no topo do CSS):** cores de code block (`#e5e7eb`, `#374151`, `#1f2937`, `#dc2626`) — tema de código deliberadamente distinto da superfície do chat, sem token equivalente no tema atual; `font-family: 'Fira Code'` (fonte monoespaçada específica de código); tamanhos de ícone/emoji decorativos (22px, 48px, 24px/18px do título do empty-state) — não fazem parte da escala tipográfica de texto, mantidos como estão para não descaracterizar a identidade visual do chat (proibido "redesign radical").

**CSS morto removido:** `.btn-new-chat` (classe não é mais usada — botão virou `AqbButtonComponent`) e `.agent-pills`/`.agent-pill` (já eram código morto **antes** desta etapa — nunca referenciadas no template, confirmado por grep).

## 7. Header

**KEEP_LOCAL + TOKENS** (não migrado para `AqbPageHeaderComponent`). Justificativa: o header do chat é `position: fixed` logo abaixo da nav global, com altura compacta (~48px) — `AqbPageHeaderComponent` tem `max-width` e `padding-bottom`/`border-bottom` fixos, desenhado para cabeçalho estático no topo de conteúdo rolável, não para uma barra fixa compacta. Forçar o primitive geraria regressão de layout ou peso visual incompatível com a identidade de chat (título grande + borda, em vez de uma barra fina tipo toolbar). Migrado apenas visualmente: cores/spacing agora via tokens.

## 8. Novo Chat

Migrado para `<aqb-button variant="secondary" (clicked)="newChat()">`. `newChat()` preservado 100% igual (só reseta `messages`/`sessionId` local).

## 9. Select de agente

Mantido nativo + tokens (sem `AqbSelect`, conforme escopo). Nenhuma mudança de comportamento.

## 10. Label do agente

`<label class="aq-sr-only" for="chat-agent-select">Agente</label>` + `id="chat-agent-select"` no `<select>`. Visualmente oculto (classe `aq-sr-only` já existente em `theme.scss`), localizável por `getByLabel('Agente')`/leitor de tela.

## 11. Composer

**KEEP_LOCAL + TOKENS** (não migrado para `AqbTextareaComponent`, conforme diagnóstico da Etapa 1 — a API do primitive `value`/`valueChange` sem `ControlValueAccessor` não é substituição segura para `[(ngModel)] + (keydown)` com Enter/Shift+Enter).

## 12. Label da mensagem

`<label class="aq-sr-only" for="chat-message-input">Mensagem</label>` + `id="chat-message-input"` na textarea.

## 13–14. Botão enviar / accessible name

Mantido nativo (migrar para `AqbButtonComponent` prejudicaria a composição circular compacta de 36×36px). Adicionado `aria-label="Enviar mensagem"` — nome acessível explícito, independente do `title="Enviar (Enter)"` (mantido como dica complementar).

## 15. Message bubbles

**KEEP_LOCAL.** Cores/bordas/radius/spacing/tipografia migrados para tokens (ver tabela da seção 4-6). Nenhum primitive global criado.

## 16. Conversation

**KEEP_LOCAL.** Nenhum `ChatConversationComponent`/`MessageBubbleComponent`/`ChatComposerComponent` criado.

## 17–18. role="log" / aria-live

Adicionado `role="log" aria-live="polite" aria-label="Conversa"` em `.messages-list` (container real da conversa, só existe quando há mensagens ou loading — não no wrapper que também contém os empty states). Sem `role="alert"` redundante em mensagens individuais (nem mesmo na mensagem de erro, que já é anunciada pelo `aria-live` do container pai).

## 19–20. Loading / role="status"

Bolha "digitando" ganhou `role="status"` + `<span class="aq-sr-only">Assistente está respondendo</span>`; os 3 pontos decorativos ganharam `aria-hidden="true"` cada. Lógica/animação (`@keyframes bounce`) intocada.

## 21. Empty states

**KEEP_LOCAL + TOKENS** (não migrados para `AqbEmptyStateComponent`). Justificativa: o primitive não tem slot para o ícone emoji (🤖/⚠️), elemento central da identidade visual desses estados; forçar o texto a incorporar o emoji ou perder o ícone seria regressão visual. Cores/spacing migrados para tokens.

## 22. Enter

Preservado 100% — `onKeyDown()` intocado no `.ts`.

## 23. Shift+Enter

Preservado 100% — comportamento nativo do `<textarea>` (sem interceptação), intocado.

## 24. Double-send

**KEEP AS IS — `PROTECTED`.** Guard `if (!text || !this.selectedAgent || this.loading) return;` não foi tocado.

## 25. Scroll

`shouldScroll`, `@ViewChild('messagesEnd')`, `scrollIntoView({behavior:'smooth'})` — 100% preservados, sem refatoração.

## 26–27. 48px / --aq-nav-height

`top: 48px` → `top: var(--aq-nav-height)`; `margin-top: 48px` → `margin-top: var(--aq-nav-height)`. Nenhum outro número mágico de posicionamento restante.

## 28–33. Escaping defensivo (segurança — achado MEDIUM da Etapa 1, corrigido nesta etapa)

**Antes:** `formatContent()` aplicava as transformações markdown-like diretamente sobre o conteúdo bruto, sem escapar `&`, `<`, `>`, `"`, `'`.

**Depois:**
```ts
formatContent(content: string): string {
  return this.escapeHtml(content)
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre><code class="code-block">$2</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

private escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
```
Caracteres escapados: `& < > " '` (nessa ordem, `&` primeiro para não escapar duas vezes as entidades geradas pelos escapes seguintes). O escaping roda **antes** de qualquer transformação markdown-like; delimitadores de markdown (`` ` ``, `*`, `-`) não são caracteres HTML especiais, então sobrevivem intactos e as regras subsequentes continuam funcionando normalmente sobre a string já escapada.

## 29. bypassSecurityTrustHtml

**Ausente** — não foi introduzido (proibido pelo escopo). `[innerHTML]` continua passando pelo sanitizer automático do Angular como segunda camada de defesa.

## 30. HTML cru da IA

Confirmado por teste unitário e E2E: `<img src="x" onerror="...">` agora é devolvido por `formatContent()` como a string literal `&lt;img src=&quot;x&quot; onerror=&quot;...&quot;&gt;` — nenhuma tag `<img>` real chega ao `[innerHTML]`. Comprovado no DOM real (unit com Karma/Chrome e E2E com Playwright): `bubble.querySelector('img')` retorna `null`.

## 31. Texto legítimo

`1 < 2 && 3 > 1` → `formatContent()` retorna `1 &lt; 2 &amp;&amp; 3 &gt; 1`, que o navegador renderiza visualmente como `1 < 2 && 3 > 1` — texto correto e legível. Coberto por unit test e E2E dedicado.

## 32. innerHTML

Continua em uso — agora recebendo **apenas HTML controlado** produzido pelo próprio `formatContent()` (entrada não confiável → escape → parser markdown-like local → HTML controlado → `[innerHTML]` → sanitizer Angular), conforme autorizado no escopo (seção 36 da aprovação).

## 33. Sanitizer Angular

Continua ativo e comprovado por um teste unitário dedicado que simula (via spy) `formatContent()` devolvendo HTML malicioso não-escapado, para provar que a segunda camada de defesa (o sanitizer nativo do `[innerHTML]`) permanece funcional independentemente do escaping — o warning nativo do Angular (`"WARNING: sanitizing HTML stripped some content"`) aparece exatamente nesse teste.

## 34. Teste `<img>`

Unit: `formatContent('<img src="x" onerror="alert(1)">')` retorna a string escapada exata, `not.toContain('<img')`; renderização real via `[innerHTML]` confirma `bubble.querySelector('img')` é `null`. E2E: mesmo cenário em browser real, `window.__xssFired` permanece `undefined`.

## 35. Teste `<script>`

Unit e E2E: `<script>alert(1)</script>` vira texto escapado (`&lt;script&gt;...&lt;/script&gt;`), nenhum elemento `<script>` real é criado, nada executa.

## 36. Teste comparação matemática

Unit e E2E: `1 < 2 && 3 > 1` (e `**negrito**` junto) renderiza como texto correto, com a formatação de negrito ainda funcionando ao redor.

## 37–41. Code block / inline code / bold / italic / listas

Todos preservados e recobertos por teste — confirmados funcionando corretamente **após** o escaping (delimitadores markdown não são afetados).

## 42. Links

Não implementado (fora de escopo, conforme aprovação — sem auto-link).

## 43–44. Testes de segurança (unit) / E2E

Ver seções 34–36; testes de caracterização da Etapa 1 foram **transformados em regressão** (não removidos, reescritos para provar o comportamento corrigido) + 2 testes novos (comparação matemática, camada de defesa remanescente do sanitizer).

## 45–46. newChat / DELETE

`newChat()` continua só resetando estado local. `DELETE /api/agents/sessions/{sessionId}` **não implementado** (fora de escopo, conforme aprovação).

## 47. History endpoint

**Não implementado** (fora de escopo).

## 48. Timestamp

**Não exibido** (campo continua não usado, conforme aprovação).

## 49. Última mensagem não-assistant

Regra **não alterada** — só a última mensagem `role: 'assistant'` é adicionada ao histórico local.

## 50–52. Endpoints / payload / IA real

`GET /api/agents` e `POST /api/agents/sessions/chat` — **exatamente iguais**, nenhum novo endpoint, nenhuma mudança de payload. **IA real: não chamada** em nenhum teste (todos os testes E2E interceptam `**/api/agents/sessions/chat` via `page.route()`).

## 53. Mocks E2E

`page.route()` determinístico para `GET /api/agents` e `POST /api/agents/sessions/chat` em todos os 9 testes do spec — classificação `UI E2E WITH API MOCK`.

## 54. Servidor limpo

Antes da execução da suíte E2E completa desta etapa, foi confirmado que a porta 4200 estava livre (nenhum `ng serve` obsoleto residual de sessões anteriores); a suíte foi então executada e o log `[WebServer]` do Playwright confirma que um processo **novo** foi iniciado pelo próprio test runner. `playwright.config.ts` não foi alterado.

## 55–58. Responsividade

| Largura | Resultado |
|---|---|
| 1440 | **PASS** |
| 1280 | **PASS** |
| 768 | **PASS** |
| 390 | **PASS** |

Validado em browser real (Playwright/Chromium) nos estados vazio **e** com conversa ativa (mensagem do usuário + resposta formatada com negrito/código/lista) — header, select, bubbles, composer, botão enviar, empty state e scroll confirmados visualmente via screenshot em cada largura.

## 59. Overflow

Zero em todas as combinações largura × estado (vazio e com conversa) — `scrollWidth <= innerWidth + 1`.

## 60–63. Testes unitários

Antes: 520. Depois: **528** (+8). Todos verdes. Composição: 2 testes de caracterização da Etapa 1 reescritos como regressão (comparação matemática, HTML malicioso) + 1 teste novo de `formatContent()` (img/script viram texto) + 1 teste de segunda camada do sanitizer + 5 testes novos de acessibilidade/visual (labels, aria-label do botão enviar, `role="log"`, `role="status"` do loading, migração do "Novo Chat" para `AqbButtonComponent`, tokens aplicados no computed style).

## 64–66. E2E

Antes: 52. Depois: **58** (+6 = 3 specs novos × 2 projetos). Todos verdes. Novos: XSS fortalecido (nenhum `<img>`/`<script>` real criado no DOM), comparação matemática em browser real, acessibilidade + migração visual do "Novo Chat" + labels via `getByLabel`, responsividade dedicada (4 larguras em um único teste, estado vazio).

## 67. Build

Verde.

## 68. Bundle

`main`: 1,79 MB → 1,79 MB raw / 443,55 kB → 443,10 kB transfer (variação desprezível — `AqbButtonComponent` já era importado por outras telas, sem custo adicional relevante).

## 69–79. Confirmações de escopo

- **Backend:** intocado.
- **Theme:** intocado.
- **Primitives (`Aqb*`):** intactos (nenhum arquivo em `shared/ui/` tocado).
- **Shell:** intocado.
- **Cenários:** intocado nesta etapa (a padronização de fundo de `/cenarios` foi feita em pedido separado do usuário, antes desta fase, e não faz parte do escopo aprovado aqui).
- **Gerar Cenário:** intocado — `FASE_14_5_HARDENED` permanece intacta.
- **Auto QA:** intocado — regressão completa rodou junto da suíte geral, sem falhas.
- **Pipeline:** intocado.
- **`playwright.config.ts`:** intocado (só o spec do chat foi atualizado).
- **Package files:** intactos. Nenhuma dependência nova.

## 80. Riscos

Nenhum risco novo introduzido. O único achado de segurança (`MEDIUM`) registrado na Etapa 1 foi corrigido e comprovado com dupla camada de teste (unit + E2E, em browser real).

## 81. Limitações / dívidas futuras

- `ErrorMapper`/diferenciação de erro por status HTTP — ainda não aplicado (fora de escopo desde a Etapa 1).
- `HttpClient` direto no componente (sem `ChatService`) — dívida arquitetural conhecida, fora de escopo.
- Sessões órfãs no MongoDB (`newChat()` não chama `DELETE`) — decisão de produto pendente, fora de escopo.
- `timestamp` do `ChatMessage` continua sem uso.

## 82. Classificação final

**FASE_14_6_CHAT_MIGRATED_AND_HARDENED**

Todos os critérios de aceite (segurança, acessibilidade, visual, funcional, regressão) foram atendidos: escaping defensivo implementado e comprovado com dupla camada de teste; labels, nome acessível do botão enviar, `role="log"`/`aria-live` e `role="status"` do loading implementados sem quebrar nenhum comportamento funcional caracterizado na Etapa 1; tokens globais consumidos onde havia equivalência real, com hardcodes remanescentes documentados e justificados; `48px` substituído por `--aq-nav-height`; primitives usados só onde não geravam regressão (`AqbButtonComponent` no "Novo Chat"), com KEEP_LOCAL justificado para header, composer, bubbles, conversation e empty states. Regressão completa verde (528 unit / 58 E2E / build), responsividade PASS nas 4 larguras, zero overflow.

## 83. Confirmação de nenhum Git de escrita

Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

## 84. Confirmação de que a Fase 14.7 NÃO foi iniciada

Confirmado.

---

**PARE.** Aguardando revisão.
