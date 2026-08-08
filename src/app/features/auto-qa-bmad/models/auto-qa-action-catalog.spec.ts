import { AUTO_QA_ACTION_LABELS, getActionLabel, getActionVisualKind } from './auto-qa-action-catalog';
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

  describe('getActionVisualKind', () => {
    it('classifica START/CONTINUE/GENERATE/APPLY/EXECUTE como "primary"', () => {
      expect(getActionVisualKind('START')).toBe('primary');
      expect(getActionVisualKind('CONTINUE')).toBe('primary');
      expect(getActionVisualKind('GENERATE')).toBe('primary');
      expect(getActionVisualKind('APPLY')).toBe('primary');
      expect(getActionVisualKind('EXECUTE')).toBe('primary');
    });

    it('classifica APPROVE_FILE_UPDATE/APPROVE_EXECUTION como "approval"', () => {
      expect(getActionVisualKind('APPROVE_FILE_UPDATE')).toBe('approval');
      expect(getActionVisualKind('APPROVE_EXECUTION')).toBe('approval');
    });

    it('classifica CANCEL como "destructive"', () => {
      expect(getActionVisualKind('CANCEL')).toBe('destructive');
    });

    it('classifica VIEW_GENERATED_FILES/VIEW_DIFF/VIEW_LOGS/VIEW_LEARNING como "inspection"', () => {
      expect(getActionVisualKind('VIEW_GENERATED_FILES')).toBe('inspection');
      expect(getActionVisualKind('VIEW_DIFF')).toBe('inspection');
      expect(getActionVisualKind('VIEW_LOGS')).toBe('inspection');
      expect(getActionVisualKind('VIEW_LEARNING')).toBe('inspection');
    });

    it('classifica RETRY/NONE como "neutral"', () => {
      expect(getActionVisualKind('RETRY')).toBe('neutral');
      expect(getActionVisualKind('NONE')).toBe('neutral');
    });

    it('possui uma classificação para todas as 14 ações, sem lançar erro', () => {
      for (const action of ALL_ACTIONS) {
        expect(() => getActionVisualKind(action)).not.toThrow();
      }
    });
  });
});
