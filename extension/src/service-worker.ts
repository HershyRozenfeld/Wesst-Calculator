import { exportAllData } from '../../src/data/storage';
import { getExtensionSettings } from './extensionSettings';
import { getUpcomingSeparation } from './upcoming';
import { uploadCloudBackup } from './googleDrive';

const DAILY_REMINDER = 'daily-separation-reminder';
const CLOUD_BACKUP = 'cloud-backup';

async function scheduleDailyReminder(): Promise<void> {
  const settings = await getExtensionSettings();
  await chrome.alarms.clear(DAILY_REMINDER);
  if (!settings.reminderEnabled) return;
  const next = new Date();
  next.setHours(settings.reminderHour, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  await chrome.alarms.create(DAILY_REMINDER, { when: next.getTime(), periodInMinutes: 24 * 60 });
}

async function performBackup(): Promise<void> {
  const settings = await getExtensionSettings();
  if (!settings.automaticBackup) return;
  try {
    await uploadCloudBackup(await exportAllData());
    await chrome.storage.local.set({ extensionSettings: { ...settings, lastCloudBackup: new Date().toISOString() } });
  } catch {
    // A non-interactive backup waits for the next successful sign-in.
  }
}

async function showUpcomingReminder(): Promise<void> {
  const settings = await getExtensionSettings();
  const upcoming = await getUpcomingSeparation();
  if (!settings.reminderEnabled || !upcoming || upcoming.daysAway > settings.reminderDaysBefore) return;
  const when = upcoming.daysAway === 0 ? 'היום' : upcoming.daysAway === 1 ? 'מחר' : `בעוד ${upcoming.daysAway} ימים`;
  await chrome.notifications.create(`separation-${upcoming.label}`, {
    type: 'basic',
    iconUrl: 'icons/icon-128.png',
    title: `יום פרישה ${when}`,
    message: upcoming.label,
    priority: 2,
  });
}

chrome.runtime.onInstalled.addListener(() => { void scheduleDailyReminder(); });
chrome.runtime.onStartup.addListener(() => { void scheduleDailyReminder(); });
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message.type === 'data-changed') {
    void chrome.alarms.create(CLOUD_BACKUP, { delayInMinutes: 1 });
  }
  if (message.type === 'settings-changed') void scheduleDailyReminder();
});
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === DAILY_REMINDER) void showUpcomingReminder();
  if (alarm.name === CLOUD_BACKUP) void performBackup();
});
chrome.notifications.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });
void scheduleDailyReminder();
