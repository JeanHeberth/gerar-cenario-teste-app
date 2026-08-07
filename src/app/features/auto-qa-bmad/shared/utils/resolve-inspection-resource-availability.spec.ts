import { resolveInspectionResourceAvailability } from './resolve-inspection-resource-availability';
import { InspectionResourceId } from '../../models/inspection-resource-availability.model';

describe('resolveInspectionResourceAvailability', () => {
  it('classifica HISTORY como SUPPORTED', () => {
    expect(resolveInspectionResourceAvailability('HISTORY')).toBe('SUPPORTED');
  });

  it('classifica GENERATED_FILES como UNAVAILABLE', () => {
    expect(resolveInspectionResourceAvailability('GENERATED_FILES')).toBe('UNAVAILABLE');
  });

  it('classifica PREVIEW como UNAVAILABLE', () => {
    expect(resolveInspectionResourceAvailability('PREVIEW')).toBe('UNAVAILABLE');
  });

  it('classifica DIFF como UNAVAILABLE', () => {
    expect(resolveInspectionResourceAvailability('DIFF')).toBe('UNAVAILABLE');
  });

  it('classifica LOGS como UNAVAILABLE', () => {
    expect(resolveInspectionResourceAvailability('LOGS')).toBe('UNAVAILABLE');
  });

  it('classifica LEARNING como PARTIAL', () => {
    expect(resolveInspectionResourceAvailability('LEARNING')).toBe('PARTIAL');
  });

  it('classifica RETRY como UNAVAILABLE', () => {
    expect(resolveInspectionResourceAvailability('RETRY')).toBe('UNAVAILABLE');
  });

  it('é determinístico: chamadas repetidas com o mesmo recurso retornam o mesmo valor', () => {
    const first = resolveInspectionResourceAvailability('DIFF');
    const second = resolveInspectionResourceAvailability('DIFF');
    const third = resolveInspectionResourceAvailability('DIFF');
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('cobre exatamente os 7 recursos conhecidos, sem lançar erro para nenhum', () => {
    const resources: InspectionResourceId[] = [
      'HISTORY',
      'GENERATED_FILES',
      'PREVIEW',
      'DIFF',
      'LOGS',
      'LEARNING',
      'RETRY',
    ];
    for (const resource of resources) {
      expect(() => resolveInspectionResourceAvailability(resource)).not.toThrow();
    }
  });
});
