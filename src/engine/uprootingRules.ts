/**
 * Uprooting Rules — כללי עקירה
 *
 * Cross-cutting logic for determining when vesets are uprooted.
 *
 * Based on sections 14-18, 31, 91, 95-98, 103-104 of הלכות-ווסתות.txt
 *
 * KEY RULES:
 * - Non-fixed veset: uprooted after 1 miss (section 14)
 * - Fixed veset: uprooted after 3 checked misses (section 15)
 * - Continued sighting on veset day does NOT count as uprooting (section 17-18)
 * - Short haflaga does NOT uproot long haflaga (section 29) — handled in vesetHaflaga.ts
 * - Birth uproots non-fixed vesets (section 31b)
 * - Medication does NOT uproot (sections 103-104)
 * - Kfitzot: uprooted after 1 miss even if fixed (section 91)
 * - Yamim Nevukhim: only uprooted when ALL days are uprooted (section 73-74)
 * - Dormant vesets can return with 1 sighting (section 95-96)
 */

import type { VesetRecord, VesetStatus, Sighting } from '../data/types';
import type { HebrewDate } from '../calendar/hebrewDate';
import { sameDate } from '../calendar/hebrewDate';

/** Result of an uprooting check */
export interface UprootCheckResult {
  shouldUproot: boolean;
  newStatus: VesetStatus;
  newUprootCount: number;
  reason_he: string;
  reason_en: string;
}

/**
 * Check if a non-fixed veset should be uprooted.
 * Section 14: One miss (day passed without sighting) uproots a non-fixed veset.
 *
 * @param vesetDay - The expected veset day
 * @param vesetOnah - The expected onah
 * @param sightingOnDay - Whether there was a sighting on that day (null = no sighting)
 * @param isContinuedSighting - Whether the sighting is continued from before the veset day
 * @returns Whether the non-fixed veset should be uprooted
 */
export function checkNonFixedUprooting(
  sightingOnDay: Sighting | null,
  isContinuedSighting: boolean,
): UprootCheckResult {
  // Section 17-18: If a continued sighting covers the veset day, it does NOT uproot
  if (sightingOnDay && isContinuedSighting) {
    return {
      shouldUproot: false,
      newStatus: 'non-fixed',
      newUprootCount: 0,
      reason_he: 'ראיה נמשכת ביום הווסת — לא נעקר',
      reason_en: 'Continued sighting on veset day — not uprooted',
    };
  }

  // If she saw on the day — veset is confirmed (not uprooted)
  if (sightingOnDay) {
    return {
      shouldUproot: false,
      newStatus: 'non-fixed',
      newUprootCount: 0,
      reason_he: 'ראתה ביום הווסת — הווסת לא נעקר',
      reason_en: 'Sighting on veset day — not uprooted',
    };
  }

  // No sighting on that day → uprooted (section 14)
  return {
    shouldUproot: true,
    newStatus: 'uprooted',
    newUprootCount: 1,
    reason_he: 'עבר יום הווסת ולא ראתה — נעקר (סעיף יד)',
    reason_en: 'Veset day passed without sighting — uprooted (section 14)',
  };
}

/**
 * Check if a fixed veset should be uprooted.
 * Section 15: 3 checked misses (day passed + she checked + didn't see) uproot a fixed veset.
 *
 * @param currentUprootCount - How many times she already checked and missed
 * @param sightingOnDay - Whether there was a sighting on that day
 * @param checkedOnDay - Whether she performed a bedika on that day
 * @param isContinuedSighting - Whether the sighting is continued from before
 * @param vesetType - Type of veset (kfitzot has special rule)
 * @returns Uprooting check result
 */
