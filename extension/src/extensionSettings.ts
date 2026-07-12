export interface ExtensionSettings {
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderHour: number;
  automaticBackup: boolean;
  lastCloudBackup: string | null;
}

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  reminderEnabled: true,
  reminderDaysBefore: 1,
  reminderHour: 20,
  automaticBackup: true,
  lastCloudBackup: null,
};

export async function getExtensionSettings(): Promise<ExtensionSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    const saved = localStorage.getItem('extensionSettings');
    return saved
      ? { ...DEFAULT_EXTENSION_SETTINGS, ...JSON.parse(saved) as Partial<ExtensionSettings> }
      : DEFAULT_EXTENSION_SETTINGS;
  }
  const stored = await chrome.storage.local.get('extensionSettings');
  const saved = stored.extensionSettings as Partial<ExtensionSettings> | undefined;
  return { ...DEFAULT_EXTENSION_SETTINGS, ...saved };
}

export async function saveExtensionSettings(settings: ExtensionSettings): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    localStorage.setItem('extensionSettings', JSON.stringify(settings));
    return;
  }
  await chrome.storage.local.set({ extensionSettings: settings });
  if (chrome.runtime?.id) await chrome.runtime.sendMessage({ type: 'settings-changed' });
}
