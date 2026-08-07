import { InspectionResourceId } from './inspection-resource-availability.model';
import { resolveInspectionResourceAvailability } from '../shared/utils/resolve-inspection-resource-availability';

/**
 * Catálogo visual central dos recursos de inspeção (Fase 12.3.7). Cada
 * entrada é só metadata de apresentação (label/description/icon/mensagens)
 * — nunca contém endpoint, WorkflowStatus/currentStage necessário, regra de
 * autorização, regra de transição ou regra de availableActions. A
 * disponibilidade de cada recurso vem exclusivamente do resolver
 * (resolveInspectionResourceAvailability), nunca duplicada aqui.
 */
export interface AutoQaInspectionResourceMetadata {
  id: InspectionResourceId;
  label: string;
  description: string;
  icon: string;
  availability: ReturnType<typeof resolveInspectionResourceAvailability>;
  emptyMessage?: string;
  unavailableMessage?: string;
}

export const AUTO_QA_INSPECTION_RESOURCE_CATALOG: Record<InspectionResourceId, AutoQaInspectionResourceMetadata> = {
  HISTORY: {
    id: 'HISTORY',
    label: 'Histórico',
    description: 'Execuções anteriores do Auto QA BMAD.',
    icon: 'clipboard-list',
    availability: resolveInspectionResourceAvailability('HISTORY'),
  },
  GENERATED_FILES: {
    id: 'GENERATED_FILES',
    label: 'Artefatos',
    description: 'Arquivos gerados pela automação.',
    icon: 'file-text',
    availability: resolveInspectionResourceAvailability('GENERATED_FILES'),
    unavailableMessage: 'Os detalhes dos arquivos gerados não estão disponíveis no contrato público atual.',
  },
  PREVIEW: {
    id: 'PREVIEW',
    label: 'Preview',
    description: 'Conteúdo dos arquivos gerados.',
    icon: 'eye',
    availability: resolveInspectionResourceAvailability('PREVIEW'),
    unavailableMessage: 'A pré-visualização de arquivos não está disponível no contrato público atual.',
  },
  DIFF: {
    id: 'DIFF',
    label: 'Diff',
    description: 'Comparação entre o conteúdo anterior e o conteúdo gerado.',
    icon: 'code',
    availability: resolveInspectionResourceAvailability('DIFF'),
    unavailableMessage: 'Diff não disponível no contrato público atual.',
  },
  LOGS: {
    id: 'LOGS',
    label: 'Logs',
    description: 'Saída detalhada da execução dos testes.',
    icon: 'file-check',
    availability: resolveInspectionResourceAvailability('LOGS'),
    unavailableMessage: 'Logs detalhados da execução não são expostos pela API atual.',
  },
  LEARNING: {
    id: 'LEARNING',
    label: 'Aprendizado',
    description: 'Registro de aprendizado da execução.',
    icon: 'graduation-cap',
    availability: resolveInspectionResourceAvailability('LEARNING'),
    emptyMessage:
      'Apenas informações gerais desta etapa estão disponíveis; detalhes específicos da execução não são públicos.',
  },
  RETRY: {
    id: 'RETRY',
    label: 'Tentar novamente',
    description: 'Nova tentativa automática da execução.',
    icon: 'play',
    availability: resolveInspectionResourceAvailability('RETRY'),
    unavailableMessage: 'Tentar novamente ainda não é suportado pelo contrato público atual.',
  },
};
