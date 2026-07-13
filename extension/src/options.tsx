import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from '../../src/ui/App';
import '../../src/index.css';
import { downloadCloudBackup, isOAuthConfigured } from './googleDrive';
import { importAllData } from '../../src/data/storage';
import {
  DEFAULT_EXTENSION_SETTINGS,
  getExtensionSettings,
  saveExtensionSettings,
  type ExtensionSettings,
} from './extensionSettings';
import './options.css';

interface StatusMessage {
  text: string;
  tone: 'info' | 'success' | 'error';
}

function ExtensionControls() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_EXTENSION_SETTINGS);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  useEffect(() => { void getExtensionSettings().then(setSettings); }, []);

  async function update(patch: Partial<ExtensionSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveExtensionSettings(next);
    setStatus({ text: 'ההגדרות נשמרו', tone: 'success' });
  }

  async function restore() {
    if (!confirm('שחזור הגיבוי יחליף את הנתונים המקומיים הקיימים. להמשיך?')) return;
    setStatus({ text: 'מוריד את הגיבוי...', tone: 'info' });
    try {
      const backup = await downloadCloudBackup();
      if (!backup) {
        setStatus({ text: 'לא נמצא גיבוי בענן', tone: 'info' });
        return;
      }
      const result = await importAllData(JSON.stringify(backup));
      setStatus(result.success
        ? { text: `שוחזרו ${result.sightingsCount} ראיות`, tone: 'success' }
        : { text: `השחזור נכשל: ${result.error}`, tone: 'error' });
      if (result.success) window.location.reload();
    } catch (error) {
      setStatus({
        text: error instanceof Error ? error.message : 'השחזור נכשל',
        tone: 'error',
      });
    }
  }

  return <section className="extension-controls" aria-labelledby="extension-settings-title">
    <header className="extension-controls__header">
      <div>
        <h3 id="extension-settings-title">תזכורות וגיבוי ענני</h3>
        <p>הגדרות התוסף במחשב זה</p>
      </div>
      <span className="extension-controls__badge">תוסף Chrome</span>
    </header>
    {!isOAuthConfigured() && <p className="setup-warning">התחברות Google תעבוד לאחר הגדרת מזהה OAuth בקובץ manifest.</p>}

    <div className="extension-setting-group">
      <div className="extension-setting-row">
        <div>
          <h4>תזכורת ליום פרישה</h4>
          <p>קבלת הודעה מקומית לפני המועד הקרוב</p>
        </div>
        <label className="extension-switch">
          <input
            type="checkbox"
            checked={settings.reminderEnabled}
            onChange={event => void update({ reminderEnabled: event.target.checked })}
          />
          <span className="extension-switch__track" aria-hidden="true" />
          <span className="extension-switch__label">הפעלת תזכורות</span>
        </label>
      </div>

      <div className="extension-fields" aria-disabled={!settings.reminderEnabled}>
        <label className="extension-field">
          <span>ימים מראש</span>
          <input
            type="number"
            min="0"
            max="14"
            value={settings.reminderDaysBefore}
            disabled={!settings.reminderEnabled}
            onChange={event => void update({ reminderDaysBefore: Number(event.target.value) })}
          />
        </label>
        <label className="extension-field">
          <span>שעת התזכורת</span>
          <input
            type="time"
            value={`${String(settings.reminderHour).padStart(2, '0')}:00`}
            disabled={!settings.reminderEnabled}
            onChange={event => void update({ reminderHour: Number(event.target.value.slice(0, 2)) })}
          />
        </label>
      </div>
    </div>

    <div className="extension-setting-group extension-setting-group--last">
      <div className="extension-setting-row">
        <div>
          <h4>גיבוי אוטומטי</h4>
          <p>שמירת גיבוי לאחר שינוי בנתונים</p>
        </div>
        <label className="extension-switch">
          <input
            type="checkbox"
            checked={settings.automaticBackup}
            onChange={event => void update({ automaticBackup: event.target.checked })}
          />
          <span className="extension-switch__track" aria-hidden="true" />
          <span className="extension-switch__label">הפעלת גיבוי אוטומטי</span>
        </label>
      </div>

      <div className="extension-actions">
        <button type="button" onClick={restore}>שחזור מגיבוי Google Drive</button>
        {status && <span className={`extension-status extension-status--${status.tone}`} role="status" aria-live="polite">{status.text}</span>}
      </div>
    </div>
  </section>;
}

function Options() {
  return (
    <App
      initialTab="settings"
      settingsExtension={<ExtensionControls />}
      showWaterBackdrop={false}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>);
