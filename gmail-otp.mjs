import { google } from 'googleapis';
import fs from 'node:fs/promises';

export async function getNaukriOtp(loginStartedAt, timeoutMs = 120000) {
  const saved = JSON.parse(
    await fs.readFile('gmail-token.json', 'utf8')
  );

  const auth = new google.auth.OAuth2(
    saved.client_id,
    saved.client_secret
  );

  auth.setCredentials({
    refresh_token: saved.refresh_token
  });

  const gmail = google.gmail({ version: 'v1', auth });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:info@naukri.com newer_than:1d',
      maxResults: 20
    });

    console.log(
      'Naukri-related Gmail messages returned:',
      result.data.messages?.length ?? 0
    );

    for (const message of result.data.messages ?? []) {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      const email = response.data;
      const headers = email.payload?.headers ?? [];

      const getHeader = name =>
        headers.find(
          h => h.name?.toLowerCase() === name.toLowerCase()
        )?.value ?? '';

      const subject = getHeader('subject');
      const sender = getHeader('from');
      const receivedAt = Number(email.internalDate ?? 0);

      // Safe diagnostics only: never log the OTP or email body.
      console.log('Email metadata:', {
        sender,
        subject,
        receivedAfterLogin: receivedAt >= loginStartedAt
      });

      if (!/otp|verification code/i.test(subject)) continue;
      if (receivedAt < loginStartedAt) continue;

      const chunks = [];

      function collectParts(part) {
        if (part.body?.data) {
          chunks.push(
            Buffer.from(part.body.data, 'base64url').toString('utf8')
          );
        }

        for (const child of part.parts ?? []) {
          collectParts(child);
        }
      }

      if (email.payload) collectParts(email.payload);

      const body = chunks.join('\n')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ');

      const patterns = [
        /(?:otp|one[- ]time password|verification code)[^\d]{0,100}(\d{4,8})/i,
        /(\d{4,8})[^\d]{0,100}(?:otp|verification code)/i
      ];

      for (const pattern of patterns) {
        const match = body.match(pattern);

        if (match) {
          console.log('A new OTP was extracted successfully.');
          return match[1];
        }
      }

      console.log(
        'A recent verification email was found, but its OTP format did not match.'
      );
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error(
    'No usable new Naukri OTP was extracted. Review Gmail metadata logs.'
  );
}