import { test, expect } from '@playwright/test';

/**
 * Happy Path real (sem interceptação) — depende do backend estar
 * acessível no ambiente E2E. Se a chamada de lista falhar, o teste ainda
 * valida que a página em si carrega corretamente (título, formulário),
 * já que isso não depende do backend.
 */
test.describe('Dashboard (histórico de execuções)', () => {
  test('carrega o título neutro, o formulário de nova execução e não deixa overflow horizontal', async ({ page }) => {
    await page.goto('/auto-qa');

    await expect(page.locator('.aqb-page-header__title')).toHaveText('Histórico de execuções');
    await expect(page.getByLabel('Cenário de teste')).toBeVisible();
    await expect(page.getByLabel('Caminho do projeto')).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('mostra histórico real (grid) ou estado vazio, conforme o backend responder', async ({ page }) => {
    // Observa a resposta HTTP real da listagem: sem isso, uma falha de
    // rede (backend fora do ar) produz a mesma UI de "vazio"/erro e o
    // teste passaria mesmo sem o backend estar de pé — waitForResponse
    // falha por timeout nesse cenário, em vez de aceitar silenciosamente
    // (Fase 13.6).
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/auto-qa/executions') && res.request().method() === 'GET',
        { timeout: 15_000 }
      ),
      page.goto('/auto-qa'),
    ]);
    expect(response.status()).toBe(200);

    const grid = page.locator('.execution-list-page__grid');
    const emptyState = page.locator('.aqb-empty-state');

    await expect(grid.or(emptyState).first()).toBeVisible({ timeout: 15_000 });
  });
});
