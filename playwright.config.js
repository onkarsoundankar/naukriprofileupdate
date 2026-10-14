
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  timeout: 240000,
  retries: 0,
  workers: 1,

  reporter: 'list',

  outputDir: 'test-results',

  use: {
    headless: false,

    launchOptions: {
      args: ['--disable-http2']
    },

    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure'
  }
});
