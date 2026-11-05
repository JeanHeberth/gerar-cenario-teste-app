# FASE 15 — Sessão 13 — Implementação do FASE15-BUG-005B (Rastreabilidade de Evidência)

Data: 2026-08-13 a 2026-08-16
Classificação final: **`FASE15_BUG_005B_REQUIRES_FIX`**

---

## 1. Resumo executivo

A implementação de código do FASE15-BUG-005B (rastreabilidade de evidência dos cenários gerados: `evidenceType` DOCUMENTED/DIRECT_INFERENCE/EXPLORATORY + `evidenceSources`) foi concluída, com TDD (RED→GREEN) em todos os pontos, regressão completa 0 falhas em backend e frontend, e ambos os builds `SUCCESSFUL`. Durante o reteste real (3 execuções end-to-end do Fluxo 3), foram encontrados e corrigidos **dois defeitos reais**, e foi identificado um **terceiro problema, não corrigido nesta sessão**, que motiva a classificação `REQUIRES_FIX`: o mecanismo determinístico de validação de fonte (`corrigirSourceInexistente`) rebaixa cenários inteiros para `EXPLORATORY` sempre que a IA cita, junto com IDs reais dos PDFs (`RN-A-01` etc.), os números `RF0X`/`RNF0X` gerados pelo `RequirementAnalysisAgent` a partir do mesmo material — mesmo quando o cenário está genuinamente sustentado. Isso fez **32 dos 34 cenários gerados nas 3 execuções reais (94%)** caírem em `EXPLORATORY`/`REVIEW_REQUIRED`, incluindo casos claramente documentados, violando a regra herdada do BUG-005 de não classificar como exploratório "só por cautela excessiva".

## 2. Itens já implementados e verificados (código completo)

1. `CenarioItem.evidenceType`/`evidenceSources` — campos novos, nulos por padrão (retrocompatível com dados legados).
2. `CenarioTextoParser` — extrai `Evidência:`/`Fontes:` do texto da IA.
3. `GeneratedScenariosValidator` — `validarEstruturaEvidencia` (estrutural), `fonteExisteNoTextoBruto` (determinística), `corrigirSourceInexistente` (downgrade fail-closed), ambas encaixadas em `validarGeracao`.
4. `TestScenarioAgent` — aplica `corrigirSourceInexistente` sobre os cenários recém-gerados, usando o `regraDeNegocio` bruto (regra digitada + texto dos PDFs).
5. `RedundancyReviewAgent` — segunda barreira: prompt com regra semântica de evidência (exemplo `RN-A-02`/"ocultar CEP"), proibição de promover `EXPLORATORY`→`DOCUMENTED`/`DIRECT_INFERENCE`, `userPrompt` inclui `Evidência`/`Fontes` de cada item + o `regraDeNegocio` bruto; `executar()` aplica `corrigirSourceInexistente` de novo sobre os itens revisados.
6. `ZephyrFormatterAgent` — inclui `Tipo de Evidência`/`Fontes`/`Status` no texto exportado quando presentes (sem alterar o contrato BDD central).
7. `agents/gerador_cenarios_testes.agent.md` — campos `Evidência:`/`Fontes:` no formato padrão; seção "REGRA DE RASTREABILIDADE DE EVIDÊNCIA" com os três valores, exemplo de fonte real mas semanticamente irrelevante, regra de "menor certeza vence" para cenário misto, e a instrução de usar `USER` (nunca inventar `USER-RN-001`).
8. Frontend `cenario-list.component.ts` — `normalizarCenario()` inclui os dois novos campos nas duas branches; exports XLSX (novas colunas "Tipo de Evidência"/"Fontes", sem reorganizar as existentes) e DOC preservam os campos quando presentes; PDF também. Além disso, um `itensDoCenario()` + bloco no HTML/CSS foi adicionado (por você, fora desta sessão) para exibir Status/Evidência/Fontes na tela de detalhes — não fazia parte do escopo original desta sessão, mas cobre exatamente a lacuna que eu havia identificado.

Todos os itens acima já estavam **commitados no branch atual** antes de eu retomar esta sessão (backend: commit `68e10b1` "Correção do bug encontrado no relatorio 15.2"; frontend: commit `c0f6cbc` "Corrigindo o bug"; ambos 2026-08-14 13:14, fora do meu controle — eu não rodo `git commit`).

## 3. Defeitos encontrados durante o reteste real (novos, desta sessão)

