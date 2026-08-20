# FASE 15 — Validação Funcional End-to-End do Produto
## Sessão 12 — Diagnóstico e desenho técnico do `FASE15-BUG-005B` (rastreabilidade de evidência)

**Data:** 2026-08-13
**Natureza desta sessão:** exclusivamente diagnóstico e desenho técnico. **Nenhum arquivo foi alterado.** Nenhum comando Git de escrita. Nenhuma geração real de IA foi executada (não foi necessária — todas as perguntas foram respondidas com leitura de código real e evidência já coletada nas Sessões 9-11).

---

## 1. Status atual

x`FASE15-BUG-005`/`005A`: melhoria substancial implementada (estratégia A+B+D), mas **`REQUIRES_FIX`** — 2 casos residuais confirmados nas Sessões 10-11 (comportamento de timing "tempo real" e comportamento de UI "ocultar campo" persistidos como `APPROVED` sem fonte documental), mesmo após duas rodadas de reforço textual de prompt, uma delas citando os termos literalmente.

## 2. Evidência que motivou o `BUG-005B`

Um mecanismo baseado **inteiramente em julgamento de linguagem natural** ("isto parece documentado?") tem taxa de acerto alta mas não garantida. O `BUG-005B` investiga substituir/complementar esse julgamento por uma pergunta mais verificável: **"qual requisito especificamente sustenta este comportamento?"** — e, na medida do possível, tornar essa pergunta parcialmente checável de forma determinística (a fonte citada existe?), mesmo sabendo que a checagem semântica completa (a fonte citada realmente sustenta a afirmação?) continuará dependendo de julgamento de IA.

## 3. Mapa real do `CenarioItem`

```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CenarioItem {
    private String nome;
    private String objetivo;
    private String precondicao;
    private String scriptTeste;
    private String resultadoEsperado;
    private String variaveis;
    private String componente;
    private String rotulos;
    private String proposito;
    private String pasta;
    private String proprietario;
    private String cobertura;
    private String status;
}
```
Todos os campos são `String` livres — não há enum, não há validação de schema Java, não há anotação `@Field`/constraint do Spring Data MongoDB. `Tipo`/`Prioridade`/`Tags` (pedidos no prompt histórico) **nunca foram campos reais** — são descartados pelo parser há muito tempo (achado das Sessões 10-11: só `Status`/`Rótulos` são campos reais e extraídos, e só passaram a ser efetivamente populados nas Sessões 10-11).

## 4. Mapa do pipeline completo (com pontos de nascimento/preservação de rastreabilidade)

```
USER (regra digitada, sem ID)  ─┐
PDF-A/PDF-B (com IDs "RN-X-NN") ─┼─→ CenarioRequest.regraDeNegocio (RAW, concatenado)
Jira (não investigado — não executado nesta sessão) ─┘
        ↓
RequirementAnalysisAgent  → RE-NUMERA como "RF01/RF02/RNF01..." (perde o ID original do PDF)
        ↓
TranscriptAnalysisAgent   → decisões/ambiguidades, sem IDs
        ↓
TestPlanAgent (Planning)  → plano macro, sem IDs formais
        ↓
TestScenarioAgent (Generator)
  → recebe TUDO: regraDeNegocio BRUTO (com "RN-A-01" ainda intacto) +
    Requisitos (já renumerados) + Decisões + Plano
  → gera texto com Status/Rótulos (desde Sessão 10)
        ↓
CenarioTextoParser → extrai campos, incluindo Status/Rótulos (genérico, já suporta)
        ↓
RedundancyReviewAgent (Reviewer) → só vê os CenarioItem já parseados (Nome/Objetivo/
  Pré-condições/Passos/Resultado/Rótulos/Status) — NÃO vê mais o regraDeNegocio bruto
  nem os RN-X-NN originais diretamente
        ↓
BddFormatterAgent → reorganização estrutural apenas (sem IA, confirmado nas Sessões 5/6)
        ↓
ZephyrFormatterAgent → NÃO usa Rótulos/Status hoje (só nome/objetivo/precondicao/
  scriptTeste/resultadoEsperado) — qualquer evidência ficaria invisível na exportação
  Zephyr sem mudança futura nesse formatter
        ↓
Cenario (Mongo, @Document) → List<CenarioItem> embutido, sem schema/validator no código
        ↓
CenarioResponse (DTO) → espelha CenarioItem diretamente (nenhum mapeamento manual)
        ↓
Frontend (cenario-list.component.ts)
  → `normalizarCenario()` faz WHITELIST EXPLÍCITO de campos conhecidos
  → JÁ exibe Rótulos e Status hoje (lista, modal de detalhe, XLSX, DOC/PDF export)
  → qualquer campo NOVO seria SILENCIOSAMENTE DESCARTADO até o frontend ser atualizado
```

