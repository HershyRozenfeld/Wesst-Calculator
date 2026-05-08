/**
 * Veset HaHaflaga Calculator — ווסת הפלגה
 *
 * Calculates separation days based on the interval between sightings.
 *
 * Based on sections 20-31 of הלכות-ווסתות.txt
 *
 * KEY RULES:
 * - Inclusive counting: both first and last day count (section 21)
 * - Fixed after 4 sightings / 3 equal intervals + same onah (section 20)
 * - First sighting's onah doesn't need to match (section 23)
 * - Always count from ACTUAL sighting date, not expected (section 24-25)
 * - ⚠️ SHORT HAFLAGA DOES NOT UPROOT LONG HAFLAGA (section 29-30)
 * - 4 ways to uproot a long haflaga (section 31)
 */

import type { Onah } from '../calendar/hebrewDate';
import { hebrewDaysBetween, addHebrewDays } from '../calendar/hebrewDate';
import type { Sighting, SeparationDay, ActiveHaflaga } from '../data/types';

/**
 * Calculate all haflaga worry days from sighting history.
 *
 * @param sightings - Effective sightings sorted chronologically
 * @returns Separation days based on haflaga worries
 */
export function calculateHaflagaWorries(
  sightings: Sighting[],
): SeparationDay[] {
  if (sightings.length < 2) return [];

  const lastSighting = sightings[sightings.length - 1]!;
  const activeHaflagot = getActiveHaflagot(sightings);

  const results: SeparationDay[] = [];

  for (const haflaga of activeHaflagot) {
    // Calculate the worry day: haflaga days from last sighting (inclusive)
    // Day 1 = last sighting date, so add (interval - 1) days
    const worryDate = addHebrewDays(lastSighting.hebrewDate, haflaga.interval - 1);

    results.push({
      hebrewDate: worryDate,
      onah: lastSighting.onah, // Worry in the onah of the last sighting
      reasons: [{
        vesetType: 'haflaga',
        description_he: `ווסת הפלגה — ${haflaga.interval} ימים מהראיה האחרונה`,
        description_en: `Veset HaHaflaga — ${haflaga.interval} days from last sighting`,
        sectionRef: haflaga.isFixed ? 20 : 26,
      }],
    });
  }

  return results;
}

/**
 * Get all active (non-uprooted) haflaga worries.
 *
 * This implements the critical "short doesn't uproot long" rule (section 29):
 * If the current haflaga is shorter than a previous one, the previous
 * long haflaga is NOT uprooted and must still be worried about.
 *
 * Both are counted from the LAST sighting date (section 25).
 *
 * A haflaga is uprooted when:
 * 1. The day arrives and she checks and doesn't see (non-fixed: 1 time)
 * 2. Birth (uproots non-fixed, section 31)
 * 3. A new fixed veset is established (section 31)
 * 4. 3 shorter haflagot (some permit even non-equal) (section 31d)
 *
 * @returns Active haflagot sorted by interval
 */
export function getActiveHaflagot(sightings: Sighting[]): ActiveHaflaga[] {
  if (sightings.length < 2) return [];

  // Calculate all historical haflagot (intervals between consecutive sightings)
  const haflagot: Array<{ interval: number; fromIndex: number; toIndex: number }> = [];

  for (let i = 1; i < sightings.length; i++) {
    const prev = sightings[i - 1]!;
    const curr = sightings[i]!;
    const interval = hebrewDaysBetween(prev.hebrewDate, curr.hebrewDate);
    haflagot.push({ interval, fromIndex: i - 1, toIndex: i });
  }

  if (haflagot.length === 0) return [];

  // The last haflaga always creates a worry (section 26)
  const lastHaflaga = haflagot[haflagot.length - 1]!;
  const lastSighting = sightings[sightings.length - 1]!;

  const active: ActiveHaflaga[] = [
    {
      interval: lastHaflaga.interval,
      fromSightingId: lastSighting.id,
      isFixed: false, // Will be determined by kavua check
    },
  ];

  // Section 29-30: Check if there are longer haflagot that weren't uprooted
  // A short haflaga does NOT uproot a longer one.
  // We need to track all previous longer haflagot that haven't been uprooted.
  //
  // A longer haflaga is uprooted (section 31a / section 14) if:
  // - Its day arrived and she checked and didn't see (for non-fixed: 1 time)
  //
  // Since we don't track "checked and didn't see" events yet, we use a
  // simplified approach: track all haflagot that are longer than or equal to
  // the last one, going backwards, until we find one that was uprooted
  // (i.e., a haflaga at least as long came after it).

  const seenIntervals = new Set<number>();
  seenIntervals.add(lastHaflaga.interval);

  // Walk backwards through haflagot
  for (let i = haflagot.length - 2; i >= 0; i--) {
    const h = haflagot[i]!;

    // Skip if we already have this interval
    if (seenIntervals.has(h.interval)) continue;

    // Section 29: If this haflaga is LONGER than all subsequent haflagot,
    // it was NOT uprooted by the shorter ones.
    // Check: was there ever a haflaga >= this one AFTER it?
    let uprootedByLonger = false;
    for (let j = i + 1; j < haflagot.length; j++) {
      if (haflagot[j]!.interval >= h.interval) {
        uprootedByLonger = true;
        break;
      }
    }

    if (!uprootedByLonger && h.interval > lastHaflaga.interval) {
      // This long haflaga is still active — section 29
      active.push({
        interval: h.interval,
        fromSightingId: lastSighting.id,
        isFixed: false,
      });
      seenIntervals.add(h.interval);
    }
  }

  // Sort by interval (ascending)
  active.sort((a, b) => a.interval - b.interval);

  return active;
}

/**
 * Check if 4 sightings establish a fixed Veset HaHaflaga.
 * Section 20: 4 sightings with 3 equal intervals + same onah.
 * Section 23: First sighting's onah doesn't need to match.
 *
 * @returns The fixed interval and onah, or null if not established
 */
export function checkHaflagaKavua(
  sightings: Sighting[],
): { interval: number; onah: Onah; establishedBy: string[] } | null {
  if (sightings.length < 4) return null;

  // Calculate all intervals
  const intervals: Array<{ interval: number; onah: Onah; fromIndex: number; toIndex: number }> = [];
  for (let i = 1; i < sightings.length; i++) {
    intervals.push({
      interval: hebrewDaysBetween(sightings[i - 1]!.hebrewDate, sightings[i]!.hebrewDate),
      onah: sightings[i]!.onah,
      fromIndex: i - 1,
      toIndex: i,
    });
  }

  // Look for 3 consecutive equal intervals with same onah
  // Section 23: the first sighting (before the first interval) doesn't need same onah
  for (let i = 0; i <= intervals.length - 3; i++) {
    const a = intervals[i]!;
    const b = intervals[i + 1]!;
    const c = intervals[i + 2]!;

    if (a.interval === b.interval && b.interval === c.interval) {
      // Check that all 3 intervals' sightings have the same onah
      // (the sighting at the END of each interval)
      if (a.onah === b.onah && b.onah === c.onah) {
        return {
          interval: a.interval,
          onah: a.onah,
          establishedBy: [
            sightings[a.fromIndex]!.id,
            sightings[a.toIndex]!.id,
            sightings[b.toIndex]!.id,
            sightings[c.toIndex]!.id,
          ],
        };
      }
    }
  }

  return null;
}

/**
 * Calculate the haflaga (interval) between two sightings.
 * Uses inclusive counting (section 21).
 */
export function calculateInterval(a: Sighting, b: Sighting): number {
  return hebrewDaysBetween(a.hebrewDate, b.hebrewDate);
}
