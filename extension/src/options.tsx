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

function ExtensionControls() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_EXTENSION_SETTINGS);
  const [status, setStatus] = useState('');
  useEffect(() => { void getExtensionSettings().then(setSettings); }, []);

  async function update(patch: Partial<ExtensionSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    await saveExtensionSettings(next);
    setStatus('ההגדרות נשמרו');
  }

  async function restore() {
    if (!confirm('שחזור הגיבוי יחליף את הנתונים המקומיים הקיימים. להמשיך?')) return;
    setStatus('מוריד את הגיבוי...');
    try {
      const backup = await downloadCloudBackup();
      if (!backup) { setStatus('לא נמצא גיבוי בענן'); return; }
      const result = await importAllData(JSON.stringify(backup));
      setStatus(result.success ? `שוחזרו ${result.sightingsCount} ראיות` : `השחזור נכשל: ${result.error}`);
      if (result.success) window.location.reload();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'השחזור נכשל');
    }
  }

  return <section className="extension-controls" aria-labelledby="extension-settings-title">
    <div><h2 id="extension-settings-title">תזכורות וגיבוי ענני</h2><p>הגדרות אלה שייכות לתוסף Chrome בלבד.</p></div>
    {!isOAuthConfigured() && <p className="setup-warning">התחברות Google תעבוד לאחר הגדרת מזהה OAuth בקובץ manifest.</p>}
    <div className="control-grid">
      <label className="toggle"><input type="checkbox" checked={settings.reminderEnabled} onChange={event => void update({ reminderEnabled: event.target.checked })} /><span>תזכורת לפני יום פרישה</span></label>
      <label><span>כמה ימים מראש</span><input type="number" min="0" max="14" value={settings.reminderDaysBefore} disabled={!settings.reminderEnabled} onChange={event => void update({ reminderDaysBefore: Number(event.target.value) })} /></label>
      <label><span>שעת התזכורת</span><input type="time" value={`${String(settings.reminderHour).padStart(2, '0')}:00`} disabled={!settings.reminderEnabled} onChange={event => void update({ reminderHour: Number(event.target.value.slice(0, 2)) })} /></label>
      <label className="toggle"><input type="checkbox" checked={settings.automaticBackup} onChange={event => void update({ automaticBackup: event.target.checked })} /><span>גיבוי אוטומטי לאחר שינוי</span></label>
    </div>
    <div className="control-actions"><button type="button" onClick={restore}>שחזור מגיבוי Google Drive</button>{status && <span role="status">{status}</span>}</div>
  </section>;
}

function Options() {
  return <><ExtensionControls /><App /></>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Options /></React.StrictMode>);
