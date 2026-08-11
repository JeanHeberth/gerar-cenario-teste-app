# FASE 14.5 — Gerar Cenário
## Etapa 1 — Baseline, Caracterização Funcional e Testes de Proteção

**Data:** 2026-08-11
**Pré-condição confirmada:** Fase 14.4 = `FASE_14_4_CENARIOS_MIGRATED`; Fase 14.4.1 = `FASE_14_4_1_BACKGROUND_FIXED` (ver `implementacao-fase-14.4.1.md`), ambas verificadas byte a byte no working tree antes do início desta etapa.
**Modo:** produção somente leitura — apenas testes de caracterização (unit + E2E) foram criados. Nenhum arquivo de produção da tela foi alterado.

---

## 1. Baseline

444 unit / 30 E2E, ambos verdes, antes de qualquer teste novo desta etapa.

## 2–4. Rota, componente, arquivos

Rota `/` → `CenarioComponent` (`src/app/cenario/`), eager, `standalone`, `ChangeDetectionStrategy.Eager`. Arquivos de produção: `cenario.component.ts/html/css` (só leitura nesta etapa). Arquivos novos: `cenario.component.spec.ts`, `e2e/gerar-cenario.spec.ts`.

## 5–8. Formulário

`FormGroup` com 4 controls: `titulo` (string, `Validators.required`), `regraDeNegocio` (string, `Validators.required`), `jiraTaskKey` (string, sem validator), `agent` (string, sem validator). Todos `''` por padrão. Tipagem inferida via `FormBuilder.group` — sem interface de payload dedicada.

## 9. Submit

usuário preenche → `gerar()` seta `submitted=true` → se `form.invalid`, retorna sem HTTP → senão `loading=true` → se há PDFs, `POST /cenario/com-pdf` (multipart); senão `POST /cenario` (JSON) → sucesso chama `sucesso()` (mensagem + reset + limpa loading) → erro chama `erro()` (`window.alert` + `console.error` + limpa loading). Sem navegação após gerar (permanece na tela).

## 10–11. Endpoints reais consumidos (confirmados também por leitura do backend `criar-cenario-testes`, somente leitura)

| Fluxo | Endpoint | Payload | Retorno |
|---|---|---|---|
| Geração (sem PDF) | `POST {apiUrl}/cenario` | `{titulo, regraDeNegocio, agent}` | `CenarioResponse` |
| Geração (com PDF) | `POST {apiUrl}/cenario/com-pdf` | multipart: titulo, regraDeNegocio, agent?, arquivos[] | `CenarioResponse` |
| Agentes | `GET {apiUrl}/api/agents` | — | `AgentInfoResponse[]` |
| Jira — anexos | `GET {apiUrl}/jira/tasks/{taskKey}/attachments` | — | `JiraIssueAttachmentsResponse` |
| Jira — download individual | `GET` (via `downloadUrl` relativo, resolvido com `apiUrl`) | — | blob |
| Jira — download .zip | `GET {apiUrl}/jira/tasks/{taskKey}/attachments/download-all` | — | blob |

**Achado:** nenhum payload enviado pela tela inclui `workflowType`. O backend expõe `GET /cenario/workflows` e o enum `WorkflowType` (COMPLETO/RAPIDO/REVISAO/REGRESSAO), mas a tela não tem seletor. Confirmado no código-fonte do backend que ambos os caminhos (`QaWorkflowService` com null-check e o construtor de 3 args usado em `gerarCenarioComPdf`) fazem fallback seguro para `COMPLETO` — não é bug, é funcionalidade do backend não exposta na UI.

## 12–13. Agentes

Carregados automaticamente no `ngOnInit`. Lista vazia → `agentsMessage = 'Nenhum agente disponivel no backend.'`. Item cujo `id` contém "gerador" E "cenario" → selecionado como default via `patchValue`. Erro → `agentsMessage` genérica + `agents=[]` + `console.error`.

## 14–15. Workflow

Não exposto na UI (ver seção 10–11).

## 16–17. Jira

Busca (`buscarArquivosDaTaskJira`): valida taskKey vazio, normaliza (`trim().toUpperCase()`), filtra só anexos PDF, baixa cada um via GET blob, deduplica por `name-size-lastModified`, mensagens diferenciadas (sem anexos / sem PDF / sucesso com contagem / já existentes). Download `.zip` (`baixarTodosAnexosDaTaskJira`): dispara download real via `<a>` sintético + `URL.createObjectURL`, nome extraído do header `content-disposition` ou fallback `{taskKey}.zip`.

## 18–22. Upload local / PDFs

Input múltiplo + input de pasta (`webkitdirectory`) + drag&drop, todos convergem para `adicionarArquivos()`: filtra só PDF (mime ou extensão), deduplica, mensagens diferenciadas (sucesso/parcial/erro/duplicado). `removerPdf(index)` e `limparPdfs()` simples, sem confirmação. PDFs armazenados só em memória (`File[]` no componente), sem limite client-side de tamanho/quantidade (delegado ao backend).

