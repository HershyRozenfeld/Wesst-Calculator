/**
 * HistoryView — List of all recorded sightings, with delete option.
 */

import { useTranslation } from 'react-i18next';
import { useAppContext } from '../AppContext';
import { formatSightingDate } from '../../calendar/gregorianBridge';
import { hebrewDaysBetween } from '../../calendar/hebrewDate';

export function HistoryView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const { sightings, removeSighting } = useAppContext();

  // Sort descending by date (newest first)
  const sorted = [...sightings].sort((a, b) => {
    const diff = hebrewDaysBetween(a.hebrewDate, b.hebrewDate);
    return diff > 1 ? -1 : 1;
  }).reverse();

  if (sightings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center text-gray-500">
        {t('history.noSightings')}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h2 className="text-xl font-semibold mb-3">{t('history.title')}</h2>
      <ul className="divide-y">
        {sorted.map(s => (
          <li key={s.id} className="py-3 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="font-semibold">{formatSightingDate(s.hebrewDate, s.onah, lang)}</div>
              <div className="text-sm text-gray-600 space-y-0.5 mt-1">
                <div>{t(`sighting.type.${s.type}`)}</div>
                {s.medicationStatus !== 'none' && (
                  <div>{t(`sighting.medication.${s.medicationStatus}`)}</div>
                )}
                {s.pregnancyStatus !== 'none' && (
                  <div>{t(`sighting.pregnancy.${s.pregnancyStatus}`)}</div>
                )}
                {s.exertion && <div>⚡ {s.exertion.description}</div>}
                {s.bodySymptoms && s.bodySymptoms.length > 0 && (
                  <div>🩺 {s.bodySymptoms.map(b => b.type).join(', ')}</div>
                )}
                {s.notes && <div className="text-gray-500 italic">"{s.notes}"</div>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(t('common.delete') + '?')) removeSighting(s.id);
              }}
              className="px-2 py-1 text-sm rounded text-red-600 hover:bg-red-50"
              aria-label={t('common.delete')}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
