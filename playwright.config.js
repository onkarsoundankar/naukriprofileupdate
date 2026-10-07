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
    // Local Mac = headed
    // GitHub Actions = headless
    headless: !!process.env.CI,

    // Local Mac browser window
    viewport: null,

    launchOptions: {
      args: [
        '--start-maximized',
        '--window-size=1920,1080',
      ],
    },

    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
    },
  ],
});