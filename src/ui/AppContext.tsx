/**
 * App Context — Global application state
 *
 * Uses React Context (no Redux per ADR-008).
 * Provides: sightings, vesetRecords, settings, and mutation actions.
 */

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import type { Sighting, VesetRecord, AppSettings } from '../data/types';
import { DEFAULT_SETTINGS } from '../data/types';
import {
  getAllSightings,
  getAllVesetRecords,
  getSettings,
  saveSighting,
  deleteSighting as deleteSightingDB,
  saveVesetRecord,
  saveSettings as saveSettingsDB,
} from '../data/storage';
import { setLanguage } from '../i18n';
import { buildHalachicState, checkForNewKavua, type NewKavuaDetection } from '../engine/stateManager';

interface AppContextValue {
  sightings: Sighting[];
  vesetRecords: VesetRecord[];
  settings: AppSettings;
  loading: boolean;
  addSighting: (sighting: Omit<Sighting, 'id' | 'createdAt'>) => Promise<void>;
  removeSighting: (id: string) => Promise<void>;
  updateSettings: (settings: AppSettings) => Promise<void>;
  refresh: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

function sameDetectedVeset(record: VesetRecord, detection: NewKavuaDetection): boolean {
  return (
    record.status === 'fixed' &&
    record.type === detection.type &&
    JSON.stringify(record.details) === JSON.stringify(detection.details)
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [vesetRecords, setVesetRecords] = useState<VesetRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [s, v, set] = await Promise.all([
      getAllSightings(),
      getAllVesetRecords(),
      getSettings(),
    ]);
    setSightings(s);
    setVesetRecords(v);
    setSettings(set);
    setLanguage(set.language);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const addSighting = useCallback(async (input: Omit<Sighting, 'id' | 'createdAt'>) => {
    const sighting: Sighting = {
      ...input,
      id: uuid(),
      createdAt: new Date().toISOString(),
    };
    await saveSighting(sighting);

    const [latestSightings, latestRecords] = await Promise.all([
      getAllSightings(),
      getAllVesetRecords(),
    ]);
    const state = buildHalachicState(latestSightings, latestRecords);
    const newKavuot = checkForNewKavua(state);

    for (const detection of newKavuot) {
      const alreadyStored = latestRecords.some(record => sameDetectedVeset(record, detection));
      if (alreadyStored) continue;

      const now = new Date().toISOString();
      const record: VesetRecord = {
        id: uuid(),
        type: detection.type,
        status: 'fixed',
        details: detection.details,
        establishedBy: detection.establishedBy,
        uprootCount: 0,
        isMaAyanPatuach: false,
        createdAt: now,
        updatedAt: now,
      };
      await saveVesetRecord(record);
      latestRecords.push(record);
    }

    await refresh();
  }, [refresh]);

  const removeSighting = useCallback(async (id: string) => {
    await deleteSightingDB(id);
    await refresh();
  }, [refresh]);

  const updateSettings = useCallback(async (newSettings: AppSettings) => {
    await saveSettingsDB(newSettings);
    setSettings(newSettings);
    setLanguage(newSettings.language);
  }, []);

  const value: AppContextValue = {
    sightings,
    vesetRecords,
    settings,
    loading,
    addSighting,
    removeSighting,
    updateSettings,
    refresh,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
