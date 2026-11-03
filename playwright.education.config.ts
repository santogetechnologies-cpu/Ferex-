import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: 'education-billing.spec.ts', workers: 2, timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5188', headless: true, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5188 --strictPort', url: 'http://127.0.0.1:5188', reuseExistingServer: true, timeout: 60000 },
});
