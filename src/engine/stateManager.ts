/**
 * State Manager — מנהל מצב
 *
 * Determines the woman's current halachic state based on sighting history
 * and veset records. This is the bridge between raw sighting data and
 * the calculator that produces separation days.
 *
 * Key responsibilities:
 * - Track which vesets are active (fixed, non-fixed, dormant)
 * - Determine if woman currently has a fixed veset (section 9)
 * - Apply establishment rules (checkChodeshKavua, checkHaflagaKavua)
 * - Apply uprooting rules after each cycle
 * - Handle dormant veset revival (section 95-96)
 * - Handle medication status effects (sections 99-104)
 *
 * Section 9: When a fixed veset exists, she ONLY worries about:
 * - The fixed veset day itself
 * - (If she changed once: also the chodesh worry for the new day, section 13)
 * She does NOT worry about: onah beinonit, haflaga, or other non-fixed worries.
 */

import type { HebrewDate } from '../calendar/hebrewDate';
import { addHebrewDays } from '../calendar/hebrewDate';
import type {
  Sighting,
  VesetRecord,
  VesetType,
  ActiveHaflaga,
} from '../data/types';
import { getEffectiveSightings, getRegularSightings } from './sightingClassifier';
import { checkChodeshKavua } from './vesetChodesh';
import { checkHaflagaKavua } from './vesetHaflaga';
import { checkShavuaKavua } from './vesetShavua';
import { checkSirugKavua } from './vesetSirug';
import { checkDilugChodesh, checkDilugHaflaga } from './vesetDilug';
import { checkGufPattern } from './vesetGuf';
import { checkKfitzotKavua } from './vesetKfitzot';
import { checkYamimNevukhimChodesh } from './yamimNevukhim';
import { checkDormantRevival } from './uprootingRules';

export interface NewKavuaDetection {
  type: VesetType;
  details: VesetRecord['details'];
  establishedBy: string[];
}

/**
 * The complete halachic state of a woman at a given point in time.
 */
export interface HalachicState {
  /** The currently active fixed veset, if any (section 9) */
  activeFixedVeset: VesetRecord | null;

  /** All veset records (fixed, non-fixed, dormant) */
  vesetRecords: VesetRecord[];

  /** Effective sightings (filtered, merged) sorted chronologically */
  effectiveSightings: Sighting[];

  /** Regular sightings only (no bedika) */
  regularSightings: Sighting[];

  /** Whether medication is currently active */
  isMedicationActive: boolean;

  /** Whether she has had a verified medication cycle (3 times proven, section 99) */
  medicationProven: boolean;

  /** Active haflaga worries (from vesetHaflaga) */
  activeHaflagot: ActiveHaflaga[];

  /** Whether the fixed veset day was missed this cycle (for OB exceptions) */
  fixedVesetMissedThisCycle: boolean;
}

/**
 * Build the halachic state from raw data.
 *
 * @param allSightings - All recorded sightings
 * @param vesetRecords - All veset records (from storage)
 * @returns The current halachic state
 */
export function buildHalachicState(
  allSightings: Sighting[],
  vesetRecords: VesetRecord[],
): HalachicState {
  const effectiveSightings = getEffectiveSightings(allSightings);
  const regularSightings = getRegularSightings(allSightings);

  // Find active fixed veset
  const activeFixedVeset = vesetRecords.find(v => v.status === 'fixed') ?? null;

  // Determine medication status from last sighting
  const lastSighting = effectiveSightings[effectiveSightings.length - 1];
  const isMedicationActive = lastSighting?.medicationStatus === 'taking';

  // Check if medication has been proven (3 cycles without sighting while on medication)
  // This would be tracked in app state; for now we use a simplified check
  const medicationProven = false; // TODO: track in app data

  // Check if fixed veset was missed this cycle
  const fixedVesetMissedThisCycle = false; // Determined by calculator when processing

  return {
    activeFixedVeset,
    vesetRecords,
    effectiveSightings,
    regularSightings,
    isMedicationActive,
    medicationProven,
    activeHaflagot: [],
    fixedVesetMissedThisCycle,
  };
}

