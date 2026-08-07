/**
 * Espelha 1:1 os DTOs de
 * com.br.criarcenariotestes.business.autoqa.executionapi.dto.* e
 * com.br.criarcenariotestes.business.dto.ErrorResponse. Campos e nomes
 * idênticos ao backend — nenhum tipo inventado aqui.
 */
import type { AutoQaAvailableAction, AutoQaStage, AutoQaWorkflowStatus } from './auto-qa-enums.model';

export interface AutoQaPublicWarning {
  code: string;
  description: string;
  blocking: boolean;
}

export interface AutoQaPublicError {
  code: string;
  message: string;
}

export interface AutoQaExecutionResponse {
  executionId: string;
  scenario: string;
  status: AutoQaWorkflowStatus;
  currentStage: AutoQaStage | null;
  lastStageStarted: AutoQaStage | null;
  lastStageCompleted: AutoQaStage | null;
  attempt: number;
  progress: number;
  availableActions: AutoQaAvailableAction[];
  warnings: AutoQaPublicWarning[];
  errors: AutoQaPublicError[];
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface AutoQaExecutionListResponse {
  items: AutoQaExecutionResponse[];
  page: number;
  size: number;
  totalElements: number;
}

export interface AutoQaCreateExecutionRequest {
  scenario: string;
  projectPath: string;
}

export type ApplyOperation = 'CREATE' | 'UPDATE' | 'REUSE' | 'NONE';

export interface AutoQaApplyApprovalRequest {
  approvedBy: string;
  authorizedOperations: ApplyOperation[];
  allowFileUpdate: boolean;
  allowWarnings: boolean;
}

export type ExecutionCommandId =
  | 'NPM_TEST'
  | 'NPM_TEST_E2E'
  | 'PLAYWRIGHT_TEST'
  | 'CYPRESS_RUN'
  | 'CYPRESS_SCRIPT_RUN'
  | 'GRADLE_WRAPPER_TEST'
  | 'GRADLE_WRAPPER_CLEAN_TEST'
  | 'MAVEN_WRAPPER_TEST'
  | 'MAVEN_TEST'
  | 'ROBOT_TEST'
  | 'PYTEST';

export interface AutoQaExecutionApprovalRequest {
  approvedBy: string;
  allowedCommands: ExecutionCommandId[];
  allowTestExecution: boolean;
  allowInstallCommand: boolean;
  allowBuildCommand: boolean;
}

export interface AutoQaCancelRequest {
  reason?: string;
}

export interface AutoQaErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
}
