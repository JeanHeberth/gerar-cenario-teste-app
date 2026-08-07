import { AutoQaExecutionResponse } from '../../models/auto-qa-execution.model';
import { AutoQaStageId } from '../../models/auto-qa-stage-catalog';
import { StageVisualState } from '../../models/stage-visual-state.model';
import { getStageMetadata } from '../../models/auto-qa-stage-catalog';

/**
 * Função pura — sem chamada HTTP, sem side effect, sem acesso ao state
 * service, sem mutação, resultado determinístico. Usa exclusivamente
 * status/currentStage/lastStageCompleted do AutoQaExecutionResponse; nunca
 * infere conclusão pela posição ou pelo progress.
 */
export function resolveStageVisualState(
  execution: AutoQaExecutionResponse | null,
  stage: AutoQaStageId
): StageVisualState {
  if (!execution) {
    return 'PENDING';
  }

  const stageOrder = getStageMetadata(stage).order;
  const lastCompletedOrder = execution.lastStageCompleted ? getStageMetadata(execution.lastStageCompleted).order : -1;
  const currentOrder = execution.currentStage ? getStageMetadata(execution.currentStage).order : -1;

  if (stageOrder <= lastCompletedOrder) {
    return 'COMPLETED';
  }

  if (stageOrder === currentOrder) {
    if (execution.status === 'FAILED') {
      return 'FAILED';
    }
    if (execution.status === 'CANCELLED') {
      return 'CANCELLED';
    }
    return 'CURRENT';
  }

  const isTerminalFailure = execution.status === 'FAILED' || execution.status === 'CANCELLED';
  if (isTerminalFailure && stageOrder > currentOrder) {
    return 'BLOCKED';
  }

  return 'PENDING';
}