**Achado central desta seção:** a fonte real (`regraDeNegocio` bruto, incluindo o texto integral dos PDFs com os IDs `RN-A-01` etc. ainda literais) **já chega ao Generator hoje**, via `TestScenarioAgent.buildUserPrompt()` (que inclui `context.getRequest().regraDeNegocio()` diretamente, não só a versão resumida do RequirementAnalysisAgent). Isso significa que uma citação de fonte pelo Generator **não depende de reconstruir nada** — o dado já está no prompt dele.

## 5. RequirementAnalysis — IDs já existem?

**`REQUIREMENT_IDS_ALREADY_EXIST = PARTIAL` (na prática, NO para o propósito de rastreabilidade).**

O `RequirementAnalysisAgent` gera sua própria numeração (`RF01`, `RF02`, `RNF01`...) — mas essa numeração é **inventada pela IA em cada execução**, não corresponde aos IDs originais dos documentos-fonte, e (confirmado em execuções reais das Sessões 9-11) frequentemente diverge do texto-fonte original. Não é uma base confiável para rastreabilidade determinística por si só.

## 6. PDF — IDs preservados até o Generator?

**`PDF_REQUIREMENT_IDS_PRESERVED = YES, até o Generator (via regraDeNegocio bruto) — NO, via a camada resumida (RequirementAnalysis)`.**

Confirmado extraindo o texto real dos 2 PDFs de fixture (`fluxo3_pdf_A_regras_cadastrais.pdf`, `fluxo3_pdf_B_regras_endereco.pdf`) com um leitor de PDF independente do backend:
```
ID          Regra              Descricao
RN-A-01     Telefone celular   O cliente deve informar um numero de telefone celular...
RN-A-02     DDD obrigatorio    O telefone celular deve conter DDD valido...
RN-A-03     Aceite dos termos  O cliente deve aceitar explicitamente os Termos de Uso...
```
(estrutura idêntica no PDF-B com `RN-B-01/02/03`). O `PdfTextExtractor` (PDFBox puro, sem OCR/processamento semântico) preserva esse texto literalmente. Esse texto bruto chega ao Generator via `regraDeNegocio` — **os IDs estão fisicamente presentes no prompt do Generator hoje**, mesmo sem nenhuma mudança de código. O que falta é (a) o Generator ser instruído a *citá-los* e (b) alguma forma de checar se a citação é válida.

## 7. USER (regra digitada) — sem ID

A regra digitada pelo usuário (texto livre, sem nenhum ID) precisaria de uma convenção sintética se quisermos rastreabilidade uniforme. Avaliado conceitualmente (não implementado): tratar a regra digitada inteira como uma única fonte `USER` (sem subdivisão granular) é a opção de menor custo/risco — subdividir automaticamente a regra digitada em "USER-RN-001", "USER-RN-002" por frase/parágrafo exigiria heurística de segmentação (risco de quebrar no meio de uma frase, criar IDs artificiais que não significam nada para o usuário). Recomendação preliminar: **fonte `USER` única, sem sub-ID**, pelo menos nesta primeira fase.

## 8. Jira — análise conceitual (não executado)

Não foi executado nenhum fluxo Jira nesta sessão (proibido pela autorização). Pela leitura do código já feita em sessões anteriores desta fase, o fluxo Jira (quando usado) busca anexos/descrição da tarefa e os trata de forma equivalente a um PDF anexado — a mesma lógica de "fonte com ou sem ID interno" se aplicaria: se a tarefa Jira tiver critérios de aceite numerados, o texto bruto provavelmente preservaria esses números da mesma forma que o PDF preserva `RN-A-01`; se for texto livre, cairia no mesmo caso do `USER`.

## 9. Generator — pode comportar campos de evidência sem quebrar o parser?

**Sim, tecnicamente viável sem quebrar nada, comprovado pela mesma técnica já usada nas Sessões 10-11** (Status/Rótulos): o `CenarioTextoParser.extrairCampo()` já extrai qualquer campo `"NomeDoCampo: valor"` de forma genérica, desde que o nome do campo seja adicionado ao array `campos[]` (para o cálculo de fronteira funcionar) — como já foi feito para `Status`/`Rótulos`. Um novo campo como `Fontes:` ou `Evidência:` seguiria exatamente o mesmo padrão. **Não implementado nesta sessão** (só avaliado).

## 10. Parser — o que mudaria (não implementado)

Se a Opção A (novos campos simples) for aprovada: adicionar `"Evidência"`/`"Fontes"` ao array `campos[]` do `extrairCampo()` (mesma posição relativa que `Status`/`Rótulos` ocupam hoje), e 2 linhas no builder do `CenarioItem` em `parsear()`. É a mesma escala de mudança que já foi feita 2 vezes nesta fase (baixo risco, já validado como padrão).

## 11. Reviewer como validador de evidência

O Reviewer **pode** verificar textualmente se a fonte citada (`RN-A-02`) aparece no texto que ele recebe — mas hoje ele **não recebe mais o `regraDeNegocio` bruto**, só os cenários já processados (ver seção 4). Para o Reviewer validar `source = RN-A-02 existe na fonte`, ele precisaria passar a receber o `regraDeNegocio` bruto (ou um resumo/catálogo dele) no seu próprio prompt — mudança de escopo maior que o padrão mínimo já usado (ver seção 26 sobre validação determinística vs. semântica).