export function checkFixedUprooting(
  currentUprootCount: number,
  sightingOnDay: Sighting | null,
  checkedOnDay: boolean,
  isContinuedSighting: boolean,
  vesetType: VesetRecord['type'],
): UprootCheckResult {
  // Section 17-18: Continued sighting — not uprooted
  if (sightingOnDay && isContinuedSighting) {
    return {
      shouldUproot: false,
      newStatus: 'fixed',
      newUprootCount: currentUprootCount,
      reason_he: 'ראיה נמשכת ביום הווסת — לא נעקר',
      reason_en: 'Continued sighting on veset day — not uprooted',
    };
  }

  // If she saw on the day — uprootCount resets
  if (sightingOnDay) {
    return {
      shouldUproot: false,
      newStatus: 'fixed',
      newUprootCount: 0,
      reason_he: 'ראתה ביום הווסת — הווסת מאושר',
      reason_en: 'Sighting on veset day — veset confirmed',
    };
  }

  // Section 91: Kfitzot — uprooted after just 1 miss (even if fixed!)
  if (vesetType === 'kfitzot') {
    return {
      shouldUproot: true,
      newStatus: 'uprooted',
      newUprootCount: 1,
      reason_he: 'מאמץ ולא ראתה — ווסת קפיצות נעקר (סעיף צא)',
      reason_en: 'Exertion without sighting — kfitzot uprooted (section 91)',
    };
  }

  // She didn't see — increment uprootCount if she checked
  if (!checkedOnDay) {
    // Day passed but she didn't check — no change to uprootCount
    // The day still "passed" but without bedika it doesn't count toward the 3
    return {
      shouldUproot: false,
      newStatus: 'fixed',
      newUprootCount: currentUprootCount,
      reason_he: 'עבר יום הווסת ללא בדיקה — ממתין לבדיקה',
      reason_en: 'Veset day passed without check — awaiting bedika',
    };
  }

  // Checked and didn't see — increment
  const newCount = currentUprootCount + 1;

  if (newCount >= 3) {
    // Section 15: 3 checked misses → uprooted
    return {
      shouldUproot: true,
      newStatus: 'uprooted',
      newUprootCount: newCount,
      reason_he: 'בדקה 3 פעמים ולא ראתה — ווסת קבוע נעקר (סעיף טו)',
      reason_en: 'Checked 3 times without sighting — fixed veset uprooted (section 15)',
    };
  }

  // Not yet 3 misses
  return {
    shouldUproot: false,
    newStatus: 'fixed',
    newUprootCount: newCount,
    reason_he: `בדקה ולא ראתה — ${newCount}/3 לעקירה`,
    reason_en: `Checked without sighting — ${newCount}/3 toward uprooting`,
  };
}

/**
 * Determine the new status of a veset after uprooting.
 * Section 95: A fixed veset that is uprooted becomes "dormant" (not deleted).
 * It must be remembered forever because it can return (section 96).
 *
 * @param veset - The veset being uprooted
 * @returns The new status: 'uprooted' for non-fixed, 'dormant' for previously fixed
 */
export function getUprootedStatus(veset: VesetRecord): VesetStatus {
  if (veset.status === 'fixed') {
    // Section 95: Fixed veset becomes dormant, not fully deleted
    return 'dormant';
  }
  return 'uprooted';
}

/**
 * Check if a dormant veset should be revived.
 * Section 95-96: If a dormant veset (previously fixed, then uprooted) sees a sighting
 * on its expected day, it returns as a fixed veset with just 1 sighting.
 *
 * Section 97: Vesets established via ma'ayan patuach (section 35) do NOT return.
 * Section 98: Shavua, dilug, sirug vesets do NOT return.
 *
 * @param dormantVeset - The dormant veset record
 * @param sighting - The new sighting to check
 * @param expectedDate - The date the dormant veset would have expected a sighting
 * @returns Whether the dormant veset should be revived
 */
export function checkDormantRevival(
  dormantVeset: VesetRecord,
  sighting: Sighting,
  expectedDate: HebrewDate,
): boolean {
  // Must be dormant
  if (dormantVeset.status !== 'dormant') return false;

  // Section 97: Ma'ayan patuach vesets don't return
  if (dormantVeset.isMaAyanPatuach) return false;

  // Section 98: Shavua, dilug, sirug don't return
  const nonReturningTypes: VesetRecord['type'][] = ['shavua', 'dilug', 'sirug'];
  if (nonReturningTypes.includes(dormantVeset.type)) return false;

  // Check if the sighting falls on the expected date
  if (!sameDate(sighting.hebrewDate, expectedDate)) return false;

  // Section 96: One sighting on the expected day revives it
  return true;
}

