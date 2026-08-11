# FASE 14.5 — Gerar Cenário
## Etapa 2 — Hardening Funcional

**Data:** 2026-08-11
**Pré-condição confirmada:** Etapa 1 = `FASE_14_5_HARDENING_REQUIRED` (482 unit / 38 E2E / build verde).
**Escopo:** hardening estritamente derivado dos achados comprovados na Etapa 1 — nenhuma regra de negócio, contrato, payload, endpoint ou fluxo Jira/upload/agentes alterado além do disabled do select.

---

## 1. Baseline

482 unit / 38 E2E / build verde, antes de qualquer alteração desta etapa.

## 2. Arquivos alterados

`src/app/cenario/cenario.component.ts`, `src/app/cenario/cenario.component.html` (produção — únicos autorizados). `cenario.component.css` **não** foi tocado (tokens `--aq-*` já existentes bastaram). Testes: `cenario.component.spec.ts`, `e2e/gerar-cenario.spec.ts`.

## 3–4. Duplo submit — antes/depois e guard implementado

**Antes:** `gerar()` não tinha proteção própria; duas chamadas seguidas disparavam 2 requisições HTTP reais (comprovado na Etapa 1).
**Depois:** guard no início do método:
```ts
gerar(): void {
  if (this.loading) {
    return;
  }
  this.submitted = true;
  if (!this.form.valid) return;
  this.erroGeracao = '';
  this.loading = true;
  ...
}
```
Não depende do `[disabled]` do template — proteção real no próprio método.

## 5. Teste de regressão

O teste que antes comprovava 2 requisições foi reescrito para exigir **exatamente 1**. Adicionado também um segundo teste confirmando que o guard **não trava permanentemente**: após a resposta da primeira geração, uma nova chamada a `gerar()` volta a disparar HTTP normalmente.

## 6–7. Select de agente — antes/depois e estratégia disable/enable

**Antes:** `<select formControlName="agent" [disabled]="agentsLoading">` — o binding `[disabled]` era sobrescrito pelo próprio `FormControlDirective` (conflito documentado do Reactive Forms), então o `<select>` nunca ficava realmente desabilitado no DOM.
**Depois:** removido o binding `[disabled]` do template; o próprio `FormControl` é desabilitado/habilitado via código:
```ts
// no início de carregarAgentes():
this.form.get('agent')?.disable({ emitEvent: false });
// no finally:
this.form.get('agent')?.enable({ emitEvent: false });
```
`emitEvent: false` evita disparar `valueChanges`/`statusChanges` desnecessários (nenhum listener depende deles hoje, mas evita efeito colateral futuro).

## 8. Default do agente preservado

`patchValue({ agent: agenteGerador.id })` continua funcionando normalmente mesmo com o control temporariamente `disabled` — `patchValue`/`.value` de um `AbstractControl` não são afetados pelo estado disabled (isso só afeta a agregação em `FormGroup.value` e o atributo DOM). Confirmado por teste dedicado: o valor default é aplicado e o control volta a `enabled` corretamente.

## 9–11. Labels, ids e aria-describedby

Adicionados `id`/`for` reais para: Título (`cenario-titulo`), Regra de Negócio (`cenario-regra-negocio`), Agente (`cenario-agent`), Task Jira (`cenario-jira-task-key`), e os dois inputs de upload (`cenario-upload-pdfs`, `cenario-upload-pasta`). Nenhum texto de label foi alterado. Erros de Título/Regra de Negócio ganharam `id` estável (`cenario-titulo-erro`, `cenario-regra-negocio-erro`) referenciado via `[attr.aria-describedby]` condicional nos respectivos campos.

## 12. aria-invalid

`[attr.aria-invalid]="campoInvalido('titulo') ? 'true' : null"` (e equivalente em Regra de Negócio) — reaproveita o estado real já existente (`campoInvalido()`), sem duplicar lógica de validação.

## 13–15. successMessage — role/status/aria-live

`role="status"` adicionado ao bloco de `successMessage` (implica `aria-live="polite"`). Texto/comportamento visual e temporização (`setTimeout` de 4s) inalterados.

## 16. aria-busy

Adicionado `[attr.aria-busy]="loading ? 'true' : null"` no `<form>` — único ponto (não espalhado pela página), reflete exatamente o estado de `loading` da geração.

## 17–20. window.alert removido / feedback inline / role=alert / limpeza do erro

`alert('❌ Erro ao gerar cenario.')` removido de `erro()`, substituído por `this.erroGeracao = '❌ Erro ao gerar cenario.'` (texto idêntico). Novo bloco no template:
```html
@if (erroGeracao) {
  <div class="cenario-page__alert cenario-page__alert--danger cenario-page__alert--centered" role="alert">
    {{ erroGeracao }}
  </div>
}
```
Usa exclusivamente classes/tokens já existentes desde a 14.4.1 (`--aq-danger` etc.) — nenhum CSS novo. `erroGeracao` é limpo no início de `gerar()` assim que uma nova tentativa válida é disparada (antes de `loading = true`), garantindo que some/atualize corretamente numa nova execução ou sucesso.

## 21. Tratamento HTTP

Preservado como estava — nenhuma matriz de status code, nenhuma migração para `ErrorMapper`. Único ajuste: a mensagem que antes ia para `alert()` agora vai para `erroGeracao` (mesmo texto).

## 22. ErrorMapper

