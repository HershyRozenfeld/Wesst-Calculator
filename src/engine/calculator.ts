/**
 * Main Calculator Orchestrator — אורקסטרטור ראשי
 *
 * Runs all sub-calculators, merges results, deduplicates separation days,
 * and produces the final list of separation days for a given period.
 *
 * This is the single entry point for the UI to get calculated results.
 *
 * Flow:
 * 1. Build halachic state from sightings + veset records
 * 2. Determine which worry types apply (section 8-9)
 * 3. Run applicable sub-calculators
 * 4. Merge and deduplicate separation days
 * 5. Return sorted results with full halachic explanations
 */

import { isBefore, isAfter, addHebrewDays } from '../calendar/hebrewDate';
import type {
  Sighting,
  VesetRecord,
  SeparationDay,
  VesetType,
} from '../data/types';
import { calculateOnahBeinonit } from './onahBeinonit';
import { calculateChodeshWorries } from './vesetChodesh';
import { calculateHaflagaWorries, getActiveHaflagot } from './vesetHaflaga';
import {
  buildHalachicState,
  getApplicableWorryTypes,
  shouldSuppressForMedication,
  checkForNewKavua,
  type HalachicState,
} from './stateManager';

/**
 * Configuration for the calculator.
 */
export interface CalculatorConfig {
  /** Target month to calculate for (Hebrew year) */
  targetYear: number;
  /** Target month to calculate for (Hebrew month, Nisan=1) */
  targetMonth: number;
}

/**
 * Full calculation result returned to the UI.
 */
export interface CalculationResult {
  /** Merged and deduplicated separation days, sorted by date */
  separationDays: SeparationDay[];

  /** The halachic state used for this calculation */
  state: HalachicState;

  /** Whether a new kavua was detected */
  newKavuaDetected: boolean;

  /** Summary info for the UI */
  summary: CalculationSummary;
}

/**
 * Summary info for display in the UI.
 */
export interface CalculationSummary {
  /** Whether woman has a fixed veset */
  hasFixedVeset: boolean;
  /** Type of fixed veset, if any */
  fixedVesetType: VesetType | null;
  /** Number of separation days this month */
  separationDayCount: number;
  /** Whether any "ask rav" items exist */
  hasAskRav: boolean;
  /** Total number of sightings considered */
  sightingCount: number;
}

/**
 * Calculate all separation days for a given month.
 *
 * This is the main entry point for the application.
 *
 * @param allSightings - All recorded sightings
 * @param vesetRecords - All veset records (from storage)
 * @param config - Calculation configuration (target month)
 * @returns Full calculation result
 */
export function calculateSeparationDays(
  allSightings: Sighting[],
  vesetRecords: VesetRecord[],
  config: CalculatorConfig,
): CalculationResult {
  // Step 1: Build halachic state
  const state = buildHalachicState(allSightings, vesetRecords);

  // Check if medication suppresses all worries
  if (shouldSuppressForMedication(state)) {
    return {
      separationDays: [],
      state,
      newKavuaDetected: false,
      summary: {
        hasFixedVeset: !!state.activeFixedVeset,
        fixedVesetType: state.activeFixedVeset?.type ?? null,
        separationDayCount: 0,
        hasAskRav: false,
        sightingCount: state.effectiveSightings.length,
      },
    };
  }

  // Step 2: Check for new kavua establishment
  const newKavuot = checkForNewKavua(state);
  const newKavuaDetected = newKavuot.length > 0;

  // Step 3: Determine applicable worry types
  const worryTypes = getApplicableWorryTypes(state);

  // Step 4: Run sub-calculators
  const allDays: SeparationDay[] = [];

  if (state.regularSightings.length === 0) {
    // No sightings at all — nothing to calculate
    return {
      separationDays: [],
      state,
      newKavuaDetected: false,
      summary: {
        hasFixedVeset: false,
        fixedVesetType: null,
        separationDayCount: 0,
        hasAskRav: false,
        sightingCount: 0,
      },
    };
  }

  const lastSighting = state.regularSightings[state.regularSightings.length - 1]!;

  // Onah Beinonit
  if (worryTypes.includes('onah_beinonit')) {
    const obDays = calculateOnahBeinonit(
      lastSighting.hebrewDate,
      state.activeFixedVeset,
      state.fixedVesetMissedThisCycle,
    );
    allDays.push(...obDays);
  }

  // Veset HaChodesh
  if (worryTypes.includes('chodesh')) {
    const chodeshDays = calculateChodeshWorries(
      state.regularSightings,
      config.targetYear,
      config.targetMonth,
    );
    allDays.push(...chodeshDays);
  }

  // Veset HaHaflaga
  if (worryTypes.includes('haflaga')) {
    const haflagaDays = calculateHaflagaWorries(state.regularSightings);
    // Update active haflagot in state
    state.activeHaflagot = getActiveHaflagot(state.regularSightings);
    allDays.push(...haflagaDays);
  }

  // Fixed veset worry (if applicable and not already covered by chodesh/haflaga above)
  if (state.activeFixedVeset) {
    const fixedDays = calculateFixedVesetWorry(
      state.activeFixedVeset,
      lastSighting,
      config.targetYear,
      config.targetMonth,
    );
    allDays.push(...fixedDays);
  }

  // Step 5: Merge and deduplicate
  const merged = mergeSeparationDays(allDays);

  // Step 6: Filter to target month only
  const filtered = filterToMonth(merged, config.targetYear, config.targetMonth);

  // Step 7: Sort by date
  filtered.sort((a, b) => {
    if (isBefore(a.hebrewDate, b.hebrewDate)) return -1;
    if (isAfter(a.hebrewDate, b.hebrewDate)) return 1;
    return 0;
  });

  return {
    separationDays: filtered,
    state,
    newKavuaDetected,
    summary: {
      hasFixedVeset: !!state.activeFixedVeset,
      fixedVesetType: state.activeFixedVeset?.type ?? null,
      separationDayCount: filtered.length,
      hasAskRav: filtered.some(d => d.reasons.some(r => r.askRav)),
      sightingCount: state.effectiveSightings.length,
    },
  };
}

