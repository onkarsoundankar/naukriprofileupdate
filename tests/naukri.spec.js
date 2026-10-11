
import 'dotenv/config';
import { test } from '@playwright/test';
import { getNaukriOtp } from '../gmail-otp.mjs';

test('Update Naukri Profile', async ({ page }) => {
  test.setTimeout(180000);

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

  await page.locator('#login_Layer').click();

  await page.getByLabel('Email ID / Username')
    .fill(process.env.NAUKRI_USERNAME);

  await page.getByLabel('Password')
    .fill(process.env.NAUKRI_PASSWORD);

  // Capture the start time immediately before submitting the login form.
  const loginStartedAt = Date.now();

  const loginResponsePromise = page.waitForResponse(
    response =>
      response.request().method() === 'POST' &&
      /central-login-services\/v1\/login/i.test(response.url()),
    { timeout: 20000 }
  ).catch(() => null);

  await page.locator('button.btn-primary.loginButton').click();

  const loginResponse = await loginResponsePromise;

  if (loginResponse) {
    console.log('Login HTTP status:', loginResponse.status());
  } else {
    console.log('Login response was not detected.');
  }

  // Wait for Naukri to render its next screen.
  await page.waitForTimeout(3000);

  const pageText = await page.locator('body').innerText().catch(() => '');
  console.log('OTP form visible:', /\bOTP\b/i.test(pageText));
  console.log(
    'Visible textbox count:',
    await page.getByRole('textbox').count()
  );
  console.log(
    'Visible button names:',
    await page.getByRole('button').allTextContents()
  );

  const viewProfile = page.getByRole('link', {
    name: 'View profile'
  });

  if (await viewProfile.count() === 0) {
    if (!/\bOTP\b/i.test(pageText)) {
      await page.screenshot({
        path: 'after-login.png',
        fullPage: true
      });

      throw new Error(
        'Login did not reach the profile or an identifiable OTP screen. ' +
        'Inspect after-login.png.'
      );
    }

    // Retrieve the OTP from Gmail without printing it.
    const otp = await getNaukriOtp(loginStartedAt, 90000);

    // Try common OTP input patterns. If Naukri changes its UI,
    // stop rather than guessing which field to fill.
    const otpCandidates = [
      page.getByLabel(/otp|verification code|one.time password/i),
      page.getByPlaceholder(/otp|verification code|one.time password/i),
      page.locator('input[autocomplete="one-time-code"]'),
      page.locator('input[inputmode="numeric"]')
    ];

    let otpInput = null;

    for (const candidate of otpCandidates) {
      const count = await candidate.count().catch(() => 0);

      if (count === 1 && await candidate.isVisible().catch(() => false)) {
        otpInput = candidate;
        break;
      }
    }

    if (!otpInput) {
      await page.screenshot({
        path: 'otp-form.png',
        fullPage: true
      });

      throw new Error(
        'Could not identify one unique visible OTP input. ' +
        'Inspect otp-form.png and adjust the selector.'
      );
    }

    await otpInput.fill(otp);

    const verifyButton = page.getByRole('button', {
      name: /^verify$/i
    });

    if (await verifyButton.count() !== 1) {
      await page.screenshot({
        path: 'otp-form.png',
        fullPage: true
      });

      throw new Error(
        'Could not identify one unique Verify button. ' +
        'Inspect otp-form.png.'
      );
    }

    await verifyButton.click();

    // Wait for Naukri to process the verification.
    await page.waitForTimeout(5000);
  }

  const profileLink = page.getByRole('link', {
    name: 'View profile'
  });

  if (await profileLink.count() === 0) {
    await page.screenshot({
      path: 'after-otp.png',
      fullPage: true
    });

    throw new Error(
      'Profile link not found after login/OTP. ' +
      'Inspect after-otp.png.'
    );
  }

  await profileLink.click();

  await page.getByRole('button', {
    name: 'Edit resume headline'
  }).click();

  const randomHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];

  const headline = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  await headline.fill(randomHeadline);

  await page.getByRole('button', {
    name: 'Save'
  }).click();

  // Verify that the save operation completed before ending the test.
  await page.waitForTimeout(3000);

  console.log('Resume headline save action completed.');

  await page.screenshot({
    path: 'headline-updated.png',
    fullPage: true
  });
});