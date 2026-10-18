
import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const authFile = 'playwright/.auth/state.json';

export default defineConfig({
  testDir: './tests',

  timeout: 240000,
  retries: 0,
  workers: 1,

  reporter: 'list',
  outputDir: 'test-results',

  use: {
    storageState: fs.existsSync(authFile) ? authFile : undefined,

    headless: false,

    launchOptions: {
      args: ['--disable-http2'],
    },

    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
});
