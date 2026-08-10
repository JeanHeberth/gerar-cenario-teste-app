import { test, expect } from '@playwright/test';

test.describe('Execução inexistente', () => {
  test('404 real do backend mostra mensagem sanitizada, sem payload bruto', async ({ page }) => {
    // ID válido no formato mas inexistente — o backend real responde 404.
    // Observa a resposta HTTP real (não só a UI): uma falha de rede
    // (backend fora do ar) nunca dispara o evento "response" do
    // Playwright, então waitForResponse falha por timeout em vez de
    // aceitar silenciosamente a mesma UI genérica de erro usada para o
    // 404 real — sem isso, o teste passava mesmo sem o backend (Fase 13.6).
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes('/api/auto-qa/executions/00000000-0000-0000-0000-000000000000') &&
          res.request().method() === 'GET',
        { timeout: 15_000 }
      ),
      page.goto('/auto-qa/00000000-0000-0000-0000-000000000000'),
    ]);
    expect(response.status()).toBe(404);

    const alert = page.getByRole('alert');
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(alert).not.toContainText('{');
    await expect(alert).not.toContainText('Exception');

    // a tela continua utilizável: há como voltar ao histórico
    await expect(page.locator('a.execution-detail-page__back')).toBeVisible();
  });
});
