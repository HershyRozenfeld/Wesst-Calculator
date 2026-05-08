/**
 * BackupReminder — Shows a banner when no backup has been made in 30 days.
 *
 * Checks lastBackupDate from IndexedDB. Can be dismissed for a week.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../AppContext';
import {
  getLastBackupDate,
  getBackupDismissedUntil,
  setBackupDismissedUntil,
  downloadExport,
} from '../../data/storage';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function BackupReminder() {
  const { t } = useTranslation();
  const { settings, sightings } = useAppContext();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!settings.backupReminder || sightings.length === 0) return;

    (async () => {
      const [lastBackup, dismissedUntil] = await Promise.all([
        getLastBackupDate(),
        getBackupDismissedUntil(),
      ]);

      // Check if dismissed recently
      if (dismissedUntil && new Date(dismissedUntil) > new Date()) return;

      // Check if backup is overdue
      if (!lastBackup) {
        setShow(true); // never backed up
        return;
      }
      const elapsed = Date.now() - new Date(lastBackup).getTime();
      if (elapsed > THIRTY_DAYS_MS) {
        setShow(true);
      }
    })();
  }, [settings.backupReminder, sightings.length]);

  if (!show) return null;

  const handleExport = async () => {
    await downloadExport();
    setShow(false);
  };

  const handleDismissWeek = async () => {
    const until = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();
    await setBackupDismissedUntil(until);
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-4" role="alert">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 text-lg" aria-hidden="true">💾</span>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900 text-sm">{t('backup.reminderTitle')}</h4>
          <p className="text-xs text-amber-800 mt-0.5">{t('backup.reminderText')}</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <button
              type="button"
              onClick={handleExport}
              className="text-xs px-3 py-1 rounded bg-primary text-white hover:bg-primary-dark"
            >
              {t('backup.exportNow')}
            </button>
            <button
              type="button"
              onClick={handleDismissWeek}
              className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
            >
              {t('backup.dismissWeek')}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700"
              aria-label={t('backup.dismiss')}
            >
              {t('backup.dismiss')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