## 12. BDD Formatter — sem impacto

Confirmado (Sessões 5/6): reorganização estrutural pura, sem chamada de IA, sem alteração de conteúdo semântico. Não seria afetado por nenhuma das opções.

## 13. Zephyr Formatter — impacto real identificado

`ZephyrFormatterAgent.formatarParaZephyr()` usa apenas `nome`/`objetivo`/`precondicao`/`scriptTeste`/`resultadoEsperado` — **não usa `rotulos` nem `status` hoje**. Isso significa que, mesmo hoje (Sessões 10-11), a classificação `REVIEW_REQUIRED`/exploratório **não aparece no texto exportado para Zephyr** — só na tela/XLSX/DOC do frontend (que leem `rotulos`/`status` diretamente do objeto). Qualquer campo novo de evidência teria o mesmo problema: presente no Mongo/API, ausente do texto Zephyr, até que `ZephyrFormatterAgent` seja atualizado (mudança pequena, mas real, fora do escopo desta sessão).

## 14. MongoDB — compatibilidade e migração

`Cenario` é um `@Document("cenario")` do Spring Data MongoDB, sem nenhum `@Field`/validador de schema no código. MongoDB é schemaless por padrão. **Não há necessidade de migration** para adicionar novos campos: documentos antigos simplesmente não terão o campo (desserializa como `null` automaticamente pelo Spring Data — mesmo comportamento já observado com `status`/`rotulos` em cenários criados antes das Sessões 10-11, que continuaram funcionando normalmente). *Ressalva honesta:* não inspecionei se o cluster Atlas tem algum validador de schema configurado diretamente no banco (fora do código Java) — não há evidência disso no código, mas não posso garantir 100% sem inspecionar a configuração do cluster diretamente, o que não foi autorizado/necessário nesta sessão de diagnóstico.

## 15. API — impacto

**Nenhuma mudança de DTO seria necessária.** `CenarioResponse` reutiliza `CenarioItem` diretamente como tipo do campo `cenarios` — qualquer novo campo em `CenarioItem` apareceria automaticamente no JSON de `POST /cenario`, `GET /cenario`, `GET /cenario/{id}` sem tocar em `CenarioResponse.java`.

## 16. Frontend — impacto real (achado importante)

`cenario-list.component.ts`, método `normalizarCenario()`, faz um **whitelist explícito** dos campos conhecidos de `CenarioItem` (linhas ~404-418) — usado tanto para exibição em tela/modal quanto para exportação XLSX/DOC/PDF. **Campos novos não listados nesse whitelist são silenciosamente ignorados até o frontend ser atualizado.** Já existe hoje, sem nenhuma mudança adicional, exibição de `Rótulos` e `Status` em 3 lugares: modal de detalhe (HTML), exportação XLSX (`xlsx-js-style`) e exportação DOC. Isso teve um efeito prático real nas Sessões 10-11: os cenários `REVIEW_REQUIRED` já ficaram visíveis para o usuário na tela, sem eu ter tocado no frontend — porque reaproveitei campos que já estavam mapeados.

## 17. XLSX/DOC — mesma constatação da seção 16 (mesmo arquivo/método).

## 18-21. Comparativo das alternativas

| | **A — Novos campos simples** | **B — Reaproveitar campos existentes** | **C — Objeto Evidence estruturado** | **D — RequirementCatalog + Evidence** |
|---|---|---|---|---|
| Descrição | `CenarioItem.evidenceType` (String) + `CenarioItem.evidenceSources` (String, lista separada por vírgula) | Continuar codificando tudo dentro de `Rótulos` (texto livre, ex.: `"exploratorio, source:RN-A-02"`) | `CenarioItem.evidence` como objeto aninhado `{type, sources[]}` | Pré-construir um catálogo determinístico/semi-determinístico de requisitos com IDs estáveis antes da geração; Generator/Reviewer referenciam só esse catálogo |
| Segurança (evita source inventado) | Média — permite validação leve (regex de formato) | Baixa — mistura semântica com outras tags, difícil de validar isoladamente | Média — mesma limitação de A sem catálogo | Alta — único que permite rejeitar deterministicamente um ID que não existe no catálogo |
| Complexidade | Baixa (mesmo padrão já usado 2x nesta fase) | Muito baixa (nenhuma mudança de schema) | Média (Mongo aninhado, parser mais complexo para extrair estrutura) | Alta (novo componente, nova etapa no pipeline, contrato novo em 3+ agentes) |
| Rastreabilidade | Boa (campos nomeados e típados) | Fraca (tudo misturado em texto livre não estruturado) | Boa | Excelente (única opção com garantia de existência) |
| Impacto backend | Baixo (parser + 2 campos) | Nenhum | Médio (parser + serialização aninhada) | Alto (novo agente ou etapa determinística + mudança em Generator/Reviewer/parser) |
| Impacto frontend | Precisa (novo campo = invisível até atualizar `normalizarCenario`) | Nenhum (já funciona hoje) | Precisa (idem A, + desserializar objeto aninhado) | Precisa (idem A) |
| Impacto Mongo | Nenhuma migration | Nenhuma | Nenhuma migration, mas documento mais aninhado | Nova coleção ou estrutura para o catálogo |
| Impacto exportação (Zephyr) | Precisa (`ZephyrFormatterAgent` não usa esses campos hoje) | Idem | Idem | Idem |
| Compatibilidade com dados antigos | Trivial (`null` = ausência de evidência estruturada) | Trivial (já é assim hoje) | Trivial | Precisa decidir status de cenários pré-catálogo |
| Custo de IA extra | Nenhum (mesmos agentes, prompt maior) | Nenhum | Nenhum | Potencialmente alto se o catálogo depender de LLM para documentos sem estrutura de ID clara (regra digitada em prosa) |
| Latência extra | Nenhuma | Nenhuma | Nenhuma | Uma etapa a mais (mesmo que leve) |
| Manutenibilidade | Boa — campos claros e nomeados | Ruim a médio prazo — mistura de responsabilidades em um campo de texto livre | Boa | Boa, mas mais peças móveis |

