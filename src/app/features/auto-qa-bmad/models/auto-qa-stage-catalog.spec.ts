import { AUTO_QA_STAGE_CATALOG, AUTO_QA_STAGE_IDS, getStageMetadata } from './auto-qa-stage-catalog';

// eslint-disable-next-line no-misleading-character-class
const EMOJI_PATTERN = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('AUTO_QA_STAGE_CATALOG', () => {
  it('possui exatamente as 10 etapas do backend (AutoQaStage), na mesma ordem', () => {
    expect(AUTO_QA_STAGE_IDS).toEqual([
      'DISCOVERY',
      'SCENARIO_ANALYSIS',
      'PROJECT_KNOWLEDGE',
      'PLANNING',
      'GENERATION',
      'REVIEW',
      'APPLY',
      'EXECUTION',
      'FAILURE_ANALYSIS',
      'LEARNING',
    ]);
    expect(AUTO_QA_STAGE_CATALOG.length).toBe(10);
  });

  it('cada etapa possui todos os metadados exigidos e não vazios', () => {
    for (const entry of AUTO_QA_STAGE_CATALOG) {
      expect(entry.stage).toBeTruthy();
      expect(entry.title).toBeTruthy();
      expect(entry.shortTitle).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.icon).toBeTruthy();
      expect(entry.visualTone).toBeTruthy();
      expect(entry.loadingMessage).toBeTruthy();
      expect(entry.successMessage).toBeTruthy();
      expect(entry.errorMessage).toBeTruthy();
      expect(entry.pendingMessage).toBeTruthy();
      expect(entry.cancelledMessage).toBeTruthy();
      expect(entry.blockedMessage).toBeTruthy();
      expect(entry.helpText).toBeTruthy();
      expect(entry.detailSections.length).toBeGreaterThan(0);
    }
  });

  it('a ordem (order) é determinística, sequencial e sem duplicidade', () => {
    const orders = AUTO_QA_STAGE_CATALOG.map((entry) => entry.order);
    expect(orders).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('não possui stage duplicado', () => {
    const stages = AUTO_QA_STAGE_CATALOG.map((entry) => entry.stage);
    expect(new Set(stages).size).toBe(stages.length);
  });

  it('nenhum texto (title, shortTitle, description, mensagens) contém emoji', () => {
    for (const entry of AUTO_QA_STAGE_CATALOG) {
      const texts = [
        entry.title,
        entry.shortTitle,
        entry.description,
        entry.loadingMessage,
        entry.successMessage,
        entry.errorMessage,
        entry.pendingMessage,
        entry.cancelledMessage,
        entry.blockedMessage,
        entry.helpText,
        ...entry.detailSections,
      ];
      for (const text of texts) {
        expect(EMOJI_PATTERN.test(text)).toBeFalse();
      }
    }
  });

  describe('getStageMetadata', () => {
    it('retorna os metadados corretos para uma etapa conhecida', () => {
      const metadata = getStageMetadata('GENERATION');
      expect(metadata.stage).toBe('GENERATION');
      expect(metadata.order).toBe(4);
    });

    it('lança erro para uma etapa desconhecida', () => {
      expect(() => getStageMetadata('UNKNOWN_STAGE' as never)).toThrowError();
    });
  });
});
