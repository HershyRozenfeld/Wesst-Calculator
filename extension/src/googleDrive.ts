import type { ExportSchema } from '../../src/data/types';

const BACKUP_FILE_NAME = 'wesst-calculator-backup.json';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

export function isOAuthConfigured(): boolean {
  return !chrome.runtime.getManifest().oauth2?.client_id.startsWith('YOUR_');
}

export async function getGoogleToken(interactive: boolean): Promise<string> {
  if (!isOAuthConfigured()) throw new Error('Google OAuth client ID is not configured');
  const result = await chrome.identity.getAuthToken({ interactive });
  if (!result.token) throw new Error('Google sign-in did not return an access token');
  return result.token;
}

async function driveFetch(url: string, token: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init?.headers },
  });
  if (response.status === 401) {
    await chrome.identity.removeCachedAuthToken({ token });
  }
  if (!response.ok) throw new Error(`Google Drive request failed (${response.status})`);
  return response;
}

async function findBackupFile(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const response = await driveFetch(`${DRIVE_API}/files?spaces=appDataFolder&q=${query}&fields=files(id,name)&pageSize=1`, token);
  const data = await response.json() as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}

export async function uploadCloudBackup(data: ExportSchema, interactive = false): Promise<void> {
  const token = await getGoogleToken(interactive);
  const fileId = await findBackupFile(token);
  const boundary = `wesst_${crypto.randomUUID()}`;
  const metadata = fileId ? { name: BACKUP_FILE_NAME } : { name: BACKUP_FILE_NAME, parents: ['appDataFolder'] };
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n`,
    `--${boundary}--`,
  ].join('');
  const endpoint = fileId
    ? `${UPLOAD_API}/files/${fileId}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`;
  await driveFetch(endpoint, token, {
    method: fileId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

export async function downloadCloudBackup(): Promise<ExportSchema | null> {
  const token = await getGoogleToken(true);
  const fileId = await findBackupFile(token);
  if (!fileId) return null;
  const response = await driveFetch(`${DRIVE_API}/files/${fileId}?alt=media`, token);
  return response.json() as Promise<ExportSchema>;
}

export async function disconnectGoogle(): Promise<void> {
  await chrome.identity.clearAllCachedAuthTokens();
}
