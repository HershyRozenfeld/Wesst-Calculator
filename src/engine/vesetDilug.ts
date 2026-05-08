/**
 * Veset HaDilug Calculator — ווסת הדילוג
 *
 * "Skipping" veset — sightings that progressively shift by a fixed amount
 * each cycle, ascending or descending.
 *
 * Based on sections 53-63 of הלכות-ווסתות.txt
 *
 * Two scopes:
 *
 * TYPE A — Dilug by day-of-month (section 53-54):
 * - 4 sightings with 3 equal step-shifts in day-of-month + same onah
 * - Example ascending: 15 Nisan, 16 Iyar, 17 Sivan, 18 Tammuz → worry 19 Av
 * - Example descending (section 56): 25 Nisan, 24 Iyar, 23 Sivan, 22 Tammuz → step -1
 * - Expires at end of month (section 62) — can't go below day 1 or above day 30
 *
 * TYPE B — Dilug by haflaga (section 55):
 * - 5 sightings with 4 haflagot showing 3 equal step-shifts
 * - Example: haflagot 30, 31, 32, 33 → worry haflaga 34
 * - Does NOT expire (section 63)
 *
 * General rules:
 * - No non-fixed worry before establishment (section 61) — unlike chodesh/haflaga
 * - 2 skips only (ambiguous): worry both as fixed AND as non-fixed (section 59)
 */

import type { Onah } from '../calendar/hebrewDate';
import { addHebrewDays, hebrewDaysBetween, hebrewMonthLength } from '../calendar/hebrewDate';
import type { Sighting, SeparationDay } from '../data/types';

export interface DilugKavua {
  direction: 'ascending' | 'descending';
  step: number;           // step size (absolute)
  lastDay: number;        // last seen day (for chodesh) or last haflaga (for haflaga)
  scope: 'chodesh' | 'haflaga';
  onah: Onah;
  establishedBy: string[];
}

/**
 * Calculate interval (inclusive) between two sightings.
 */
function calcInterval(a: Sighting, b: Sighting): number {
  return hebrewDaysBetween(a.hebrewDate, b.hebrewDate);
}

/**
 * Check for Dilug by day-of-month.
 * Section 53-54: 4 sightings with 3 equal day-shifts + same onah.
 */
export function checkDilugChodesh(sightings: Sighting[]): DilugKavua | null {
  const regulars = sightings.filter(s => s.type === 'regular');
  if (regulars.length < 4) return null;

  // Try every window of 4 consecutive sightings
  for (let i = 0; i <= regulars.length - 4; i++) {
    const [s1, s2, s3, s4] = [regulars[i]!, regulars[i + 1]!, regulars[i + 2]!, regulars[i + 3]!];

    // Same onah
    if (s1.onah !== s2.onah || s2.onah !== s3.onah || s3.onah !== s4.onah) continue;

    const step12 = s2.hebrewDate.day - s1.hebrewDate.day;
    const step23 = s3.hebrewDate.day - s2.hebrewDate.day;
    const step34 = s4.hebrewDate.day - s3.hebrewDate.day;

    // All steps must be equal and non-zero
    if (step12 !== step23 || step23 !== step34) continue;
    if (step12 === 0) continue;

    const direction = step12 > 0 ? 'ascending' : 'descending';

    return {
      direction,
      step: Math.abs(step12),
      lastDay: s4.hebrewDate.day,
      scope: 'chodesh',
      onah: s1.onah,
      establishedBy: [s1.id, s2.id, s3.id, s4.id],
    };
  }

  return null;
}

/**
 * Check for Dilug by haflaga.
 * Section 55: 5 sightings with 4 haflagot showing 3 equal step-shifts.
 */
export function checkDilugHaflaga(sightings: Sighting[]): DilugKavua | null {
  const regulars = sightings.filter(s => s.type === 'regular');
  if (regulars.length < 5) return null;

  // Try every window of 5 consecutive sightings
  for (let i = 0; i <= regulars.length - 5; i++) {
    const [s1, s2, s3, s4, s5] = [
      regulars[i]!, regulars[i + 1]!, regulars[i + 2]!,
      regulars[i + 3]!, regulars[i + 4]!,
    ];

    // Same onah for sightings 2-5 (section 23 analog; last 4 sightings define the pattern)
    if (s2.onah !== s3.onah || s3.onah !== s4.onah || s4.onah !== s5.onah) continue;

    const h1 = calcInterval(s1, s2);
    const h2 = calcInterval(s2, s3);
    const h3 = calcInterval(s3, s4);
    const h4 = calcInterval(s4, s5);

    const step12 = h2 - h1;
    const step23 = h3 - h2;
    const step34 = h4 - h3;

    if (step12 !== step23 || step23 !== step34) continue;
    if (step12 === 0) continue;

    const direction = step12 > 0 ? 'ascending' : 'descending';

    return {
      direction,
      step: Math.abs(step12),
      lastDay: h4, // last haflaga
      scope: 'haflaga',
      onah: s2.onah,
      establishedBy: [s1.id, s2.id, s3.id, s4.id, s5.id],
    };
  }

  return null;
}

/**
 * Calculate the next worry day for a fixed Dilug.
 *
 * @param kavua - The dilug pattern
 * @param lastSighting - Last sighting (for haflaga scope) or anchor
 * @param targetYear - For chodesh scope: target year
 * @param targetMonth - For chodesh scope: target month
 * @returns Separation day, or null if expired (section 62)
 */
export function calculateDilugWorry(
  kavua: DilugKavua,
  lastSighting: Sighting,
  targetYear?: number,
  targetMonth?: number,
): SeparationDay | null {
  if (kavua.scope === 'chodesh') {
    if (targetYear === undefined || targetMonth === undefined) return null;

    const nextDay = kavua.direction === 'ascending'
      ? kavua.lastDay + kavua.step
      : kavua.lastDay - kavua.step;

    // Section 62: expires if goes out of valid range
    const monthLen = hebrewMonthLength(targetYear, targetMonth);
    if (nextDay < 1 || nextDay > monthLen) return null;

    return {
      hebrewDate: { year: targetYear, month: targetMonth, day: nextDay },
      onah: kavua.onah,
      reasons: [{
        vesetType: 'dilug' as const,
        description_he: `ווסת הדילוג — יום ${nextDay} (דילוג ${kavua.direction === 'ascending' ? '+' : '-'}${kavua.step})`,
        description_en: `Veset HaDilug — Day ${nextDay} (${kavua.direction} by ${kavua.step})`,
        sectionRef: 53,
      }],
    };
  }

  // Haflaga scope (section 55): add next haflaga to last sighting
  const nextHaflaga = kavua.direction === 'ascending'
    ? kavua.lastDay + kavua.step
    : kavua.lastDay - kavua.step;

  if (nextHaflaga < 1) return null; // invalid

  // Section 63: haflaga scope doesn't expire — still produce the day
  const worryDate = addHebrewDays(lastSighting.hebrewDate, nextHaflaga - 1);

  return {
    hebrewDate: worryDate,
    onah: kavua.onah,
    reasons: [{
      vesetType: 'dilug' as const,
      description_he: `ווסת הדילוג בהפלגה — ${nextHaflaga} ימים (דילוג ${kavua.direction === 'ascending' ? '+' : '-'}${kavua.step})`,
      description_en: `Veset HaDilug (haflaga) — ${nextHaflaga} days (${kavua.direction} by ${kavua.step})`,
      sectionRef: 55,
    }],
  };
}
