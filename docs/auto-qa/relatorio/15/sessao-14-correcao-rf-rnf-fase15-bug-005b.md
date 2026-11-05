# FASE 15 — Sessão 14 — Continuação do FASE15-BUG-005B

## Correção do rebaixamento excessivo de evidências RF/RNF

Data: 2026-08-16
Classificação final: **`FASE15_BUG_005B_FIXED`**

---

## 1. Causa raiz confirmada

`GeneratedScenariosValidator.corrigirSourceInexistente` validava cada fonte citada em `Fontes` apenas contra o texto bruto (`regraDeNegocio` = regra digitada + texto dos PDFs). Referências `RFxx`/`RNFxx`, geradas pelo `RequirementAnalysisAgent` a partir do MESMO material de origem e disponíveis em `context.getRequisitos()`, nunca aparecem literalmente no texto bruto — então qualquer cenário que as citasse (mesmo junto com IDs documentais reais) era rebaixado inteiro para `EXPLORATORY`/`REVIEW_REQUIRED`. Na Sessão 13 isso resultou em 32/34 (94%) dos cenários reais rebaixados.

## 2. Comportamento anterior vs. desenho da correção

**Antes:** `sourceExiste(fonte) = fonte existe em regraDeNegocio?`

**Depois:** `sourceExiste(fonte) = fonte é "USER" com regra digitada existente OU existe em regraDeNegocio OU existe em context.getRequisitos() desta mesma execução`

Sem regex de formato (`RF\d+` etc.) — a validação é sempre por presença literal de string, agora em duas fontes de texto em vez de uma. Isolamento entre execuções é natural: `requisitosDerivados` vem do `WorkflowContext` da chamada atual, nunca de catálogo global, Mongo ou execução anterior.

## 3. Arquivos alterados (escopo exato, mudança mínima — sem novo agente, sem RequirementCatalog)

- `GeneratedScenariosValidator.java`: `fonteExisteNoTextoBruto(fonte, bruto)` e `corrigirSourceInexistente(item, bruto)` viraram overloads que delegam para novas versões de 3 argumentos (`..., requisitosDerivados`). As 15 chamadas/testes com a assinatura de 2 argumentos continuam funcionando sem alteração (retrocompatibilidade).
- `TestScenarioAgent.java`: passa `context.getRequisitos()` para `corrigirSourceInexistente` (dado já disponível no contexto, sem plumbing novo).
- `RedundancyReviewAgent.java`: idem, na segunda barreira pós-revisão.
- Testes correspondentes nos 3 arquivos acima.
- `WorkflowContext`/`QaWorkflowService` **não precisaram ser alterados** — `getRequisitos()` já existia e já estava populado antes do `TestScenarioAgent`/`RedundancyReviewAgent` executarem.

## 4. TDD

RED escrito antes de qualquer alteração de produção: 11 erros de compilação (overloads de 3 argumentos inexistentes) em `GeneratedScenariosValidatorTest`, confirmados. Implementação → GREEN. Em seguida, RED→GREEN em `TestScenarioAgentTest` (2 testes: RF válido não rebaixa; RF inventado rebaixa) e `RedundancyReviewAgentTest` (2 testes: idem, na segunda barreira). Total de 16 novos testes cobrindo: RF válido, RNF válido, RF/RNF inventado (incluindo formato sintaticamente válido mas inexistente, ex. `RF9999`), overloads de 2 argumentos intactos, isolamento entre execuções (RF válido numa não vaza para outra), fonte mista válida, fonte mista com uma parte inválida (fail-closed), e os dois testes de wiring por agente.

## 5. Regressão e build

- Backend: **1975 testes, 0 falhas** (baseline anterior: 1949). `./gradlew build -x test` → `SUCCESSFUL`.
- Frontend: nenhuma alteração necessária — não tocado, conforme instrução. `git status --porcelain` no frontend mostra só a pasta deste relatório, nada de código.

## 6. Reteste real — Fluxo 3 (input exato desta autorização)

Título: "Cadastro de cliente com múltiplas regras documentais". Regra digitada: "O sistema deve permitir cadastrar um novo cliente informando seus dados pessoais.\nAo concluir o cadastro com dados válidos, o cliente deve ser salvo com status ATIVO." PDFs: A (regras cadastrais) + B (regras de endereço). Agente `gerador_cenarios_testes`. Sem Jira.

| Tentativa | Resultado |
|---|---|
| Execução oficial 1 | 200 — id `6a8255ee9db2102ff08d6bc8`, 13 cenários, de primeira |
| Execução oficial 2 | 200 — id `6a82565c9db2102ff08d6bc9`, 15 cenários, de primeira |
| Execução oficial 3, tentativa 1 | 500 — "Cenário 'Cadastro bem-sucedido... (parâmetro: país de residência)' sem estrutura BDD mínima (Quando=false)" — fail-closed correto (item pós-Reviewer corrompido, mesma classe de falha já registrada na Sessão 13, não é bug novo desta correção) |
| Execução oficial 3, tentativa 2 | 200 — id `6a8257249db2102ff08d6bca`, 19 cenários |

Nenhum dado corrompido foi persistido na tentativa que falhou.

