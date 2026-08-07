import { AutoQaWorkflowStatus } from './auto-qa-enums.model';
import { AqbBadgeTone } from '../shared/ui/badge/aqb-badge.component';

/**
 * Estados de encerramento exibidos ao usuário (Fase 12.3.6). O backend não
 * expõe esses 5 valores diretamente — eles agrupam os 8
 * AutoQaWorkflowStatus reais em uma visão de UI mais simples: os três
 * WAITING_*_APPROVAL (aguardando aprovação humana) viram BLOCKED; CREATED e
 * RUNNING viram IN_PROGRESS. Nenhum enum novo é inventado no backend — isso
 * é só uma categorização local de apresentação.
 *
 * ExecutionUiStatus é exclusivamente uma abstração de apresentação. Não
 * representa um status de domínio do backend e não deve ser serializado,
 * enviado à API ou utilizado para determinar transições/permissões. É
 * derivado de AutoQaWorkflowStatus (via resolveExecutionUiStatus) somente
 * para fins de apresentação — em especial, BLOCKED aqui não é um estado de
 * domínio novo: é só o agrupamento visual dos três WAITING_*_APPROVAL,
 * usado para comunicar "aguardando aprovação humana", nunca "falha técnica"
 * ou qualquer outra regra de negócio.
 */
export type ExecutionUiStatus = 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'BLOCKED' | 'IN_PROGRESS';

export type ExecutionUiStatusIcon = 'check-circle' | 'x-circle' | 'ban' | 'lock' | 'loader';

export interface ExecutionUiStatusMetadata {
  status: ExecutionUiStatus;
  label: string;
  description: string;
  tone: AqbBadgeTone;
  icon: ExecutionUiStatusIcon;
}

const WORKFLOW_STATUS_TO_UI_STATUS: Record<AutoQaWorkflowStatus, ExecutionUiStatus> = {
  CREATED: 'IN_PROGRESS',
  RUNNING: 'IN_PROGRESS',
  WAITING_GENERATION_APPROVAL: 'BLOCKED',
  WAITING_APPLY_APPROVAL: 'BLOCKED',
  WAITING_EXECUTION_APPROVAL: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
};

export const EXECUTION_UI_STATUS_CATALOG: Record<ExecutionUiStatus, ExecutionUiStatusMetadata> = {
  COMPLETED: {
    status: 'COMPLETED',
    label: 'Concluída',
    description: 'A execução terminou com sucesso.',
    tone: 'success',
    icon: 'check-circle',
  },
  FAILED: {
    status: 'FAILED',
    label: 'Falhou',
    description: 'A execução terminou com falhas funcionais.',
    tone: 'danger',
    icon: 'x-circle',
  },
  CANCELLED: {
    status: 'CANCELLED',
    label: 'Cancelada',
    description: 'A execução foi cancelada pelo usuário.',
    tone: 'neutral',
    icon: 'ban',
  },
  BLOCKED: {
    status: 'BLOCKED',
    label: 'Interrompida',
    description: 'A execução está aguardando uma aprovação para continuar.',
    tone: 'warning',
    icon: 'lock',
  },
  IN_PROGRESS: {
    status: 'IN_PROGRESS',
    label: 'Em andamento',
    description: 'A execução ainda está em andamento.',
    tone: 'neutral',
    icon: 'loader',
  },
};

export function resolveExecutionUiStatus(status: AutoQaWorkflowStatus): ExecutionUiStatus {
  return WORKFLOW_STATUS_TO_UI_STATUS[status];
}

export function getExecutionUiStatusMetadata(status: AutoQaWorkflowStatus): ExecutionUiStatusMetadata {
  return EXECUTION_UI_STATUS_CATALOG[resolveExecutionUiStatus(status)];
}