## 22-24. Granularidade e cenário misto

**Investigado como ponto obrigatório (regra 23-24):** um cenário pode combinar uma parte documentada (`RN-A-01`) com uma parte inventada ("e o botão fica desabilitado até o aceite"). Comparando as opções:

- **A) menor certeza vence, no nível do cenário inteiro** — se qualquer afirmação do cenário for exploratória, o cenário inteiro vira `EXPLORATORY`/`REVIEW_REQUIRED`. **Mais simples e mais segura.** É essencialmente a extensão natural do que já foi implementado nas Sessões 10-11 (um único `Status` por cenário) — não exige granularidade nova.
- **B) dividir cenário automaticamente** — dividiria "aceite dos termos" (documentado) de "botão desabilitado" (exploratório) em 2 cenários separados. Tecnicamente possível, mas aumenta a quantidade de cenários artificialmente e exigiria lógica de split não trivial no Generator (contradiz a regra explícita do agent.md contra fragmentação desnecessária).
- **C) evidência por resultado/assertion individual** — mais preciso, mas exige granularidade dentro do próprio campo `Passos`/`Resultado Esperado` (cada linha "Então"/"E" com sua própria evidência) — aumenta MUITO a complexidade de parsing e de prompt, risco de overengineering explicitamente alertado na própria autorização.

**Recomendação: opção A (menor certeza vence, por cenário inteiro).** É a que menos aumenta complexidade, é consistente com a arquitetura de `Status` já validada em produção nas Sessões 10-11, e prioriza segurança (um cenário misto vira `REVIEW_REQUIRED` inteiro, nunca `APPROVED` parcialmente incorreto).

## 25. Exemplos classificados (regra 44 da autorização)

Usando o critério proposto na regra 43 ("a inferência é direta somente quando sua negação contradiz logicamente o requisito original, sem adicionar nova decisão de UX, timing, integração, persistência ou fluxo"), testado contra os 7 exemplos:

| # | Regra | Teste | Classificação | Justificativa curta |
|---|---|---|---|---|
| 1 | CEP exatamente 8 dígitos | CEP com 7 dígitos inválido | `DOCUMENTED` | Restatement quase literal da própria regra ("exatamente 8" já define "diferente de 8 = inválido") |
| 2 | Telefone deve possuir DDD | Telefone sem DDD rejeitado | `DOCUMENTED` | Idem — consequência direta e imediata da obrigatoriedade |
| 3 | CEP obrigatório para Brasil | CEP opcional para exterior | `DIRECT_INFERENCE` | Raciocínio sobre o escopo da regra (ela só fala de Brasil), sem adicionar UX/timing novo |
| 4 | CEP obrigatório para Brasil | Campo CEP **oculto** para exterior | `EXPLORATORY` | Adiciona uma decisão de UX (visibilidade) não implicada por "não obrigatório" |
| 5 | Campo obrigatório | Erro exibido imediatamente no **onBlur** | `EXPLORATORY` | Adiciona uma decisão de timing/interação não definida pela regra |
| 6 | Termos devem ser aceitos | Botão fica **desabilitado** até aceitar | `EXPLORATORY` | Adiciona uma decisão de UX/interação específica (poderia ser implementado de outras formas) |
| 7 | Termos devem ser aceitos | Cadastro não pode ser concluído sem aceite | `DOCUMENTED` | Consequência direta e definicional, sem nova decisão de produto |

Esse critério classifica corretamente os 2 casos residuais reais das Sessões 10-11 (exemplos 4 e 5 do enunciado são, respectivamente, quase idênticos ao "ocultar CEP" e "tempo real"/onBlur observados de verdade) — o que dá confiança de que o critério é operacional, não só teórico.

