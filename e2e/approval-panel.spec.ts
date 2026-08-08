import { test, expect } from '@playwright/test';
import { mockExecutionDetail } from './fixtures/execution-fixture';

test.describe('Painel de aprovação — estrutura visual', () => {
  test('abrir "Aprovar aplicação de arquivos" mostra o fieldset "Operações autorizadas" e mantém o CTA desabilitado até preencher', async ({
    page,
  }) => {
    const executionId = await mockExecutionDetail(page, {
      status: 'WAITING_APPLY_APPROVAL',
      availableActions: ['APPROVE_FILE_UPDATE', 'CANCEL'],
    });
    await page.goto(`/auto-qa/${executionId}`);

    const approveButton = page
      .locator('app-action-bar')
      .getByRole('button', { name: 'Aprovar aplicação de arquivos' });
    await approveButton.scrollIntoViewIfNeeded();
    await approveButton.click();

    const panel = page.locator('app-apply-approval-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByText('Operações autorizadas')).toBeVisible();

    const submit = panel.getByRole('button', { name: 'Aprovar aplicação' });
    await expect(submit).toBeDisabled();

    await panel.getByLabel('Aprovado por').fill('QA E2E');
    await panel.getByText('CREATE', { exact: true }).click();

    await expect(submit).toBeEnabled();
  });
});