### 3.1 — Indentação de Passos quebra a detecção BDD (corrigido)
Com o prompt maior do BUG-005B, a IA passou a indentar as linhas "Quando"/"Então" (com espaços à esquerda), e o regex `GeneratedScenariosValidator.INICIO_DE_PASSO` só reconhece a palavra-chave logo após uma quebra de linha SEM espaços. Corrigido com uma frase adicional no `agent.md` (arquivo já autorizado) pedindo que as palavras-chave de Passos fiquem sempre na margem esquerda, sem indentação. Confirmado que resolveu esse modo de falha nas tentativas seguintes.

### 3.2 — Ordem invertida `Status`/`Evidência`/`Fontes` no parser (corrigido, TDD)
**Causa raiz de praticamente todas as falhas HTTP 500 nas primeiras tentativas de reteste.** O `agent.md` documenta a ordem `Status → Evidência → Fontes` no "Formato padrão de cenário" (e é essa ordem que a IA real usa). O array `campos[]` do `CenarioTextoParser` (usado para calcular a fronteira de cada campo) tinha a ordem invertida: `..., Evidência, Fontes, Status`. Como `Status` era o último do array, seu regex de extração não tinha limite após ele — e como no texto real vinham `Evidência`/`Fontes` DEPOIS de `Status`, o campo `Status` "engolia" esse conteúdo inteiro (`"REVIEW_REQUIRED\n- Evidência: EXPLORATORY\n- Fontes: ..."`), quebrando a comparação de igualdade em `validarEstruturaEvidencia` e derrubando a geração inteira.

Corrigido reordenando o array para `..., Cobertura, Status, Evidência, Fontes` (arquivo `CenarioTextoParser.java`, já autorizado nesta fase). TDD: escrito teste RED reproduzindo a ordem real (`deveExtrairStatusLimpoQuandoStatusVemAntesDeEvidenciaEFontes`), confirmado falho, corrigido, confirmado GREEN; os dois testes existentes que usavam a ordem antiga (invertida, nunca usada na prática) foram corrigidos para refletir a ordem real do contrato. Regressão completa após a correção: **1949 testes, 0 falhas**, build `SUCCESSFUL`.

Este defeito é diferente do `FASE15-BUG-007` já registrado (que é sobre `Status` não ter limite quando é genuinamente o último campo do bloco) — aqui o problema é a ordem do array não bater com o contrato real, um erro autoral desta mesma sessão, corrigido dentro do escopo já autorizado. `FASE15-BUG-007` não foi tocado.

**Nota de escopo:** esta correção está aplicada nos arquivos (`CenarioTextoParser.java` e seu teste) mas **ainda não foi commitada** — segue meu padrão de nunca rodar `git commit`. Precisa ser revisada e commitada por você antes de ir para produção.

### 3.3 — Rebaixamento excessivo por mistura de IDs reais com RF/RNF (NÃO corrigido — motivo do REQUIRES_FIX)
`corrigirSourceInexistente` divide o campo `Fontes` por vírgula e rejeita o cenário inteiro (rebaixa para `EXPLORATORY`) se **qualquer uma** das partes não existir literalmente no `regraDeNegocio` bruto (regra digitada + texto dos PDFs). Isso é correto para IDs realmente inventados — mas a IA legitimamente também cita os números `RF01`, `RF02`... `RNF01`... gerados pelo `RequirementAnalysisAgent` a partir do MESMO material de origem (esses números não aparecem no texto bruto, só na camada de requisitos já processada, que o `TestScenarioAgent`/`RedundancyReviewAgent` também recebem via `context.getRequisitos()`). Como o Generator não foi proibido de citar esses números junto com os IDs reais, e o `corrigirSourceInexistente` não os reconhece como fonte válida, **qualquer cenário que cite tanto `RN-A-01` (real) quanto `RF01` (derivado) é rebaixado inteiro para `EXPLORATORY`** — mesmo quando genuinamente sustentado pelas regras reais.

Evidência direta nos dados reais (seção 5): os únicos 2 cenários que permaneceram `APPROVED` nas 3 execuções são exatamente os que citaram **apenas** IDs reais (`RN-A-02`; `RN-A-01, RN-B-01`), nunca RF/RNF. Todo cenário que misturou os dois tipos foi rebaixado — incluindo, por exemplo, um "Cadastro completo e válido – Cliente residente" citando `RF01...RF08, RN-A-01...RN-B-03` (execução 3), que deveria plausivelmente ser `DOCUMENTED`.