/**
 * Check if any new fixed vesets should be established based on sighting history.
 * This runs establishment checks for chodesh and haflaga.
 *
 * @param state - Current halachic state
 * @returns Array of newly established vesets (may be empty)
 */
export function checkForNewKavua(
  state: HalachicState,
): NewKavuaDetection[] {
  const newKavuot: NewKavuaDetection[] = [];

  // Skip if already has a fixed veset — section 9 implies one active fixed at a time
  // (though technically multiple can exist, the primary one governs)
  if (state.activeFixedVeset) return newKavuot;

  const sightings = state.regularSightings;

  // Check Chodesh Kavua: 3 sightings on same day + same onah
  const chodeshKavua = checkChodeshKavua(sightings);
  if (chodeshKavua) {
    newKavuot.push({
      type: 'chodesh',
      details: {
        kind: 'chodesh',
        dayOfMonth: chodeshKavua.dayOfMonth,
        onah: chodeshKavua.onah,
        isRoshChodesh: chodeshKavua.isRoshChodesh,
      },
      establishedBy: chodeshKavua.establishedBy,
    });
  }

  // Check Haflaga Kavua: 4 sightings with 3 equal intervals + same onah
  const haflagaKavua = checkHaflagaKavua(sightings);
  if (haflagaKavua) {
    newKavuot.push({
      type: 'haflaga',
      details: {
        kind: 'haflaga',
        interval: haflagaKavua.interval,
        onah: haflagaKavua.onah,
      },
      establishedBy: haflagaKavua.establishedBy,
    });
  }

  const shavuaKavua = checkShavuaKavua(sightings);
  if (shavuaKavua) {
    newKavuot.push({
      type: 'shavua',
      details: {
        kind: 'shavua',
        dayOfWeek: shavuaKavua.dayOfWeek,
        weekInterval: shavuaKavua.weekInterval,
        onah: shavuaKavua.onah,
      },
      establishedBy: shavuaKavua.establishedBy,
    });
  }

  const dilugChodesh = checkDilugChodesh(sightings);
  if (dilugChodesh) {
    newKavuot.push({
      type: 'dilug',
      details: {
        kind: 'dilug',
        direction: dilugChodesh.direction,
        step: dilugChodesh.step,
        lastDay: dilugChodesh.lastDay,
        scope: dilugChodesh.scope,
        onah: dilugChodesh.onah,
      },
      establishedBy: dilugChodesh.establishedBy,
    });
  }

  const dilugHaflaga = checkDilugHaflaga(sightings);
  if (dilugHaflaga) {
    newKavuot.push({
      type: 'dilug',
      details: {
        kind: 'dilug',
        direction: dilugHaflaga.direction,
        step: dilugHaflaga.step,
        lastDay: dilugHaflaga.lastDay,
        scope: dilugHaflaga.scope,
        onah: dilugHaflaga.onah,
      },
      establishedBy: dilugHaflaga.establishedBy,
    });
  }

  const sirugKavua = checkSirugKavua(sightings);
  if (sirugKavua) {
    newKavuot.push({
      type: 'sirug',
      details: {
        kind: 'sirug',
        dayOfMonth: sirugKavua.dayOfMonth,
        monthInterval: sirugKavua.monthInterval,
        onah: sirugKavua.onah,
      },
      establishedBy: sirugKavua.establishedBy,
    });
  }

  const gufPattern = checkGufPattern(sightings);
  if (gufPattern?.isFixed) {
    newKavuot.push({
      type: 'guf',
      details: {
        kind: 'guf',
        symptomType: gufPattern.symptomType,
        timing: gufPattern.timing,
      },
      establishedBy: gufPattern.establishedBy,
    });
  }

  const kfitzotKavua = checkKfitzotKavua(sightings);
  if (kfitzotKavua) {
    newKavuot.push({
      type: 'kfitzot',
      details: {
        kind: 'kfitzot',
        exertionType: kfitzotKavua.exertionType,
      },
      establishedBy: kfitzotKavua.establishedBy,
    });
  }

  const yamimNevukhim = checkYamimNevukhimChodesh(sightings);
  if (yamimNevukhim) {
    newKavuot.push({
      type: 'yamim_nevukhim',
      details: {
        kind: 'yamim_nevukhim',
        days: yamimNevukhim.days,
        scope: yamimNevukhim.scope,
      },
      establishedBy: yamimNevukhim.establishedBy,
    });
  }

  return newKavuot;
}

