import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_CREDENTIALS = path.join(ROOT, '.cws-credentials.local.json');
const DEFAULT_PACKAGE = path.join(ROOT, 'release-artifacts', 'wesst-calculator-chrome-extension.zip');
const API_ROOT = 'https://chromewebstore.googleapis.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

async function loadCredentials() {
  const file = path.resolve(process.env.CWS_CREDENTIALS_FILE || DEFAULT_CREDENTIALS);
  const saved = existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) : {};
  const credentials = {
    publisherId: process.env.CWS_PUBLISHER_ID || saved.publisherId,
    extensionId: process.env.CWS_EXTENSION_ID || saved.extensionId,
    clientId: process.env.CWS_CLIENT_ID || saved.clientId,
    clientSecret: process.env.CWS_CLIENT_SECRET || saved.clientSecret,
    refreshToken: process.env.CWS_REFRESH_TOKEN || saved.refreshToken,
  };

  const missing = Object.entries(credentials).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) {
    throw new Error(`Missing Chrome Web Store credentials: ${missing.join(', ')}. See scripts/chrome-web-store-credentials.example.json.`);
  }
  return credentials;
}

async function getAccessToken({ clientId, clientSecret, refreshToken }) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`OAuth token request failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function apiRequest(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`Chrome Web Store API failed (${response.status}): ${JSON.stringify(data)}`);
  }
  return data;
}

async function fetchStatus(name, token) {
  return apiRequest(`${API_ROOT}/v2/${name}:fetchStatus`, token);
}

async function main() {
  const command = process.argv[2] || 'status';
  const credentials = await loadCredentials();
  const token = await getAccessToken(credentials);
  const name = `publishers/${credentials.publisherId}/items/${credentials.extensionId}`;

  if (command === 'status') {
    console.log(JSON.stringify(await fetchStatus(name, token), null, 2));
    return;
  }

  if (command === 'upload') {
    const packagePath = path.resolve(process.argv[3] || DEFAULT_PACKAGE);
    if (!existsSync(packagePath)) throw new Error(`Extension package not found: ${packagePath}`);
    const result = await apiRequest(`${API_ROOT}/upload/v2/${name}:upload`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/zip' },
      body: await readFile(packagePath),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'publish') {
    const result = await apiRequest(`${API_ROOT}/v2/${name}:publish`, token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ publishType: 'DEFAULT_PUBLISH', blockOnWarnings: true }),
    });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}. Use status, upload, or publish.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
