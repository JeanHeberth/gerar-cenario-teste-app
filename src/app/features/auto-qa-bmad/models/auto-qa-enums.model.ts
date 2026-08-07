/**
 * Espelha 1:1 os enums de
 * com.br.criarcenariotestes.business.autoqa.executionapi.model.*.
 * Nomes idênticos aos do backend, de propósito, para grep cruzado.
 */
import type { AutoQaStageId } from './auto-qa-stage-catalog';

export type AutoQaStage = AutoQaStageId;

export type AutoQaWorkflowStatus =
  | 'CREATED'
  | 'RUNNING'
  | 'WAITING_GENERATION_APPROVAL'
  | 'WAITING_APPLY_APPROVAL'
  | 'WAITING_EXECUTION_APPROVAL'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type AutoQaAvailableAction =
  | 'START'
  | 'CONTINUE'
  | 'GENERATE'
  | 'APPROVE_FILE_UPDATE'
  | 'APPLY'
  | 'APPROVE_EXECUTION'
  | 'EXECUTE'
  | 'CANCEL'
  | 'RETRY'
  | 'VIEW_GENERATED_FILES'
  | 'VIEW_DIFF'
  | 'VIEW_LOGS'
  | 'VIEW_LEARNING'
  | 'NONE';
