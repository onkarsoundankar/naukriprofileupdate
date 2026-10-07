// @ts-check
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    headless: false,

    // Use actual browser window size
    viewport: null,

    // Start Chrome maximized
    launchOptions: {
      args: ['--start-maximized'],
    },

    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
    },
  ],
});