/**
 * SettingsView — Language, theme, export/import, about.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../AppContext';
import { downloadExport, importAllData } from '../../data/storage';
import { LocationPicker } from '../components/LocationPicker';

export function SettingsView() {
  const { t } = useTranslation();
  const { settings, updateSettings, refresh } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleExport = async () => {
    await downloadExport();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = await importAllData(text);
    if (result.success) {
      setImportMessage(`✓ ${result.sightingsCount} ראיות, ${result.vesetRecordsCount} ווסתות`);
      await refresh();
    } else {
      setImportMessage(`✗ ${result.error ?? 'Failed'}`);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Language */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-3">{t('settings.language')}</h3>
        <div className="flex gap-2">
          {(['he', 'en'] as const).map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => updateSettings({ ...settings, language: lang })}
              className={[
                'px-4 py-2 rounded border flex-1',
                settings.language === lang
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-gray-300 hover:bg-gray-50',
              ].join(' ')}
            >
              {lang === 'he' ? 'עברית' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-3">{t('settings.location')}</h3>
        <LocationPicker
          value={settings.location}
          onChange={loc => updateSettings({ ...settings, location: loc })}
        />
      </div>

      {/* Backup reminder */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.backupReminder}
            onChange={e => updateSettings({ ...settings, backupReminder: e.target.checked })}
          />
          <span>{t('settings.backupReminder')}</span>
        </label>
      </div>

      {/* Export / Import */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <h3 className="text-lg font-semibold">{t('settings.export')} / {t('settings.import')}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark"
          >
            {t('settings.export')}
          </button>
          <button
            type="button"
            onClick={handleImportClick}
            className="flex-1 px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
          >
            {t('settings.import')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {importMessage && (
          <div className="text-sm text-center text-gray-700">{importMessage}</div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-900 mb-1">⚠ {t('disclaimer.title')}</h3>
        <p className="text-sm text-yellow-800">{t('disclaimer.text')}</p>
      </div>
    </div>
  );
}
