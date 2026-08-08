import { test, expect } from '@playwright/test';
import { mockExecutionDetail } from './fixtures/execution-fixture';

/**
 * Estrutura visual isolada (dado determinístico via interceptação) — não
 * testa o processamento de domínio real, só a apresentação/interação de
 * Workflow Overview + Timeline + Stage Detail, conforme item 48 da
 * aprovação da Fase 12.3.8.
 */
test.describe('Workflow Overview e Timeline', () => {
  test('renderiza o overview compacto e a timeline detalhada, e permite selecionar uma etapa', async ({ page }) => {
    const executionId = await mockExecutionDetail(page, {
      currentStage: 'GENERATION',
      lastStageCompleted: 'PLANNING',
      availableActions: ['CANCEL'],
    });

    await page.goto(`/auto-qa/${executionId}`);

    await expect(page.locator('app-workflow-overview')).toBeVisible();
    await expect(page.locator('app-stage-timeline')).toBeVisible();

    // seleciona a etapa "Descoberta do Projeto" na timeline (não no overview
    // compacto, que usa só o shortTitle "Descoberta") e confirma que o
    // painel de detalhe muda para refletir a seleção.
    await page.locator('app-stage-timeline').getByText('Descoberta do Projeto').click();
    await expect(page.locator('.stage-detail-panel__title')).toContainText('Descoberta do Projeto');
  });
});
