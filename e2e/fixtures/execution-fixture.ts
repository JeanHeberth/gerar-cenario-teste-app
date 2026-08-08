import { Page } from '@playwright/test';

/**
 * Espelha 1:1 o shape de AutoQaExecutionResponse (frontend) — usado apenas
 * para interceptação determinística de cenários de estrutura/interação de
 * UI (Timeline, Inspection Panel, Modal, Approval), nunca para simular um
 * Happy Path de domínio completo (isso só roda contra o backend real).
 */
export interface ExecutionFixtureOverrides {
  executionId?: string;
  scenario?: string;
  status?: string;
  currentStage?: string | null;
  lastStageStarted?: string | null;
  lastStageCompleted?: string | null;
  attempt?: number;
  progress?: number;
  availableActions?: string[];
  warnings?: Array<{ code: string; description: string; blocking: boolean }>;
  errors?: Array<{ code: string; message: string }>;
}

export function buildExecutionFixture(overrides: ExecutionFixtureOverrides = {}) {
  return {
    executionId: 'e2e-fixture-exec-1',
    scenario: 'Login com credenciais válidas (fixture E2E)',
    status: 'WAITING_APPLY_APPROVAL',
    currentStage: 'APPLY',
    lastStageStarted: 'APPLY',
    lastStageCompleted: 'REVIEW',
    attempt: 1,
    progress: 60,
    availableActions: ['APPROVE_FILE_UPDATE', 'CANCEL', 'VIEW_GENERATED_FILES', 'VIEW_DIFF', 'VIEW_LOGS'],
    warnings: [],
    errors: [],
    createdAt: '2026-08-07T10:00:00Z',
    updatedAt: '2026-08-07T10:05:00Z',
    startedAt: '2026-08-07T10:00:30Z',
    finishedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    ...overrides,
  };
}

/** Intercepta GET /api/auto-qa/executions/:id com um payload determinístico. */
export async function mockExecutionDetail(page: Page, overrides: ExecutionFixtureOverrides = {}): Promise<string> {
  const fixture = buildExecutionFixture(overrides);
  await page.route(`**/api/auto-qa/executions/${fixture.executionId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) });
  });
  return fixture.executionId;
}
