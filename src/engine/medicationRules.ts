/**
 * Medication Rules — כללי תרופות למניעת מחזור
 *
 * Special rules when the woman takes medication to prevent her period.
 *
 * Based on sections 99-104 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Section 99: If medication has been proven 3 times to prevent periods
 *   (3 expected periods passed without sighting while on medication),
 *   she does NOT worry about her vesets during medication.
 * - Section 100: Before it's proven — worry as usual.
 * - Section 101: Sighting while on medication — treated like any regular sighting
 *   for purposes of starting niddah, but doesn't establish/uproot vesets.
 * - Section 102: After stopping medication, the first sighting resets the cycle.
 * - Section 103: Missed periods during medication do NOT count as uprooting.
 * - Section 104: Fixed veset returns automatically when she stops medication
 *   (dormant veset re-activates on first sighting matching the pattern).
 */

import type { Sighting, VesetRecord } from '../data/types';

/**
 * Determine whether a woman's medication has been proven to prevent periods.
 * Section 99: Requires 3 expected cycles to pass without sighting while on medication.
 *
 * @param sightingsWhileOnMedication - Sightings that occurred while on medication
 * @param expectedCyclesWhileOnMedication - How many veset cycles should have occurred
 * @returns Whether medication is proven effective
 */
export function isMedicationProven(
  sightingsWhileOnMedication: number,
  expectedCyclesWhileOnMedication: number,
): boolean {
  return expectedCyclesWhileOnMedication >= 3 && sightingsWhileOnMedication === 0;
}

/**
 * Filter sightings to those NOT during medication — for veset establishment purposes.
 * Section 101: Sightings during medication don't establish vesets.
 */
export function sightingsForEstablishment(allSightings: Sighting[]): Sighting[] {
  return allSightings.filter(s => s.medicationStatus !== 'taking');
}

/**
 * Check if medication status transition should trigger recalculation.
 * - Starting medication: pause all non-fixed worries (wait for proof)
 * - Stopping medication: resume all, dormant vesets may revive
 *
 * @param previous - Previous medication status
 * @param current - Current medication status
 * @returns Transition event type
 */
export function medicationTransition(
  previous: 'none' | 'taking' | 'stopped',
  current: 'none' | 'taking' | 'stopped',
): 'started' | 'stopped' | 'none' {
  if (previous !== 'taking' && current === 'taking') return 'started';
  if (previous === 'taking' && current !== 'taking') return 'stopped';
  return 'none';
}

/**
 * Get the effective status of a fixed veset given medication context.
 * Section 103-104: Fixed veset is preserved during medication (not uprooted).
 *
 * @param veset - The veset record
 * @param isOnMedication - Whether currently on medication
 * @returns Effective status for display purposes
 */
export function getEffectiveVesetStatus(
  veset: VesetRecord,
  isOnMedication: boolean,
): { status: VesetRecord['status']; suppressed: boolean } {
  // While on medication, a fixed veset remains fixed but worries are suppressed
  if (isOnMedication && veset.status === 'fixed') {
    return { status: 'fixed', suppressed: true };
  }

  return { status: veset.status, suppressed: false };
}
