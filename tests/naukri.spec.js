
import 'dotenv/config';
import { test } from '@playwright/test';
import { getNaukriOtp } from '../gmail-otp.mjs';

test('Update Naukri Profile', async ({ page }) => {
  test.setTimeout(240000);

  const headlines = [
    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Functional Testing | Regression Testing | POM | Performance Testing JMeter | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    'Senior Engineer | 4+ YOE | Playwright | JavaScript | Automation Testing | Manual Testing | Functional Testing | Regression Testing | POM Framework | JMeter Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    '4+ YOE | QA Automation Engineer | Playwright | JavaScript | POM Framework | Automation Testing | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | JMeter | Performance Testing | Test Case Creation | SDLC | STLC | Agile | Healthcare | Insurance | Claims | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation Engineer | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM | JMeter | Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Insurance | Claims | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP',

    'Senior Engineer with 4+ YOE | Playwright Automation | JavaScript | Manual & Automation Testing | POM | Functional Testing | Regression Testing | JMeter Performance Testing | Test Case Creation | Agile | SDLC | STLC | US Healthcare | Insurance | Claims | HIPAA | HL7 | Clinical Trials | CFR Part 11 | GCP',

    '4+ YOE | Playwright | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM Framework | Performance Testing | JMeter | Test Case Design | SDLC | STLC | Agile | Healthcare | Claims | Insurance | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Automation Testing | POM Framework | Functional & Regression Testing | Smoke Testing | JMeter Performance Testing | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP'
  ];

  if (!process.env.NAUKRI_USERNAME || !process.env.NAUKRI_PASSWORD) {
    throw new Error('Naukri credentials are missing.');
  }

  const isVisible = async locator =>
    locator.isVisible().catch(() => false);

  const profileLink = page.getByRole('link', {
    name: 'View profile'
  });

  const verifyButton = page.getByRole('button', {
    name: /^verify$/i
  });

  const getOtpButton = page.getByRole('button', {
    name: /^get otp$/i
  });

  const useOtpButton = page.getByRole('button', {
    name: /use otp to login/i
  });

  async function detectState(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await isVisible(profileLink)) {
        return 'profile';
      }

      if (await isVisible(verifyButton)) {
        return 'verify';
      }

      if (await isVisible(getOtpButton)) {
        return 'get-otp';
      }

      if (await isVisible(useOtpButton)) {
        return 'use-otp';
      }

      await page.waitForTimeout(500);
    }

    return 'unknown';
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

  await page.locator('button.btn-primary.loginButton').click();

  let state = await detectState();

  console.log('State after password login:', state);

  // If the password login did not succeed, select the site's OTP option.
  if (state === 'use-otp') {
    await useOtpButton.click();
    state = await detectState();

    console.log('State after selecting OTP login:', state);
  }

  // Request a fresh OTP only when the Get OTP action is visible.
  let loginStartedAt = 0;

  if (state === 'get-otp') {
    // Start the timestamp immediately before requesting the code.
    loginStartedAt = Date.now();

    await getOtpButton.click();

    console.log('Clicked Get OTP.');

    state = await detectState();

    console.log('State after requesting OTP:', state);
  }

  // If the UI changed to an intermediate screen, stop instead of
  // repeatedly polling Gmail for an OTP that may not have been sent.
  if (state === 'unknown') {
    await page.screenshot({
      path: 'after-login.png',
      fullPage: true
    });

    throw new Error(
      'Login did not reach the profile, Get OTP, or Verify screen. ' +
      'Inspect after-login.png.'
    );
  }

  if (state === 'verify') {
    if (!loginStartedAt) {
      throw new Error(
        'Verification screen appeared without a recorded Get OTP request. ' +
        'Cannot safely determine which email contains the correct OTP.'
      );
    }

    console.log('Actual Verify screen detected.');

    const otp = await getNaukriOtp(loginStartedAt, 120000);

    const otpCandidates = [
      page.getByLabel(/otp|verification code|one.time password/i),
      page.getByPlaceholder(/otp|verification code|one.time password/i),
      page.locator('input[autocomplete="one-time-code"]'),
      page.locator('input[inputmode="numeric"]')
    ];

    let otpInput = null;

    for (const candidate of otpCandidates) {
      const count = await candidate.count().catch(() => 0);

      if (
        count === 1 &&
        await candidate.isVisible().catch(() => false)
      ) {
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
        'Verify screen found, but no unique visible OTP field was identified. ' +
        'Inspect otp-form.png.'
      );
    }

    await otpInput.fill(otp);
    await verifyButton.click();

    state = await detectState(20000);

    console.log('State after OTP verification:', state);

    if (state !== 'profile') {
      await page.screenshot({
        path: 'after-otp.png',
        fullPage: true
      });

      throw new Error(
        'OTP verification did not reach the profile. ' +
        'Inspect after-otp.png.'
      );
    }
  }

  if (state !== 'profile') {
    await page.screenshot({
      path: 'after-login.png',
      fullPage: true
    });

    throw new Error(
      'Profile was not reached. Headline update was skipped.'
    );
  }

  await profileLink.click();

  await page.getByRole('button', {
    name: 'Edit resume headline'
  }).click();

  const headline =
    headlines[Math.floor(Math.random() * headlines.length)];

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