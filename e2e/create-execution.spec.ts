import { test, expect } from '@playwright/test';

/**
 * Happy Path real contra o backend (sem interceptação): cria uma execução
 * de verdade e navega para o detalhe. Se o backend não estiver acessível
 * neste ambiente E2E, o teste falha explicitamente (nunca finge sucesso
 * interceptando a chamada) — ver relatório para status de execução real.
 */
test.describe('Criação de execução (Happy Path real)', () => {
  test('preenche o formulário, cria a execução e navega para o detalhe', async ({ page }) => {
    await page.goto('/auto-qa');

    const scenario = `Cenário E2E ${Date.now()} — validar login com credenciais válidas`;
    await page.getByLabel('Cenário de teste').fill(scenario);
    await page.getByLabel('Caminho do projeto').fill('/tmp/projeto-e2e');

    await page.getByRole('button', { name: 'Executar Workflow' }).click();

    await expect(page).toHaveURL(/\/auto-qa\/[^/]+$/, { timeout: 15_000 });
    await expect(page.locator('.aqb-page-header__title')).toContainText(scenario, { timeout: 10_000 });
    // app-execution-status-header aparece duas vezes por design: no topo
    // da página e dentro da aba Resumo do Inspection Panel (reaproveitado
    // por ExecutionResultSummaryComponent) — checamos só a do topo.
    await expect(page.locator('app-execution-status-header').first()).toBeVisible();
  });
});
