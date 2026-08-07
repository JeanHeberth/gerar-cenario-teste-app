import { AutoQaStageMetadata } from '../../models/auto-qa-stage-catalog';
import { StageVisualState } from '../../models/stage-visual-state.model';

/**
 * Função pura — escolhe a mensagem certa do catálogo conforme o estado
 * visual da etapa. Evita duplicar texto condicional em cada template.
 */
export function resolveStageMessage(metadata: AutoQaStageMetadata, state: StageVisualState): string {
  switch (state) {
    case 'CURRENT':
      return metadata.loadingMessage;
    case 'COMPLETED':
      return metadata.successMessage;
    case 'FAILED':
      return metadata.errorMessage;
    case 'PENDING':
      return metadata.pendingMessage;
    case 'CANCELLED':
      return metadata.cancelledMessage;
    case 'BLOCKED':
      return metadata.blockedMessage;
  }
}
