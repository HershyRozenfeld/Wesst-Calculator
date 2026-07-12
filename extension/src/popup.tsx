import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { exportAllData } from '../../src/data/storage';
import { getExtensionSettings } from './extensionSettings';
import { disconnectGoogle, getGoogleToken, isOAuthConfigured, uploadCloudBackup } from './googleDrive';
import { getUpcomingSeparation, type UpcomingSeparation } from './upcoming';
import './popup.css';

function Popup() {
  const [signedIn, setSignedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [upcoming, setUpcoming] = useState<UpcomingSeparation | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const configured = isOAuthConfigured();

  useEffect(() => {
    void Promise.all([
      getGoogleToken(false).then(() => setSignedIn(true)).catch(() => undefined),
      chrome.identity.getProfileUserInfo().then(profile => setEmail(profile.email)),
      getUpcomingSeparation().then(setUpcoming),
      getExtensionSettings().then(settings => setLastBackup(settings.lastCloudBackup)),
    ]);
  }, []);

  async function signIn() {
    setStatus('מתחבר...');
    try {
      await getGoogleToken(true);
      const profile = await chrome.identity.getProfileUserInfo();
      setEmail(profile.email);
      setSignedIn(true);
      setStatus('החשבון חובר בהצלחה');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ההתחברות נכשלה');
    }
  }

  async function backupNow() {
    setStatus('מגבה...');
    try {
      await uploadCloudBackup(await exportAllData(), true);
      const now = new Date().toISOString();
      const settings = await getExtensionSettings();
      await chrome.storage.local.set({ extensionSettings: { ...settings, lastCloudBackup: now } });
      setLastBackup(now);
      setSignedIn(true);
      setStatus('הגיבוי הושלם');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'הגיבוי נכשל');
    }
  }

  async function disconnect() {
    await disconnectGoogle();
    setSignedIn(false);
    setEmail('');
    setStatus('החשבון נותק');
  }

  return <main>
    <header><img src="/icons/icon-48.png" alt="" /><div><h1>מחשבון ווסתות</h1><p>גיבוי ותזכורות</p></div></header>
    {!configured && <section className="warning"><strong>נדרשת הגדרת Google</strong><p>יש להגדיר מזהה OAuth לפני ההתחברות. ההוראות נמצאות בקובץ README.</p></section>}
    {!signedIn ? <section><h2>גיבוי ענני פרטי</h2><p>התחברי פעם אחת לחשבון Google כדי לשמור גיבוי מוצפן בתעבורה בתיקיית האפליקציה הפרטית.</p><button className="primary" onClick={signIn} disabled={!configured}>התחברות עם Google</button></section>
      : <section><div className="row"><div><h2>הגיבוי מחובר</h2><p>{email || 'חשבון Google'}</p></div><span className="ok">מחובר</span></div><button className="primary" onClick={backupNow}>גיבוי עכשיו</button>{lastBackup && <small>גיבוי אחרון: {new Date(lastBackup).toLocaleString('he-IL')}</small>}<button className="link" onClick={disconnect}>ניתוק החשבון</button></section>}
    <section><h2>יום הפרישה הקרוב</h2>{upcoming ? <><strong className="upcoming">{upcoming.label}</strong><p>{upcoming.daysAway === 0 ? 'היום' : upcoming.daysAway === 1 ? 'מחר' : `בעוד ${upcoming.daysAway} ימים`}</p></> : <p>לא נמצא יום פרישה קרוב בנתונים השמורים.</p>}</section>
    {status && <p className="status">{status}</p>}
    <button className="options" onClick={() => chrome.runtime.openOptionsPage()}>פתיחת האפליקציה והאפשרויות</button>
  </main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Popup /></React.StrictMode>);
