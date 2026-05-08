/**
 * App — Main application shell with navigation.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppProvider, useAppContext } from './AppContext';
import { CalendarView } from './views/CalendarView';
import { SightingWizard } from './views/SightingWizard';
import { HistoryView } from './views/HistoryView';
import { TimelineView } from './views/TimelineView';
import { SettingsView } from './views/SettingsView';
import { HalachaView } from './views/HalachaView';
import { BackupReminder } from './components/BackupReminder';
import '../i18n'; // initialize i18next

type Tab = 'calendar' | 'add' | 'history' | 'timeline' | 'halacha' | 'settings';

function AppShell() {
  const { t } = useTranslation();
  const { loading } = useAppContext();
  const [tab, setTab] = useState<Tab>('calendar');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  const tabs: Array<{ key: Tab; label: string; icon: string }> = [
    { key: 'calendar', label: t('nav.calendar'), icon: '📅' },
    { key: 'add', label: t('nav.add'), icon: '➕' },
    { key: 'history', label: t('nav.history'), icon: '📜' },
    { key: 'timeline', label: t('nav.timeline'), icon: '📈' },
    { key: 'halacha', label: t('nav.halacha'), icon: '📖' },
    { key: 'settings', label: t('nav.settings'), icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-primary text-white p-4 shadow">
        <h1 className="text-xl font-bold text-center">{t('app.title')}</h1>
        <p className="text-center text-xs opacity-80 mt-0.5">{t('app.subtitle')}</p>
      </header>

      <main className={`${tab === 'calendar' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto p-3 lg:p-4`}>
        <BackupReminder />
        {tab === 'calendar' && <CalendarView />}
        {tab === 'add' && (
          <SightingWizard onComplete={() => setTab('calendar')} onCancel={() => setTab('calendar')} />
        )}
        {tab === 'history' && <HistoryView />}
        {tab === 'timeline' && <TimelineView />}
        {tab === 'halacha' && <HalachaView />}
        {tab === 'settings' && <SettingsView />}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto grid grid-cols-6">
          {tabs.map(tabDef => (
            <button
              key={tabDef.key}
              type="button"
              onClick={() => setTab(tabDef.key)}
              className={[
                'py-2 flex flex-col items-center text-xs transition-colors',
                tab === tabDef.key ? 'text-primary font-semibold' : 'text-gray-600 hover:text-primary',
              ].join(' ')}
            >
              <span className="text-lg">{tabDef.icon}</span>
              <span>{tabDef.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
