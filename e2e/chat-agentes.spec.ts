import { test, expect } from '@playwright/test';

/**
 * Golden path de caracterização da tela Chat IA (Fase 14.6/Etapa 1).
 * Classificação: UI E2E WITH API MOCK — a resposta do chat é gerada por um
 * provider de IA no BACKEND (nunca chamado diretamente pelo frontend), então
 * POST /api/agents/sessions/chat é sempre interceptado aqui (nunca chama
 * OpenAI/Gemini reais). GET /api/agents também é mockado deterministicamente.
 */
test.describe('Chat IA — golden path de caracterização', () => {
  test('agente é selecionado automaticamente (primeiro da lista), envia mensagem com Enter e a resposta aparece', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'agente-b', fileName: 'b.yaml' },
          { id: 'agente-a', fileName: 'a.yaml' },
        ]),
      });
    });

    let chatPostBody: unknown = null;
    await page.route('**/api/agents/sessions/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      chatPostBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: (chatPostBody as any).sessionId,
          agentId: 'agente-b',
          messages: [
            { role: 'user', content: 'Olá, tudo bem?' },
            { role: 'assistant', content: 'Tudo ótimo! Como posso ajudar?' },
          ],
        }),
      });
    });

    await page.goto('/chat-agentes');

    // agente "primeiro da lista" selecionado automaticamente (estratégia diferente do Gerar Cenário):
    await expect(page.locator('.agent-select')).toHaveValue('agente-b');
    await expect(page.locator('.empty-title')).toContainText('Como posso ajudar?');

    const textarea = page.locator('.input-textarea');
    await textarea.fill('Olá, tudo bem?');
    await textarea.press('Enter');

    await expect(page.locator('.message-bubble.user-bubble')).toContainText('Olá, tudo bem?');
    await expect(page.locator('.message-bubble.assistant-bubble')).toContainText('Tudo ótimo! Como posso ajudar?', { timeout: 10_000 });

    expect(chatPostBody).toMatchObject({
      agentId: 'agente-b',
      message: 'Olá, tudo bem?',
    });

    // textarea some libera após a resposta, pronta para nova mensagem, sem overflow horizontal:
    await expect(textarea).toHaveValue('');
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('Shift+Enter cria nova linha em vez de enviar a mensagem', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    let posted = false;
    await page.route('**/api/agents/sessions/chat', async (route) => {
      posted = true;
      await route.fallback();
    });

    await page.goto('/chat-agentes');

    const textarea = page.locator('.input-textarea');
    await textarea.fill('linha 1');
    await textarea.press('Shift+Enter');
    await textarea.type('linha 2');

    expect(await textarea.inputValue()).toBe('linha 1\nlinha 2');
    expect(posted).toBe(false);
  });

  test('sem agentes disponíveis: composer e select ficam desabilitados, sem crash', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/chat-agentes');

    await expect(page.locator('.empty-title')).toContainText('Nenhum agente disponivel');
    await expect(page.locator('.input-textarea')).toBeDisabled();
    await expect(page.locator('.agent-select')).toBeDisabled();
    await expect(page.locator('.send-button')).toBeDisabled();
  });

  test('erro no envio mostra mensagem inline do assistente (sem window.alert) e permite tentar novamente', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    let dialogAppeared = false;
    page.on('dialog', async (dialog) => {
      dialogAppeared = true;
      await dialog.dismiss();
    });

    let tentativa = 0;
    await page.route('**/api/agents/sessions/chat', async (route) => {
      tentativa++;
      if (tentativa === 1) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'erro' }) });
        return;
      }
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: body.sessionId,
          agentId: 'agente-a',
          messages: [
            { role: 'user', content: body.message },
            { role: 'assistant', content: 'Segunda tentativa funcionou' },
          ],
        }),
      });
    });

    await page.goto('/chat-agentes');

    const textarea = page.locator('.input-textarea');
    await textarea.fill('primeira tentativa');
    await textarea.press('Enter');

    await expect(page.locator('.message-bubble.assistant-bubble')).toContainText(
      'Erro ao processar mensagem',
      { timeout: 10_000 }
    );
    expect(dialogAppeared).toBe(false);

    await textarea.fill('segunda tentativa');
    await textarea.press('Enter');
    await expect(page.locator('.message-bubble.assistant-bubble').last()).toContainText('Segunda tentativa funcionou', { timeout: 10_000 });
  });

  test('duplo envio: clicar duas vezes rapidamente dispara SOMENTE UMA requisição (guard já existe em sendMessage)', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    let chamadas = 0;
    await page.route('**/api/agents/sessions/chat', async (route) => {
      chamadas++;
      await new Promise((resolve) => setTimeout(resolve, 300)); // dá tempo para uma tentativa de segundo clique
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: body.sessionId,
          agentId: 'agente-a',
          messages: [
            { role: 'user', content: body.message },
            { role: 'assistant', content: 'Resposta única' },
          ],
        }),
      });
    });

    await page.goto('/chat-agentes');

    await page.locator('.input-textarea').fill('mensagem única');
    const sendBtn = page.locator('.send-button');
    await sendBtn.click();
    // segunda tentativa de clique enquanto a primeira ainda está "loading" (botão fica disabled):
    await sendBtn.click({ force: true }).catch(() => {});

    await expect(page.locator('.message-bubble.assistant-bubble')).toContainText('Resposta única', { timeout: 10_000 });
    expect(chamadas).toBe(1);
    await expect(page.locator('.message-bubble.user-bubble')).toHaveCount(1);
  });

  test('REGRESSÃO (Etapa 2 — SEGURANÇA): HTML malicioso (<img onerror>, <script>) vira TEXTO visível — nenhum elemento <img>/<script> é criado no DOM, nada executa', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    await page.route('**/api/agents/sessions/chat', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: body.sessionId,
          agentId: 'agente-a',
          messages: [
            { role: 'user', content: body.message },
            {
              role: 'assistant',
              content: '<img src="x" onerror="window.__xssFired = true">conteúdo malicioso <script>window.__xssScript = true;</script> fim',
            },
          ],
        }),
      });
    });

    await page.goto('/chat-agentes');
    await page.locator('.input-textarea').fill('teste xss');
    await page.locator('.input-textarea').press('Enter');

    const bubble = page.locator('.message-bubble.assistant-bubble .message-content').last();
    await expect(bubble).toContainText('conteúdo malicioso', { timeout: 10_000 });

    // o HTML malicioso deve aparecer como texto visível, não como markup:
    await expect(bubble).toContainText('<img src="x" onerror="window.__xssFired = true">');

    // nenhum elemento real foi criado no DOM (prova de que o escaping funcionou, não só o sanitizer):
    expect(await bubble.locator('img').count()).toBe(0);
    expect(await bubble.locator('script').count()).toBe(0);

    const xssFired = await page.evaluate(() => (window as any).__xssFired);
    const xssScript = await page.evaluate(() => (window as any).__xssScript);
    expect(xssFired).toBeUndefined();
    expect(xssScript).toBeUndefined();
  });

  test('1 < 2 && 3 > 1 continua legível corretamente (texto legítimo não é quebrado pelo escaping)', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    await page.route('**/api/agents/sessions/chat', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: body.sessionId,
          agentId: 'agente-a',
          messages: [
            { role: 'user', content: body.message },
            { role: 'assistant', content: '1 < 2 && 3 > 1, e isso é **importante**' },
          ],
        }),
      });
    });

    await page.goto('/chat-agentes');
    await page.locator('.input-textarea').fill('comparação');
    await page.locator('.input-textarea').press('Enter');

    const bubble = page.locator('.message-bubble.assistant-bubble .message-content').last();
    await expect(bubble).toContainText('1 < 2 && 3 > 1, e isso é importante', { timeout: 10_000 });
    await expect(bubble.locator('strong')).toHaveText('importante');
  });

  test('acessibilidade: "Novo Chat" (AqbButtonComponent) limpa a conversa; select/textarea têm label; botão enviar tem nome acessível', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    await page.route('**/api/agents/sessions/chat', async (route) => {
      const body = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: body.sessionId,
          agentId: 'agente-a',
          messages: [
            { role: 'user', content: body.message },
            { role: 'assistant', content: 'Resposta' },
          ],
        }),
      });
    });

    await page.goto('/chat-agentes');

    // labels reais (agora localizáveis por getByLabel, mesmo visualmente ocultos):
    await expect(page.getByLabel('Mensagem', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Agente', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enviar mensagem' })).toBeVisible();

    await page.getByLabel('Mensagem', { exact: true }).fill('mensagem antes do novo chat');
    await page.getByLabel('Mensagem', { exact: true }).press('Enter');
    await expect(page.locator('.message-bubble.assistant-bubble')).toContainText('Resposta', { timeout: 10_000 });

    await page.getByRole('button', { name: /Novo Chat/ }).click();
    await expect(page.locator('.message-bubble')).toHaveCount(0);
    await expect(page.locator('.empty-title')).toContainText('Como posso ajudar?');
  });

  test('responsividade: 1440/1280/768/390 sem overflow horizontal e com o layout do chat visível', async ({ page }) => {
    await page.route('**/api/agents', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.fallback();
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'agente-a', fileName: 'a.yaml' }]) });
    });

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 800 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/chat-agentes');
      await expect(page.locator('.empty-title')).toBeVisible();
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth + 1);
    }
  });
});