/**
 * Check if medication prevents uprooting.
 * Sections 103-104: If she's taking medication that prevents periods,
 * the missed veset days do NOT count toward uprooting.
 *
 * @param sighting - The sighting context (or null if no sighting)
 * @param medicationStatus - Current medication status
 * @returns Whether medication prevents uprooting
 */
export function medicationPreventsUprooting(
  medicationStatus: 'none' | 'taking' | 'stopped',
): boolean {
  // Section 103-104: While taking medication, missed days don't uproot
  return medicationStatus === 'taking';
}

/**
 * Check if a birth event uproots non-fixed vesets.
 * Section 31b: Birth uproots all non-fixed haflaga worries.
 * (Fixed vesets are NOT affected by birth.)
 *
 * @param veset - The veset to check
 * @returns Whether birth uproots this veset
 */
export function birthUproots(veset: VesetRecord): boolean {
  return veset.status === 'non-fixed';
}

/**
 * Check if establishing a new fixed veset uproots old non-fixed worries.
 * Section 9: When a fixed veset is established, all non-fixed worries
 * (chodesh, haflaga, onah beinonit) are automatically cancelled.
 * Section 31c: A new fixed veset uproots old non-fixed haflaga worries.
 *
 * @param veset - The veset to check
 * @returns Whether this veset should be uprooted by a new kavua
 */
export function newKavuaUproots(veset: VesetRecord): boolean {
  return veset.status === 'non-fixed';
}

/**
 * Handle Yamim Nevukhim special uprooting rule.
 * Sections 73-74: A yamim nevukhim veset is only uprooted when
 * ALL of its constituent days are uprooted. Uprooting one day
 * doesn't uproot the entire veset.
 *
 * @param uprootedDays - Which days of the yamim nevukhim have been uprooted
 * @param totalDays - Total number of days in the yamim nevukhim (2-3)
 * @returns Whether the entire veset should be uprooted
 */
export function checkYamimNevukhimUprooting(
  uprootedDays: number[],
  totalDays: number[],
): boolean {
  // All days must be uprooted for the veset to be fully uprooted
  return totalDays.every(day => uprootedDays.includes(day));
}

/**
 * Process a veset after a cycle completes (veset day passed).
 * This is the main entry point for uprooting logic.
 *
 * @param veset - The veset record
 * @param sightingOnDay - Sighting on the veset day, if any
 * @param checkedOnDay - Whether she performed a bedika
 * @param isContinued - Whether the sighting is continued from before
 * @param medicationStatus - Current medication status
 * @returns Updated veset status info
 */
export function processVesetAfterCycle(
  veset: VesetRecord,
  sightingOnDay: Sighting | null,
  checkedOnDay: boolean,
  isContinued: boolean,
  medicationStatus: 'none' | 'taking' | 'stopped',
): UprootCheckResult {
  // Section 103-104: Medication prevents uprooting
  if (!sightingOnDay && medicationPreventsUprooting(medicationStatus)) {
    return {
      shouldUproot: false,
      newStatus: veset.status,
      newUprootCount: veset.uprootCount,
      reason_he: 'תחת תרופות — ימי ווסת שעברו לא עוקרים (סעיפים קג-קד)',
      reason_en: 'Under medication — missed veset days do not uproot (sections 103-104)',
    };
  }

  if (veset.status === 'fixed') {
    return checkFixedUprooting(
      veset.uprootCount,
      sightingOnDay,
      checkedOnDay,
      isContinued,
      veset.type,
    );
  }

  if (veset.status === 'non-fixed') {
    return checkNonFixedUprooting(sightingOnDay, isContinued);
  }

  // Dormant or already uprooted — no change
  return {
    shouldUproot: false,
    newStatus: veset.status,
    newUprootCount: veset.uprootCount,
    reason_he: 'ווסת כבר נעקר או ישן — ללא שינוי',
    reason_en: 'Veset already uprooted or dormant — no change',
  };
}
