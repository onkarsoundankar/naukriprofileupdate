
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
  const seen = new Set();

  while (Date.now() < deadline) {
    const result = await gmail.users.messages.list({
      userId: 'me',
      q: 'from:info@naukri.com newer_than:1d',
      maxResults: 20
    });

    const messages = result.data.messages ?? [];
    const candidates = [];

    for (const message of messages) {
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      const email = response.data;
      const headers = email.payload?.headers ?? [];

      const header = name =>
        headers.find(
          h => h.name?.toLowerCase() === name.toLowerCase()
        )?.value ?? '';

      const subject = header('subject');
      const receivedAt = Number(email.internalDate ?? 0);

      if (!/otp|verification code/i.test(subject)) continue;
      if (receivedAt < loginStartedAt) continue;

      candidates.push({ email, receivedAt, id: message.id });
    }

    candidates.sort((a, b) => b.receivedAt - a.receivedAt);

    for (const item of candidates) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);

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

      if (item.email.payload) {
        collectParts(item.email.payload);
      }

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
          console.log('OTP extracted from a recent Naukri email.');
          return match[1];
        }
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  throw new Error('Timed out waiting for a usable Naukri OTP.');
}