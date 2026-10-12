
import 'dotenv/config';
import { test, expect } from '@playwright/test';
import { getNaukriOtp } from '../gmail-otp.mjs';

test.describe.configure({ retries: 0 });

test('Update Naukri Profile', async ({ page }) => {
  test.setTimeout(180000);

  const headlines = [
    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Functional Testing | Regression Testing | POM | Performance Testing JMeter | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    'Senior Engineer | 4+ YOE | Playwright | JavaScript | Automation Testing | Manual Testing | Functional Testing | Regression Testing | POM Framework | JMeter Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',

    '4+ YOE | QA Automation Engineer | Playwright | JavaScript | POM Framework | Automation Testing | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | JMeter | Performance Testing | Test Case Creation | SDLC | STLC | Agile | Healthcare | Insurance | Claims | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation Engineer | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM | JMeter | Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Insurance | Claims | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP',

    'Senior Engineer with 4+ YOE | Playwright Automation | JavaScript | Manual & Automation Testing | POM | Functional Testing | Regression Testing | JMeter Performance Testing | Test Case Creation | Agile | SDLC | STLC | US Healthcare | Insurance | Claims | HIPAA | HL7 | Clinical Trials | CFR Part 11 | GCP',

    '4+ YOE | Playwright | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM Framework | Performance Testing | JMeter | Test Case Design | SDLC | STLC | Agile | Healthcare | Claims | Insurance | HIPAA | HL7 | GCP',

    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Automation Testing | POM Framework | Functional & Regression Testing | Smoke Testing | JMeter Performance Testing | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP'
  ];

  const username = process.env.NAUKRI_USERNAME;
  const password = process.env.NAUKRI_PASSWORD;

  if (!username || !password) {
    throw new Error('Naukri credentials are missing from environment variables.');
  }

  // Never print credentials or OTP values.
  page.setDefaultTimeout(15000);

  const loginUrl =
    'https://www.naukri.com/nlogin/login?URL=https://www.naukri.com/mnjuser/homepage';

  console.log('Opening Naukri login page...');

  await page.goto(loginUrl, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.locator('#usernameField').waitFor({
    state: 'visible',
    timeout: 20000
  });

  await page.locator('#usernameField').fill(username);
  await page.locator('#passwordField').fill(password);

  // Start the timestamp immediately before submitting credentials.
  const loginStartedAt = Date.now();

  console.log('Submitting login form once...');

  await page.locator('#login_Layer')
    .getByRole('button', { name: /^Login$/i })
    .click()
    .catch(async () => {
      // Fallback for pages where Login is outside #login_Layer.
      await page.getByRole('button', { name: /^Login$/i }).first().click();
    });

  // Wait for either the OTP screen or a logged-in page.
  await page.waitForTimeout(3000);

  console.log('URL after login submission:', page.url());

  const otpPrompt = page.getByText(/Enter the OTP sent to/i).first();

  const otpRequired = await otpPrompt.isVisible().catch(() => false);

  if (otpRequired) {
    console.log('OTP screen detected. Waiting for Gmail OTP...');

    await page.screenshot({
      path: 'after-selecting-otp.png',
      fullPage: true
    });

    // The Gmail function must return the OTP received for this login attempt.
    const otp = await getNaukriOtp(loginStartedAt, 120000);

    if (!/^\d{4,8}$/.test(otp)) {
      throw new Error('Gmail returned an OTP with an unexpected format.');
    }

    // Prefer an input explicitly identified as an OTP field.
    const otpSelectors = [
      'input[autocomplete="one-time-code"]',
      'input[placeholder*="OTP" i]',
      'input[aria-label*="OTP" i]',
      'input[name*="otp" i]',
      'input[id*="otp" i]'
    ];

    let otpInput = null;

    for (const selector of otpSelectors) {
      const candidate = page.locator(selector).first();

      if (await candidate.isVisible().catch(() => false)) {
        otpInput = candidate;
        break;
      }
    }

    // Fallback: inspect visible, editable text-like inputs only.
    if (!otpInput) {
      const candidates = page.locator(
        'input:visible:not([type="hidden"]):not([type="password"]):not([type="email"]):not([type="search"])'
      );

      const count = await candidates.count();

      for (let i = 0; i < count; i++) {
        const candidate = candidates.nth(i);

        const details = await candidate.evaluate(el => ({
          disabled: el.disabled,
          readOnly: el.readOnly,
          type: el.type,
          maxLength: el.maxLength
        }));

        if (
          !details.disabled &&
          !details.readOnly &&
          ['text', 'tel', 'number', ''].includes(details.type)
        ) {
          otpInput = candidate;
          break;
        }
      }
    }

    if (!otpInput) {
      await page.screenshot({
        path: 'otp-input-not-found.png',
        fullPage: true
      });

      throw new Error(
        'OTP was retrieved, but the OTP input could not be identified. Inspect otp-input-not-found.png.'
      );
    }

    // Fill the OTP without logging its value.
    await otpInput.fill(otp);

    console.log('OTP entered. Submitting verification...');

    const verifyButton = page.getByRole('button', {
      name: /^(verify|verify otp|submit)$/i
    }).first();

    await verifyButton.waitFor({
      state: 'visible',
      timeout: 10000
    });

    await verifyButton.click();

    // Wait for verification to finish before touching the profile.
    await page.waitForTimeout(5000);

    await page.screenshot({
      path: 'after-otp-verification.png',
      fullPage: true
    });
  } else {
    console.log('OTP prompt not detected immediately.');
  }

  // Confirm that login actually succeeded.
  const loggedIn = await page.waitForFunction(() => {
    const url = location.href;
    const text = document.body?.innerText ?? '';

    const otpStillVisible = /Enter the OTP sent to/i.test(text);

    const loggedInUrl =
      /mnjuser\/(homepage|profile|resume)/i.test(url);

    const profileControlVisible =
      [...document.querySelectorAll('a, button')]
        .some(el =>
          el.getClientRects().length > 0 &&
          /view profile|my profile|edit resume headline/i.test(
            el.innerText || el.getAttribute('aria-label') || ''
          )
        );

    return !otpStillVisible && (loggedInUrl || profileControlVisible);
  }, { timeout: 20000 }).then(() => true).catch(() => false);

  if (!loggedIn) {
    await page.screenshot({
      path: 'login-not-confirmed.png',
      fullPage: true
    });

    const body = await page.locator('body').innerText().catch(() => '');

    console.log('Final URL:', page.url());
    console.log('Final title:', await page.title());
    console.log('Final page content:', body.slice(0, 1500));

    throw new Error(
      'Login was not confirmed. Inspect after-otp-verification.png and login-not-confirmed.png.'
    );
  }

  console.log('Login confirmed. Opening profile...');

  // Prefer the profile link/control available on the authenticated page.
  const viewProfile = page.getByText('View profile', { exact: true }).first();

  if (await viewProfile.isVisible().catch(() => false)) {
    await viewProfile.click();
  } else {
    await page.goto('https://www.naukri.com/mnjuser/homepage', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
  }

  const editHeadline = page.getByRole('button', {
    name: /edit resume headline/i
  }).first();

  await editHeadline.waitFor({
    state: 'visible',
    timeout: 20000
  });

  await editHeadline.click();

  const headline = headlines[
    Math.floor(Math.random() * headlines.length)
  ];

  const headlineInput = page.getByRole('textbox', {
    name: /resume headline/i
  });

  await headlineInput.waitFor({ state: 'visible' });
  await headlineInput.fill(headline);

  // Use the first visible Save button to avoid strict-mode ambiguity.
  const saveButtons = page.getByRole('button', { name: /^Save$/i });
  const saveCount = await saveButtons.count();

  let saveClicked = false;

  for (let i = 0; i < saveCount; i++) {
    const button = saveButtons.nth(i);

    if (await button.isVisible().catch(() => false)) {
      await button.click();
      saveClicked = true;
      break;
    }
  }

  if (!saveClicked) {
    throw new Error('Could not find a visible Save button for the headline.');
  }

  await page.waitForTimeout(3000);

  await page.screenshot({
    path: 'headline-updated.png',
    fullPage: true
  });

  console.log('Resume headline save action completed.');
});