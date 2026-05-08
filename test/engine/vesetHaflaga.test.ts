/**
 * Tests for Veset HaHaflaga Calculator
 * Based on sections 20-31 of הלכות-ווסתות.txt
 */

import { describe, test, expect } from 'vitest';
import {
  calculateHaflagaWorries,
  getActiveHaflagot,
  checkHaflagaKavua,
  calculateInterval,
} from '../../src/engine/vesetHaflaga';
import { sameDate, hebrewDaysBetween, type HebrewDate } from '../../src/calendar/hebrewDate';
import type { Sighting } from '../../src/data/types';

function hd(day: number, month: number, year: number = 5786): HebrewDate {
  return { year, month, day };
}

function makeSighting(day: number, month: number, onah: 'day' | 'night' = 'day', id?: string): Sighting {
  return {
    id: id ?? `s-${month}-${day}`,
    hebrewDate: hd(day, month),
    onah,
    type: 'regular',
    medicationStatus: 'none',
    pregnancyStatus: 'none',
    createdAt: '',
  };
}

describe('calculateInterval — Inclusive counting (Section 21)', () => {
  test('section-21: 1 Nisan to 25 Nisan = 25 days', () => {
    const a = makeSighting(1, 1);
    const b = makeSighting(25, 1);
    expect(calculateInterval(a, b)).toBe(25);
  });

  test('same day = interval of 1', () => {
    const a = makeSighting(5, 1);
    const b = makeSighting(5, 1);
    expect(calculateInterval(a, b)).toBe(1);
  });

  test('cross month: 25 Nisan to 19 Iyar = 25 days (Nisan=30)', () => {
    const a = makeSighting(25, 1);
    const b = makeSighting(19, 2);
    expect(calculateInterval(a, b)).toBe(25);
  });
});

describe('getActiveHaflagot — Basic', () => {
  test('2 sightings create 1 haflaga worry', () => {
    const sightings = [
      makeSighting(1, 1),
      makeSighting(25, 1),
    ];
    const active = getActiveHaflagot(sightings);
    expect(active.length).toBe(1);
    expect(active[0]!.interval).toBe(25);
  });

  test('less than 2 sightings = no haflaga', () => {
    expect(getActiveHaflagot([makeSighting(1, 1)]).length).toBe(0);
    expect(getActiveHaflagot([]).length).toBe(0);
  });
});

describe('Section 29-30: Short haflaga does NOT uproot long haflaga', () => {
  test('section-30: haflaga 29 then 27 → worry about BOTH 27 and 29', () => {
    // ראתה בהפלגה 29, אח"כ 27 → חוששת ליום 27 ויום 29 מהראיה האחרונה
    // Sighting 1: 1 Nisan
    // Sighting 2: 29 Nisan (interval = 29, inclusive)
    // Sighting 3: 25 Iyar (interval = 27 from 29 Nisan, inclusive)
    // Verify: 29 Nisan to 25 Iyar = (30-29) + 25 + 1 = 27
    expect(hebrewDaysBetween(hd(29, 1), hd(25, 2))).toBe(27);

    const correctSightings = [
      makeSighting(1, 1),
      makeSighting(29, 1),  // haflaga 29
      makeSighting(25, 2),  // haflaga 27 (shorter!)
    ];

    const active = getActiveHaflagot(correctSightings);

    // Should have both 27 and 29
    const intervals = active.map(h => h.interval).sort((a, b) => a - b);
    expect(intervals).toContain(27);
    expect(intervals).toContain(29);
  });

  test('equal or longer haflaga DOES uproot previous', () => {
    // haflaga 25, then haflaga 28 → only worry about 28
    const sightings = [
      makeSighting(1, 1),
      makeSighting(25, 1),  // haflaga 25
      makeSighting(23, 2),  // haflaga from 25 Nisan to 23 Iyar
    ];

    // Verify: 25 Nisan to 23 Iyar = (30-25) + 23 + 1 = 5 + 23 + 1 = 29
    expect(hebrewDaysBetween(hd(25, 1), hd(23, 2))).toBe(29);

    const active = getActiveHaflagot(sightings);
    // 29 > 25, so 25 should be uprooted
    const intervals = active.map(h => h.interval);
    expect(intervals).toContain(29);
    expect(intervals).not.toContain(25);
  });
});

describe('calculateHaflagaWorries — Worry day calculation', () => {
  test('section-21: sighting on 1 Nisan, then 25 Nisan → worry 19 Iyar', () => {
    const sightings = [
      makeSighting(1, 1),
      makeSighting(25, 1),
    ];

    const worries = calculateHaflagaWorries(sightings);
    expect(worries.length).toBe(1);

    // Haflaga = 25. Next worry: 25 days from 25 Nisan (inclusive).
    // 25 Nisan + 24 = 19 Iyar
    expect(sameDate(worries[0]!.hebrewDate, hd(19, 2))).toBe(true);
  });
});

