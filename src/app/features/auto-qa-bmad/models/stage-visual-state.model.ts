/**
 * Estados visuais possíveis de uma etapa na Timeline/WorkflowOverview.
 * Puramente derivado de dados reais do backend (ver resolveStageVisualState)
 * — nunca uma segunda máquina de estados independente do que o backend
 * retorna em status/currentStage/lastStageCompleted.
 */
export type StageVisualState = 'COMPLETED' | 'CURRENT' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'BLOCKED';
