import { AUTO_QA_ACTION_LABELS, getActionLabel } from './auto-qa-action-catalog';
import { AutoQaAvailableAction } from './auto-qa-enums.model';

describe('auto-qa-action-catalog', () => {
  const ALL_ACTIONS: AutoQaAvailableAction[] = [
    'START',
    'CONTINUE',
    'GENERATE',
    'APPROVE_FILE_UPDATE',
    'APPLY',
    'APPROVE_EXECUTION',
    'EXECUTE',
    'CANCEL',
    'RETRY',
    'VIEW_GENERATED_FILES',
    'VIEW_DIFF',
    'VIEW_LOGS',
    'VIEW_LEARNING',
    'NONE',
  ];

  it('possui label não vazio para todas as 14 ações do backend', () => {
    for (const action of ALL_ACTIONS) {
      expect(AUTO_QA_ACTION_LABELS[action]).toBeTruthy();
    }
  });

  describe('getActionLabel', () => {
    it('retorna o label correspondente à ação', () => {
      expect(getActionLabel('APPLY')).toBe(AUTO_QA_ACTION_LABELS.APPLY);
      expect(getActionLabel('EXECUTE')).toBe(AUTO_QA_ACTION_LABELS.EXECUTE);
    });
  });
});
