/**
 * Veset HaChodesh Calculator — ווסת החודש
 *
 * Calculates separation days based on the day-of-Hebrew-month pattern.
 *
 * Based on sections 10-19 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Fixed after 3 sightings on same day + same onah (section 10)
 * - Non-fixed worry after even 1 sighting (section 12)
 * - Rosh Chodesh: 2 days of worry after 2 sightings on RC (section 19)
 * - Uprooting non-fixed: 1 miss (section 14)
 * - Uprooting fixed: 3 checked misses (section 15)
 * - Continued sighting on veset day does NOT uproot (section 17)
 */

import type { Onah } from '../calendar/hebrewDate';
import {
  getNextMonth,
  hebrewMonthLength,
  isRoshChodesh,
  getRoshChodeshDays,
} from '../calendar/hebrewDate';
import type { Sighting, SeparationDay } from '../data/types';

export interface ChodeshWorry {
  dayOfMonth: number;
  onah: Onah;
  isRoshChodesh: boolean;
  sourceDescription: string;
  sectionRef: number;
}

/**
 * Calculate Veset HaChodesh worry days from a list of effective sightings.
 *
 * For a woman without a fixed veset, she worries about the day-of-month
 * of her last sighting in the next Hebrew month (section 12).
 *
 * This function returns the worry for the month AFTER the last sighting.
 *
 * @param sightings - Effective sightings (sorted chronologically, no ketem)
 * @param targetYear - Hebrew year to calculate for
 * @param targetMonth - Hebrew month to calculate for
 * @returns Array of separation days
 */
export function calculateChodeshWorries(
  sightings: Sighting[],
  targetYear: number,
  targetMonth: number,
): SeparationDay[] {
  if (sightings.length === 0) return [];

  const results: SeparationDay[] = [];
  const regularSightings = sightings.filter(s => s.type === 'regular');
  for (const sighting of regularSightings) {
    const nextMonth = getNextMonth(sighting.hebrewDate.year, sighting.hebrewDate.month);
    const sourceDescription = `ראיה ביום ${sighting.hebrewDate.day}`;

    if (isRoshChodesh(sighting.hebrewDate)) {
      // Rosh Chodesh: the worry is on the next Rosh Chodesh only.
      const rcDays = getRoshChodeshDays(nextMonth.year, nextMonth.month);
      for (const rcDay of rcDays.filter(d => d.year === targetYear && d.month === targetMonth)) {
        results.push({
          hebrewDate: rcDay,
          onah: sighting.onah,
          reasons: [{
            vesetType: 'chodesh',
            description_he: `ווסת החודש — ראש חודש (${sourceDescription})`,
            description_en: `Veset HaChodesh — Rosh Chodesh (${sourceDescription})`,
            sectionRef: 19,
          }],
        });
      }
    } else {
      const targetMonthLen = hebrewMonthLength(nextMonth.year, nextMonth.month);
      if (sighting.hebrewDate.day <= targetMonthLen) {
        const worryDate = {
          year: nextMonth.year,
          month: nextMonth.month,
          day: sighting.hebrewDate.day,
        };
        if (worryDate.year !== targetYear || worryDate.month !== targetMonth) {
          continue;
        }
        results.push({
          hebrewDate: worryDate,
          onah: sighting.onah,
          reasons: [{
            vesetType: 'chodesh',
            description_he: `ווסת החודש — יום ${sighting.hebrewDate.day} בחודש`,
            description_en: `Veset HaChodesh — Day ${sighting.hebrewDate.day} of month`,
            sectionRef: 12,
          }],
        });
      }
    }
  }

  return results;
}

/**
 * Get active (non-uprooted) day-of-month worries from sighting history.
 *
 * A worry is created for the day-of-month of each sighting.
 * A worry is uprooted if the day passed once without a sighting (non-fixed, section 14).
 */
export function getActiveChodeshWorries(sightings: Sighting[]): ChodeshWorry[] {
  if (sightings.length === 0) return [];

  const lastSighting = sightings[sightings.length - 1]!;
  const worries: ChodeshWorry[] = [];

  // The last sighting always creates a worry for its day of month (section 12)
  worries.push({
    dayOfMonth: lastSighting.hebrewDate.day,
    onah: lastSighting.onah,
    isRoshChodesh: isRoshChodesh(lastSighting.hebrewDate),
    sourceDescription: `ראיה אחרונה ביום ${lastSighting.hebrewDate.day}`,
    sectionRef: 12,
  });

  // Check if there are older worries that haven't been uprooted.
  // A non-fixed chodesh worry is uprooted if the day passed once and she didn't see (section 14).
  // Since the last sighting creates a new worry, and old worries are uprooted
  // if their day passed without a sighting after the sighting that created them,
  // we only need to keep old worries if the day hasn't passed yet.
  //
  // In practice, for non-fixed chodesh: only the last sighting's day matters,
  // because old days are uprooted after one miss.
  // BUT: if she has a FIXED chodesh veset, that's handled separately by the
  // state manager (not here). Here we only handle non-fixed worries.

  return worries;
}

/**
 * Check if 3 sightings establish a fixed Veset HaChodesh.
 * Section 10: 3 sightings on the same day of month + same onah.
 * Section 11: Additional sightings in between don't interfere.
 *
 * @returns The fixed day and onah, or null if not established
 */
export function checkChodeshKavua(
  sightings: Sighting[],
): { dayOfMonth: number; onah: Onah; isRoshChodesh: boolean; establishedBy: string[] } | null {
  if (sightings.length < 3) return null;

  // Count sightings per (dayOfMonth, onah) combination
  const counts = new Map<string, { count: number; dayOfMonth: number; onah: Onah; ids: string[] }>();

  for (const s of sightings) {
    const key = `${s.hebrewDate.day}-${s.onah}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
      existing.ids.push(s.id);
    } else {
      counts.set(key, { count: 1, dayOfMonth: s.hebrewDate.day, onah: s.onah, ids: [s.id] });
    }
  }

  // Find any combination with 3+ sightings
  for (const entry of counts.values()) {
    if (entry.count >= 3) {
      return {
        dayOfMonth: entry.dayOfMonth,
        onah: entry.onah,
        isRoshChodesh: entry.dayOfMonth === 1 || entry.dayOfMonth === 30,
        establishedBy: entry.ids.slice(0, 3),
      };
    }
  }

  // Section 19: Rosh Chodesh — 3 sightings on RC (mix of day 30 and day 1)
  const rcSightings = sightings.filter(s => isRoshChodesh(s.hebrewDate));
  if (rcSightings.length >= 3) {
    // Check if same onah
    const onahs = new Set(rcSightings.map(s => s.onah));
    if (onahs.size === 1) {
      return {
        dayOfMonth: 1, // Treat as RC
        onah: rcSightings[0]!.onah,
        isRoshChodesh: true,
        establishedBy: rcSightings.slice(0, 3).map(s => s.id),
      };
    }
  }

  return null;
}
