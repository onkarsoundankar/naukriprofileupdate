// @ts-check
import 'dotenv/config';
import { test } from '@playwright/test';

test('Update Naukri Profile', async ({ page }) => {

  const headlines = [
    "4+ YOE | Playwright Automation | JavaScript | Manual Testing | Functional Testing | Regression Testing | POM | Performance Testing JMeter | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP",

    "Senior Engineer | 4+ YOE | Playwright | JavaScript | Automation Testing | Manual Testing | Functional Testing | Regression Testing | POM Framework | JMeter Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP",

    "4+ YOE | QA Automation Engineer | Playwright | JavaScript | POM Framework | Automation Testing | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | JMeter | Performance Testing | Test Case Creation | SDLC | STLC | Agile | Healthcare | Insurance | Claims | HIPAA | HL7 | GCP",

    "4+ YOE | Playwright Automation Engineer | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM | JMeter | Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Insurance | Claims | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP",

    "Senior Engineer with 4+ YOE | Playwright Automation | JavaScript | Manual & Automation Testing | POM | Functional Testing | Regression Testing | JMeter Performance Testing | Test Case Creation | Agile | SDLC | STLC | US Healthcare | Insurance | Claims | HIPAA | HL7 | Clinical Trials | CFR Part 11 | GCP",

    "4+ YOE | Playwright | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM Framework | Performance Testing | JMeter | Test Case Design | SDLC | STLC | Agile | Healthcare | Claims | Insurance | HIPAA | HL7 | GCP",

    "4+ YOE | Playwright Automation | JavaScript | Manual Testing | Automation Testing | POM Framework | Functional & Regression Testing | Smoke Testing | JMeter Performance Testing | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP"
  ];

  if (!process.env.NAUKRI_USERNAME || !process.env.NAUKRI_PASSWORD) {
    throw new Error('Naukri credentials are missing.');
  }

  // Open Naukri
  await page.goto('https://www.naukri.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  console.log(
    'Access Denied:',
    await page.getByRole('heading', { name: 'Access Denied' }).count()
  );

  console.log(
    'Jobseeker Login:',
    await page.getByTitle('Jobseeker Login').count()
  );

  await page.screenshot({
    path: 'naukri-homepage.png',
    fullPage: true
  });

  // Login
  await page.locator('#login_Layer').click();

  await page
    .getByLabel('Email ID / Username')
    .fill(process.env.NAUKRI_USERNAME);

  await page
    .getByLabel('Password')
    .fill(process.env.NAUKRI_PASSWORD);

  await page.locator('button.btn-primary.loginButton').click();

  await page.waitForTimeout(5000);

  console.log('After login URL:', page.url());
  console.log('After login Title:', await page.title());

  console.log(
    'View profile count:',
    await page.getByRole('link', { name: 'View profile' }).count()
  );

  await page.screenshot({
    path: 'after-login.png',
    fullPage: true
  });

  // Open profile
  await page
    .getByRole('link', { name: 'View profile' })
    .click();

  // Edit resume headline
  await page
    .getByRole('button', { name: 'Edit resume headline' })
    .click();

  // Select random headline
  const randomHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];

  console.log('Selected headline:', randomHeadline);

  // Update headline
  const headline = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  await headline.fill(randomHeadline);

  // Save
  await page.locator('button.btn-dark-ot:visible').click();

  // Verify by reloading
  await page.reload({
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  console.log('Final URL:', page.url());
  console.log('Naukri profile update completed.');
});