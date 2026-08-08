import { test, expect } from '@playwright/test';
import { mockExecutionDetail } from './fixtures/execution-fixture';

test.describe('Inspection Panel — navegação entre abas', () => {
  test('navega entre Resumo/Artefatos/Diff/Logs por clique, mostrando o conteúdo correto', async ({ page }) => {
    const executionId = await mockExecutionDetail(page);
    await page.goto(`/auto-qa/${executionId}`);

    const panel = page.locator('app-execution-inspection-panel');
    await expect(panel.getByRole('tablist')).toBeVisible();
    await panel.getByRole('tablist').scrollIntoViewIfNeeded();

    await panel.getByRole('tab', { name: /Artefatos/ }).click();
    await expect(panel.getByRole('tabpanel')).toContainText(
      'Os detalhes dos arquivos gerados não estão disponíveis no contrato público atual.'
    );

    await panel.getByRole('tab', { name: /Diff/ }).click();
    await expect(panel.getByRole('tabpanel')).toContainText('Diff não disponível no contrato público atual.');

    await panel.getByRole('tab', { name: /Logs/ }).click();
    await expect(panel.getByRole('tabpanel')).toContainText(
      'Logs detalhados da execução não são expostos pela API atual.'
    );
  });

  test('navega entre abas via teclado (ArrowRight/ArrowLeft) com wrap-around', async ({ page }) => {
    const executionId = await mockExecutionDetail(page);
    await page.goto(`/auto-qa/${executionId}`);

    const panel = page.locator('app-execution-inspection-panel');
    const resumoTab = panel.getByRole('tab', { name: /Resumo/ });
    await resumoTab.focus();

    await page.keyboard.press('ArrowLeft');
    await expect(panel.getByRole('tab', { name: /Logs/ })).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(resumoTab).toBeFocused();
  });
});
