import { AUTO_QA_STATUS_METADATA, getStatusMetadata } from './auto-qa-status-catalog';

describe('AUTO_QA_STATUS_METADATA', () => {
  const ALL_STATUSES = [
    'CREATED',
    'RUNNING',
    'WAITING_GENERATION_APPROVAL',
    'WAITING_APPLY_APPROVAL',
    'WAITING_EXECUTION_APPROVAL',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ] as const;

  it('possui exatamente os 8 status do backend (AutoQaWorkflowStatus)', () => {
    expect(Object.keys(AUTO_QA_STATUS_METADATA).sort()).toEqual([...ALL_STATUSES].sort());
  });

  it('cada status possui label, tone e description não vazios', () => {
    for (const status of ALL_STATUSES) {
      const metadata = AUTO_QA_STATUS_METADATA[status];
      expect(metadata.label).toBeTruthy();
      expect(metadata.tone).toBeTruthy();
      expect(metadata.description).toBeTruthy();
    }
  });

  it('usa tone "success" para COMPLETED e "danger" para FAILED', () => {
    expect(AUTO_QA_STATUS_METADATA.COMPLETED.tone).toBe('success');
    expect(AUTO_QA_STATUS_METADATA.FAILED.tone).toBe('danger');
  });

  describe('getStatusMetadata', () => {
    it('retorna os metadados corretos para um status conhecido', () => {
      expect(getStatusMetadata('RUNNING').label).toBe(AUTO_QA_STATUS_METADATA.RUNNING.label);
    });
  });
});
