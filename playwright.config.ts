import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: 'http://localhost:3030',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  webServer: {
    command: 'npm run build && npx vite preview --port 3030 --strictPort',
    url: 'http://localhost:3030',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