## 23. Estados reais observados

`IDLE`, `AGENTS_LOADING`/`AGENTS_ERROR`, `VALIDATION` (por campo, após touched/submitted), `GENERATION_LOADING`/`SUCCESS`/`ERROR`, `JIRA_SEARCH_LOADING`/`JIRA_DOWNLOAD_LOADING` com `jiraMessageType` (success/error/info), `UPLOAD` com `uploadMessageType`, `DRAG_OVER` (puramente visual).

## 24–30. Feedback e console

`jiraMessage`/`uploadMessage` renderizam com `role="alert"` (anunciado a leitor de tela). `successMessage` **não** tem `role`/`aria-live` — gap pré-existente, preservado fielmente da versão original (não introduzido na 14.4.1). Único `window.alert()` nativo: em `erro()` da geração — bloqueia a thread, inconsistente com o padrão inline usado no resto da tela.

**Console:** só `console.error` (4 ocorrências: agentes, busca Jira, download Jira, erro de geração) — todos classificados `ERROR_DIAGNOSTIC`, nenhum `DEBUG`/`UNNECESSARY`.

## 31. Duplo submit — CLASSIFICAÇÃO: PARTIAL

O `[disabled]="form.invalid || loading"` no template impede o clique duplo normal do mouse (confirmado via unit test — o CD do Angular reflete `disabled` a tempo). Porém `gerar()` **não tem guard próprio** (`if (this.loading) return`) — provado por teste unitário que chama `gerar()` duas vezes seguidas e captura **2 requisições HTTP reais** via `httpMock.match()`. Qualquer caminho que burle o binding (reentrância futura, lag de CD) dispara geração concorrente.

## 32. Tratamento HTTP

Genérico em todos os fluxos — nenhuma distinção por status code (400/401/404/409/500/timeout tratados igual). Sem `ErrorMapper` (padrão já usado no Auto QA) aplicado aqui.

## 33–37. Acessibilidade — gaps registrados (não corrigidos)

- `<label>` sem `for`/`id` associando aos inputs — confirmado (precisei usar seletores `[formcontrolname]` no E2E em vez de `getByLabel()`).
- Erros de campo (`campoInvalido`) sem `aria-describedby` ligando input↔erro.
- **Achado de bug funcional real:** `<select formControlName="agent" [disabled]="agentsLoading">` **não desabilita de fato o elemento no DOM** — conflito clássico do Reactive Forms (Angular emite warning no console; o `FormControlDirective` sobrescreve o binding pelo estado do próprio `FormControl`, que nunca é `.disable()`). Provado por teste unitário: `agentSelect().disabled === false` mesmo com `agentsLoading === true` (confirmado inclusive após um segundo `detectChanges()`).
- `successMessage` sem `role="status"`/`aria-live`.
- Loading sem `aria-busy`.
- Labels/semântica de `button`/`form`/`required` no restante, preservados corretamente.

## 38–41. Responsividade

Revalidado via Playwright (produção não foi tocada nesta etapa; herda a correção da 14.4.1):

| Largura | Resultado |
|---|---|
| 1440 | **PASS** |
| 1280 | **PASS** |
| 768 | **PASS** |
| 390 | **PASS** |

## 42. Overflow

Zero em todas as 4 larguras — confirmado por medição de pixel (`scrollWidth === innerWidth`) e pelo assert de overflow no E2E golden path.

## 43–50. Testes

- **Existentes antes:** 444 unit / 30 E2E.
- **Unit novos:** 38 (`cenario.component.spec.ts`) — formulário (controls/validators/defaults), agentes (sucesso com/sem match, lista vazia, erro, select disabled — achado), submit (inválido, válido JSON, válido multipart, duplo submit), Jira (busca com/sem taskKey, sem anexos, sem PDF, sucesso com download, erro; baixar .zip sem taskKey, sucesso, erro), upload (adicionar/misturar/duplicar/remover/limpar, drag/drop), navegação.
- **E2E novos:** 8 (`gerar-cenario.spec.ts` × 2 projetos Desktop/Mobile) — golden path completo (agente default + geração com sucesso, mock determinístico), validação (CTA desabilitado + erro inline ao tocar/sair do campo Título), upload local (fixture inline via `setInputFiles`, sem arquivo em disco), Jira (anexos mockados, importação do PDF).
- **Endpoints mockados no E2E:** `**/api/agents`, `**/cenario` (POST), `**/jira/tasks/OP-1/attachments`, `**/jira/tasks/OP-1/attachments/a1/download` — **nenhuma chamada real a IA** (classificação: `UI E2E WITH API MOCK`).
- **Fixtures:** nenhum arquivo em disco criado; PDFs de teste são buffers inline mínimos (`%PDF-1.4 fixture...`), sem conteúdo sensível.
- **Total final:** 482 unit / 38 E2E — ambos 100% verdes.
- **Build:** verde (`main` 1,79 MB / 442,98 kB — sem mudança, produção intocada).

