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

  await page.goto('https://www.naukri.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Initial URL:', page.url());
  console.log('Initial title:', await page.title());

  await page.screenshot({
    path: 'naukri-homepage.png',
    fullPage: true
  });

  await page.locator('#login_Layer').click();

  await page.getByLabel('Email ID / Username')
    .fill(process.env.NAUKRI_USERNAME);

  await page.getByLabel('Password')
    .fill(process.env.NAUKRI_PASSWORD);

  // Observe likely login POST responses before submitting.
  const loginResponsePromise = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      /login|authenticate|auth/i.test(response.url()),
    { timeout: 15000 }
  ).catch(() => null);

  await page.locator('button.btn-primary.loginButton').click();

  const loginResponse = await loginResponsePromise;

  if (loginResponse) {
    console.log('Login response URL:', loginResponse.url());
    console.log('Login response status:', loginResponse.status());
    console.log(
      'Login response content type:',
      loginResponse.headers()['content-type'] || 'unknown'
    );

    const contentType =
      loginResponse.headers()['content-type'] || '';

    if (contentType.includes('application/json')) {
      const responseBody = await loginResponse.text().catch(() => '');
      console.log(
        'Login response body:',
        responseBody.slice(0, 1500)
      );
    }
  } else {
    console.log('No matching login POST response detected within 15 seconds.');
  }

  await page.waitForTimeout(5000);

  console.log('After login URL:', page.url());
  console.log('After login title:', await page.title());

  const pageText = (
    await page.locator('body').innerText().catch(() => '')
  ).slice(0, 4000);

  console.log('========== LOGIN DIAGNOSTICS ==========');
  console.log('Visible page text:', pageText);

  const diagnosticChecks = [
    ['OTP mention', /\botp\b/i],
    ['One-time password', /one.time password/i],
    ['Verification code', /verification code/i],
    ['Verify email', /verify your email/i],
    ['Access denied', /access denied/i],
    ['Something went wrong', /something went wrong/i],
    ['Incorrect credentials', /incorrect.{0,30}(password|credential)/i],
    ['Invalid credentials', /invalid.{0,30}(password|credential)/i]
  ];

  for (const [label, pattern] of diagnosticChecks) {
    console.log(`${label}: ${pattern.test(pageText)}`);
  }

  const viewProfile = page.getByRole('link', {
    name: 'View profile'
  });

  console.log('View profile link count:', await viewProfile.count());

  await page.screenshot({
    path: 'after-login.png',
    fullPage: true
  });

  if (await viewProfile.count() === 0) {
    throw new Error(
      'Login did not reach the profile. Inspect the login response ' +
      'and after-login.png artifact.'
    );
  }

  await viewProfile.click();

  await page.getByRole('button', {
    name: 'Edit resume headline'
  }).click();

  const randomHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];

  console.log('Selected headline:', randomHeadline);

  const headline = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  await headline.fill(randomHeadline);
  await page.locator('button.btn-dark-ot:visible').click();

  await page.reload({
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  console.log('Final URL:', page.url());
  console.log('Naukri profile update flow completed.');
});