## 26-30. Validação determinística vs. semântica

- **Determinística (sem catálogo):** só é possível checar se o texto citado como fonte (`RN-A-02`) aparece literalmente em algum lugar do `regraDeNegocio` bruto — uma checagem de substring simples, sem IA. Isso pega o caso "fonte completamente inventada" (ex.: `RN-A-99` que não existe em lugar nenhum) com alta confiança. **Não pega** o caso "fonte existe mas não sustenta a afirmação" (ex.: citar `RN-A-02`, que fala de DDD, para justificar "ocultar campo CEP") — isso é uma checagem semântica, exige entender o CONTEÚDO da regra, não só sua existência.
- **Semântica:** só é possível via IA (Reviewer reforçado, ou um agente novo). Nunca será uma garantia matemática — é redução de risco, não eliminação, exatamente como já demonstrado nas Sessões 10-11 (reforço de prompt reduziu mas não zerou os falsos positivos).
- **Registrar explicitamente (regra 30):** uma referência existente mas semanticamente incorreta **não pode ser considerada evidência válida só porque o ID existe**. Isso é um risco real e deve ser comunicado como limitação, não escondido atrás da aparência de uma citação.

## 31-33. Reviewer como validador vs. novo `EvidenceValidatorAgent`

Comparado:
- **Reaproveitar o Reviewer** (reforçá-lo para também checar `source` existe/é plausível): custo zero de latência adicional (já é uma chamada de IA que já acontece), custo zero de complexidade arquitetural nova. Risco: ele já falhou 2 vezes em capturar os mesmos padrões mesmo com regras explícitas — reforçar ainda mais o mesmo agente pode ter retorno decrescente (observado empiricamente nas Sessões 10-11).
- **Criar `EvidenceValidatorAgent` novo:** uma chamada de IA adicional dedicada exclusivamente a checar evidência, com um prompt mais estreito e focado (potencialmente mais confiável que um Reviewer que também faz consolidação/dedup ao mesmo tempo). Custo: +1 chamada de IA por geração completa (latência e custo de tokens adicionais), +1 classe/agente novo no pipeline (mais uma peça para manter).

**Recomendação: não criar agente novo nesta fase.** A autorização já favorece essa direção (regra 33: "a existência de vários agentes no projeto não significa que a solução deve necessariamente criar outro"). Um agente dedicado só se justificaria se, após reforçar o Reviewer com a checagem de existência (determinística, barata) mais uma instrução semântica mais focada, os casos residuais continuarem recorrendo — nesse ponto, um agente cuja ÚNICA responsabilidade é validar evidência (sem a carga cognitiva extra de também consolidar/desduplicar) pode ter uma taxa de acerto melhor por ter um escopo mais estreito. Mas isso é uma escalada de custo que só se justifica com mais uma rodada de dados.

## 34-35. Persistência, compatibilidade, dados legados

Confirmado na seção 14: sem migration necessária. Para cenários antigos sem os novos campos, a recomendação é `evidenceType: null` (não inventar um valor como `"LEGACY"` ou `"UNKNOWN"` — `null` já comunica corretamente "esta informação não existe para este registro", e é o comportamento padrão natural do Java/Mongo sem nenhum código extra). O frontend, ao exibir, trataria `null` como "sem classificação" (mostrar nada, não mostrar um selo enganoso).

## 36-40. API / UX / XLSX / Zephyr — resumo already coberto nas seções 15-17. Frontend futuramente poderia exibir algo como "Evidência: Documentada (RN-A-02)" ou "⚠ Ponto a validar" ao lado do Status já exibido hoje — não implementado, não mapeado em detalhe de componente Angular específico nesta sessão (fora do escopo: "não alterar frontend").

## 41-43. Relação Status × novo `evidenceType`

Recomendação (não implementada): manter os dois campos, com papéis distintos e não-redundantes:
- `status` (já existente): campo **operacional**, já consumido pelo frontend hoje — "isto está pronto para ser tratado como aprovado?" (`APPROVED`/`REVIEW_REQUIRED`).
- `evidenceType` (novo, proposto): campo de **auditoria/rastreabilidade** — "por quê?" (`DOCUMENTED`/`DIRECT_INFERENCE`/`EXPLORATORY`).

Relação recomendada:
- `DOCUMENTED` → `status = APPROVED`
- `DIRECT_INFERENCE` → `status = APPROVED` (por padrão) — é uma inferência defensável, não uma invenção; forçar `REVIEW_REQUIRED` para toda inferência reduziria demais a cobertura útil (contraria a regra 39/67 da autorização original do BUG-005)
- `EXPLORATORY` → `status = REVIEW_REQUIRED` sempre

## 44. `DIRECT_INFERENCE` — o ponto mais delicado