**Observação sobre `finish_reason` (BUG-006, não alterado):** nas chamadas do `TestScenarioAgent` (limite de 8000 tokens), todas retornaram `finishReason='stop'`. Na chamada do `RedundancyReviewAgent` da 2ª tentativa da execução 3 (19 cenários, resposta maior), `finishReason='length'` — o Reviewer usa o limite padrão de 4000 tokens (nunca foi estendido, só o Generator tem teto maior, por desenho original do BUG-006). Isso é consistente com a causa da falha na 1ª tentativa dessa mesma execução. Não alterado nesta sessão (fora do escopo autorizado); registrado como observação para o BUG-006 continuar monitorado.

## 7. Auditoria agregada (3 execuções oficiais, 47 cenários)

- **APPROVED: 40 (85%)** — antes da correção: 2/34 (6%).
- **REVIEW_REQUIRED: 7 (15%)**.
- DOCUMENTED: 30. DIRECT_INFERENCE: 10. EXPLORATORY: 7.
- **Cobertura das 6 regras documentadas**: `RN-A-01`, `RN-A-02`, `RN-A-03`, `RN-B-01`, `RN-B-02`, `RN-B-03` — todas citadas, a maioria agora em cenários `DOCUMENTED`/`APPROVED` (diferente da Sessão 13, onde apareciam quase só em `EXPLORATORY`).
- **0 `APPROVED` sem `evidenceType`** — PASS.
- **0 `APPROVED` como `EXPLORATORY`** — PASS.
- **0 `APPROVED` com `evidenceSources` vazio** — PASS.
- **0 `APPROVED` com fonte inexistente** — PASS até onde auditado manualmente: toda fonte `RN-A-XX`/`RN-B-XX` citada existe nos PDFs (confirmado na Sessão 13); toda fonte `RFxx`/`RNFxx` é consistente com o conteúdo real do texto digitado/PDFs (ex.: "RF06: Persistência apenas com todos os obrigatórios preenchidos" citando só `RF-06` — condiz com "status ATIVO" da regra digitada). Uma observação pontual: dois cenários citaram `RN-01`/`RN05` (sem o padrão `RN-A/B-XX` dos PDFs) — plausivelmente numeração própria do `RequirementAnalysisAgent` para a regra digitada (que não tem ID nos PDFs), não confirmado por log direto do texto de requisitos desta execução (instrumentação de diagnóstico não foi religada para não repetir o desvio de escopo da Sessão 13); mecanismo é o mesmo, testado e determinístico usado em todos os outros casos.
- **Cenário misto incorretamente `APPROVED`**: não identificado.
- **Termos residuais históricos** ("tempo real", "imediatamente", "onBlur", "ocultar CEP", "ocultar campo", "botão desabilitado"): nenhuma ocorrência nesta rodada (nem para auditar).

## 8. Critérios de sucesso (seção 57 da autorização)

1. RF/RNF reais reconhecidos — PASS (30 `DOCUMENTED` + 10 `DIRECT_INFERENCE`, muitos citando RF/RNF junto com IDs reais).
2. RF/RNF inventados continuam rejeitados — PASS (coberto por 4 testes unitários dedicados, incl. formato válido mas inexistente).
3. IDs documentais reais continuam validados — PASS (regressão intacta, testes antigos verdes).
4. IDs documentais inventados continuam rejeitados — PASS (regressão intacta).
5. `USER` continua válido — PASS (regressão intacta, comportamento não tocado).
6. Fontes mistas válidas não causam downgrade indevido — PASS (testado e confirmado nos dados reais, ex. exec1 item 1: `RF-01...RF-06, RN-A-01...RN-B-03` todos válidos → `APPROVED`).
7. Uma fonte inválida na lista continua causando fail-closed — PASS (testado unitariamente).
8. Reviewer continua validando semântica — PASS (prompt do Reviewer não alterado nesta sessão).
9. Cenário misto continua `REVIEW_REQUIRED` — PASS (regra "menor certeza vence" preservada, não tocada).
10. 0 `APPROVED` com source inexistente — PASS (ver seção 7).
11. Cenários documentados não são mais rebaixados só por citar RF/RNF reais — **PASS, esta é a correção central**: taxa de `APPROVED` subiu de 6% para 85%.

## 9. Não iniciado (respeitando o STOP)

`FASE15-BUG-007` não tocado. Jira, Chat IA, Auto QA, `Task Jira → Cenário`, limpeza de Mongo — nenhum iniciado. Nenhum comando `git` de escrita executado.

## 10. IDs Mongo criados nesta sessão

`6a8255ee9db2102ff08d6bc8`, `6a82565c9db2102ff08d6bc9`, `6a8257249db2102ff08d6bca` (não removidos, conforme instrução de não limpar Mongo).

## 11. Classificação final

**`FASE15_BUG_005B_FIXED`**

A causa raiz do rebaixamento excessivo (Sessão 13, item 3.3) foi corrigida com mudança mínima, TDD completo, regressão 0 falhas, build verde, e confirmada em 3 execuções reais do Fluxo 3 com o input exato desta autorização — taxa de `APPROVED` correta subiu de 6% para 85%, sem reintroduzir nenhum `APPROVED` com fonte inexistente. A falha residual observada (item pós-Reviewer corrompido em 1 das 4 tentativas reais, ligada a `finish_reason='length'` no Reviewer) é uma manifestação já registrada e monitorada do `BUG-006` para o Reviewer especificamente — não faz parte do escopo desta correção e o fail-closed funcionou corretamente, sem persistir dado corrompido.
