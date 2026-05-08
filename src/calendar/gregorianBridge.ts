/**
 * Gregorian Bridge
 *
 * Converts between Hebrew dates and Gregorian dates for UI display.
 */

import { HDate, gematriya, months as hebMonths } from '@hebcal/core';
import type { HebrewDate, Onah } from './hebrewDate';
import { isLeapYear } from './hebrewDate';

/**
 * Convert a HebrewDate to a JavaScript Date (Gregorian).
 */
export function toGregorian(hd: HebrewDate): Date {
  const hdate = new HDate(hd.day, halachicToHebcal(hd.month, hd.year), hd.year);
  return hdate.greg();
}

/**
 * Convert a JavaScript Date (Gregorian) to a HebrewDate.
 */
export function fromGregorian(date: Date): HebrewDate {
  const hdate = new HDate(date);
  return {
    year: hdate.getFullYear(),
    month: hebcalToHalachic(hdate.getMonth(), hdate.getFullYear()),
    day: hdate.getDate(),
  };
}

/**
 * Format a Hebrew date for display.
 *
 * locale 'he': "י"ז באייר תשפ"ו"
 * locale 'en': "17 Iyar 5786"
 */
export function formatHebrewDate(hd: HebrewDate, locale: 'he' | 'en'): string {
  if (locale === 'en') {
    return `${hd.day} ${MONTH_NAMES_EN[hd.month]} ${hd.year}`;
  }

  const dayStr = gematriya(hd.day);
  const monthStr = MONTH_NAMES_HE[hd.month]!;
  const yearStr = gematriya(hd.year % 1000); // e.g. 786 -> תשפ"ו
  // Add ב prefix for "in [month]" convention (יז באייר)
  return `${dayStr} ב${monthStr} ${yearStr}`;
}

/**
 * Format a Hebrew date WITHOUT the year, compact form.
 * Used in places where year is obvious from context.
 */
export function formatHebrewDateShort(hd: HebrewDate, locale: 'he' | 'en'): string {
  if (locale === 'en') {
    return `${hd.day} ${MONTH_NAMES_EN[hd.month]}`;
  }
  const dayStr = gematriya(hd.day);
  const monthStr = MONTH_NAMES_HE[hd.month]!;
  return `${dayStr} ב${monthStr}`;
}

/**
 * Format a sighting moment (Hebrew date + onah) with halachic convention:
 *   - Day onah: show the date as usual: "י"ז באייר תשפ"ו"
 *   - Night onah: prefix "אור ל" indicating this is the night leading to that date.
 *     "אור לי"ז באייר תשפ"ו"
 *
 * The halachic meaning: the Hebrew day starts at sunset. So "night of 17 Iyar"
 * is the evening/night portion of the 17th, traditionally called "אור ל17".
 */
export function formatSightingDate(
  hd: HebrewDate,
  onah: Onah,
  locale: 'he' | 'en',
  options: { short?: boolean } = {}
): string {
  const dateStr = options.short
    ? formatHebrewDateShort(hd, locale)
    : formatHebrewDate(hd, locale);

  if (onah === 'night') {
    if (locale === 'he') {
      // Traditional: "אור ל" + date with gematriya joined with maqaf
      // "אור ל־י״ז באייר" is cleaner than "אור ל י״ז באייר"
      return `אור ל־${dateStr}`;
    }
    return `Eve of ${dateStr}`;
  }

  return dateStr;
}

/**
 * Format a Gregorian date for display.
 */
export function formatGregorianDate(date: Date, locale: 'he' | 'en'): string {
  return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// Hebrew month names (halachic ordering: Nisan=1)
const MONTH_NAMES_HE: Record<number, string> = {
  1: 'ניסן',
  2: 'אייר',
  3: 'סיון',
  4: 'תמוז',
  5: 'אב',
  6: 'אלול',
  7: 'תשרי',
  8: 'חשוון',
  9: 'כסלו',
  10: 'טבת',
  11: 'שבט',
  12: 'אדר',
  13: 'אדר ב׳',
};

const MONTH_NAMES_EN: Record<number, string> = {
  1: 'Nisan',
  2: 'Iyar',
  3: 'Sivan',
  4: 'Tammuz',
  5: 'Av',
  6: 'Elul',
  7: 'Tishrei',
  8: 'Cheshvan',
  9: 'Kislev',
  10: 'Tevet',
  11: 'Shevat',
  12: 'Adar',
  13: 'Adar II',
};

// Internal conversion helpers (duplicated from hebrewDate.ts to avoid circular deps)
function halachicToHebcal(halachicMonth: number, year: number): number {
  const mapping: Record<number, number> = {
    1: hebMonths.NISAN,
    2: hebMonths.IYYAR,
    3: hebMonths.SIVAN,
    4: hebMonths.TAMUZ,
    5: hebMonths.AV,
    6: hebMonths.ELUL,
    7: hebMonths.TISHREI,
    8: hebMonths.CHESHVAN,
    9: hebMonths.KISLEV,
    10: hebMonths.TEVET,
    11: hebMonths.SHVAT,
    12: isLeapYear(year) ? hebMonths.ADAR_I : hebMonths.ADAR_II,
    13: hebMonths.ADAR_II,
  };
  return mapping[halachicMonth]!;
}

function hebcalToHalachic(hebcalMonth: number, year: number): number {
  const mapping: Record<number, number> = {
    [hebMonths.NISAN]: 1,
    [hebMonths.IYYAR]: 2,
    [hebMonths.SIVAN]: 3,
    [hebMonths.TAMUZ]: 4,
    [hebMonths.AV]: 5,
    [hebMonths.ELUL]: 6,
    [hebMonths.TISHREI]: 7,
    [hebMonths.CHESHVAN]: 8,
    [hebMonths.KISLEV]: 9,
    [hebMonths.TEVET]: 10,
    [hebMonths.SHVAT]: 11,
    [hebMonths.ADAR_I]: isLeapYear(year) ? 12 : 12,
    [hebMonths.ADAR_II]: isLeapYear(year) ? 13 : 12,
  };
  return mapping[hebcalMonth]!;
}