Critério proposto e testado na seção 25. Resumo: **a inferência é direta quando nega logicamente o requisito original sem introduzir uma nova decisão de produto** (UX, timing, integração, persistência, fluxo). Qualquer decisão nova nessas dimensões — mesmo que "razoável" ou "comum na indústria" — deve ser tratada como `EXPLORATORY`.

## 45-46. Não solicitar chain-of-thought

Confirmado: a saída recomendada nunca pediria "explique seu raciocínio" — apenas 3 campos objetivos (`evidenceType`, `evidenceSources`, e o `status` já existente), sem texto de raciocínio interno exposto.

## 47-50. `RequirementCatalog` — benefício, custo, e por que não agora

**Benefício:** seria a única forma de garantir IDs consistentes e verificáveis deterministicamente entre execuções, essencial se a exigência evoluir para "todo source citado deve existir no catálogo" (regra 84 da autorização, critério futuro de aceite mais forte).

**Custo:** para o caso controlado desta fixture (PDFs com tabela `ID | Regra | Descrição` limpa), um catálogo determinístico é tecnicamente viável via regex/parsing estrutural simples. **Mas isso não generaliza** — PDFs reais raramente têm essa estrutura tabular perfeita, e a regra digitada pelo usuário nunca tem ID nenhum. Um catálogo confiável para o caso geral exigiria ou (a) uma IA para extrair/atribuir IDs a partir de texto livre — reintroduzindo o mesmo problema de confiabilidade probabilística que o BUG-005B tenta resolver, só que uma camada antes —, ou (b) aceitar que o catálogo só funciona bem para fontes já estruturadas (como PDFs com tabelas de regras) e usar uma fonte única sem sub-ID para tudo o resto (mesma recomendação da seção 7).

**`AutoQaContext`/estrutura equivalente já existe? NÃO** — investigado (regra 49): é uma classe de um recurso completamente diferente (Auto QA — geração/execução de código de automação), sem nenhuma relação com o pipeline de geração de cenários. Não há nenhum "RequirementCatalog" ou estrutura equivalente reaproveitável hoje em nenhum lugar do código.

**Por isso, RequirementCatalog fica recomendado como evolução de FASE 2, não da primeira implementação.**

## 51-52. Bug do Status (fronteira do parser) — registrado separadamente

Confirmado como candidato a **`FASE15-BUG-007`** (próximo número disponível na sequência real desta fase: 001, 002, 003, 003A, 005, 005A, 006 já usados). Causa: texto de notas/comentário do Reviewer após o `Status:` do último cenário de um bloco, mas antes do separador `---`, é capturado dentro do próprio campo `Status` (mesma família do `FASE15-BUG-003A`, mas em um campo diferente). **Não corrigido nesta sessão** (fora de escopo, confirmado como diagnóstico apenas). É uma causa **diferente** do `BUG-005B` (um é rastreabilidade semântica; o outro é um defeito determinístico de fronteira de regex) — não devem ser misturados em uma única correção futura.

## 53. BUG-006 — não alterado, `max-tokens` intocado.

## 54-58. Testes/Git/Banco/Código

Nenhum teste novo (nenhuma implementação). Suíte existente não foi reexecutada por não haver mudança de código a validar. Nenhum comando Git de escrita. Nenhum dado novo gerado no MongoDB (nenhuma geração real de IA foi necessária — todas as perguntas foram respondidas com leitura de código-fonte real e evidência já coletada nas Sessões 9-11, mais a extração independente do texto dos 2 PDFs de fixture usando uma biblioteca externa, para confirmar objetivamente que os IDs `RN-X-NN` existem literalmente nos documentos). Nenhum arquivo de código foi alterado.

## 59. Decisões que este relatório permite tomar

Respondidas ao longo do documento:
1. **Criar novos campos no `CenarioItem`?** Recomendado: sim (`evidenceType`, `evidenceSources`), Opção A.
2. **Reutilizar campos existentes?** Não como solução principal — `Rótulos` continua sendo usado para tags descritivas gerais, mas não deveria carregar a responsabilidade de citação de fonte estruturada.
3. **Usar objeto `Evidence`?** Não nesta fase — overengineering relativo ao ganho.
4. **Evidência por cenário ou assertion?** Por cenário inteiro, com regra "menor certeza vence".
5. **Criar `RequirementCatalog`?** Não nesta fase — recomendado como evolução futura, condicionada a uma necessidade real de rejeitar sources inventados de forma determinística.
6. **Quem gera a evidência?** O Generator (`TestScenarioAgent`), que já tem acesso ao `regraDeNegocio` bruto com os IDs originais.
7. **Quem valida?** O Reviewer reforçado (checagem determinística leve de existência textual + reforço semântico), sem novo agente por enquanto.
8. **Precisa novo agente?** Não, por enquanto (seção 31-33).
9. **Impacto Mongo?** Nenhum, sem migration.
10. **Impacto frontend?** Necessário para exibição, mas não bloqueante — dado ficaria disponível na API mesmo antes de o frontend ser atualizado.
11. **Impacto XLSX?** Mesmo caso do frontend (mesmo arquivo/método).
12. **Impacto Zephyr?** `ZephyrFormatterAgent` precisaria ser atualizado para expor evidência no texto exportado — hoje nem `Rótulos`/`Status` aparecem lá.
13. **Compatibilidade com dados antigos?** Trivial — `null`.
14. **Impacto em custo/latência?** Nenhum adicional (mesmos agentes, prompts maiores) — a menos que se decida criar o `EvidenceValidatorAgent`, aí sim +1 chamada de IA por geração.
15. **Tamanho estimado da implementação?** Pequeno a médio — mesma ordem de grandeza das Sessões 10-11 (2 campos novos + prompt do Generator + prompt do Reviewer + parser + testes de contrato).

