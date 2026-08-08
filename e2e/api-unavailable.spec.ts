import { test, expect } from '@playwright/test';

/**
 * Interceptação determinística para simular indisponibilidade de rede —
 * uso explicitamente permitido pelo item 48 da aprovação (404/500/network
 * failure), diferente de simular sucesso de domínio.
 */
test.describe('API indisponível', () => {
  test('lista: mostra error state sanitizado com retry manual', async ({ page }) => {
    await page.route('**/api/auto-qa/executions?*', (route) => route.abort('failed'));

    await page.goto('/auto-qa');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText('Exception');
    await expect(alert).not.toContainText('stacktrace');

    await expect(alert.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
  });

  test('detalhe: erro 500 mostra estado utilizável, sem stacktrace bruto', async ({ page }) => {
    await page.route('**/api/auto-qa/executions/exec-500', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          timestamp: '2026-08-07T10:00:00Z',
          status: 500,
          error: 'Internal Server Error',
          message: 'Erro interno',
          path: '/api/auto-qa/executions/exec-500',
        }),
      })
    );

    await page.goto('/auto-qa/exec-500');

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible();
    await expect(alert).not.toContainText('com.br.criarcenariotestes');
    await expect(page.locator('a.execution-detail-page__back')).toBeVisible();
  });
});
