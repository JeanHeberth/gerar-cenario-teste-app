import { AutoQaStageId, getStageMetadata } from '../../models/auto-qa-stage-catalog';

/**
 * Função pura — deriva a quantidade de etapas executadas a partir de
 * lastStageCompleted usando a ordem já publicada no catálogo estático de
 * etapas (mesma fonte usada por StageTimeline/WorkflowOverview). Não é uma
 * métrica inventada: é a contagem de etapas do catálogo até a última
 * concluída, dado já presente no DTO público.
 */
export function resolveExecutedStageCount(lastStageCompleted: AutoQaStageId | null): number {
  if (!lastStageCompleted) {
    return 0;
  }
  return getStageMetadata(lastStageCompleted).order + 1;
}
