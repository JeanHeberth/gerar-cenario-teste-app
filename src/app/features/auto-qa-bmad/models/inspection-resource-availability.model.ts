/**
 * Estado exclusivamente visual do frontend (Fase 12.3.7).
 *
 * Não representa um status de domínio do backend e não deve ser
 * serializado, enviado à API ou utilizado para determinar
 * transições/permissões. É derivado localmente (via
 * resolveInspectionResourceAvailability) somente para decidir o que a
 * interface consegue apresentar para cada recurso de inspeção — nunca se o
 * usuário pode executar uma ação (isso continua sendo definido
 * exclusivamente por AutoQaExecutionResponse.availableActions).
 *
 * - SUPPORTED: existe contrato público real permitindo funcionalidade real.
 * - PARTIAL: existe apenas metadata/informação resumida (sem detalhe real
 *   da execução).
 * - UNAVAILABLE: o contrato público atual não fornece conteúdo algum.
 */
export type InspectionResourceAvailability = 'SUPPORTED' | 'PARTIAL' | 'UNAVAILABLE';

/**
 * Identificadores dos recursos de inspeção conhecidos pelo frontend. Não é
 * um enum do backend — é só a chave usada pelo resolver/catálogo locais.
 */
export type InspectionResourceId =
  | 'HISTORY'
  | 'GENERATED_FILES'
  | 'PREVIEW'
  | 'DIFF'
  | 'LOGS'
  | 'LEARNING'
  | 'RETRY';
