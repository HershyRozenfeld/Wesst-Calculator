/**
 * Tests for Hebrew Calendar Module
 *
 * Validates Hebrew date operations critical for veset calculations.
 * Section references point to הלכות-ווסתות.txt
 */

import { describe, test, expect } from 'vitest';
import {
  hebrewDaysBetween,
  addHebrewDays,
  hebrewMonthLength,
  isLeapYear,
  dayOfWeek,
  sameDate,
  isBefore,
  isAfter,
  getRoshChodeshDays,
  getNextMonth,
  getPreviousMonth,
  type HebrewDate,
} from '../../src/calendar/hebrewDate';

// Helper: create HebrewDate shorthand (Nisan=1)
function hd(day: number, month: number, year: number = 5786): HebrewDate {
  return { year, month, day };
}

describe('hebrewDaysBetween — Inclusive counting (Section 21)', () => {
  test('section-21: 1 Nisan to 25 Nisan = haflaga of 25 days', () => {
    // א' ניסן → כ"ה ניסן = הפלגה 25
    expect(hebrewDaysBetween(hd(1, 1), hd(25, 1))).toBe(25);
  });

  test('same day = 1 (day counts as both start and end)', () => {
    expect(hebrewDaysBetween(hd(5, 1), hd(5, 1))).toBe(1);
  });

  test('adjacent days = 2', () => {
    expect(hebrewDaysBetween(hd(5, 1), hd(6, 1))).toBe(2);
  });

  test('cross month boundary: Nisan (30 days) to Iyar', () => {
    // א' ניסן → א' אייר = 31 ימים (ניסן = 30 יום)
    expect(hebrewDaysBetween(hd(1, 1), hd(1, 2))).toBe(31);
  });

  test('section-21: 25 Nisan to 19 Iyar = 25 days (Nisan is full=30)', () => {
    // כ"ה ניסן → י"ט אייר
    // Nisan has 30 days. From 25 Nisan: 6 remaining in Nisan + 19 in Iyar = 25
    // But inclusive: (30-25) + 19 + 1 = 25. Let's verify.
    expect(hebrewDaysBetween(hd(25, 1), hd(19, 2))).toBe(25);
  });

  test('cross two months: 1 Nisan to 1 Sivan', () => {
    // Nisan=30, Iyar=29, so 1 Nisan to 1 Sivan:
    // 30 (rest of Nisan) + 29 (Iyar) + 1 (Sivan) = 60, but inclusive from day 1:
    // Actually: abs difference + 1
    const days = hebrewDaysBetween(hd(1, 1), hd(1, 3));
    expect(days).toBe(60); // 30 + 29 + 1 = 60
  });
});

describe('addHebrewDays', () => {
  test('add 0 days = same date', () => {
    const result = addHebrewDays(hd(5, 1), 0);
    expect(sameDate(result, hd(5, 1))).toBe(true);
  });

  test('add within same month', () => {
    const result = addHebrewDays(hd(1, 1), 10);
    expect(sameDate(result, hd(11, 1))).toBe(true);
  });

  test('add crossing month boundary', () => {
    // 25 Nisan + 24 = 19 Iyar (for haflaga of 25, we add interval-1=24)
    const result = addHebrewDays(hd(25, 1), 24);
    expect(result.day).toBe(19);
    expect(result.month).toBe(2); // Iyar
  });

  test('section-21 haflaga calculation: sighting on 1 Nisan, haflaga 25', () => {
    // If haflaga=25, next worry is 25 days later inclusive.
    // Day 1 is the sighting itself, so add (25-1)=24 days.
    const worry = addHebrewDays(hd(1, 1), 24);
    expect(worry.day).toBe(25);
    expect(worry.month).toBe(1); // still Nisan
  });

  test('add crossing year boundary', () => {
    // 29 Elul + 2 = 1 Tishrei (next month in halachic order is Tishrei)
    // Elul has 29 days. 29 Elul + 1 = 30 Elul? No, Elul has 29 days.
    // 29 Elul + 1 = 1 Tishrei
    const result = addHebrewDays(hd(29, 6), 1);
    expect(result.day).toBe(1);
    expect(result.month).toBe(7); // Tishrei
  });
});