/**
 * Check if any dormant vesets should be revived by a new sighting.
 * Section 95-96: A dormant veset returns to fixed with just 1 matching sighting.
 *
 * @param dormantVesets - All dormant veset records
 * @param newSighting - The new sighting to check against
 * @returns Array of veset IDs that should be revived
 */
export function checkDormantRevivals(
  dormantVesets: VesetRecord[],
  newSighting: Sighting,
  lastSightingBeforeNew: Sighting | null,
): string[] {
  const revivedIds: string[] = [];

  for (const dormant of dormantVesets) {
    // Calculate expected date based on veset type
    const expectedDate = getExpectedDateForVeset(dormant, newSighting.hebrewDate, lastSightingBeforeNew);
    if (!expectedDate) continue;

    if (checkDormantRevival(dormant, newSighting, expectedDate)) {
      revivedIds.push(dormant.id);
    }
  }

  return revivedIds;
}

/**
 * Calculate the expected date for a veset.
 * Used for checking dormant revival and for producing separation days.
 *
 * @param veset - The veset record
 * @param currentDate - Reference date (for chodesh: current month)
 * @param lastSighting - Last sighting (for haflaga: count from here)
 * @returns The expected Hebrew date, or null if can't determine
 */
export function getExpectedDateForVeset(
  veset: VesetRecord,
  currentDate: HebrewDate,
  lastSighting: Sighting | null,
): HebrewDate | null {
  const details = veset.details;

  switch (details.kind) {
    case 'chodesh':
      // Expected on the same day of the current month
      return {
        year: currentDate.year,
        month: currentDate.month,
        day: details.dayOfMonth,
      };

    case 'haflaga':
      // Expected at the same interval from last sighting
      if (!lastSighting) return null;
      return addHebrewDays(lastSighting.hebrewDate, details.interval - 1);

    default:
      // Other types handled separately
      return null;
  }
}

/**
 * Determine which worry types apply based on the current state.
 * Section 8-9: Without a fixed veset, worry about chodesh + haflaga + onah beinonit.
 * With a fixed veset, worry only about the fixed day.
 *
 * @param state - Current halachic state
 * @returns Which veset types to calculate worries for
 */
export function getApplicableWorryTypes(state: HalachicState): VesetType[] {
  if (state.activeFixedVeset) {
    // Section 9: Only worry about the fixed veset type
    const types: VesetType[] = [state.activeFixedVeset.type];

    // Section 89: even a fixed kfitzot veset does not suppress Onah Beinonit.
    if (state.activeFixedVeset.type === 'kfitzot') {
      types.push('onah_beinonit');
    }

    // Section 13: If she changed once (saw on a different day), also worry about
    // that day's chodesh. This is tracked by a non-fixed chodesh worry existing
    // alongside the fixed veset.
    const hasNonFixedChodesh = state.vesetRecords.some(
      v => v.type === 'chodesh' && v.status === 'non-fixed',
    );
    if (hasNonFixedChodesh && !types.includes('chodesh')) {
      types.push('chodesh');
    }

    return types;
  }

  // Section 8: No fixed veset — worry about all three basic types
  return ['chodesh', 'haflaga', 'onah_beinonit'];
}

/**
 * Check if a sighting happened during proven medication use.
 * Section 99: If medication proven 3 times to prevent periods, don't worry.
 * Section 102: Sighting after stopping medication counts as regular.
 *
 * @param state - Current halachic state
 * @returns Whether to suppress worries due to medication
 */
export function shouldSuppressForMedication(state: HalachicState): boolean {
  return state.isMedicationActive && state.medicationProven;
}