**Não utilizado.** Registrado como dívida futura (já apontado no relatório da Etapa 1, item FUTURE #5), não implementado nesta etapa por estar fora do escopo aprovado.

## 23. CenarioService

**Não criado.** `HttpClient` permanece injetado diretamente no componente, como estava.

## 24. workflowType

**Não exposto.** Fora de escopo do hardening, conforme aprovação.

## 25–26. Payload e endpoints

Idênticos aos caracterizados na Etapa 1:
- Sem PDF: `POST {apiUrl}/cenario` com `{titulo, regraDeNegocio, agent}`.
- Com PDF: `POST {apiUrl}/cenario/com-pdf` multipart.
- Nenhum endpoint novo, removido ou alterado.

## 27–29. Jira, upload, agentes

Jira e upload: nenhuma linha de lógica tocada (normalização, endpoints, download, zip, deduplicação, filtragem PDF, mensagens — todos intactos). Agentes: única mudança é a correção do disabled (itens 6–8); algoritmo de seleção automática do agente "gerador", mensagens de erro/vazio e endpoint `GET /api/agents` inalterados.

## 30. Console

Nenhuma alteração — os 4 `console.error` classificados `ERROR_DIAGNOSTIC` na Etapa 1 permanecem exatamente como estavam.

## 31–32. Visual e background

Nenhuma alteração visual — `cenario.component.css` não foi tocado nesta etapa. A correção de fundo da Fase 14.4.1 (`page` full-width / `content` max-width) permanece intacta e foi revalidada (ver seção 33–37).

## 33–37. Responsividade e overflow (revalidado nesta etapa)

| Largura | Resultado |
|---|---|
| 1440 | **PASS** (fundo `rgb(19,19,19)` nas duas bordas, sem faixa clara) |
| 1280 | **PASS** (idem) |
| 768 | **PASS** |
| 390 | **PASS** |

**Overflow:** zero — `scrollWidth === innerWidth` exatamente nos 4 viewports, medido via Playwright após o build desta etapa.

## 38–43. Testes

- **Unit baseline:** 482.
- **Unit final:** **491** (+9).
- **Novos unit:** 3 testes reescritos como regressão (select disabled, erro inline sem alert, duplo submit única requisição) + 6 testes novos (select volta a enabled, default do agente preservado, erro limpo em nova tentativa, duplo submit não trava permanentemente, 5 testes do novo describe `acessibilidade (Etapa 2)` — labels/for, aria-invalid+aria-describedby, aria-busy, role=status).
- **E2E baseline:** 38 (19 specs × 2 projetos).
- **E2E final:** **40** (+2 = 1 spec novo × 2 projetos).
- **Novo E2E:** golden path de erro na geração — mocka `POST /cenario` retornando 500 na 1ª tentativa, confirma o bloco inline `role="alert"` com o texto exato, confirma **nenhum `dialog` nativo apareceu** (`page.on('dialog')` usado para provar que `window.alert()` não é mais chamado), depois simula uma 2ª tentativa bem-sucedida e confirma que o erro inline some.
- Demais specs E2E (golden path, validação, upload, Jira) atualizados para usar `getByLabel()` em Título/Regra de Negócio/Agente/Task Jira, agora que os labels têm associação real — comportamento de usuário mais fiel, não é troca "por estética".

## 44–45. IA real / Jira real

Nenhuma chamada real a IA (OpenAI/Gemini) nem a Jira real — todos os endpoints continuam mockados deterministicamente via `page.route()`.

## 46. Build

Verde.

## 47. Bundle

`main`: 1,79 MB → 1,79 MB raw / 442,98 kB → 443,29 kB transfer (+0,31 kB) — variação desprezível, esperada por atributos `id`/`aria-*` adicionais no template (nenhum import novo).

## 48–58. Confirmações de escopo

- **Backend:** intocado.
- **Theme:** intocado.
- **Primitives:** intactos.
- **Shell:** intocado.
- **Cenários:** intocado.
- **Auto QA:** intocado — regressão completa rodou junto da suíte geral, sem falhas.
- **Chat IA:** intocado.
- **Package files/`angular.json`/`playwright.config.ts`/pipeline:** intactos. Nenhuma dependência nova.

## 59. Riscos restantes

- Ausência de `ErrorMapper` (mensagens de erro ainda genéricas, sem diferenciação por status HTTP) — dívida conhecida, fora de escopo.
- `HttpClient` direto no componente (sem `CenarioService`) — dívida arquitetural conhecida, fora de escopo.
- `workflowType` não exposto na UI — gap de produto, não bug.
- Nenhum risco novo introduzido pelas correções desta etapa (todas cobertas por teste de regressão).

## 60. Dívidas futuras

Registradas na Etapa 1 e reafirmadas aqui, sem mudança: `ErrorMapper`, `CenarioService`, exposição de `workflowType`.

## 61. Classificação final

**FASE_14_5_HARDENED**

Todas as 7 correções aprovadas (A–G) foram implementadas, cada uma com teste de regressão específico provando que o bug anterior não existe mais. Regressão completa (unit + E2E + build) verde, responsividade e background da 14.4.1 revalidados sem nenhuma faixa clara ou overflow. Nenhum gap relevante permanece dentro do escopo aprovado desta etapa.

## 62. Confirmação de nenhum Git de escrita

Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

## 63. Confirmação de que a Fase 14.6 NÃO foi iniciada

Confirmado.

---

**PARE.** Aguardando revisão.
