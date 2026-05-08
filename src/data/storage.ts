/**
 * IndexedDB Storage Layer
 *
 * Uses `idb` for a promise-based IndexedDB wrapper.
 * All data persists locally in the browser — no server, no cloud.
 * Users can export/import JSON files for backup and transfer.
 *
 * Database: VestosCalculatorDB
 * Stores:
 *   - sightings: All recorded sightings (key: id)
 *   - vesetRecords: All veset records (key: id)
 *   - settings: App settings (key: 'singleton')
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Sighting, VesetRecord, AppSettings, ExportSchema } from './types';
import { DEFAULT_SETTINGS } from './types';

const DB_NAME = 'VestosCalculatorDB';
const DB_VERSION = 1;
const SETTINGS_KEY = 'singleton';
const EXPORT_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('sightings')) {
          db.createObjectStore('sightings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('vesetRecords')) {
          db.createObjectStore('vesetRecords', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// ===== Sightings =====

export async function getAllSightings(): Promise<Sighting[]> {
  const db = await getDB();
  return db.getAll('sightings');
}

export async function saveSighting(sighting: Sighting): Promise<void> {
  const db = await getDB();
  await db.put('sightings', sighting);
}

export async function deleteSighting(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('sightings', id);
}

// ===== Veset Records =====

export async function getAllVesetRecords(): Promise<VesetRecord[]> {
  const db = await getDB();
  return db.getAll('vesetRecords');
}

export async function saveVesetRecord(record: VesetRecord): Promise<void> {
  const db = await getDB();
  await db.put('vesetRecords', record);
}

export async function deleteVesetRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vesetRecords', id);
}

// ===== Settings =====

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const stored = await db.get('settings', SETTINGS_KEY);
  return stored ?? DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, SETTINGS_KEY);
}

// ===== Backup Tracking =====

const LAST_BACKUP_KEY = 'lastBackupDate';
const BACKUP_DISMISSED_KEY = 'backupDismissedUntil';

export async function getLastBackupDate(): Promise<string | null> {
  const db = await getDB();
  return (await db.get('settings', LAST_BACKUP_KEY)) ?? null;
}

async function setLastBackupDate(): Promise<void> {
  const db = await getDB();
  await db.put('settings', new Date().toISOString(), LAST_BACKUP_KEY);
}

export async function getBackupDismissedUntil(): Promise<string | null> {
  const db = await getDB();
  return (await db.get('settings', BACKUP_DISMISSED_KEY)) ?? null;
}

export async function setBackupDismissedUntil(date: string): Promise<void> {
  const db = await getDB();
  await db.put('settings', date, BACKUP_DISMISSED_KEY);
}

// ===== Export / Import =====

export async function exportAllData(): Promise<ExportSchema> {
  const [sightings, vesetRecords, settings] = await Promise.all([
    getAllSightings(),
    getAllVesetRecords(),
    getSettings(),
  ]);
  return {
    version: EXPORT_VERSION,
    exportDate: new Date().toISOString(),
    sightings,
    vesetRecords,
    settings,
  };
}

/**
 * Download the full database as a JSON file.
 */
export async function downloadExport(): Promise<void> {
  const data = await exportAllData();
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vestos-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  await setLastBackupDate();
}

export interface ImportResult {
  success: boolean;
  sightingsCount: number;
  vesetRecordsCount: number;
  error?: string;
}

/**
 * Import data from an export JSON string.
 * Replaces all existing data.
 */
export async function importAllData(jsonString: string): Promise<ImportResult> {
  try {
    const data = JSON.parse(jsonString) as ExportSchema;

    // Validate minimum schema
    if (
      typeof data.version !== 'number' ||
      !Array.isArray(data.sightings) ||
      !Array.isArray(data.vesetRecords)
    ) {
      return {
        success: false,
        sightingsCount: 0,
        vesetRecordsCount: 0,
        error: 'Invalid export file format',
      };
    }

    const db = await getDB();

    // Clear existing data
    await db.clear('sightings');
    await db.clear('vesetRecords');

    // Import new data
    const tx = db.transaction(['sightings', 'vesetRecords', 'settings'], 'readwrite');
    await Promise.all([
      ...data.sightings.map(s => tx.objectStore('sightings').put(s)),
      ...data.vesetRecords.map(v => tx.objectStore('vesetRecords').put(v)),
      data.settings ? tx.objectStore('settings').put(data.settings, SETTINGS_KEY) : Promise.resolve(),
    ]);
    await tx.done;

    return {
      success: true,
      sightingsCount: data.sightings.length,
      vesetRecordsCount: data.vesetRecords.length,
    };
  } catch (err) {
    return {
      success: false,
      sightingsCount: 0,
      vesetRecordsCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Delete ALL data — useful for reset / troubleshooting.
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  await Promise.all([
    db.clear('sightings'),
    db.clear('vesetRecords'),
    db.clear('settings'),
  ]);
}
