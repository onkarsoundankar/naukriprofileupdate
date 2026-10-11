import { google } from 'googleapis';
import fs from 'node:fs/promises';

const TOKEN_FILE = 'gmail-token.json';
const OTP_QUERY =
  'from:info@naukri.com subject:"Your OTP for logging in Naukri account" newer_than:1d';

export async function getNaukriOtp(loginStartedAt, timeoutMs = 90000) {
  const saved = JSON.parse(await fs.readFile(TOKEN_FILE, 'utf8'));

  const auth = new google.auth.OAuth2(
    saved.client_id,
    saved.client_secret
  );

  auth.setCredentials({ refresh_token: saved.refresh_token });

  const gmail = google.gmail({ version: 'v1', auth });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: OTP_QUERY,
      maxResults: 10,
    });

    for (const message of result.data.messages ?? []) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const receivedAt = Number(email.data.internalDate ?? 0);

      // Never accept an OTP email from before this login attempt.
      if (receivedAt < loginStartedAt) continue;

      const chunks = [];
      function collectParts(part) {
        if (part.body?.data) {
          chunks.push(
            Buffer.from(part.body.data, 'base64url').toString('utf8')
          );
        }
        for (const child of part.parts ?? []) collectParts(child);
      }

      if (email.data.payload) collectParts(email.data.payload);
      const body = chunks.join('\n');

      const patterns = [
        /(?:otp|one[- ]time password|verification code)[^\d]{0,40}(\d{4,8})/i,
        /(\d{4,8})[^\n]{0,40}(?:otp|verification code)/i,
      ];

      for (const pattern of patterns) {
        const match = body.match(pattern);
        if (match) return match[1];
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error(
    'No matching new Naukri OTP email arrived within the timeout.'
  );
}
