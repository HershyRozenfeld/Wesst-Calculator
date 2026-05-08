/**
 * Veset HaShavua Calculator — ווסת השבוע
 *
 * Day-of-week pattern with fixed week interval.
 *
 * Based on sections 46-52 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Fixed after 3 sightings on same weekday + same onah + same week interval (section 46)
 * - NO non-fixed worry before establishment (section 47) — unlike chodesh/haflaga
 * - Edge case: 2 haflagot of 22/29/36 auto-establishes (section 48)
 * - Any sighting in between prevents establishment (section 50)
 * - 4 sightings at 4-week intervals → converts to haflaga only (section 52)
 */

import type { HebrewDate, Onah } from '../calendar/hebrewDate';
import { addHebrewDays, dayOfWeek, hebrewDaysBetween } from '../calendar/hebrewDate';
import type { Sighting, SeparationDay } from '../data/types';

export interface ShavuaKavua {
  dayOfWeek: number;    // 0=Sunday, 6=Saturday
  weekInterval: number; // How many weeks between sightings (e.g., 4)
  onah: Onah;
  establishedBy: string[]; // Sighting IDs
}

/**
 * Calculate the week interval between two sightings.
 * For Veset HaShavua, the interval must be a whole number of weeks.
 *
 * @returns Number of weeks, or null if not a whole-week interval
 */
function weekInterval(a: HebrewDate, b: HebrewDate): number | null {
  const days = hebrewDaysBetween(a, b) - 1; // exclusive for weeks calculation
  if (days % 7 !== 0) return null;
  return days / 7;
}

/**
 * Check if a sighting is a regular sighting (not ketem/bedika) for this calculation.
 * Section 50: any sighting in between disrupts the pattern.
 */
function isRegular(s: Sighting): boolean {
  return s.type === 'regular';
}

/**
 * Check if a fixed Veset HaShavua exists in the sighting history.
 *
 * Requires:
 * - 3 regular sightings
 * - Same day of week
 * - Same onah
 * - Equal whole-week intervals between consecutive sightings
 * - No sightings in between (section 50)
 *
 * Section 48: 2 intervals of exactly 22/29/36 days automatically establishes,
 * because those are whole-week intervals that produce 3 same-weekday sightings.
 *
 * @param sightings - Regular sightings in chronological order
 * @returns The kavua details, or null if no kavua
 */
export function checkShavuaKavua(sightings: Sighting[]): ShavuaKavua | null {
  const regulars = sightings.filter(isRegular);
  if (regulars.length < 3) return null;

  // Try every window of 3 consecutive sightings
  for (let i = 0; i <= regulars.length - 3; i++) {
    const [s1, s2, s3] = [regulars[i]!, regulars[i + 1]!, regulars[i + 2]!];

    // Same onah
    if (s1.onah !== s2.onah || s2.onah !== s3.onah) continue;

    // Same day of week
    const dow1 = dayOfWeek(s1.hebrewDate);
    const dow2 = dayOfWeek(s2.hebrewDate);
    const dow3 = dayOfWeek(s3.hebrewDate);
    if (dow1 !== dow2 || dow2 !== dow3) continue;

    // Equal whole-week intervals
    const w12 = weekInterval(s1.hebrewDate, s2.hebrewDate);
    const w23 = weekInterval(s2.hebrewDate, s3.hebrewDate);
    if (w12 === null || w23 === null) continue;
    if (w12 !== w23) continue;

    // Section 52: If week interval is exactly 4 and we have 4+ sightings,
    // it converts to haflaga-only. But for the 3-sighting kavua, it's valid.

    return {
      dayOfWeek: dow1,
      weekInterval: w12,
      onah: s1.onah,
      establishedBy: [s1.id, s2.id, s3.id],
    };
  }

  return null;
}

/**
 * Calculate the next worry day for a fixed Veset HaShavua.
 *
 * @param kavua - The fixed veset details
 * @param lastSighting - The last sighting (to count from)
 * @returns The expected next worry day
 */
export function calculateShavuaWorry(
  kavua: ShavuaKavua,
  lastSighting: Sighting,
): SeparationDay {
  // Next expected = last sighting + (weekInterval * 7) days
  const daysForward = kavua.weekInterval * 7;
  const expectedDate = addHebrewDays(lastSighting.hebrewDate, daysForward);

  return {
    hebrewDate: expectedDate,
    onah: kavua.onah,
    reasons: [{
      vesetType: 'shavua',
      description_he: `ווסת השבוע — יום ${getDayOfWeekName(kavua.dayOfWeek, 'he')} בסירוג ${kavua.weekInterval} שבועות`,
      description_en: `Veset HaShavua — ${getDayOfWeekName(kavua.dayOfWeek, 'en')} every ${kavua.weekInterval} weeks`,
      sectionRef: 46,
    }],
  };
}

function getDayOfWeekName(dow: number, lang: 'he' | 'en'): string {
  const names = {
    he: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };
  return names[lang][dow] ?? '';
}
