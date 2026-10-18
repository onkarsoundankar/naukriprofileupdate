
import 'dotenv/config';
import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';

const authFile = 'playwright/.auth/state.json';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('https://www.naukri.com', {
  waitUntil: 'domcontentloaded',
});

await page.locator('#login_Layer').click();

await page.getByRole('textbox', {
  name: 'Email ID / Username',
}).fill(process.env.NAUKRI_USERNAME);

await page.getByLabel('Password').fill(process.env.NAUKRI_PASSWORD);

await page.locator('button.btn-primary.loginButton').click();

console.log('Complete any OTP or verification in the browser.');

await page.getByText('View profile', { exact: true }).waitFor({
  state: 'visible',
  timeout: 180000,
});

await fs.mkdir('playwright/.auth', { recursive: true });

await context.storageState({ path: authFile });

console.log(`Storage state saved to ${authFile}`);

await browser.close();