/**
 * Calculate the worry day for a fixed veset.
 * This produces the specific day the fixed veset expects a sighting.
 */
function calculateFixedVesetWorry(
  fixedVeset: VesetRecord,
  lastSighting: Sighting,
  targetYear: number,
  targetMonth: number,
): SeparationDay[] {
  const details = fixedVeset.details;

  switch (details.kind) {
    case 'chodesh': {
      // Fixed chodesh: worry on the same day every month
      return [{
        hebrewDate: { year: targetYear, month: targetMonth, day: details.dayOfMonth },
        onah: details.onah,
        reasons: [{
          vesetType: 'chodesh',
          description_he: `ווסת קבוע — יום ${details.dayOfMonth} בחודש`,
          description_en: `Fixed veset — Day ${details.dayOfMonth} of month`,
          sectionRef: 10,
        }],
      }];
    }

    case 'haflaga': {
      // Fixed haflaga: worry at the fixed interval from last sighting
      // Already handled by calculateHaflagaWorries if haflaga is in worryTypes
      // But if haflaga is NOT in worryTypes (because she has a fixed veset of this type),
      // we still need to produce the specific day
      const worryDate = addHebrewDays(lastSighting.hebrewDate, details.interval - 1);
      return [{
        hebrewDate: worryDate,
        onah: details.onah,
        reasons: [{
          vesetType: 'haflaga',
          description_he: `ווסת קבוע — הפלגה ${details.interval} ימים`,
          description_en: `Fixed veset — Interval of ${details.interval} days`,
          sectionRef: 20,
        }],
      }];
    }

    default:
      return [];
  }
}

/**
 * Merge separation days that fall on the same date.
 * Combines reasons from all sources into a single entry.
 * If any source says 'full', the merged result is 'full'.
 */
export function mergeSeparationDays(days: SeparationDay[]): SeparationDay[] {
  const byDate = new Map<string, SeparationDay>();

  for (const day of days) {
    const key = `${day.hebrewDate.year}-${day.hebrewDate.month}-${day.hebrewDate.day}`;
    const existing = byDate.get(key);

    if (existing) {
      // Merge reasons (avoid duplicates by vesetType)
      for (const reason of day.reasons) {
        const hasSameType = existing.reasons.some(
          r => r.vesetType === reason.vesetType && r.sectionRef === reason.sectionRef,
        );
        if (!hasSameType) {
          existing.reasons.push(reason);
        }
      }

      // If any says 'full', use 'full'; otherwise keep the more restrictive
      if (day.onah === 'full' || existing.onah === 'full') {
        existing.onah = 'full';
      }
    } else {
      // Clone to avoid mutation
      byDate.set(key, {
        hebrewDate: { ...day.hebrewDate },
        onah: day.onah,
        reasons: [...day.reasons],
      });
    }
  }

  return Array.from(byDate.values());
}

/**
 * Filter separation days to only those in the target month.
 */
function filterToMonth(
  days: SeparationDay[],
  targetYear: number,
  targetMonth: number,
): SeparationDay[] {
  return days.filter(
    d => d.hebrewDate.year === targetYear && d.hebrewDate.month === targetMonth,
  );
}
