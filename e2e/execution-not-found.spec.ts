import { test, expect } from '@playwright/test';

test.describe('Execução inexistente', () => {
  test('404 real do backend mostra mensagem sanitizada, sem payload bruto', async ({ page }) => {
    // ID válido no formato mas inexistente — o backend real responde 404.
    await page.goto('/auto-qa/00000000-0000-0000-0000-000000000000');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).not.toContainText('{');
    await expect(alert).not.toContainText('Exception');

    // a tela continua utilizável: há como voltar ao histórico
    await expect(page.locator('a.execution-detail-page__back')).toBeVisible();
  });
});
