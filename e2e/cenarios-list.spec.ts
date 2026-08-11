import { test, expect } from '@playwright/test';

/**
 * Golden path de caracterização da tela de Cenários (Fase 14.4). Criado na
 * Etapa 1 como rede de segurança; seletores adaptados na Etapa 2 para a
 * estrutura de DOM migrada para o Design System global (primitives Aqb*).
 * Intercepta GET /cenario com um payload determinístico que espelha o
 * contrato real do backend (Cenario/CenarioItem) — não testa a lista
 * vazia/real do backend (isso já é incerto por design; o objetivo aqui é
 * um fluxo estável e repetível).
 */
const cenarioFixture = {
  id: 'cen-e2e-1',
  titulo: 'Login com credenciais válidas (fixture E2E)',
  regraDeNegocio: 'O usuário deve conseguir logar informando email e senha cadastrados.',
  criteriosAceitacao: 'N/A',
  cenarios: [
    {
      nome: 'Login válido',
      objetivo: 'Validar login com credenciais corretas',
      precondicao: 'Usuário previamente cadastrado',
      scriptTeste: 'Dado que o usuário está na tela de login\nQuando informa email e senha válidos\nE clica em Entrar',
      resultadoEsperado: 'Então o usuário é autenticado e redirecionado para a home',
      variaveis: 'email; senha',
      componente: 'Login',
      rotulos: 'smoke',
      proposito: 'TESTE MANUAL',
      pasta: 'Login',
      proprietario: 'JIRAUSER23105',
      cobertura: 'Alta',
      status: 'APPROVED',
    },
  ],
};

test.describe('Cenários — golden path de caracterização', () => {
  test('carrega a lista real (200), expande/recolhe detalhes via teclado e exporta .xlsx com download real', async ({ page }) => {
    await page.route('**/cenario', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([cenarioFixture]) });
    });

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().endsWith('/cenario') && res.request().method() === 'GET', {
        timeout: 15_000,
      }),
      page.goto('/cenarios'),
    ]);
    expect(response.status()).toBe(200);

    await expect(page.locator('.cenario-card')).toHaveCount(1);
    const toggle = page.locator('.cenario-card__toggle');
    await expect(toggle.locator('.cenario-card__title')).toHaveText(cenarioFixture.titulo);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // detalhes começam recolhidos:
    await expect(page.locator('.cenario-card__details')).toHaveCount(0);

    // expandir/recolher via TECLADO (Fase 14.4/Etapa 2 — corrige o HIGH de
    // acessibilidade: <button> nativo já responde a Enter/Space sem handler
    // manual de keydown).
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.cenario-card__details .cenario-card__rule-text')).toHaveText(cenarioFixture.regraDeNegocio);

    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.cenario-card__details')).toHaveCount(0);

    // exportação real: aciona o download de verdade (sem mock de FileSaver/jsPDF).
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.cenario-card__export-xlsx button').click(),
    ]);
    expect(download.suggestedFilename()).toBe('Login_com_credenciais_vlidas_fixture_E2E_ZephyrScale.xlsx');
  });

  test('busca filtra por título e "Limpar" restaura a lista, sem overflow horizontal', async ({ page }) => {
    const segundoCenario = { ...cenarioFixture, id: 'cen-e2e-2', titulo: 'Cadastro de produto (fixture E2E)' };
    await page.route('**/cenario', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([cenarioFixture, segundoCenario]),
      });
    });

    await page.goto('/cenarios');
    await expect(page.locator('.cenario-card')).toHaveCount(2);

    await page.getByLabel('Buscar cenário').fill('cadastro');
    await expect(page.locator('.cenario-card')).toHaveCount(1, { timeout: 5_000 });
    await expect(page.locator('.cenario-card__title')).toHaveText(segundoCenario.titulo);

    await page.getByRole('button', { name: 'Limpar' }).click();
    await expect(page.locator('.cenario-card')).toHaveCount(2);

    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
