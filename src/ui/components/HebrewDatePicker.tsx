/**
 * HebrewDatePicker — Select a Hebrew date via Gregorian picker.
 *
 * Uses a native <input type="date"> for Gregorian selection,
 * then converts to Hebrew for display/storage.
 */

import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { HebrewDate } from '../../calendar/hebrewDate';
import { fromGregorian, toGregorian, formatHebrewDate } from '../../calendar/gregorianBridge';

interface Props {
  value: HebrewDate;
  onChange: (date: HebrewDate) => void;
}

export function HebrewDatePicker({ value, onChange }: Props) {
  const { i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';

  const gregorian = toGregorian(value);
  const isoDate = gregorian.toISOString().slice(0, 10);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const [y, m, d] = e.target.value.split('-').map(Number);
    if (y && m && d) {
      const date = new Date(y, m - 1, d);
      onChange(fromGregorian(date));
    }
  };

  return (
    <div className="space-y-1">
      <input
        type="date"
        value={isoDate}
        onChange={handleChange}
        className="w-full rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="text-sm text-gray-600 text-center">
        {formatHebrewDate(value, lang)}
      </div>
    </div>
  );
}