## 51–57. Riscos por área

| Área | Risco | Motivo |
|---|---|---|
| FORM | LOW | estrutura simples e coerente; único ponto notável é o bug do `[disabled]` no select |
| GENERATION | MEDIUM | duplo submit PARTIAL, erro genérico via `alert()`, sem diferenciação de status HTTP |
| AGENTS | LOW | fluxo simples e previsível; mensagens claras nos 3 cenários |
| JIRA | LOW-MEDIUM | fluxo robusto (dedup, filtragem, mensagens diferenciadas), mas erro genérico como o resto da tela |
| UPLOAD | LOW | comportamento consistente e coberto por teste; sem limite client-side |
| ERROR_HANDLING | MEDIUM | ausência de `ErrorMapper`/diferenciação por status em toda a tela |
| ACCESSIBILITY | MEDIUM | bug real do select disabled, labels sem `for`, erros sem `aria-describedby`, sucesso sem `aria-live` |
| RESPONSIVENESS | LOW | PASS nos 4 breakpoints, sem overflow |

## 58–60. Classificação de achados

- **FIX_NOW:** nenhum — nada bloqueia o uso real da tela hoje.
- **FUTURE** (candidatos à Etapa 2, mediante aprovação):
  1. Guard de duplo submit em `gerar()`.
  2. `role="status"`/`aria-live` em `successMessage`.
  3. `aria-describedby` nos campos com erro + `for`/`id` nos labels.
  4. Resolver o conflito `[disabled]`+`formControlName` no select do agente (ex.: `.disable()`/`.enable()` no próprio `FormControl`).
  5. Diferenciar erros HTTP (aplicar padrão `ErrorMapper` do Auto QA).
  6. Considerar expor seleção de `workflowType` (o backend já suporta).
  7. Substituir `window.alert()` por feedback inline consistente com o resto da tela.
  8. Extrair `HttpClient` para um `CenarioService` dedicado (dívida arquitetural, não urgente).
- **KEEP_AS_IS:** deduplicação de PDFs, mensagens diferenciadas de Jira/upload, estrutura do formulário, ausência de seletor de workflow (funcional mas incompleto — decisão de produto, não bug).

## 61–62. Plano Etapa 2 / arquivos que precisariam ser alterados

Os itens FUTURE acima tocariam somente `cenario.component.ts`/`.html` (e opcionalmente um novo `cenario.service.ts`, caso aprovado extrair o HTTP — não criado nesta etapa).

## 63–72. Confirmações de escopo

- **Backend:** intocado (só leitura — `CenarioController`, `AgentController`, `JiraController`, `CenarioService` parcial, DTOs, `WorkflowType`).
- **Theme:** intocado.
- **Primitives:** intactos.
- **Shell:** intocado.
- **Cenários:** intocado.
- **Auto QA:** intocado — regressão completa rodou junto da suíte geral, sem nenhuma falha.
- **Chat IA:** intocado.
- **autoqa-artifacts:** intocado.
- **Pipeline:** intocado.
- **`playwright.config.ts`:** intocado (só o novo spec `e2e/gerar-cenario.spec.ts` foi adicionado).
- **Package files/`angular.json`:** intactos. Nenhuma dependência nova.

## 73. Confirmação de nenhum Git de escrita

Nenhum `add`/`commit`/`push`/`merge`/`rebase`/`reset`/`checkout`/`switch`/`cherry-pick`/`clean` executado.

## 74. Confirmação de nenhuma correção funcional implementada

Confirmado — produção 100% somente leitura nesta etapa (`git status` mostra só os 2 arquivos de teste novos).

## 75. Confirmação de que a Fase 14.6 NÃO foi iniciada

Confirmado.

---

## Classificação final

**FASE_14_5_HARDENING_REQUIRED**

Justificativa: nenhum bloqueio (`BLOCKED`) e a tela funciona corretamente no golden path (confirmado por 482 unit + 38 E2E, todos verdes), mas há gaps reais e comprovados por teste — bug do `[disabled]` no select do agente, duplo submit `PARTIAL`, tratamento de erro genérico sem diferenciação por status HTTP, e gaps de acessibilidade (labels sem `for`, erros sem `aria-describedby`, sucesso sem `aria-live`) — que justificam uma Etapa 2. Por isso não se qualifica como `FUNCTIONALLY_SUFFICIENT`.

---

**PARE.** Não iniciar Etapa 2. Não iniciar Fase 14.6. Nenhuma alteração de produção. Nenhum Git de escrita. Aguardando aprovação.
