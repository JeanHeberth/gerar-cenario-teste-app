import {
  EXECUTION_UI_STATUS_CATALOG,
  getExecutionUiStatusMetadata,
  resolveExecutionUiStatus,
} from './execution-ui-status-catalog';
import { AutoQaWorkflowStatus } from './auto-qa-enums.model';

describe('execution-ui-status-catalog', () => {
  const ALL_WORKFLOW_STATUSES: AutoQaWorkflowStatus[] = [
    'CREATED',
    'RUNNING',
    'WAITING_GENERATION_APPROVAL',
    'WAITING_APPLY_APPROVAL',
    'WAITING_EXECUTION_APPROVAL',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ];

  describe('resolveExecutionUiStatus', () => {
    it('mapeia COMPLETED/FAILED/CANCELLED diretamente', () => {
      expect(resolveExecutionUiStatus('COMPLETED')).toBe('COMPLETED');
      expect(resolveExecutionUiStatus('FAILED')).toBe('FAILED');
      expect(resolveExecutionUiStatus('CANCELLED')).toBe('CANCELLED');
    });

    it('mapeia CREATED e RUNNING para IN_PROGRESS', () => {
      expect(resolveExecutionUiStatus('CREATED')).toBe('IN_PROGRESS');
      expect(resolveExecutionUiStatus('RUNNING')).toBe('IN_PROGRESS');
    });

    it('mapeia os três estados de espera de aprovação para BLOCKED', () => {
      expect(resolveExecutionUiStatus('WAITING_GENERATION_APPROVAL')).toBe('BLOCKED');
      expect(resolveExecutionUiStatus('WAITING_APPLY_APPROVAL')).toBe('BLOCKED');
      expect(resolveExecutionUiStatus('WAITING_EXECUTION_APPROVAL')).toBe('BLOCKED');
    });

    it('cobre todos os 8 status do backend sem lançar erro', () => {
      for (const status of ALL_WORKFLOW_STATUSES) {
        expect(() => resolveExecutionUiStatus(status)).not.toThrow();
      }
    });
  });

  describe('EXECUTION_UI_STATUS_CATALOG', () => {
    it('possui exatamente os 5 estados de UI exigidos', () => {
      expect(Object.keys(EXECUTION_UI_STATUS_CATALOG).sort()).toEqual(
        ['BLOCKED', 'CANCELLED', 'COMPLETED', 'FAILED', 'IN_PROGRESS'].sort()
      );
    });

    it('cada entrada possui label, description, tone e icon não vazios', () => {
      for (const key of Object.keys(EXECUTION_UI_STATUS_CATALOG)) {
        const metadata = EXECUTION_UI_STATUS_CATALOG[key as keyof typeof EXECUTION_UI_STATUS_CATALOG];
        expect(metadata.label).toBeTruthy();
        expect(metadata.description).toBeTruthy();
        expect(metadata.tone).toBeTruthy();
        expect(metadata.icon).toBeTruthy();
      }
    });

    it('usa tone "success" para COMPLETED e "danger" para FAILED', () => {
      expect(EXECUTION_UI_STATUS_CATALOG.COMPLETED.tone).toBe('success');
      expect(EXECUTION_UI_STATUS_CATALOG.FAILED.tone).toBe('danger');
    });
  });

  describe('getExecutionUiStatusMetadata', () => {
    it('retorna os metadados corretos combinando o mapeamento e o catálogo', () => {
      expect(getExecutionUiStatusMetadata('RUNNING')).toBe(EXECUTION_UI_STATUS_CATALOG.IN_PROGRESS);
      expect(getExecutionUiStatusMetadata('WAITING_APPLY_APPROVAL')).toBe(EXECUTION_UI_STATUS_CATALOG.BLOCKED);
      expect(getExecutionUiStatusMetadata('COMPLETED')).toBe(EXECUTION_UI_STATUS_CATALOG.COMPLETED);
    });
  });
});
