
import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { getNaukriOtp } from '../gmail-otp.mjs';

test('Update Naukri Profile', async ({ page }) => {
  test.setTimeout(120000);

  const username = process.env.NAUKRI_USERNAME;
  const password = process.env.NAUKRI_PASSWORD;

  if (!username || !password) {
    throw new Error('NAUKRI_USERNAME or NAUKRI_PASSWORD is missing.');
  }

  const headlines = [
    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Functional Testing | Regression Testing | POM | Performance Testing JMeter | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    'Senior Engineer | 4+ YOE | Playwright | JavaScript | Automation Testing | Manual Testing | Functional Testing | Regression Testing | POM Framework | JMeter Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    '4+ YOE | QA Automation Engineer | Playwright | JavaScript | POM Framework | Automation Testing | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | JMeter | Performance Testing | Test Case Creation | SDLC | STLC | Agile | Healthcare | Insurance | Claims | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation Engineer | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM | JMeter | Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Insurance | Claims | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP',

    'Senior Engineer with 4+ YOE | Playwright Automation | JavaScript | Manual & Automation Testing | POM | Functional Testing | Regression Testing | JMeter Performance Testing | Test Case Creation | Agile | SDLC | STLC | US Healthcare | Insurance | Claims | HIPAA | HL7 | Clinical Trials | CFR Part 11 | GCP',

    '4+ YOE | Playwright | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM Framework | Performance Testing | JMeter | Test Case Design | SDLC | STLC | Agile | Healthcare | Claims | Insurance | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Automation Testing | POM Framework | Functional & Regression Testing | Smoke Testing | JMeter Performance Testing | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP'
  ];

  // Open Naukri login page.
  await page.goto(
    'https://www.naukri.com/nlogin/login?URL=https://www.naukri.com/mnjuser/homepage',
    {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    }
  );

  console.log('Initial URL:', page.url());
  console.log('Initial title:', await page.title());

  // Fill login form.
  const usernameField = page.locator('#usernameField');
  const passwordField = page.locator('#passwordField');

  await usernameField.waitFor({
    state: 'visible',
    timeout: 30000
  });

  await usernameField.fill(username);
  await passwordField.fill(password);

  // Submit password login.
  await page.getByRole('button', {
    name: 'Login',
    exact: true
  }).click();

  // Allow the server response and client-side navigation to occur.
  await page.waitForTimeout(4000);

  console.log('After password login URL:', page.url());
  console.log('After password login title:', await page.title());

  // Capture the actual login result for diagnosis.
  await page.screenshot({
    path: 'after-password-login.png',
    fullPage: true
  });

  const bodyText = await page.locator('body')
    .innerText()
    .catch(() => '');

  console.log(
    'Login page indicators:',
    bodyText.slice(0, 1500)
  );

  // Check whether login has already reached the dashboard.
  const viewProfile = page.getByText('View profile', {
    exact: true
  });

  let loggedIn = await viewProfile.isVisible().catch(() => false);

  // If password login did not succeed, inspect possible OTP flow.
  if (!loggedIn) {
    const loginError = page.getByText(
      'Something went wrong. Please try again.',
      { exact: true }
    );

    const hasLoginError = await loginError
      .isVisible()
      .catch(() => false);

    const otpButton = page.getByRole('button', {
      name: 'Use OTP to Login',
      exact: true
    });

    const hasOtpButton = await otpButton
      .isVisible()
      .catch(() => false);

    if (hasLoginError) {
      console.log(
        'Naukri returned a login error after password submission.'
      );
    }

    if (hasOtpButton) {
      console.log('Trying the OTP login option.');

      await otpButton.click();
      await page.waitForTimeout(2000);

      console.log('After selecting OTP URL:', page.url());

      await page.screenshot({
        path: 'after-selecting-otp.png',
        fullPage: true
      });

      // This part assumes your existing getNaukriOtp() function
      // retrieves the newest Naukri OTP from Gmail.
      const otp = await getNaukriOtp();

      if (!otp) {
        throw new Error(
          'No Naukri OTP was returned by getNaukriOtp().'
        );
      }

      // Locate the OTP field without assuming one specific HTML ID.
      const otpField = page.locator(
        'input[autocomplete="one-time-code"], input[name*="otp" i], input[id*="otp" i], input[placeholder*="otp" i]'
      ).first();

      await otpField.waitFor({
        state: 'visible',
        timeout: 15000
      });

      await otpField.fill(String(otp));

      // Inspect the page's actual buttons before changing this
      // selector if Naukri uses a different verification label.
      const verifyButton = page.getByRole('button', {
        name: /verify|submit|continue|login/i
      }).first();

      await verifyButton.click();

      await page.waitForTimeout(5000);

      await page.screenshot({
        path: 'after-otp-verification.png',
        fullPage: true
      });

      loggedIn = await viewProfile
        .isVisible()
        .catch(() => false);
    }
  }

  // Never attempt profile editing unless the dashboard is visible.
  if (!loggedIn) {
    console.log('Final URL:', page.url());
    console.log('Final title:', await page.title());

    const finalBody = await page.locator('body')
      .innerText()
      .catch(() => '');

    console.log('Final page content:', finalBody.slice(0, 2000));

    throw new Error(
      'Login was not confirmed. Inspect after-password-login.png, after-selecting-otp.png if created, and after-otp-verification.png if created.'
    );
  }

  console.log('Login confirmed. Opening profile.');

  await viewProfile.click();

  // Open the resume headline editor.
  const editHeadlineButton = page.getByRole('button', {
    name: 'Edit resume headline'
  });

  await editHeadlineButton.waitFor({
    state: 'visible',
    timeout: 30000
  });

  await editHeadlineButton.click();

  // Select one headline randomly.
  const headline =
    headlines[Math.floor(Math.random() * headlines.length)];

  console.log('Selected resume headline:', headline);

  const headlineField = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  await headlineField.waitFor({
    state: 'visible',
    timeout: 15000
  });

  await headlineField.fill(headline);

  await page.getByRole('button', {
    name: 'Save',
    exact: true
  }).click();

  // Wait for the save request/UI update.
  await page.waitForTimeout(3000);

  console.log('Save action completed.');

  await page.screenshot({
    path: 'headline-updated.png',
    fullPage: true
  });

  // Verify the saved headline if the editor remains visible.
  const savedHeadline = await page.getByRole('textbox', {
    name: 'Resume headline'
  }).inputValue().catch(() => null);

  if (savedHeadline !== null) {
    console.log('Headline field after save:', savedHeadline);
  }
});