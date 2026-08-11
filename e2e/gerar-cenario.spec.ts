import { test, expect } from '@playwright/test';

/**
 * Golden path de caracterização da tela Gerar Cenário (Fase 14.5/Etapa 1,
 * atualizado na Etapa 2). Classificação: UI E2E WITH API MOCK — a geração
 * real dispara um workflow de agentes de IA (BMAD) no backend, então
 * POST /cenario é sempre interceptado aqui (nunca chama OpenAI/Gemini
 * reais). GET /api/agents também é mockado deterministicamente para não
 * depender de configuração externa. Título/Regra de Negócio/Agente/Task
 * Jira usam getByLabel() desde a Etapa 2 (labels agora têm for/id reais);
 * os dois inputs de arquivo continuam via CSS por terem nome acessível
 * complexo (emoji + texto longo).
 */
test.describe('Gerar Cenário — golden path de caracterização', () => {
  test('preenche título/regra, agente padrão já vem selecionado, gera com sucesso (backend mockado)', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'gerador-de-cenario-de-testes', fileName: 'gerador.yaml' }]),
      });
    });

    let cenarioPostBody: unknown = null;
    await page.route('**/cenario', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      cenarioPostBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'e2e-fixture-1',
          titulo: 'Login com credenciais válidas (E2E)',
          regraDeNegocio: 'O usuário deve conseguir logar informando email e senha cadastrados.',
          criteriosAceitacao: 'N/A',
          cenarios: [],
        }),
      });
    });

    await page.goto('/');

    // agente "gerador" selecionado automaticamente pelo componente (ngOnInit):
    await expect(page.getByLabel('Agente')).toHaveValue('gerador-de-cenario-de-testes');

    await page.getByLabel('Título').fill('Login com credenciais válidas (E2E)');
    await page
      .getByLabel('Regra de Negócio')
      .fill('O usuário deve conseguir logar informando email e senha cadastrados.');

    const cta = page.getByRole('button', { name: /Gerar Cenário/ });
    await expect(cta).toBeEnabled();
    await cta.click();

    await expect(page.getByText('Cenario gerado com sucesso')).toBeVisible({ timeout: 10_000 });

    expect(cenarioPostBody).toEqual({
      titulo: 'Login com credenciais válidas (E2E)',
      regraDeNegocio: 'O usuário deve conseguir logar informando email e senha cadastrados.',
      agent: 'gerador-de-cenario-de-testes',
    });

    // formulário volta a ficar vazio (reset) após o sucesso, sem overflow horizontal:
    await expect(page.getByLabel('Título')).toHaveValue('');
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('formulário vazio mantém o CTA desabilitado (proteção nativa) e mostra erro inline ao tocar e sair do campo Título', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    let posted = false;
    await page.route('**/cenario', async (route) => {
      posted = true;
      await route.fallback();
    });

    await page.goto('/');

    const cta = page.getByRole('button', { name: /Gerar Cenário/ });
    await expect(cta).toBeDisabled();

    const titulo = page.getByLabel('Título');
    await titulo.click();
    await titulo.blur();

    await expect(page.locator('.cenario-page__helper--danger').first()).toContainText('Informe o título do cenário.');
    expect(posted).toBe(false);
  });

  test('upload local: seleciona um PDF via input real, mostra o chip e "Limpar PDFs" remove tudo', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/');

    const fileInput = page.locator('input[type="file"]:not([webkitdirectory])');
    await fileInput.setInputFiles({
      name: 'evidencia-e2e.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fixture minima de teste'),
    });

    await expect(page.locator('.cenario-page__file-chip-name')).toHaveText('evidencia-e2e.pdf');

    await page.getByRole('button', { name: /Limpar PDFs/ }).click();
    await expect(page.locator('.cenario-page__file-chip')).toHaveCount(0);
  });

  test('Jira: busca anexos de uma task mockada e importa só o PDF para a lista de anexos', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/jira/tasks/OP-1/attachments', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          taskKey: 'OP-1',
          attachments: [
            { id: 'a1', fileName: 'anexo-e2e.pdf', mimeType: 'application/pdf', size: 10, downloadUrl: '/jira/tasks/OP-1/attachments/a1/download' },
            { id: 'a2', fileName: 'planilha.xlsx', mimeType: 'application/vnd.ms-excel', size: 10, downloadUrl: '/jira/tasks/OP-1/attachments/a2/download' },
          ],
        }),
      });
    });

    await page.route('**/jira/tasks/OP-1/attachments/a1/download', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/pdf', body: Buffer.from('%PDF-1.4 fixture jira') });
    });

    await page.goto('/');

    await page.getByLabel('Task Jira').fill('op-1');
    await page.getByRole('button', { name: 'Buscar anexos da task' }).click();

    await expect(page.locator('.cenario-page__file-chip-name')).toHaveText('anexo-e2e.pdf');
    await expect(page.getByRole('alert')).toContainText('importado');
  });

  test('REGRESSÃO (Etapa 2): erro na geração mostra feedback inline com role="alert" — sem window.alert() — e é limpo numa nova tentativa bem-sucedida', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.dismiss();
    });

    let tentativa = 0;
    await page.route('**/cenario', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      tentativa++;
      if (tentativa === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'erro' }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'e2e-retry', titulo: 'x', regraDeNegocio: 'y', criteriosAceitacao: '', cenarios: [] }),
      });
    });

    await page.goto('/');
    await page.getByLabel('Título').fill('Cenário com erro (E2E)');
    await page.getByLabel('Regra de Negócio').fill('Regra qualquer');

    const cta = page.getByRole('button', { name: /Gerar Cenário/ });
    await cta.click();

    const erroInline = page.locator('.cenario-page__alert--danger[role="alert"]');
    await expect(erroInline).toContainText('Erro ao gerar cenario', { timeout: 10_000 });
    expect(dialogAppeared).toBe(false);

    // segunda tentativa (sucesso) limpa o erro inline:
    await cta.click();
    await expect(page.getByText('Cenario gerado com sucesso')).toBeVisible({ timeout: 10_000 });
    await expect(erroInline).toHaveCount(0);
  });
});
