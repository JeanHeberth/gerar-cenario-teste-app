import { AutoQaWorkflowStatus } from '../../models/auto-qa-enums.model';
import { resolveExecutionUiStatus } from '../../models/execution-ui-status-catalog';

/**
 * Função pura — mensagem de encerramento baseada exclusivamente em
 * WorkflowStatus. Nunca usa FailureAnalysisResult nem LearningResult (fora
 * de escopo desta fase) e nunca inventa explicações técnicas.
 */
export function resolveExecutionFinalMessage(status: AutoQaWorkflowStatus): string {
  switch (resolveExecutionUiStatus(status)) {
    case 'COMPLETED':
      return 'Execução concluída.';
    case 'FAILED':
      return 'Execução finalizada com falhas funcionais.';
    case 'CANCELLED':
      return 'Execução cancelada.';
    case 'WAITING':
      return 'Execução aguardando aprovação.';
    case 'IN_PROGRESS':
      return 'Execução em andamento.';
  }
}
