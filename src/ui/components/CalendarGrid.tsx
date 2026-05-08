/**
 * CalendarGrid — Hebrew month calendar with separation day color coding.
 *
 * Shows a Hebrew month in a weekday grid (Sunday-Saturday).
 * Each day cell shows:
 *   - Hebrew day number (gematria)
 *   - Gregorian date (small)
 *   - Color-coded separation day info (if applicable)
 *   - Sighting marker (if the user recorded a sighting)
 */

import { useTranslation } from 'react-i18next';
import { gematriya } from '@hebcal/core';
import type { HebrewDate } from '../../calendar/hebrewDate';
import {
  hebrewMonthLength,
  dayOfWeek,
  sameDate,
} from '../../calendar/hebrewDate';
import { halachicToday } from '../../calendar/zmanim';
import { useAppContext } from '../AppContext';
import { toGregorian } from '../../calendar/gregorianBridge';
import type { Sighting, SeparationDay, VesetType } from '../../data/types';

interface Props {
  year: number;
  month: number;
  separationDays: SeparationDay[];
  sightings: Sighting[];
  onDayClick?: (date: HebrewDate) => void;
  selectedDate?: HebrewDate | null;
}

/**
 * Get Tailwind color class for a separation day based on primary veset type.
 * Matches the color coding from docs/03-specification.md.
 */
function getColorClass(day: SeparationDay): string {
  const primary = day.reasons[0];
  if (!primary) return '';

  // askRav gets yellow regardless
  if (day.reasons.some(r => r.askRav)) return 'bg-sep-ask-rav text-white';

  const map: Record<VesetType, string> = {
    onah_beinonit: 'bg-sep-onah-beinonit text-white',
    haflaga: 'bg-sep-haflaga text-white',
    chodesh: 'bg-sep-chodesh text-white',
    shavua: 'bg-sep-chodesh text-white',
    dilug: 'bg-sep-chodesh text-white',
    sirug: 'bg-sep-chodesh text-white',
    yamim_nevukhim: 'bg-sep-chodesh text-white',
    guf: 'bg-sep-ask-rav text-white',
    kfitzot: 'bg-sep-ask-rav text-white',
  };

  return map[primary.vesetType] ?? '';
}

export function CalendarGrid({
  year,
  month,
  separationDays,
  sightings,
  onDayClick,
  selectedDate,
}: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const { settings } = useAppContext();
  const todayDate = halachicToday(settings.location);

  const monthLength = hebrewMonthLength(year, month);

  // The first day's weekday determines leading blank cells
  const firstDay: HebrewDate = { year, month, day: 1 };
  const firstWeekday = dayOfWeek(firstDay); // 0 = Sunday

  // Build cells: blank cells before day 1, then all days of the month
  const cells: Array<HebrewDate | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= monthLength; d++) {
    cells.push({ year, month, day: d });
  }

  // Build weekday header (localized)
  const weekdayKeys = [0, 1, 2, 3, 4, 5, 6];

  // Lookup maps for fast rendering
  const sightingByDay = new Map<number, Sighting[]>();
  for (const s of sightings) {
    if (s.hebrewDate.year === year && s.hebrewDate.month === month) {
      const list = sightingByDay.get(s.hebrewDate.day) ?? [];
      list.push(s);
      sightingByDay.set(s.hebrewDate.day, list);
    }
  }

  const separationByDay = new Map<number, SeparationDay>();
  for (const sd of separationDays) {
    if (sd.hebrewDate.year === year && sd.hebrewDate.month === month) {
      separationByDay.set(sd.hebrewDate.day, sd);
    }
  }

  return (
    <div className="w-full mx-auto" role="grid" aria-label={`${t(`months.${month}`)} ${year}`}>
      {/* Weekday header */}
      <div className="grid grid-cols-7 gap-1 mb-1" role="row">
        {weekdayKeys.map(wk => (
          <div
            key={wk}
            role="columnheader"
            className="text-center text-xs lg:text-sm font-semibold py-1 text-gray-600"
          >
            {t(`weekdaysShort.${wk}`)}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1" role="rowgroup">
        {cells.map((cell, idx) => {
          if (!cell) {
            return <div key={`blank-${idx}`} className="aspect-square lg:aspect-auto lg:h-12" />;
          }

          const sep = separationByDay.get(cell.day);
          const hasSighting = sightingByDay.has(cell.day);
          const isToday = sameDate(cell, todayDate);
          const isSelected = selectedDate && sameDate(cell, selectedDate);
          const colorClass = sep ? getColorClass(sep) : '';

          const dayLabel = lang === 'he' ? gematriya(cell.day) : String(cell.day);
          // Always show Gregorian day number in top-left corner
          const gregorianDay = toGregorian(cell).getDate();

          return (
            <button
              key={`${cell.year}-${cell.month}-${cell.day}`}
              type="button"
              onClick={() => onDayClick?.(cell)}
              className={[
                'aspect-square lg:aspect-auto lg:h-12 p-0.5 rounded flex flex-col items-center justify-center relative',
                'border transition-colors',
                colorClass || 'bg-white hover:bg-gray-50',
                isToday ? 'ring-2 ring-blue-500' : 'border-gray-200',
                isSelected ? 'ring-2 ring-orange-500' : '',
                'focus:outline-none focus:ring-2 focus:ring-blue-500',
              ].join(' ')}
              role="gridcell"
              aria-label={`${dayLabel} ${t(`months.${month}`)}${hasSighting ? ` — ${t('legend.sighting')}` : ''}${sep ? ` — ${sep.reasons.map(r => lang === 'he' ? r.description_he : r.description_en).join(', ')}` : ''}`}
              aria-current={isToday ? 'date' : undefined}
              aria-selected={isSelected || undefined}
              title={sep ? sep.reasons.map(r => lang === 'he' ? r.description_he : r.description_en).join(', ') : undefined}
            >
              <span
                className="absolute top-0.5 left-0.5 text-[9px] lg:text-[10px] opacity-60 leading-none font-normal"
                aria-hidden="true"
              >
                {gregorianDay}
              </span>
              <span className="text-base lg:text-lg font-semibold leading-none">{dayLabel}</span>
              {hasSighting && (
                <span
                  className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-sep-sighting"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
