/**
 * HebrewDatePickerFull — Pick a Hebrew date using native year/month/day dropdowns.
 *
 * Uses gematriya numerals for Hebrew locale.
 * Honors Hebrew month ordering (Nisan=1), handles leap years (Adar II),
 * and dynamically adjusts day range based on month length.
 */

import { useTranslation } from 'react-i18next';
import { gematriya } from '@hebcal/core';
import type { HebrewDate } from '../../calendar/hebrewDate';
import { isLeapYear, hebrewMonthLength } from '../../calendar/hebrewDate';

interface Props {
  value: HebrewDate;
  onChange: (date: HebrewDate) => void;
  /** Year range — how many years back/forward from current value */
  yearRange?: number;
}

export function HebrewDatePickerFull({ value, onChange, yearRange = 5 }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';

  // Build year options: current value ±yearRange
  const years: number[] = [];
  for (let y = value.year - yearRange; y <= value.year + yearRange; y++) {
    years.push(y);
  }

  // Build month options: 1..12 or 1..13 if leap
  const monthCount = isLeapYear(value.year) ? 13 : 12;
  const months: number[] = [];
  for (let m = 1; m <= monthCount; m++) months.push(m);

  // Build day options based on month length
  const dayCount = hebrewMonthLength(value.year, value.month);
  const days: number[] = [];
  for (let d = 1; d <= dayCount; d++) days.push(d);

  // Format a number in Hebrew gematriya or Arabic digits
  const fmtNum = (n: number): string => (lang === 'he' ? gematriya(n) : String(n));

  // Format year: last 3 digits as gematriya in Hebrew, full number in English
  const fmtYear = (y: number): string => (lang === 'he' ? gematriya(y % 1000) : String(y));

  const handleYear = (y: number) => {
    // Clamp day if new year changes month length
    const newMonthCount = isLeapYear(y) ? 13 : 12;
    const newMonth = value.month > newMonthCount ? newMonthCount : value.month;
    const newDayCount = hebrewMonthLength(y, newMonth);
    const newDay = value.day > newDayCount ? newDayCount : value.day;
    onChange({ year: y, month: newMonth, day: newDay });
  };

  const handleMonth = (m: number) => {
    const newDayCount = hebrewMonthLength(value.year, m);
    const newDay = value.day > newDayCount ? newDayCount : value.day;
    onChange({ year: value.year, month: m, day: newDay });
  };

  const handleDay = (d: number) => {
    onChange({ year: value.year, month: value.month, day: d });
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Day */}
      <label className="block">
        <span className="text-xs text-gray-500 block mb-1">
          {lang === 'he' ? 'יום' : 'Day'}
        </span>
        <select
          value={value.day}
          onChange={e => handleDay(Number(e.target.value))}
          className="w-full rounded border border-gray-300 px-2 py-2"
          aria-label={lang === 'he' ? 'יום' : 'Day'}
        >
          {days.map(d => (
            <option key={d} value={d}>
              {fmtNum(d)}
            </option>
          ))}
        </select>
      </label>

      {/* Month */}
      <label className="block">
        <span className="text-xs text-gray-500 block mb-1">
          {lang === 'he' ? 'חודש' : 'Month'}
        </span>
        <select
          value={value.month}
          onChange={e => handleMonth(Number(e.target.value))}
          className="w-full rounded border border-gray-300 px-2 py-2"
          aria-label={lang === 'he' ? 'חודש' : 'Month'}
        >
          {months.map(m => (
            <option key={m} value={m}>
              {t(`months.${m}`)}
            </option>
          ))}
        </select>
      </label>

      {/* Year */}
      <label className="block">
        <span className="text-xs text-gray-500 block mb-1">
          {lang === 'he' ? 'שנה' : 'Year'}
        </span>
        <select
          value={value.year}
          onChange={e => handleYear(Number(e.target.value))}
          className="w-full rounded border border-gray-300 px-2 py-2"
          aria-label={lang === 'he' ? 'שנה' : 'Year'}
        >
          {years.map(y => (
            <option key={y} value={y}>
              {fmtYear(y)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
