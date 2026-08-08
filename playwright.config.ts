import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração mínima e legível (Fase 12.3.8). baseURL configurável via
 * E2E_BASE_URL — nunca hardcoda ambiente de produção. Por padrão sobe o
 * próprio `ng serve` (porta 4200, configuração "development" ->
 * enviroment.dev.ts -> http://localhost:8089), a mesma origem que o
 * backend real já libera via CORS.
 */
const PORT = 4200;
const baseURL = process.env['E2E_BASE_URL'] ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Viewport mobile (390px, alvo da aprovação) em Chromium — sem
      // isMobile/hasTouch completos (o modo de emulação de dispositivo
      // completo do device 'Pixel 7' gerou um viewport instável com o dev
      // server do Angular; o que importa aqui é a responsividade CSS, não
      // eventos de touch reais).
      name: 'Mobile',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 390, height: 844 },
        userAgent: devices['Pixel 7'].userAgent,
      },
    },
  ],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
