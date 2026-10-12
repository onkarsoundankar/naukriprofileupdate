
import 'dotenv/config';
import { test } from '@playwright/test';
import { getNaukriOtp } from '../gmail-otp.mjs';

test.describe.configure({ retries: 0 });

test('Update Naukri Profile', async ({ page }) => {
  test.setTimeout(240000);

  const username = process.env.NAUKRI_USERNAME;
  const password = process.env.NAUKRI_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'NAUKRI_USERNAME or NAUKRI_PASSWORD is missing from environment variables.'
    );
  }

  const headlines = [
    '4+ YOE | Playwright Automation | JavaScript | Manual Testing | Functional Testing | Regression Testing | POM | Performance Testing JMeter | Test Case Creation | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',
    'Senior Engineer | 4+ YOE | Playwright | JavaScript | Automation Testing | Manual Testing | Functional Testing | Regression Testing | POM Framework | JMeter Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Claims | Insurance | HIPAA | Clinical Trials | HL7 | CFR Part 11 | GCP',
    '4+ YOE | QA Automation Engineer | Playwright | JavaScript | POM Framework | Automation Testing | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | JMeter | Performance Testing | Test Case Creation | SDLC | STLC | Agile | Healthcare | Insurance | Claims | HIPAA | HL7 | GCP',
    '4+ YOE | Playwright Automation Engineer | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM | JMeter | Performance Testing | Test Case Design | SDLC | STLC | Agile | US Healthcare | Insurance | Claims | Clinical Trials | HIPAA | HL7 | CFR Part 11 | GCP',
    '4+ YOE | Playwright | JavaScript | QA Automation | Manual Testing | Functional Testing | Regression Testing | Smoke Testing | POM Framework | Performance Testing | JMeter | Test Case Design | SDLC | STLC | Agile | Healthcare | Claims | Insurance | HIPAA | HL7 | GCP'
  ];

  const selectedHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];

  // Retry navigation for transient connection failures.
  async function navigateWithRetry(url, attempts = 3) {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        console.log(`Navigation attempt ${attempt}/${attempts}`);

        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 60000
        });

        console.log('Navigation completed:', page.url());
        return;
      } catch (error) {
        lastError = error;
        console.log(
          `Navigation attempt ${attempt} failed: ${error.message}`
        );

        if (attempt < attempts) {
          await page.waitForTimeout(3000);
        }
      }
    }

    throw lastError;
  }

  async function screenshot(name) {
    await page.screenshot({
      path: `test-results/${name}.png`,
      fullPage: true
    }).catch(() => {});
  }

  async function firstVisible(locator) {
    const count = await locator.count();

    for (let i = 0; i < count; i++) {
      const element = locator.nth(i);

      if (await element.isVisible().catch(() => false)) {
        return element;
      }
    }

    return null;
  }

  console.log('Opening Naukri login page...');

  await navigateWithRetry(
    'https://www.naukri.com/nlogin/login?URL=https://www.naukri.com/mnjuser/homepage'
  );

  const usernameField = page.locator('#usernameField');
  const passwordField = page.locator('#passwordField');

  await usernameField.waitFor({
    state: 'visible',
    timeout: 30000
  });

  await usernameField.fill(username);
  await passwordField.fill(password);

  // Click Login only once to avoid generating duplicate OTPs.
  const loginButton = await firstVisible(
    page.getByRole('button', { name: /^Login$/i })
  );

  if (!loginButton) {
    await screenshot('login-button-not-found');
    throw new Error('Could not find a visible Login button.');
  }

  const loginStartedAt = Date.now();

  console.log('Submitting login form once...');
  await loginButton.click();

  // Wait for either an OTP challenge or a real signed-in indicator.
  try {
    await page.waitForFunction(
      () => {
        const body = document.body?.innerText || '';

        const otpPrompt =
          /enter the otp sent to|verify otp|verify your otp/i.test(body);

        const signedIn =
          /view profile|my profile|edit resume headline/i.test(body);

        return otpPrompt || signedIn;
      },
      null,
      { timeout: 20000 }
    );
  } catch {
    await screenshot('login-state-not-detected');

    throw new Error(
      'Neither an OTP prompt nor a signed-in profile indicator appeared after login submission.'
    );
  }

  let bodyText = await page.locator('body').innerText().catch(() => '');
  let otpRequired =
    /enter the otp sent to|verify otp|verify your otp/i.test(bodyText);

  if (otpRequired) {
    console.log('OTP challenge detected. Waiting for the new Gmail OTP...');

    const otp = await getNaukriOtp(loginStartedAt, 120000);

    if (!/^\d{4,8}$/.test(otp)) {
      throw new Error('The extracted OTP does not have a valid format.');
    }

    // Prefer a specifically labelled OTP input.
    const otpSelectors = [
      'input[autocomplete="one-time-code"]',
      'input[placeholder*="OTP" i]',
      'input[aria-label*="OTP" i]',
      'input[name*="otp" i]',
      'input[id*="otp" i]'
    ];

    let otpField = null;

    for (const selector of otpSelectors) {
      otpField = await firstVisible(page.locator(selector));

      if (otpField) break;
    }

    if (otpField) {
      // Handle a single OTP input.
      await otpField.fill(otp);
    } else {
      // Some pages use one input per OTP digit.
      const visibleInputs = [];
      const inputs = page.locator('input');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);

        if (!(await input.isVisible().catch(() => false))) continue;
        if (!(await input.isEditable().catch(() => false))) continue;

        const type = await input.getAttribute('type');

        if (type === 'password' || type === 'hidden') continue;

        visibleInputs.push(input);
      }

      if (visibleInputs.length < otp.length) {
        await screenshot('otp-input-not-found');

        throw new Error(
          'Could not identify the OTP input. Inspect the OTP page screenshot.'
        );
      }

      // Only use digit-by-digit filling when there are enough inputs
      // and each of the first OTP-length inputs accepts a single digit.
      const digitInputs = visibleInputs.slice(0, otp.length);
      let supportsSeparateDigits = true;

      for (const input of digitInputs) {
        const maxLength = await input.getAttribute('maxlength');

        if (maxLength !== '1') {
          supportsSeparateDigits = false;
          break;
        }
      }

      if (!supportsSeparateDigits) {
        await screenshot('otp-input-not-found');

        throw new Error(
          'The OTP field was not identifiable. Stopping rather than typing the OTP into an unrelated field.'
        );
      }

      for (let i = 0; i < otp.length; i++) {
        await digitInputs[i].fill(otp[i]);
      }
    }

    const verifyButton = await firstVisible(
      page.getByRole('button', {
        name: /^(verify|verify otp|submit)$/i
      })
    );

    if (!verifyButton) {
      await screenshot('verify-button-not-found');
      throw new Error('Could not find a visible OTP Verify button.');
    }

    console.log('Submitting OTP once...');
    await verifyButton.click();

    // Wait for the OTP challenge to disappear or a signed-in indicator.
    await page.waitForFunction(
      () => {
        const body = document.body?.innerText || '';

        const otpPrompt =
          /enter the otp sent to|verify otp|verify your otp/i.test(body);

        const signedIn =
          /view profile|my profile|edit resume headline/i.test(body);

        return signedIn || !otpPrompt;
      },
      null,
      { timeout: 30000 }
    ).catch(() => {});

    await page.waitForTimeout(2000);
  }

  bodyText = await page.locator('body').innerText().catch(() => '');

  otpRequired =
    /enter the otp sent to|verify otp|verify your otp/i.test(bodyText);

  if (otpRequired) {
    await screenshot('otp-verification-incomplete');
    throw new Error(
      'The OTP challenge is still visible. Login was not confirmed.'
    );
  }

  // Do not claim login succeeded merely because the login request returned.
  let viewProfile = await firstVisible(
    page.getByText('View profile', { exact: true })
  );

  let myProfile = await firstVisible(
    page.getByText('My profile', { exact: true })
  );

  let editHeadline = await firstVisible(
    page.getByRole('button', { name: /edit resume headline/i })
  );

  if (!viewProfile && !myProfile && !editHeadline) {
    await screenshot('login-not-confirmed');

    throw new Error(
      'No profile-specific indicator was found. Login cannot be confirmed safely.'
    );
  }

  console.log('Profile indicator detected. Opening profile...');

  if (viewProfile) {
    await viewProfile.click();
  } else if (myProfile) {
    await myProfile.click();
  } else if (!editHeadline) {
    await navigateWithRetry(
      'https://www.naukri.com/mnjuser/homepage'
    );
  }

  await page.waitForTimeout(2000);

  // Locate the resume headline editor.
  editHeadline = await firstVisible(
    page.getByRole('button', { name: /edit resume headline/i })
  );

  if (editHeadline) {
    await editHeadline.click();
  } else {
    const resumeHeadline = await firstVisible(
      page.getByText('Resume headline', { exact: true })
    );

    if (resumeHeadline) {
      console.log(
        'Resume headline section found; looking for its edit control.'
      );
    } else {
      // A transient navigation error may have interrupted the page.
      await navigateWithRetry(
        'https://www.naukri.com/mnjuser/homepage'
      );
    }

    editHeadline = await firstVisible(
      page.getByRole('button', { name: /edit resume headline/i })
    );

    if (editHeadline) {
      await editHeadline.click();
    }
  }

  const headlineField = await firstVisible(
    page.getByRole('textbox', { name: /resume headline/i })
  );

  if (!headlineField) {
    await screenshot('headline-editor-not-found');

    throw new Error(
      'Could not find the Resume headline textbox. The page layout may have changed.'
    );
  }

  console.log('Updating resume headline...');
  await headlineField.fill(selectedHeadline);

  // Multiple Save buttons can exist on Naukri. Click a visible one only.
  const saveButton = await firstVisible(
    page.getByRole('button', { name: /^Save$/i })
  );

  if (!saveButton) {
    await screenshot('save-button-not-found');
    throw new Error('Could not find a visible Save button.');
  }

  await saveButton.click();

  await page.waitForTimeout(3000);
  await screenshot('headline-updated');

  console.log('Resume headline update submitted.');
});