Isso viola a regra epistêmica já existente (herdada do BUG-005): "Não marque como exploratório um requisito genuinamente documentado só por cautela excessiva — isso reduziria o valor do produto." Recomendação para uma futura sessão (não implementada aqui, fora do escopo desta autorização): ensinar `corrigirSourceInexistente` a reconhecer IDs `RF\d+`/`RNF\d+` como referências válidas (verificando contra o texto de Requisitos já processado, não só contra o `regraDeNegocio` bruto), ou instruir o `agent.md` a nunca misturar RF/RNF com IDs reais no campo `Fontes` (citar só um tipo por cenário).

## 4. Execuções reais do Fluxo 3 (multi-PDF)

Regra digitada usada: como o texto exato usado nas sessões anteriores desta fase não estava disponível em nenhum arquivo/relatório acessível (perguntei ao usuário, sem resposta em 10 min), usei um texto de regra digitada novo, mas plausível e consistente com o conteúdo real dos PDFs — isso limita parcialmente a comparação histórica literal, embora os termos residuais monitorados (seção 6) sejam padrões genéricos que independem do texto exato da regra digitada.

Título: "Cadastro de cliente com múltiplas regras documentais". Agente: `gerador_cenarios_testes`. PDFs: `fluxo3_pdf_A_regras_cadastrais.pdf` (RN-A-01/02/03) + `fluxo3_pdf_B_regras_endereco.pdf` (RN-B-01/02/03). Sem Jira.

| Tentativa | Resultado | Motivo |
|---|---|---|
| 1ª (antes da correção 3.2) | 500 | BDD ausente por indentação (3.1) |
| 2ª | 500 | idem |
| 3ª (após corrigir 3.1) | 500 | `Status` engolindo `Evidência`/`Fontes` (3.2, ainda não corrigido nesse ponto) |
| 4ª | 500 | idem |
| 5ª (após corrigir 3.2) | **200 — Execução oficial 1** | id `6a81d436e54e0120d0e75433`, 11 cenários |
| 6ª (execução oficial 2, tentativa 1) | 500 | corrupção de BDD pelo Reviewer num item (fail-closed correto, BUG-003A) |
| 7ª | 500 | idem (item fallback mal-parseado) |
| 8ª | 500 | idem |
| 9ª | **200 — Execução oficial 2** | id `6a81d616e54e0120d0e75434`, 13 cenários |
| 10ª (execução oficial 3, tentativa 1) | 500 | idem |
| 11ª | **200 — Execução oficial 3** | id `6a81d6d1e54e0120d0e75435`, 10 cenários |

Todas as falhas foram fail-closed corretas: **nenhum dado corrompido foi persistido em nenhuma tentativa** (proteções BUG-002/003A funcionando integralmente, sem alteração nesta sessão). As falhas recorrentes pós-correção 3.2 (itens malformados vindos do Reviewer) não foram investigadas a fundo por restrição de tempo — ficam como observação para uma sessão futura: a taxa de sucesso "de primeira" ficou baixa (3 de 11 tentativas reais), o que é coerente com o prompt bem maior do BUG-005B aumentando a superfície de variação de formatação da IA.

## 5. Auditoria dos cenários `APPROVED` (3 execuções, 34 cenários no total)

- Total: 34 cenários. `APPROVED`: **2**. `REVIEW_REQUIRED`: **32**.
- 0 `APPROVED` sem `evidenceType` — PASS.
- 0 `APPROVED` com `evidenceType = EXPLORATORY` — PASS (trivial, os 2 `APPROVED` são `DIRECT_INFERENCE`).
- 0 `APPROVED` com `evidenceSources` vazio — PASS.
- 0 `APPROVED` com fonte inexistente — PASS: `RN-A-02` (exec. 1) e `RN-A-01, RN-B-01` (exec. 2) existem literalmente nos PDFs.
- 0 `APPROVED` com fonte existente mas semanticamente irrelevante — PASS até onde os dados reais permitem verificar (os 2 casos citam exatamente a regra que sustentam: DDD válido → `RN-A-02`; ausência de telefone+CEP → `RN-A-01`+`RN-B-01`). O exemplo específico do desenho (`RN-A-02`/"ocultar CEP") não apareceu nesta execução real — validado apenas via teste de contrato/unitário, não via IA real desta vez.
- 0 cenário misto incorretamente `APPROVED` — PASS (todos os mistos foram rebaixados; ver 3.3 para o efeito colateral disso).
- **Cobertura das 6 regras documentadas**: `RN-A-01`, `RN-A-02`, `RN-A-03`, `RN-B-01`, `RN-B-02`, `RN-B-03` — todas citadas em `Fontes` em pelo menos um cenário nas 3 execuções — PASS quanto à citação, mas a maioria aparece em cenários rebaixados para `EXPLORATORY` (ver seção 3.3), não em `DOCUMENTED`, o que é uma cobertura fraca do ponto de vista de "requisito confirmado".

