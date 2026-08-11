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

  test('navega a timeline por teclado com roving tabindex (setas), sem precisar de Tab por item (Fase 13.8)', async ({
    page,
  }) => {
    const executionId = await mockExecutionDetail(page, {
      currentStage: 'GENERATION',
      lastStageCompleted: 'PLANNING',
      availableActions: ['CANCEL'],
    });

    await page.goto(`/auto-qa/${executionId}`);

    const listbox = page.locator('app-stage-timeline [role="listbox"]');
    const options = listbox.locator('[role="option"]');

    // etapa atual (GENERATION) é a única tabbable — único ponto de entrada
    // por Tab no listbox inteiro.
    const activeOption = listbox.locator('[role="option"][tabindex="0"]');
    await expect(activeOption).toHaveCount(1);
    await expect(activeOption).toContainText('Geração de Código');
    await expect(options.filter({ hasText: 'Geração de Código' })).toHaveAttribute('aria-selected', 'true');

    await activeOption.focus();
    await page.keyboard.press('ArrowRight');

    // seleção segue o foco: a próxima etapa do catálogo (Revisão de Código)
    // passa a ser a selecionada, a única tabbable, e recebe o foco real do
    // navegador — sem precisar de Tab adicional.
    const previousOption = options.filter({ hasText: 'Geração de Código' });
    const nextOption = options.filter({ hasText: 'Revisão de Código' });
    await expect(nextOption).toHaveAttribute('aria-selected', 'true');
    await expect(nextOption).toHaveAttribute('tabindex', '0');
    await expect(previousOption).toHaveAttribute('tabindex', '-1');
    await expect(nextOption).toBeFocused();
    await expect(page.locator('.stage-detail-panel__title')).toContainText('Revisão de Código');

    // Home volta direto para a primeira etapa do catálogo, sem wrap.
    await page.keyboard.press('Home');
    const firstOption = options.filter({ hasText: 'Descoberta do Projeto' });
    await expect(firstOption).toBeFocused();
    await expect(page.locator('.stage-detail-panel__title')).toContainText('Descoberta do Projeto');
  });
});
