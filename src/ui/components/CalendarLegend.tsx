/**
 * CalendarLegend — Color legend for the calendar grid.
 *
 * Displays color-coded dots matching the calendar separation day colors.
 */

import { useTranslation } from 'react-i18next';

const LEGEND_ITEMS = [
  { key: 'sighting', color: 'bg-green-600', border: false },
  { key: 'onahBeinonit', color: 'bg-red-500', border: false },
  { key: 'haflaga', color: 'bg-orange-500', border: false },
  { key: 'chodesh', color: 'bg-blue-600', border: false },
  { key: 'fixedVeset', color: 'bg-yellow-500', border: false },
  { key: 'today', color: 'bg-white', border: true },
] as const;

export function CalendarLegend() {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-lg shadow-sm p-2">
      <h4 className="text-xs font-semibold text-gray-500 mb-1.5">{t('legend.title')}</h4>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {LEGEND_ITEMS.map(item => (
          <div key={item.key} className="flex items-center gap-1.5">
            <span
              className={[
                'w-3 h-3 rounded-full inline-block',
                item.color,
                item.border ? 'border-2 border-blue-500' : '',
              ].join(' ')}
              aria-hidden="true"
            />
            <span className="text-xs text-gray-700">{t(`legend.${item.key}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
