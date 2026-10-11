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

  // Validate credentials without printing their values.
  if (
    !process.env.NAUKRI_USERNAME ||
    !process.env.NAUKRI_PASSWORD
  ) {
    throw new Error('Naukri credentials are missing.');
  }

  // Open Naukri.
  await page.goto('https://www.naukri.com/', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  console.log('Initial URL:', page.url());
  console.log('Initial title:', await page.title());

  console.log(
    'Access Denied heading count:',
    await page.getByRole('heading', {
      name: 'Access Denied'
    }).count()
  );

  console.log(
    'Jobseeker Login count:',
    await page.getByTitle('Jobseeker Login').count()
  );

  await page.screenshot({
    path: 'naukri-homepage.png',
    fullPage: true
  });

  // Open the login form.
  await page.locator('#login_Layer').click();

  await page
    .getByLabel('Email ID / Username')
    .fill(process.env.NAUKRI_USERNAME);

  await page
    .getByLabel('Password')
    .fill(process.env.NAUKRI_PASSWORD);

  // Submit login.
  await page.locator('button.btn-primary.loginButton').click();

  // Allow the login response to appear.
  await page.waitForTimeout(5000);

  console.log('After login URL:', page.url());
  console.log('After login title:', await page.title());

  // Inspect visible page text for diagnostic purposes.
  // Do not print credentials, OTP values, or input field values.
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
    ['Enter code', /enter.{0,30}code/i],
    ['Access denied', /access denied/i],
    ['Incorrect credentials', /incorrect.{0,30}(password|credential)/i],
    ['Invalid credentials', /invalid.{0,30}(password|credential)/i]
  ];

  for (const [label, pattern] of diagnosticChecks) {
  console.log(label + ': ' + pattern.test(pageText));
}
  console.log(
    'View profile link count:',
    await page.getByRole('link', {
      name: 'View profile'
    }).count()
  );

  // Save a screenshot of the state after login.
  await page.screenshot({
    path: 'after-login.png',
    fullPage: true
  });

  // Stop with a clear message if the profile is not available.
  const viewProfile = page.getByRole('link', {
    name: 'View profile'
  });

  if (await viewProfile.count() === 0) {
    throw new Error(
      'Login did not reach the expected profile state. ' +
      'Inspect the login diagnostics and after-login.png artifact.'
    );
  }

  // Open profile.
  await viewProfile.click();

  // Edit resume headline.
  await page
    .getByRole('button', {
      name: 'Edit resume headline'
    })
    .click();

  // Select a random headline.
  const randomHeadline =
    headlines[Math.floor(Math.random() * headlines.length)];

  console.log('Selected headline:', randomHeadline);

  // Update headline.
  const headline = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  await headline.fill(randomHeadline);

  // Save the headline.
  await page.locator('button.btn-dark-ot:visible').click();

  // Verify after reloading.
  await page.reload({
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForTimeout(5000);

  console.log('Final URL:', page.url());

  const savedHeadline = page.getByRole('textbox', {
    name: 'Resume headline'
  });

  if (await savedHeadline.count() > 0) {
    console.log(
      'Headline visible after reload:',
      (await savedHeadline.first().inputValue()) === randomHeadline
    );
  } else {
    console.log(
      'Headline textbox not visible after reload; ' +
      'verify the saved headline on the profile page.'
    );
  }

  console.log('Naukri profile update flow completed.');
});