describe('hebrewMonthLength', () => {
  test('Nisan = 30 days (always)', () => {
    expect(hebrewMonthLength(5786, 1)).toBe(30);
  });

  test('Iyar = 29 days (always)', () => {
    expect(hebrewMonthLength(5786, 2)).toBe(29);
  });

  test('Sivan = 30 days (always)', () => {
    expect(hebrewMonthLength(5786, 3)).toBe(30);
  });

  test('Tammuz = 29 days (always)', () => {
    expect(hebrewMonthLength(5786, 4)).toBe(29);
  });

  test('Av = 30 days (always)', () => {
    expect(hebrewMonthLength(5786, 5)).toBe(30);
  });

  test('Elul = 29 days (always)', () => {
    expect(hebrewMonthLength(5786, 6)).toBe(29);
  });

  test('Tishrei = 30 days (always)', () => {
    expect(hebrewMonthLength(5786, 7)).toBe(30);
  });

  // Cheshvan and Kislev vary by year type
  test('Cheshvan length depends on year type', () => {
    const len = hebrewMonthLength(5786, 8);
    expect([29, 30]).toContain(len);
  });

  test('Kislev length depends on year type', () => {
    const len = hebrewMonthLength(5786, 9);
    expect([29, 30]).toContain(len);
  });
});

describe('isLeapYear', () => {
  test('leap years in 19-year cycle', () => {
    // Years 3, 6, 8, 11, 14, 17, 19 of the cycle are leap
    // 5784 is a leap year (5784 % 19 = 8)
    expect(isLeapYear(5784)).toBe(true);
    // 5785 is not (5785 % 19 = 9)
    expect(isLeapYear(5785)).toBe(false);
    // 5787 is a leap year (5787 % 19 = 11)
    expect(isLeapYear(5787)).toBe(true);
  });
});

describe('date comparison', () => {
  test('sameDate', () => {
    expect(sameDate(hd(5, 1), hd(5, 1))).toBe(true);
    expect(sameDate(hd(5, 1), hd(6, 1))).toBe(false);
    expect(sameDate(hd(5, 1), hd(5, 2))).toBe(false);
  });

  test('isBefore', () => {
    expect(isBefore(hd(1, 1), hd(2, 1))).toBe(true);
    expect(isBefore(hd(2, 1), hd(1, 1))).toBe(false);
    expect(isBefore(hd(1, 1), hd(1, 1))).toBe(false);
    expect(isBefore(hd(30, 1), hd(1, 2))).toBe(true); // cross month
  });

  test('isAfter', () => {
    expect(isAfter(hd(2, 1), hd(1, 1))).toBe(true);
    expect(isAfter(hd(1, 1), hd(2, 1))).toBe(false);
  });
});

describe('getRoshChodeshDays (Section 19)', () => {
  test('month after 30-day month has 2 Rosh Chodesh days', () => {
    // Nisan has 30 days, so Iyar has 2 RC days: 30 Nisan + 1 Iyar
    const rc = getRoshChodeshDays(5786, 2); // Iyar
    expect(rc.length).toBe(2);
    expect(rc[0]!.day).toBe(30);
    expect(rc[0]!.month).toBe(1); // 30 Nisan
    expect(rc[1]!.day).toBe(1);
    expect(rc[1]!.month).toBe(2); // 1 Iyar
  });

  test('month after 29-day month has 1 Rosh Chodesh day', () => {
    // Iyar has 29 days, so Sivan has 1 RC day: 1 Sivan only
    const rc = getRoshChodeshDays(5786, 3); // Sivan
    expect(rc.length).toBe(1);
    expect(rc[0]!.day).toBe(1);
    expect(rc[0]!.month).toBe(3); // 1 Sivan
  });
});

describe('getNextMonth / getPreviousMonth', () => {
  test('next month within year', () => {
    expect(getNextMonth(5786, 1)).toEqual({ year: 5786, month: 2 });
    expect(getNextMonth(5786, 5)).toEqual({ year: 5786, month: 6 });
  });

  test('Elul → Tishrei (same year)', () => {
    expect(getNextMonth(5786, 6)).toEqual({ year: 5786, month: 7 });
  });

  test('Adar → Nisan (next year, non-leap)', () => {
    // 5786 is not a leap year, so month 12 is the last
    if (!isLeapYear(5786)) {
      expect(getNextMonth(5786, 12)).toEqual({ year: 5787, month: 1 });
    }
  });

  test('previous month within year', () => {
    expect(getPreviousMonth(5786, 2)).toEqual({ year: 5786, month: 1 });
  });

  test('Nisan → Adar of previous year', () => {
    const prev = getPreviousMonth(5786, 1);
    expect(prev.year).toBe(5785);
    expect(prev.month).toBeGreaterThanOrEqual(12);
  });

  test('Tishrei → Elul', () => {
    expect(getPreviousMonth(5786, 7)).toEqual({ year: 5786, month: 6 });
  });
});

describe('dayOfWeek', () => {
  test('returns 0-6', () => {
    const dow = dayOfWeek(hd(1, 1));
    expect(dow).toBeGreaterThanOrEqual(0);
    expect(dow).toBeLessThanOrEqual(6);
  });
});
