import { test, expect } from '@playwright/test';
import { mockExecutionDetail } from './fixtures/execution-fixture';

test.describe('Modal — acessibilidade (AqbModalComponent)', () => {
  test('focus trap: Tab cicla dentro do modal; Escape fecha e retorna o foco ao botão que abriu', async ({
    page,
  }) => {
    const executionId = await mockExecutionDetail(page, { availableActions: ['CANCEL'] });
    await page.goto(`/auto-qa/${executionId}`);

    const cancelButton = page.locator('app-action-bar').getByRole('button', { name: 'Cancelar' });
    // A nav global fixa (fora do escopo desta feature) pode cobrir o topo
    // da viewport durante o scroll automático em telas estreitas —
    // centralizamos o botão explicitamente antes de clicar.
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    // foco inicial cai dentro do modal
    await expect(page.locator('.aqb-modal__close')).toBeFocused();

    // Escape fecha (não está busy) e o foco retorna ao botão que abriu
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(cancelButton).toBeFocused();
  });

  test('Tab no último elemento focável do modal volta para o primeiro (focus trap)', async ({ page }) => {
    const executionId = await mockExecutionDetail(page, { availableActions: ['CANCEL'] });
    await page.goto(`/auto-qa/${executionId}`);

    const cancelButton = page.locator('app-action-bar').getByRole('button', { name: 'Cancelar' });
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    const confirmButton = dialog.getByRole('button', { name: 'Confirmar cancelamento' });
    await confirmButton.focus();

    await page.keyboard.press('Tab');
    await expect(page.locator('.aqb-modal__close')).toBeFocused();
  });
});