## 6. Termos residuais históricos (re-checados)

| Termo | Ocorrências nesta rodada | Classificação |
|---|---|---|
| "tempo real" | 3 (exec. 1 e 2) | `EXPLORATORY`/`REVIEW_REQUIRED` em todas — correto |
| "imediatamente" | 2 (exec. 1 e 2) | `EXPLORATORY`/`REVIEW_REQUIRED` em todas — correto |
| "onBlur" | 0 | não apareceu nesta rodada |
| "ocultar CEP" / "ocultar campo" | 0 | não apareceu nesta rodada |
| "botão desabilitado" | 0 | não apareceu nesta rodada |

Nenhuma ocorrência de falso `APPROVED` para os termos que apareceram — resultado positivo, consistente com o BUG-005/005A permanecendo corrigido.

## 7. Regressão e build

- Backend: **1949 testes, 0 falhas**, `./gradlew build -x test` → `SUCCESSFUL` (baseline anterior era 1907 ao fim da Sessão 11; 1941 antes da correção do item 3.2; 1949 após).
- Frontend: **524 testes, 0 falhas**, `ng build --configuration production` → sucesso.
- Instrumentação temporária de diagnóstico (log da resposta bruta da IA em `TestScenarioAgent.java`, usada só para investigar os itens 3.1/3.2) foi **integralmente revertida**; `git diff` nesse arquivo específico ficou vazio antes da correção 3.2 ser reaplicada.

## 8. Observação fora de escopo (não é problema, apenas registro)

Durante a auditoria de `git status`, encontrei mudanças no backend que eu não fiz: `.env.example`, `Jenkinsfile`, `docker-compose.yml`, `application.yml`, `QaWorkflowService.java` (+testes), e uma feature nova inteira (`ZephyrPublisherAgent`, `ZephyrProperties`, `infrastructure/zephyr/`) — aparentemente um trabalho seu, em paralelo, de publicação no Zephyr Scale via API. Não toquei em nenhum desses arquivos. Confirmei que compilam e passam junto com o restante da suíte (1949/0 falhas inclui esse código). Registro aqui só para transparência, já que apareceram depois da minha checagem inicial de escopo.

## 9. Classificação final

**`FASE15_BUG_005B_REQUIRES_FIX`**

Motivo: apesar de toda a infraestrutura determinística/estrutural funcionar corretamente (0 `APPROVED` inválido em qualquer critério, fail-closed nunca falhou), o comportamento real observado em 3 execuções ao vivo mostra uma taxa de `EXPLORATORY` de 94% (32/34), incluindo cenários claramente sustentados por regras documentadas, causada por um gap concreto e already-identificado no `corrigirSourceInexistente` (item 3.3). Isso viola a regra epistêmica de não subclassificar por cautela excessiva, reduzindo materialmente o valor prático do recurso de rastreabilidade. Recomenda-se uma sessão de continuação focada especificamente em ensinar o mecanismo de validação de fonte a aceitar `RF\d+`/`RNF\d+` como referências válidas (ou proibir a mistura desses números com IDs reais no campo Fontes), sem alterar mais nada do que já foi entregue aqui.

## 10. Pendências para autorização futura (não executadas nesta sessão — respeitando o STOP)

- Corrigir o rebaixamento excessivo por mistura RF/RN (item 3.3).
- Investigar a fundo a causa dos itens malformados vindos do Reviewer que causaram 3 das 6 falhas nas execuções oficiais 2 e 3 (fail-closed funcionou, mas a taxa de retrabalho é alta).
- Revisar e commitar a correção do item 3.2 (`CenarioTextoParser.java` + teste), hoje uncommitted.
- `FASE15-BUG-007` continua em aberto, não tocado.
- Jira, Chat IA, Auto QA, limpeza de Mongo — não iniciados, aguardando nova autorização explícita.
