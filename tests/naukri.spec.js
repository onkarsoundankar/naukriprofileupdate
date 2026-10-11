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

  // Helpers to identify the actual UI state.
  const profileLink = page.getByRole('link', {
    name: 'View profile'
  });

  const verifyButton = page.getByRole('button', {
    name: /^verify$/i
  });

  async function isVisible(locator) {
    return locator.isVisible().catch(() => false);
  }

  async function waitForLoginState(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (await isVisible(profileLink)) {
        return 'profile';
      }

      if (await isVisible(verifyButton)) {
        return 'otp';
      }

      await page.waitForTimeout(500);
    }

    return 'unknown';
  }

  // Open Naukri.
  await page.goto('https://www.naukri.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Open the login modal.
  await page.locator('#login_Layer').click();

  const usernameInput = page.getByLabel('Email ID / Username');
  const passwordInput = page.getByLabel('Password');

  await usernameInput.fill(process.env.NAUKRI_USERNAME);
  await passwordInput.fill(process.env.NAUKRI_PASSWORD);

  // Submit the password login.
  let loginStartedAt = Date.now();

  await page.locator('button.btn-primary.loginButton').click();

  let state = await waitForLoginState(15000);

  console.log('State after password login:', state);

  // If the password login stays on the login modal, try the site's
  // explicit OTP-login option. Do not mistake its label for a
  // verification screen.
  if (state === 'unknown') {
    const useOtpButton = page.getByRole('button', {
      name: /use otp to login/i
    });

    if (await isVisible(useOtpButton)) {
      console.log('Password login did not reach verification.');
      console.log('Trying the explicit OTP-login option.');

      loginStartedAt = Date.now();
      await useOtpButton.click();

      state = await waitForLoginState(15000);

      console.log('State after selecting OTP login:', state);
    }
  }

  // Save a screenshot and stop if neither the profile nor a real
  // verification screen appeared.
  if (state === 'unknown') {
    await page.screenshot({
      path: 'after-login.png',
      fullPage: true
    });

    throw new Error(
      'Login did not reach the profile or a visible Verify screen. ' +
      'Inspect after-login.png. Gmail OTP retrieval was not attempted.'
    );
  }

  // Handle OTP only when the actual Verify button is visible.
  if (state === 'otp') {
    console.log('Actual OTP verification screen detected.');

    // Retrieve a new OTP without printing it to the logs.
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
        'A Verify screen appeared, but no unique visible OTP input ' +
        'was identified. Inspect otp-form.png.'
      );
    }

    await otpInput.fill(otp);
    await verifyButton.click();

    // Wait for successful verification and profile access.
    state = await waitForLoginState(20000);

    console.log('State after OTP verification:', state);

    if (state !== 'profile') {
      await page.screenshot({
        path: 'after-otp.png',
        fullPage: true
      });

      throw new Error(
        'OTP submission did not reach the profile. ' +
        'Inspect after-otp.png.'
      );
    }
  }

  // Open the profile and edit the headline.
  await profileLink.click();

  await page.getByRole('button', {
    name: 'Edit resume headline'
  }).click();

  const randomHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];

  const headlineInput = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  await headlineInput.fill(randomHeadline);

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