describe('checkHaflagaKavua — Fixed veset establishment', () => {
  test('section-20: 4 sightings with 3 equal intervals = kavua', () => {
    const sightings = [
      makeSighting(1, 1, 'night'),
      makeSighting(25, 1, 'day'),   // haflaga 25
      makeSighting(19, 2, 'day'),   // haflaga 25
      makeSighting(14, 3, 'day'),   // haflaga 25 (Iyar=29: 19+24=43, 43-29=14 Sivan)
    ];

    // Verify intervals
    expect(hebrewDaysBetween(hd(1, 1), hd(25, 1))).toBe(25);
    expect(hebrewDaysBetween(hd(25, 1), hd(19, 2))).toBe(25);
    // 19 Iyar to 14 Sivan: Iyar has 29 days. (29-19) + 14 + 1 = 10 + 14 + 1 = 25
    expect(hebrewDaysBetween(hd(19, 2), hd(14, 3))).toBe(25);

    const kavua = checkHaflagaKavua(sightings);
    expect(kavua).not.toBeNull();
    expect(kavua!.interval).toBe(25);
    expect(kavua!.onah).toBe('day');
  });

  test('section-23: first sighting onah can differ', () => {
    // First sighting is night, rest are day — should still establish
    const sightings = [
      makeSighting(1, 1, 'night'),  // different onah — OK per section 23
      makeSighting(25, 1, 'day'),
      makeSighting(19, 2, 'day'),
      makeSighting(14, 3, 'day'),
    ];

    const kavua = checkHaflagaKavua(sightings);
    expect(kavua).not.toBeNull();
    expect(kavua!.interval).toBe(25);
    expect(kavua!.onah).toBe('day');
  });

  test('mixed onahs in intervals = no kavua', () => {
    const sightings = [
      makeSighting(1, 1, 'day'),
      makeSighting(25, 1, 'day'),
      makeSighting(19, 2, 'night'),  // different onah!
      makeSighting(14, 3, 'day'),
    ];

    const kavua = checkHaflagaKavua(sightings);
    expect(kavua).toBeNull();
  });

  test('3 sightings (only 2 intervals) = not enough for kavua', () => {
    const sightings = [
      makeSighting(1, 1, 'day'),
      makeSighting(25, 1, 'day'),
      makeSighting(19, 2, 'day'),
    ];

    const kavua = checkHaflagaKavua(sightings);
    expect(kavua).toBeNull();
  });
});

describe('Section 117 — Comprehensive example from the document', () => {
  test('1 Tishrei (haflaga 35) then 25 Tishrei (haflaga 25)', () => {
    // Based on the table in section 117:
    // Previous sighting: 26 Av 5786 (before Tishrei 5787)
    // 1 Tishrei 5787 = haflaga of 35 from 26 Av
    // 25 Tishrei 5787 = haflaga of 25 from 1 Tishrei

    // Note: Tishrei starts a new Hebrew year, so we need year 5787 for Tishrei
    const sightings = [
      makeSighting(26, 5, 'day', 's1'),  // 26 Av 5786
      { ...makeSighting(1, 7, 'day', 's2'), hebrewDate: hd(1, 7, 5787) },   // 1 Tishrei 5787
      { ...makeSighting(25, 7, 'day', 's3'), hebrewDate: hd(25, 7, 5787) },  // 25 Tishrei 5787
    ];

    // Verify intervals
    // 26 Av 5786 to 1 Tishrei 5787: Av(30)=4 remaining + Elul(29) + 1 Tishrei + 1 = 35
    const interval1 = hebrewDaysBetween(hd(26, 5, 5786), hd(1, 7, 5787));
    expect(interval1).toBe(35);

    const interval2 = hebrewDaysBetween(hd(1, 7, 5787), hd(25, 7, 5787));
    expect(interval2).toBe(25);

    const active = getActiveHaflagot(sightings);

    // Per section 29: haflaga 25 is shorter than 35, so 35 is NOT uprooted
    // Should worry about both 25 and 35 from 25 Tishrei
    const intervals = active.map(h => h.interval).sort((a, b) => a - b);
    expect(intervals).toContain(25);
    expect(intervals).toContain(35);

    // Calculate actual worry days
    const worries = calculateHaflagaWorries(sightings);
    const worryDays = worries.map(w => w.hebrewDate);

    // Haflaga 25 from 25 Tishrei 5787: 25 Tishrei + 24 = 19 Cheshvan
    expect(worryDays.some(d => sameDate(d, hd(19, 8, 5787)))).toBe(true);

    // Haflaga 35 from 25 Tishrei 5787: 25 Tishrei + 34 = 29 Cheshvan
    expect(worryDays.some(d => sameDate(d, hd(29, 8, 5787)))).toBe(true);
  });
});