## 60-62. Arquitetura recomendada

**Opção A (novos campos simples), com a granularidade "por cenário inteiro, menor certeza vence", sem `RequirementCatalog` nesta fase, reforçando o Reviewer existente (sem novo agente) com uma checagem determinística leve de existência textual da fonte + reforço semântico do critério da seção 44.**

```
regraDeNegocio bruto (com RN-X-NN, se PDF/Jira estruturado)
        ↓
Generator (TestScenarioAgent)
  → para cada cenário, declara evidenceType + evidenceSources
        ↓
Parser (extração genérica, mesmo padrão de Status/Rótulos)
        ↓
Reviewer (RedundancyReviewAgent)
  → checagem determinística: source citado aparece no regraDeNegocio bruto?
    (requer expor o regraDeNegocio bruto ao Reviewer, mudança de escopo real)
  → checagem semântica (via prompt): a fonte realmente sustenta a afirmação?
  → se qualquer checagem falhar: reclassifica cenário inteiro para EXPLORATORY/REVIEW_REQUIRED
        ↓
Persistência (sem migration)
        ↓
Frontend/XLSX/DOC (precisa atualização futura para exibir evidenceType/evidenceSources)
Zephyr (precisa atualização futura para não omitir a informação)
```

## 63-65. Garantias e limites da arquitetura recomendada

- **Evita source inventado (ID que não existe em lugar nenhum):** parcialmente — a checagem determinística de substring no `regraDeNegocio` bruto pega isso com alta confiança, DESDE que o Reviewer passe a receber esse texto bruto (mudança de escopo necessária, hoje ele não recebe).
- **Evita source existente mas semanticamente irrelevante:** não há garantia — continua dependendo de julgamento de IA (mesma limitação fundamental discutida na seção 26-30). Isso deve ser comunicado como limitação permanente, não uma promessa de solução completa.

## 66-67. Fallback e fail-closed

Quando não há fonte, fonte é inválida, fonte é parcial, ou o validador não tem certeza: **`REVIEW_REQUIRED`**, sempre — consistente com o princípio já estabelecido nas Sessões 10-11 (fail-closed epistêmico).

## 68. Custo qualitativo

| | Tokens | Latência | Complexidade |
|---|---|---|---|
| Opção A recomendada (sem catálogo, sem agente novo) | LOW (prompt um pouco maior) | LOW (nenhuma chamada extra) | LOW-MEDIUM |
| + checagem determinística no Reviewer | LOW | LOW | LOW (regex simples) |
| + `EvidenceValidatorAgent` (se necessário no futuro) | MEDIUM | MEDIUM (+1 chamada de IA) | MEDIUM |
| `RequirementCatalog` completo (se necessário no futuro) | MEDIUM-HIGH (se depender de IA para fontes não estruturadas) | MEDIUM | HIGH |

## 69-71. Migração, dados legados, enums propostos

Sem migração. Dados legados: `evidenceType = null`. Enums propostos (nomes, não implementados):
```java
// proposta conceitual, NÃO criada nesta sessão
public enum EvidenceType {
    DOCUMENTED,
    DIRECT_INFERENCE,
    EXPLORATORY
}
```
(Ou, dado que todos os outros campos de `CenarioItem` são `String` livre sem enum Java real — nem `status` é um enum hoje, é `String` — manter `evidenceType` como `String` também, por consistência com o padrão já estabelecido no projeto, em vez de introduzir o primeiro enum real da classe.)

## 72-75. Modelo conceitual (JSON, não implementado)

**Cenário documentado (RN-B-02):**
```json
{
  "nome": "Cadastro com CEP diferente de 8 dígitos",
  "status": "APPROVED",
  "evidenceType": "DOCUMENTED",
  "evidenceSources": "RN-B-02"
}
```

**Cenário exploratório (ocultar CEP para exterior):**
```json
{
  "nome": "Troca do tipo de residência durante o cadastro",
  "status": "REVIEW_REQUIRED",
  "evidenceType": "EXPLORATORY",
  "evidenceSources": "",
  "rotulos": "exploratorio, ponto-a-validar"
}
```

