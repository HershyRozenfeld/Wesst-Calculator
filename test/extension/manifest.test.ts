import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ExtensionManifest {
  key: string;
  oauth2: {
    client_id: string;
    scopes: string[];
  };
  version: string;
}

function loadManifest(): ExtensionManifest {
  const path = resolve(process.cwd(), 'extension/public/manifest.json');
  return JSON.parse(readFileSync(path, 'utf8')) as ExtensionManifest;
}

function extensionIdFromKey(publicKey: string): string {
  const digest = createHash('sha256').update(Buffer.from(publicKey, 'base64')).digest();
  return Array.from(digest.subarray(0, 16), byte => byte.toString(16).padStart(2, '0'))
    .join('')
    .replace(/[0-9a-f]/g, digit => String.fromCharCode('a'.charCodeAt(0) + Number.parseInt(digit, 16)));
}

describe('Chrome extension manifest', () => {
  it('keeps the unpacked extension on the published Web Store ID', () => {
    const manifest = loadManifest();
    expect(extensionIdFromKey(manifest.key)).toBe('bjcjbmcenflmbbmggpflnlgbcbomjifa');
  });

  it('uses the configured Drive app-data OAuth client', () => {
    const manifest = loadManifest();
    expect(manifest.oauth2.client_id).toMatch(/\.apps\.googleusercontent\.com$/);
    expect(manifest.oauth2.scopes).toEqual(['https://www.googleapis.com/auth/drive.appdata']);
  });
});
