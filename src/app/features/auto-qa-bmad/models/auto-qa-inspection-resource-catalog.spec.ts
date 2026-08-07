import { AUTO_QA_INSPECTION_RESOURCE_CATALOG } from './auto-qa-inspection-resource-catalog';
import { resolveInspectionResourceAvailability } from '../shared/utils/resolve-inspection-resource-availability';
import { InspectionResourceId } from './inspection-resource-availability.model';

describe('AUTO_QA_INSPECTION_RESOURCE_CATALOG', () => {
  const ALL_RESOURCES: InspectionResourceId[] = [
    'HISTORY',
    'GENERATED_FILES',
    'PREVIEW',
    'DIFF',
    'LOGS',
    'LEARNING',
    'RETRY',
  ];

  const ALLOWED_KEYS = new Set([
    'id',
    'label',
    'description',
    'icon',
    'availability',
    'emptyMessage',
    'unavailableMessage',
  ]);

  it('possui exatamente os 7 recursos conhecidos', () => {
    expect(Object.keys(AUTO_QA_INSPECTION_RESOURCE_CATALOG).sort()).toEqual([...ALL_RESOURCES].sort());
  });

  it('cada entrada tem id igual à própria chave (IDs únicos e consistentes)', () => {
    for (const resource of ALL_RESOURCES) {
      expect(AUTO_QA_INSPECTION_RESOURCE_CATALOG[resource].id).toBe(resource);
    }
  });

  it('cada entrada tem label, description e icon não vazios', () => {
    for (const resource of ALL_RESOURCES) {
      const entry = AUTO_QA_INSPECTION_RESOURCE_CATALOG[resource];
      expect(entry.label).toBeTruthy();
      expect(entry.description).toBeTruthy();
      expect(entry.icon).toBeTruthy();
    }
  });

  it('a availability de cada entrada é exatamente a do resolver (fonte única)', () => {
    for (const resource of ALL_RESOURCES) {
      expect(AUTO_QA_INSPECTION_RESOURCE_CATALOG[resource].availability).toBe(
        resolveInspectionResourceAvailability(resource)
      );
    }
  });

  it('toda entrada UNAVAILABLE possui unavailableMessage', () => {
    for (const resource of ALL_RESOURCES) {
      const entry = AUTO_QA_INSPECTION_RESOURCE_CATALOG[resource];
      if (entry.availability === 'UNAVAILABLE') {
        expect(entry.unavailableMessage).toBeTruthy();
      }
    }
  });

  it('a entrada PARTIAL (LEARNING) possui emptyMessage explicando a limitação', () => {
    expect(AUTO_QA_INSPECTION_RESOURCE_CATALOG.LEARNING.emptyMessage).toBeTruthy();
  });

  it('nenhuma entrada contém campos além dos permitidos (sem endpoint, sem regra de autorização)', () => {
    for (const resource of ALL_RESOURCES) {
      const entry = AUTO_QA_INSPECTION_RESOURCE_CATALOG[resource];
      for (const key of Object.keys(entry)) {
        expect(ALLOWED_KEYS.has(key)).toBeTrue();
      }
    }
  });
});
