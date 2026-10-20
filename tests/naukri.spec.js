
import 'dotenv/config';
import { test } from '@playwright/test';


test('Update Naukri Profile', async ({ page }) => {
  test.setTimeout(90000);

  const headlines = [
    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Functional Testing | Regression Testing | POM | Performance Testing JMeter | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    'Senior Engineer | 4+ YOE | Playwright | JavaScript | Automation Testing | Manual Testing | Functional Testing | Regression Testing | POM Framework | JMeter Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    '4+ YOE | QA Automation Engineer | Playwright | JavaScript | POM Framework | Automation Testing | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | JMeter | Performance Testing | Test Case Creation | SDLC | STLC | Agile | Healthcare | Insurance | Claims | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation Engineer | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM | JMeter | Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Insurance | Claims | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP',

    'Senior Engineer with 4+ YOE | Playwright Automation | JavaScript | Manual & Automation Testing | POM | Functional Testing | Regression Testing | JMeter Performance Testing | Test Case Creation | Agile | SDLC | STLC | US Healthcare | Insurance | Claims | HIPAA | HL7 | Clinical Trials | CFR Part 11 | GCP',

    '4+ YOE | Playwright | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM Framework | Performance Testing | JMeter | Test Case Design | SDLC | STLC | Agile | Healthcare | Claims | Insurance | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Automation Testing | POM Framework | Functional & Regression Testing | Smoke Testing | JMeter Performance Testing | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP'
  ];



  await page.goto('https://www.naukri.com', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.locator('#login_Layer').click();

  


  await page.getByRole('textbox', { name: 'Email ID / Username' }).fill(process.env.NAUKRI_USERNAME);

  await page.getByLabel('Password').fill(process.env.NAUKRI_PASSWORD);

  //await page.locator('#usernameField').fill(process.env.NAUKRI_USERNAME);

 // await page.locator('#passwordField').fill(process.env.NAUKRI_PASSWORD);

const loginButton = page.locator('button.btn-primary.loginButton');

await loginButton.waitFor({
  state: 'visible',
  timeout: 15000
});

await loginButton.scrollIntoViewIfNeeded();
await loginButton.click({ timeout: 15000 });
  
 //await page.locator('button').filter({ hasText: 'Login' }).first().click();


console.log(
  'View profile count:',
  await page.getByText('View profile', { exact: true }).count()
);

  //await page.locator('button.btn-primary.loginButton').click();

  await page.waitForLoadState('domcontentloaded');

  const viewProfile = page.getByText('View profile', {
  exact: true
});

await viewProfile.waitFor({
  state: 'visible',
  timeout: 30000
});

await viewProfile.click();

  //await page.getByText('View profile', { exact: true }).click();

 await page.getByRole('button', { name: 'Edit resume headline' }).click();

  const headline =
    headlines[Math.floor(Math.random() * headlines.length)];


console.log('Selected resume headline:', headline);

  await page.getByRole('textbox', {
    name: 'Resume headline'
  }).fill(headline);

  await page.getByRole('button', {
    name: 'Save'
  }).click();

  await page.waitForTimeout(3000);

  console.log('Resume headline save action completed.');

  await page.screenshot({
    path: 'headline-updated.png',
    fullPage: true
  });
});