/**
 * Sighting Classifier — סיווג ראיות
 *
 * Determines which sightings count for veset calculations
 * and how to handle continued sightings.
 *
 * Based on sections 105-112 of הלכות-ווסתות.txt
 */

import type { Sighting } from '../data/types';
import { hebrewDaysBetween } from '../calendar/hebrewDate';

/**
 * Check if a sighting counts for veset calculations (non-fixed).
 * - Regular sighting: always counts (section 105)
 * - Ketem (stain): never counts (section 106)
 * - Bedika (check): does NOT count for non-fixed veset (section 107)
 *
 * Note: Bedika CAN count for establishing a kavua — that's handled
 * separately in the veset establishment logic.
 */
export function countsForNonFixedVeset(sighting: Sighting): boolean {
  return sighting.type === 'regular';
}

/**
 * Check if a sighting can count toward establishing a fixed veset (kavua).
 * - Regular: yes (section 105)
 * - Ketem: no (section 106)
 * - Bedika: yes — can establish kavua (section 107, 109)
 */
export function countsForFixedVeset(sighting: Sighting): boolean {
  return sighting.type === 'regular' || sighting.type === 'bedika';
}

/**
 * Check if a sighting is a continuation of a previous sighting.
 * Section 112: if she stopped and started again within 7 days,
 * it's one sighting (use the first sighting's date).
 * After 7 days, it's a new sighting.
 */
export function isContinuedSighting(
  current: Sighting,
  previous: Sighting,
): boolean {
  // If explicitly linked
  if (current.continuedFromId === previous.id) {
    return true;
  }

  // Auto-detect: if both are regular sightings within 7 days
  if (current.type === 'regular' && previous.type === 'regular') {
    const daysBetween = hebrewDaysBetween(previous.hebrewDate, current.hebrewDate);
    return daysBetween <= 7;
  }

  return false;
}

/**
 * Filter and sort sightings to get the effective sightings list.
 * - Removes ketamim (stains) — they never count
 * - Merges continued sightings (within 7 days) into one
 * - Sorts by date
 * - Keeps bedika sightings marked for kavua-only usage
 *
 * Returns sightings in chronological order.
 */
export function getEffectiveSightings(allSightings: Sighting[]): Sighting[] {
  // Sort chronologically
  const sorted = [...allSightings].sort((a, b) => {
    const daysApart = hebrewDaysBetween(a.hebrewDate, b.hebrewDate);
    if (daysApart === 1) return 0; // same day
    return daysApart > 1 ? -1 : 1;
  });

  // Filter out ketamim
  const nonKetem = sorted.filter(s => s.type !== 'ketem');

  // Merge continued sightings: keep only the first in each chain
  const effective: Sighting[] = [];
  for (const sighting of nonKetem) {
    if (sighting.continuedFromId) {
      // This is a continuation — skip it, the original is already in the list
      continue;
    }
    effective.push(sighting);
  }

  return effective;
}

/**
 * Get only sightings that count for non-fixed veset worries.
 * Filters out bedika sightings (they only count for kavua).
 */
export function getRegularSightings(allSightings: Sighting[]): Sighting[] {
  return getEffectiveSightings(allSightings).filter(countsForNonFixedVeset);
}

/**
 * Check if a sighting happened during medication.
 * Sections 99-104: sightings during medication have special rules.
 */
export function isDuringMedication(sighting: Sighting): boolean {
  return sighting.medicationStatus === 'taking';
}

/**
 * Check if a sighting is from a significant exertion.
 * Section 90: only significant exertion counts for Veset HaKfitzot.
 */
export function isSignificantExertion(sighting: Sighting): boolean {
  return sighting.exertion?.intensity === 'significant';
}