**Cenário misto (aceite dos termos documentado + botão desabilitado inventado):** com a regra "menor certeza vence" (seção 22-24), o cenário INTEIRO fica:
```json
{
  "nome": "Aceite dos Termos de Uso via botão de confirmação",
  "status": "REVIEW_REQUIRED",
  "evidenceType": "EXPLORATORY",
  "evidenceSources": "RN-A-03 (parcial — parte da afirmação, a UX do botão, não tem fonte)",
  "rotulos": "exploratorio, ponto-a-validar"
}
```

## 76-81. Impacto futuro por camada (mapeado, não alterado)

- **Parser:** +1 campo no array `campos[]` × 2 (`evidenceType`, `evidenceSources`) + 2 linhas no builder.
- **Prompt do Generator:** nova seção pedindo `Evidência:`/`Fontes:` além do `Status:`/`Rótulos:` já existentes.
- **Prompt do Reviewer:** nova regra + necessidade de receber o `regraDeNegocio` bruto (mudança de assinatura/contexto, não trivial).
- **`GeneratedScenariosValidator`:** poderia, no futuro, validar que `evidenceType` só aceita os 3 valores conhecidos, e que `EXPLORATORY` sempre tem `status=REVIEW_REQUIRED` coerente — validação estrutural, não semântica, compatível com o princípio já estabelecido (`GeneratedScenariosValidator` não faz validação de verdade semântica).
- **Frontend:** `normalizarCenario()` + template do modal + colunas do XLSX/DOC.
- **Exportação:** mesmos arquivos do frontend (não há exportador backend separado).
- **Zephyr:** `ZephyrFormatterAgent.formatarParaZephyr()`.

## 82-84. Plano de testes e critério de aceite futuros (propostos, não criados)

Testes mínimos recomendados quando a implementação for autorizada: documented com source válida; direct inference; exploratory; source inexistente (rejeição determinística); source semanticamente errada (não detectável deterministicamente — documentar como limitação testada, não como bug); source parcial (cenário misto); cenário 100% exploratório; cenário legado sem evidência (`null`); fluxo USER sem ID; fluxo PDF com ID; Reviewer reclassificando; Mongo persistindo/lendo corretamente; API refletindo os novos campos; XLSX/frontend exibindo (quando essas camadas forem atualizadas); Zephyr (quando atualizado).

**Reteste futuro:** reaproveitar o Fluxo 3 multi-PDF (mesmos 2 PDFs de fixture, já validados como tendo estrutura de ID clara e um documento de controle "não interpretar regras ausentes como documentadas" — os PDFs já foram desenhados para isso). Critério de aceite mais forte proposto: *"Todo cenário `APPROVED` deve ter `evidenceSources` não vazio E cada source citado deve ser encontrável literalmente no `regraDeNegocio` bruto"* (checável deterministicamente no teste automatizado, sem depender de julgamento de IA no próprio teste).

## 85. Limitação honesta

Mesmo com toda a arquitetura recomendada implementada, **o problema não desaparece por completo**: a checagem de que uma fonte citada *realmente sustenta semanticamente* a afirmação continua dependendo de julgamento de IA (Reviewer ou um futuro `EvidenceValidatorAgent`), que já demonstrou, nesta mesma fase, ter uma taxa de acerto alta mas não perfeita. A arquitetura proposta **reduz e torna auditável** o problema (agora dá pra perguntar "qual fonte foi citada?" e checar deterministicamente se ela existe) — não promete eliminação matemática do `LOSS_OF_EPISTEMIC_STATUS`. Isso deve ser comunicado com a mesma transparência usada em todas as sessões anteriores desta fase.

---

## Classificação final

**`FASE15_BUG_005B_DESIGN_READY`**

A recomendação técnica (Opção A, granularidade por cenário, sem `RequirementCatalog` nem agente novo nesta fase, com o Reviewer passando a receber o `regraDeNegocio` bruto para checagem determinística de existência de fonte) está suficientemente detalhada para decisão de implementação, com comparativo de alternativas, exemplos classificados e validados contra os casos residuais reais, modelo conceitual de dados, e mapa de impacto por camada — sem necessidade de nova investigação antes de uma eventual aprovação.

**Nenhum arquivo foi alterado nesta sessão. Nenhum comando Git de escrita foi executado.**

---

**Status da fase:** EM ANDAMENTO. `FASE15-BUG-001`, `FASE15-BUG-002`, `FASE15-BUG-003`, `FASE15-BUG-003A` e `FASE15-BUG-006` corrigidos e validados (`FIXED`). `FASE15-BUG-005`/`005A` `REQUIRES_FIX` (melhoria substancial implementada, 2 casos residuais conhecidos). `FASE15-BUG-005B` (rastreabilidade) com desenho técnico pronto para aprovação, nada implementado. `FASE15-BUG-007` (candidato — defeito de fronteira do parser no campo Status) registrado para investigação futura separada. Parando aqui conforme a condição de stop da autorização — não avançando para implementação, Jira, Chat IA, Auto QA, nem limpeza de dados.
