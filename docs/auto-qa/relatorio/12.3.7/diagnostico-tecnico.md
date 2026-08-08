# Diagnóstico técnico — Fase 12.3.7 (Histórico, Artefatos e Experiência de Inspeção)

**Data:** 2026-08-07
**Escopo:** somente leitura — nenhum código foi escrito, nenhum arquivo alterado.
**Autorização vigente:** apenas o diagnóstico técnico inicial. Implementação aguarda nova aprovação explícita.

## 1. Dados disponíveis para Histórico

`AutoQaExecutionService.list(page, size)` → `GET /api/auto-qa/executions?page=&size=`, retornando `AutoQaExecutionListResponse { items: AutoQaExecutionResponse[], page, size, totalElements }`. Cada item já traz `executionId, scenario, status, currentStage, attempt, progress, warnings[], errors[], updatedAt`, etc. `ExecutionCardComponent` já renderiza cenário, status, etapa, progresso, tentativa, última atualização e contagem de warnings/errors. `ExecutionListPageComponent` já tem loading, empty state, error state (`role="alert"`) e paginação Anterior/Próxima. Não existe parâmetro de ordenação em `list()` (só `page`/`size`) — nada no contrato garante ou documenta ordenação.

## 2. Dados disponíveis para Generated Files

Nenhum. `AutoQaExecutionResponse` não tem nenhum campo de arquivos gerados (nome, relativePath, operação, status, hash). `AutoQaExecutionService` não tem nenhum método de listagem/consulta de arquivos. Só existe o enum `VIEW_GENERATED_FILES` em `AutoQaAvailableAction`.

## 3. Dados disponíveis para Preview

Nenhum. Depende de Generated Files, que já é inexistente. Nenhum campo de conteúdo de arquivo em nenhum DTO.

## 4. Dados disponíveis para Diff

Nenhum. Nenhum campo de conteúdo anterior/posterior ou diff pronto. Só existe o enum `VIEW_DIFF`.

## 5. Dados disponíveis para Logs

Nenhum. Nenhum campo de log/stdout/stderr em `AutoQaExecutionResponse`. `warnings`/`errors` são estruturas próprias (`code + description`/`message`), não logs. Só existe o enum `VIEW_LOGS`.

## 6. Comportamento atual de VIEW_GENERATED_FILES

Não está em `FUNCTIONAL_ACTIONS` do `ActionBarComponent`. Quando presente em `availableActions`, o botão renderiza desabilitado com o hint genérico "Disponível em uma próxima etapa." Nenhuma navegação ou painel reage a essa ação hoje.

## 7. Comportamento atual de VIEW_DIFF

Idêntico ao item 6: desabilitado, hint genérico, sem handler na página.

## 8. Comportamento atual de VIEW_LOGS

Idêntico ao item 6: desabilitado, hint genérico, sem handler na página.

## 9. Comportamento atual de VIEW_LEARNING

Idêntico ao item 6. O stage `LEARNING` já existe no catálogo estático (`AUTO_QA_STAGE_CATALOG`) e é exibido normalmente por `StageTimeline`/`WorkflowOverview`/`StageDetailPanel` quando alcançado — mas só com texto fixo do catálogo (título, descrição, mensagens por estado), nunca com um `LearningResult` real da execução.

## 10. Comportamento atual de RETRY

Idêntico ao item 6. Não existe método `retry()` em `AutoQaExecutionService` nem endpoint conhecido.

## 11. Classificação SUPPORTED / PARTIAL / UNAVAILABLE

| Recurso | Classificação | Motivo |
|---|---|---|
| HISTORY | **SUPPORTED** | `GET /executions` real, paginado, com todos os campos necessários já consumidos por `ExecutionCard`. |
| GENERATED_FILES | **UNAVAILABLE** | Nenhum DTO/endpoint expõe arquivos gerados. |
| PREVIEW | **UNAVAILABLE** | Depende de Generated Files, inexistente. |
| DIFF | **UNAVAILABLE** | Nenhum conteúdo anterior/posterior ou diff pronto exposto. |
| LOGS | **UNAVAILABLE** | Nenhum campo de log exposto; warnings/errors não substituem logs. |
| LEARNING | **PARTIAL** | Só existe metadata estática do catálogo de etapas (mesmo texto para qualquer execução) — nenhum `LearningResult` real. |
| RETRY | **UNAVAILABLE** | Enum existe, sem método de service/endpoint correspondente. |

## 12. Componentes realmente implementáveis

- Evolução da `ExecutionListPage` como histórico (título mais claro, retry manual reaproveitando `loadList()`, e — a confirmar na aprovação — filtro visual local por status, deixando explícito que atua só sobre a página carregada).
- `ExecutionInspectionPanelComponent` com navegação em abas (Resumo/Artefatos/Diff/Logs), semântica `role="tablist"/"tab"/"tabpanel"`.
- Aba "Resumo": reaproveita `ExecutionResultSummaryComponent` já existente (Fase 12.3.6) — nenhum dado novo.
- Abas "Artefatos"/"Diff"/"Logs": cada uma mostra `AqbEmptyStateComponent` (reuso, sem componente novo) com mensagem específica de indisponibilidade vinda de um catálogo visual estático.
- Função pura `resolveInspectionResourceAvailability()` — determinística, sem HTTP, retorna a classificação da tabela acima.
- Navegação: `VIEW_GENERATED_FILES`/`VIEW_DIFF`/`VIEW_LOGS`/`VIEW_LEARNING`, quando presentes em `availableActions`, passam a selecionar a aba correspondente na página (estado de UI local), sem nenhuma chamada HTTP nova.

