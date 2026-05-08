/**
 * Hebrew Calendar Module
 *
 * Wraps @hebcal/core to provide Hebrew date operations
 * needed by the halachic engine.
 *
 * Key design choice: Inclusive day counting (section 21 of halachot).
 * hebrewDaysBetween(a, b) counts BOTH the first and last day.
 * 1 Nisan to 25 Nisan = 25 days, not 24.
 */

import { HDate, months } from '@hebcal/core';

// עונה — Half-day unit: day (sunrise to sunset) or night (sunset to sunrise)
export type Onah = 'day' | 'night';

// תאריך עברי
export interface HebrewDate {
  year: number;      // e.g. 5786
  month: number;     // 1=Nisan, 2=Iyar, ..., 12=Adar (13=Adar II in leap year)
  day: number;       // 1-30
}

// רגע ראיה — Hebrew date + onah
export interface SightingMoment {
  date: HebrewDate;
  onah: Onah;
}

/**
 * Hebrew month names in order (1-based index).
 * Month 1 = Nisan, Month 7 = Tishrei.
 */
export const HEBREW_MONTHS = [
  '', // placeholder for 0-index
  'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar',
  'Adar II',
] as const;

/**
 * Convert our HebrewDate to hebcal HDate.
 * hebcal uses a different month numbering: Tishrei=1.
 * We use Nisan=1 as is standard in halachic context.
 */
function toHDate(hd: HebrewDate): HDate {
  return new HDate(hd.day, halachicMonthToHebcal(hd.month, hd.year), hd.year);
}

/**
 * Convert hebcal HDate to our HebrewDate.
 */
function fromHDate(hdate: HDate): HebrewDate {
  return {
    year: hdate.getFullYear(),
    month: hebcalMonthToHalachic(hdate.getMonth(), hdate.getFullYear()),
    day: hdate.getDate(),
  };
}

/**
 * Convert halachic month number (Nisan=1) to hebcal month constant.
 */
function halachicMonthToHebcal(halachicMonth: number, year: number): number {
  // hebcal: Nisan=months.NISAN(8), Iyar=9, ... Tishrei=months.TISHREI(1)
  const mapping: Record<number, number> = {
    1: months.NISAN,      // 8
    2: months.IYYAR,      // 9
    3: months.SIVAN,      // 10
    4: months.TAMUZ,      // 11
    5: months.AV,         // 12
    6: months.ELUL,       // 13
    7: months.TISHREI,    // 1
    8: months.CHESHVAN,   // 2
    9: months.KISLEV,     // 3
    10: months.TEVET,     // 4
    11: months.SHVAT,     // 5
    12: isLeapYear(year) ? months.ADAR_I : months.ADAR_II,  // 6 or 7
    13: months.ADAR_II,   // 7 (only in leap year)
  };
  return mapping[halachicMonth]!;
}

/**
 * Convert hebcal month number to halachic month (Nisan=1).
 */
function hebcalMonthToHalachic(hebcalMonth: number, year: number): number {
  const mapping: Record<number, number> = {
    [months.NISAN]: 1,
    [months.IYYAR]: 2,
    [months.SIVAN]: 3,
    [months.TAMUZ]: 4,
    [months.AV]: 5,
    [months.ELUL]: 6,
    [months.TISHREI]: 7,
    [months.CHESHVAN]: 8,
    [months.KISLEV]: 9,
    [months.TEVET]: 10,
    [months.SHVAT]: 11,
    [months.ADAR_I]: isLeapYear(year) ? 12 : 12,
    [months.ADAR_II]: isLeapYear(year) ? 13 : 12,
  };
  return mapping[hebcalMonth]!;
}

/**
 * Check if a Hebrew year is a leap year (has Adar I and Adar II).
 */
export function isLeapYear(year: number): boolean {
  return HDate.isLeapYear(year);
}

/**
 * Get the number of days in a Hebrew month.
 * Returns 29 or 30.
 */
export function hebrewMonthLength(year: number, month: number): number {
  const hdate = new HDate(1, halachicMonthToHebcal(month, year), year);
  return hdate.daysInMonth();
}

/**
 * Count days between two Hebrew dates, INCLUSIVE.
 * Both the first and last day are counted.
 * (Section 21: 1 Nisan to 25 Nisan = haflaga of 25 days)
 *
 * Returns a positive number if b is after a.
 */
