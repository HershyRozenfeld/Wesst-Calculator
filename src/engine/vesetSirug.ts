/**
 * Veset HaSirug Calculator — ווסת הסירוג
 *
 * Sighting on same day of Hebrew month, every N months.
 *
 * Based on sections 64-66 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Fixed after 3 sightings on same day-of-month with same month-interval (section 64)
 * - Same onah required
 * - Any sighting in between DISQUALIFIES (section 65) — veset not established
 * - NO non-fixed worry before establishment (section 66)
 *
 * This veset is nearly non-existent in practice because any intermediate sighting
 * (even ketem in some views) disqualifies it. The app still supports it.
 */

import type { HebrewDate, Onah } from '../calendar/hebrewDate';
import { getNextMonth, isBefore, isAfter } from '../calendar/hebrewDate';
import type { Sighting, SeparationDay } from '../data/types';

export interface SirugKavua {
  dayOfMonth: number;
  monthInterval: number; // e.g., 2 = every other month
  onah: Onah;
  establishedBy: string[];
}

/**
 * Calculate the number of months between two dates.
 * Handles year boundary (Tishrei).
 */
function monthsBetween(a: HebrewDate, b: HebrewDate): number {
  if (isBefore(b, a)) return -monthsBetween(b, a);

  let months = 0;
  let current = { year: a.year, month: a.month };

  while (current.year !== b.year || current.month !== b.month) {
    const next = getNextMonth(current.year, current.month);
    current = next;
    months++;
    if (months > 200) break; // safety
  }
  return months;
}

/**
 * Check if there are any sightings strictly between two dates.
 */
function hasSightingBetween(
  sightings: Sighting[],
  from: HebrewDate,
  to: HebrewDate,
  excludeIds: string[],
): boolean {
  return sightings.some(s => {
    if (excludeIds.includes(s.id)) return false;
    if (s.type !== 'regular') return false;
    return isAfter(s.hebrewDate, from) && isBefore(s.hebrewDate, to);
  });
}

/**
 * Check if a fixed Veset HaSirug exists.
 *
 * @param sightings - Regular sightings in chronological order
 * @returns The kavua details, or null
 */
export function checkSirugKavua(sightings: Sighting[]): SirugKavua | null {
  const regulars = sightings.filter(s => s.type === 'regular');
  if (regulars.length < 3) return null;

  // Try every window of 3 consecutive sightings
  for (let i = 0; i <= regulars.length - 3; i++) {
    const [s1, s2, s3] = [regulars[i]!, regulars[i + 1]!, regulars[i + 2]!];

    // Same onah
    if (s1.onah !== s2.onah || s2.onah !== s3.onah) continue;

    // Same day of month
    if (s1.hebrewDate.day !== s2.hebrewDate.day) continue;
    if (s2.hebrewDate.day !== s3.hebrewDate.day) continue;

    // Same month interval (> 1, otherwise it's chodesh)
    const int12 = monthsBetween(s1.hebrewDate, s2.hebrewDate);
    const int23 = monthsBetween(s2.hebrewDate, s3.hebrewDate);
    if (int12 !== int23 || int12 < 2) continue;

    // Section 65: No sightings in between
    const excludeIds = [s1.id, s2.id, s3.id];
    if (hasSightingBetween(sightings, s1.hebrewDate, s2.hebrewDate, excludeIds)) continue;
    if (hasSightingBetween(sightings, s2.hebrewDate, s3.hebrewDate, excludeIds)) continue;

    return {
      dayOfMonth: s1.hebrewDate.day,
      monthInterval: int12,
      onah: s1.onah,
      establishedBy: [s1.id, s2.id, s3.id],
    };
  }

  return null;
}

/**
 * Calculate the next worry day for a fixed Sirug veset.
 */
export function calculateSirugWorry(
  kavua: SirugKavua,
  lastSighting: Sighting,
): SeparationDay {
  // Advance by monthInterval months, keep same day-of-month
  let year = lastSighting.hebrewDate.year;
  let month = lastSighting.hebrewDate.month;
  for (let i = 0; i < kavua.monthInterval; i++) {
    const next = getNextMonth(year, month);
    year = next.year;
    month = next.month;
  }

  return {
    hebrewDate: { year, month, day: kavua.dayOfMonth },
    onah: kavua.onah,
    reasons: [{
      vesetType: 'sirug',
      description_he: `ווסת הסירוג — יום ${kavua.dayOfMonth} כל ${kavua.monthInterval} חודשים`,
      description_en: `Veset HaSirug — Day ${kavua.dayOfMonth} every ${kavua.monthInterval} months`,
      sectionRef: 64,
    }],
  };
}