## 13. Componentes bloqueados pelo contrato

`ArtifactViewerComponent`, `DiffViewerComponent`, `LogViewerComponent` — **não serão criados** nesta fase, pois não há conteúdo real para alimentá-los (regra explícita do documento: não criar componente alimentado por mock). `RETRY` funcional na `ActionBar` também fica bloqueado.

## 14. Arquivos que seriam criados (proposta, aguardando aprovação)

- `models/inspection-resource-availability.model.ts` (tipo `InspectionResourceAvailability` + `AUTO_QA_INSPECTION_RESOURCE_CATALOG`, só apresentação)
- `shared/utils/resolve-inspection-resource-availability.ts` (função pura)
- `components/execution-inspection-panel/execution-inspection-panel.component.{ts,html,scss,spec.ts}`
- specs correspondentes ao catálogo e ao resolver

## 15. Arquivos que seriam alterados

- `pages/execution-list-page/execution-list-page.component.{ts,html}` (histórico: título, retry manual, filtro local se aprovado)
- `pages/execution-detail-page/execution-detail-page.component.{ts,html,spec.ts}` (integra `ExecutionInspectionPanelComponent`; roteia `VIEW_GENERATED_FILES`/`VIEW_DIFF`/`VIEW_LOGS`/`VIEW_LEARNING` para a aba correspondente)
- `components/action-bar/*` — provavelmente **sem alteração de comportamento** (continua desabilitando ações não funcionais); a decidir na aprovação se o hint genérico muda de texto para esses casos específicos.

## 16. Estratégia de histórico

Evoluir a `ExecutionListPage` já existente (sem duplicar `ExecutionCard`), reforçando que já é funcionalmente um histórico real: paginação real, contagem de warnings/errors, status. Ajustes possíveis: renomear para linguagem neutra ("Histórico de execuções", nunca "Mais recentes" sem evidência de ordenação), adicionar retry manual no error state, e — só se não gerar ambiguidade — filtro puramente local (client-side) por status, rotulado como aplicando-se apenas à página carregada.

## 17. Estratégia do Inspection Panel

Um componente de abas dentro de `ExecutionDetailPage`, abaixo de `ExecutionResultSummary`, que **não busca dado novo** — apenas decide o que mostrar em cada aba com base na classificação estática SUPPORTED/PARTIAL/UNAVAILABLE. Resumo reaproveita o que já existe; as demais abas são estados de indisponibilidade controlada.

## 18. Estratégia de indisponibilidade controlada

Catálogo visual estático (`AUTO_QA_INSPECTION_RESOURCE_CATALOG`) com `unavailableMessage` por recurso, renderizado via `AqbEmptyStateComponent` reutilizado — nunca mock, nunca terminal falso, nunca linhas de log inventadas.

## 19. Testes planejados

Resolver de disponibilidade (determinismo, cobertura dos 7 recursos, não mutação); Inspection Panel (renderização das 4 abas, `aria-selected`, navegação por teclado, painel correto por aba, mensagens de indisponibilidade corretas, resumo delega para `ExecutionResultSummary`); integração `VIEW_GENERATED_FILES`/`VIEW_DIFF`/`VIEW_LOGS` via `ActionBar` → seleção de aba, sem HTTP; ajustes de histórico (retry manual, filtro local se aprovado).

## 20. Quantidade estimada

**30 a 45 testes novos** — menor que a estimativa inicial do documento (40–65), porque quase todos os recursos de inspeção estão `UNAVAILABLE`, então não há Viewers reais para testar, apenas navegação e estados controlados.

## 21. Riscos

- Confundir o usuário se "Diff"/"Logs" parecerem quebrados em vez de claramente não suportados — mitigado com mensagens explícitas por recurso.
- Sobreposição de responsabilidade entre `ExecutionInspectionPanelComponent` (aba Resumo) e `ExecutionResultSummaryComponent`/`StageDetailPanel` já existentes, se o escopo de cada um não ficar bem delimitado antes de implementar.
- Filtro local de histórico ser interpretado como filtro de servidor — mitigado com rótulo explícito, ou simplesmente não implementado.

## 22. Limitações

Sem evidência de ordenação do backend — não é possível afirmar "mais recentes primeiro"; será usada linguagem neutra. `LEARNING` continua exibindo apenas texto fixo de catálogo, nunca dado real da execução.

## 23. Dívidas técnicas

Mantidas as da Fase 12.3.6 (ApplyOperation/ExecutionCommandId sem indicação de quais são específicos da execução; Failure/Learning detalhados não públicos; hardening de acessibilidade do `AqbModalComponent`; responsividade sem validação visual manual). **Novas, registradas nesta fase**: `GENERATED_FILES`, `PREVIEW`, `DIFF`, `LOGS` e `RETRY` não têm contrato público — gap para eventual fase própria de evolução de contrato backend, fora de escopo agora.

## 24. Confirmação de que nenhum arquivo foi alterado

Confirmado — esta resposta é resultado exclusivo de leitura dos arquivos listados na seção 3 do documento de aprovação. Nenhuma escrita foi executada.

## 25. Confirmação de que o backend não será alterado

Confirmado — nenhum arquivo Java, controller, DTO, mapper, repository, workflow, agent, service backend, endpoint, `application.yml`, CORS ou exception handler foi tocado ou será tocado nesta fase.

## 26. Confirmação de que aguardará nova aprovação antes de implementar

Confirmado — nenhum teste RED e nenhum componente será criado até aprovação explícita deste diagnóstico. Fase 12.3.8 não foi iniciada.
