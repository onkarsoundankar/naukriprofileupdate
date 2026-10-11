import { google } from 'googleapis';
import fs from 'node:fs/promises';

const saved = JSON.parse(
  await fs.readFile('gmail-token.json', 'utf8')
);

const auth = new google.auth.OAuth2(
  saved.client_id,
  saved.client_secret
);

auth.setCredentials({
  refresh_token: saved.refresh_token,
});

const gmail = google.gmail({ version: 'v1', auth });

const result = await gmail.users.messages.list({
  userId: 'me',
  q: 'newer_than:1d {from:naukri subject:OTP}',
  maxResults: 10,
});

const messages = result.data.messages ?? [];

console.log('Gmail API access: successful');
console.log('Recent matching email count:', messages.length);

for (const item of messages.slice(0, 5)) {
  const details = await gmail.users.messages.get({
    userId: 'me',
    id: item.id,
    format: 'metadata',
    metadataHeaders: ['From', 'Subject', 'Date'],
  });

  const headers = details.data.payload?.headers ?? [];
  const getHeader = name =>
    headers.find(h => h.name?.toLowerCase() === name.toLowerCase())
      ?.value ?? '(not available)';

  console.log('From:', getHeader('From'));
  console.log('Subject:', getHeader('Subject'));
  console.log('Date:', getHeader('Date'));
}
