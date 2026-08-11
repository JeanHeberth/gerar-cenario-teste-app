import { AutoQaWorkflowStatus } from './auto-qa-enums.model';
import { AqbBadgeTone } from '../../../shared/ui/badge/aqb-badge.component';

/**
 * Fonte única de label/tone/descrição por AutoQaWorkflowStatus. Nenhum
 * componente deve espalhar cor ou texto de status por conta própria.
 */
export interface AutoQaStatusMetadata {
  label: string;
  tone: AqbBadgeTone;
  description: string;
}

export const AUTO_QA_STATUS_METADATA: Record<AutoQaWorkflowStatus, AutoQaStatusMetadata> = {
  CREATED: {
    label: 'Criada',
    tone: 'neutral',
    description: 'Execução criada, aguardando início.',
  },
  RUNNING: {
    label: 'Em execução',
    tone: 'neutral',
    description: 'O workflow está em andamento.',
  },
  WAITING_GENERATION_APPROVAL: {
    label: 'Aguardando aprovação de geração',
    tone: 'warning',
    description: 'Aguardando aprovação para gerar o código.',
  },
  WAITING_APPLY_APPROVAL: {
    label: 'Aguardando aprovação de aplicação',
    tone: 'warning',
    description: 'Aguardando aprovação para aplicar os arquivos gerados.',
  },
  WAITING_EXECUTION_APPROVAL: {
    label: 'Aguardando aprovação de execução',
    tone: 'warning',
    description: 'Aguardando aprovação para executar os testes.',
  },
  COMPLETED: {
    label: 'Concluída',
    tone: 'success',
    description: 'Execução concluída com sucesso.',
  },
  FAILED: {
    label: 'Falhou',
    tone: 'danger',
    description: 'A execução falhou.',
  },
  CANCELLED: {
    label: 'Cancelada',
    tone: 'neutral',
    description: 'Execução cancelada pelo usuário.',
  },
};

export function getStatusMetadata(status: AutoQaWorkflowStatus): AutoQaStatusMetadata {
  return AUTO_QA_STATUS_METADATA[status];
}
