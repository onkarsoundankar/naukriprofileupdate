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
    // Xvfb on GitHub Actions provides the virtual display
    headless: false,

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