export function hebrewDaysBetween(a: HebrewDate, b: HebrewDate): number {
  const hdA = toHDate(a);
  const hdB = toHDate(b);
  const diff = hdB.abs() - hdA.abs();
  return diff + 1; // inclusive counting
}

/**
 * Add days to a Hebrew date.
 *
 * Note: when used for haflaga calculation, we often do:
 *   addHebrewDays(sightingDate, haflaga - 1)
 * because the sighting day itself counts as day 1.
 */
export function addHebrewDays(date: HebrewDate, days: number): HebrewDate {
  const hd = toHDate(date);
  const result = new HDate(hd.abs() + days);
  return fromHDate(result);
}

/**
 * Get the day of week (0=Sunday, 6=Saturday).
 */
export function dayOfWeek(date: HebrewDate): number {
  return toHDate(date).getDay();
}

/**
 * Check if two dates are the same day of the Hebrew month.
 * Handles Rosh Chodesh edge case (section 19):
 * Day 30 and day 1 are both considered Rosh Chodesh.
 */
export function sameDayOfMonth(a: HebrewDate, b: HebrewDate): boolean {
  return a.day === b.day;
}

/**
 * Check if a date is Rosh Chodesh (day 1 or day 30 of the month).
 */
export function isRoshChodesh(date: HebrewDate): boolean {
  return date.day === 1 || date.day === 30;
}

/**
 * Get the Rosh Chodesh days for a given month.
 * Returns 1 or 2 dates:
 * - Always includes day 1 of the given month
 * - If the previous month has 30 days, also includes day 30 of previous month
 */
export function getRoshChodeshDays(year: number, month: number): HebrewDate[] {
  const result: HebrewDate[] = [];

  // Get previous month
  const { year: prevYear, month: prevMonth } = getPreviousMonth(year, month);
  const prevMonthLen = hebrewMonthLength(prevYear, prevMonth);

  // If previous month has 30 days, day 30 is also Rosh Chodesh
  if (prevMonthLen === 30) {
    result.push({ year: prevYear, month: prevMonth, day: 30 });
  }

  // Day 1 of the month is always Rosh Chodesh
  result.push({ year, month, day: 1 });

  return result;
}

/**
 * Get the previous month (handles year boundary and leap year).
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) {
    // Before Nisan = Adar (or Adar II in leap year)
    const prevYear = year - 1;
    const prevMonth = isLeapYear(prevYear) ? 13 : 12;
    return { year: prevYear, month: prevMonth };
  }
  if (month === 7) {
    // Before Tishrei = Elul
    return { year, month: 6 };
  }
  return { year, month: month - 1 };
}

/**
 * Get the next month (handles year boundary and leap year).
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } {
  const maxMonth = isLeapYear(year) ? 13 : 12;
  if (month === 6) {
    // After Elul = Tishrei
    return { year, month: 7 };
  }
  if (month >= maxMonth) {
    // After last month = Nisan of next year
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Check if two HebrewDates are the same date.
 */
export function sameDate(a: HebrewDate, b: HebrewDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Check if date a is before date b.
 */
export function isBefore(a: HebrewDate, b: HebrewDate): boolean {
  const hdA = toHDate(a);
  const hdB = toHDate(b);
  return hdA.abs() < hdB.abs();
}

/**
 * Check if date a is after date b.
 */
export function isAfter(a: HebrewDate, b: HebrewDate): boolean {
  const hdA = toHDate(a);
  const hdB = toHDate(b);
  return hdA.abs() > hdB.abs();
}

/**
 * Get all days in a Hebrew month (for calendar display).
 */
export function getMonthDays(year: number, month: number): HebrewDate[] {
  const length = hebrewMonthLength(year, month);
  const days: HebrewDate[] = [];
  for (let day = 1; day <= length; day++) {
    days.push({ year, month, day });
  }
  return days;
}

/**
 * Create a HebrewDate from the current Gregorian date.
 *
 * NOTE: This uses the browser's local midnight boundary, which is NOT
 * halachically correct — Hebrew dates change at sunset.
 * For halachic accuracy, use `halachicToday(location)` from `./zmanim`.
 * This function is kept for backwards compatibility and testing.
 */
export function today(): HebrewDate {
  return fromHDate(new HDate());
}
