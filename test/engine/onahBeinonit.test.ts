/**
 * Tests for Onah Beinonit Calculator
 * Based on sections 37-45 of הלכות-ווסתות.txt
 */

import { describe, test, expect } from 'vitest';
import { calculateOnahBeinonit } from '../../src/engine/onahBeinonit';
import { sameDate, type HebrewDate } from '../../src/calendar/hebrewDate';
import type { VesetRecord } from '../../src/data/types';

function hd(day: number, month: number, year: number = 5786): HebrewDate {
  return { year, month, day };
}

describe('Onah Beinonit — Basic calculation', () => {
  test('section-37: 5 Nisan → worry on 4 Iyar (day 30) and 5 Iyar (day 31)', () => {
    // ראתה ה' ניסן → חוששת ד' אייר (יום 30) וה' אייר (יום 31)
    // Nisan has 30 days. Day 30 from 5 Nisan (inclusive):
    // 5 Nisan is day 1, so day 30 = 5 + 29 = 34th of year... let's just check.
    const result = calculateOnahBeinonit(hd(5, 1), null);

    expect(result.length).toBe(2);
    // Day 30: Nisan has 30 days. 5 Nisan + 29 = 4 Iyar (5+29=34, 34-30=4 Iyar)
    expect(sameDate(result[0]!.hebrewDate, hd(4, 2))).toBe(true);
    // Day 31: 5 Iyar
    expect(sameDate(result[1]!.hebrewDate, hd(5, 2))).toBe(true);

    // Both should be 'full' (24-hour worry) — section 41
    expect(result[0]!.onah).toBe('full');
    expect(result[1]!.onah).toBe('full');
  });

  test('section-41: both days are full 24-hour worry', () => {
    const result = calculateOnahBeinonit(hd(1, 7), null); // 1 Tishrei
    expect(result[0]!.onah).toBe('full');
    expect(result[1]!.onah).toBe('full');
  });
});

describe('Onah Beinonit — Fixed veset exemptions', () => {
  test('section-43: woman with fixed veset does NOT worry about OB', () => {
    const fixedVeset: VesetRecord = {
      id: '1',
      type: 'haflaga',
      status: 'fixed',
      details: { kind: 'haflaga', interval: 28, onah: 'day' },
      establishedBy: [],
      uprootCount: 0,
      isMaAyanPatuach: false,
      createdAt: '',
      updatedAt: '',
    };

    const result = calculateOnahBeinonit(hd(5, 1), fixedVeset, false);
    expect(result.length).toBe(0);
  });

  test('section-44: fixed haflaga < 30, missed → worry only day 30, same onah', () => {
    const fixedVeset: VesetRecord = {
      id: '1',
      type: 'haflaga',
      status: 'fixed',
      details: { kind: 'haflaga', interval: 27, onah: 'day' },
      establishedBy: [],
      uprootCount: 0,
      isMaAyanPatuach: false,
      createdAt: '',
      updatedAt: '',
    };

    const result = calculateOnahBeinonit(hd(5, 1), fixedVeset, true);
    expect(result.length).toBe(1);
    expect(sameDate(result[0]!.hebrewDate, hd(4, 2))).toBe(true); // day 30
    expect(result[0]!.onah).toBe('day'); // same onah as fixed veset
  });

  test('section-45: fixed chodesh, missed → no OB worry at all', () => {
    const fixedVeset: VesetRecord = {
      id: '1',
      type: 'chodesh',
      status: 'fixed',
      details: { kind: 'chodesh', dayOfMonth: 5, onah: 'day', isRoshChodesh: false },
      establishedBy: [],
      uprootCount: 0,
      isMaAyanPatuach: false,
      createdAt: '',
      updatedAt: '',
    };

    const result = calculateOnahBeinonit(hd(10, 1), fixedVeset, true);
    expect(result.length).toBe(0);
  });
});
