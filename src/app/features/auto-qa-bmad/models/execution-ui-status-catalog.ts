import { AutoQaWorkflowStatus } from './auto-qa-enums.model';
import { AqbBadgeTone } from '../shared/ui/badge/aqb-badge.component';

/**
 * Estados de encerramento exibidos ao usuário (Fase 12.3.6, renomeado
 * BLOCKED→WAITING na Fase 12.3.8). O backend não expõe esses 5 valores
 * diretamente — eles agrupam os 8 AutoQaWorkflowStatus reais em uma visão
 * de UI mais simples: os três WAITING_*_APPROVAL (aguardando aprovação
 * humana) viram WAITING; CREATED e RUNNING viram IN_PROGRESS. Nenhum enum
 * novo é inventado no backend — isso é só uma categorização local de
 * apresentação.
 *
 * ExecutionUiStatus é exclusivamente uma abstração de apresentação. Não
 * representa um status de domínio do backend e não deve ser serializado,
 * enviado à API ou utilizado para determinar transições/permissões. É
 * derivado de AutoQaWorkflowStatus (via resolveExecutionUiStatus) somente
 * para fins de apresentação — em especial, WAITING aqui não é um estado de
 * domínio novo: é só o agrupamento visual dos três WAITING_*_APPROVAL,
 * usado para comunicar "aguardando aprovação humana", nunca "falha técnica"
 * ou "bloqueio operacional". Renomeado de BLOCKED nesta fase porque o nome
 * anterior soava como erro técnico para uma situação que é só espera por
 * decisão humana.
 */
export type ExecutionUiStatus = 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'WAITING' | 'IN_PROGRESS';

export type ExecutionUiStatusIcon = 'check-circle' | 'x-circle' | 'ban' | 'clock' | 'loader';

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
  WAITING_GENERATION_APPROVAL: 'WAITING',
  WAITING_APPLY_APPROVAL: 'WAITING',
  WAITING_EXECUTION_APPROVAL: 'WAITING',
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
  WAITING: {
    status: 'WAITING',
    label: 'Aguardando aprovação',
    description: 'A execução está aguardando aprovação humana para continuar.',
    tone: 'warning',
    icon: 'clock',
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
