import { authenticate } from '@google-cloud/local-auth';
import fs from 'node:fs/promises';

const credentials = JSON.parse(
  await fs.readFile('credentials.json', 'utf8')
);

const app = credentials.installed ?? credentials.web;

if (!app) {
  throw new Error(
    'OAuth client JSON must contain an installed or web client.'
  );
}

const auth = await authenticate({
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  keyfilePath: 'credentials.json',
});

const refreshToken = auth.credentials.refresh_token;

if (!refreshToken) {
  throw new Error(
    'No refresh token received. Check the OAuth grant and try again.'
  );
}

await fs.writeFile(
  'gmail-token.json',
  JSON.stringify({
    client_id: app.client_id,
    client_secret: app.client_secret,
    refresh_token: refreshToken,
  }, null, 2),
  { mode: 0o600 }
);

console.log('Success! OAuth credentials saved to gmail-token.json');
console.log('Do not share this file or commit it to GitHub.');
