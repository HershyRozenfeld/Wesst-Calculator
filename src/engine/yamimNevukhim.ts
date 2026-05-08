/**
 * Yamim Nevukhim Calculator — ימים נבוכים
 *
 * "Confused days" — sightings that cluster on 2-3 adjacent days,
 * without a single stable day.
 *
 * Based on sections 67-74 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Only 2-3 adjacent days (sections 69-70). 4+ days spread = no veset at all.
 * - Each day must appear 3 times (not necessarily in order)
 * - Can be days-of-month OR haflaga intervals
 * - Onah determined by the woman's usual pattern (section 71)
 * - Uprooting: ALL days must be uprooted; partial uprooting doesn't count (sections 73-74)
 * - Leniency: mikvah night or husband traveling — check + permitted (section 72)
 */

import type { Onah } from '../calendar/hebrewDate';
import type { Sighting, SeparationDay } from '../data/types';

export interface YamimNevukhimKavua {
  days: number[];          // 2-3 adjacent day numbers
  scope: 'chodesh' | 'haflaga';
  onah: Onah;              // Typical onah
  establishedBy: string[];
}

/**
 * Count sightings per day-of-month.
 */
function countByDayOfMonth(sightings: Sighting[]): Map<number, Sighting[]> {
  const map = new Map<number, Sighting[]>();
  for (const s of sightings) {
    const day = s.hebrewDate.day;
    const list = map.get(day) ?? [];
    list.push(s);
    map.set(day, list);
  }
  return map;
}

/**
 * Determine the dominant onah across a group of sightings.
 */
function dominantOnah(sightings: Sighting[]): Onah {
  const dayCount = sightings.filter(s => s.onah === 'day').length;
  const nightCount = sightings.length - dayCount;
  return dayCount >= nightCount ? 'day' : 'night';
}

/**
 * Check if adjacent days all have 3+ sightings each (section 69-70).
 * Returns the adjacent-day cluster or null.
 */
function findAdjacentCluster(countMap: Map<number, Sighting[]>): number[] | null {
  // Find days with 3+ sightings
  const qualifyingDays = Array.from(countMap.entries())
    .filter(([_, list]) => list.length >= 3)
    .map(([day]) => day)
    .sort((a, b) => a - b);

  if (qualifyingDays.length < 2) return null;

  // Find 2-3 adjacent days
  for (let i = 0; i < qualifyingDays.length - 1; i++) {
    const d1 = qualifyingDays[i]!;
    const d2 = qualifyingDays[i + 1]!;
    if (d2 - d1 !== 1) continue;

    // Check if there's also d+2
    if (i + 2 < qualifyingDays.length) {
      const d3 = qualifyingDays[i + 2]!;
      if (d3 - d2 === 1) {
        return [d1, d2, d3]; // 3-day cluster
      }
    }
    return [d1, d2]; // 2-day cluster
  }

  return null;
}

/**
 * Check for a Yamim Nevukhim kavua on day-of-month scope.
 *
 * @param sightings - Regular sightings
 * @returns The kavua details or null
 */
export function checkYamimNevukhimChodesh(sightings: Sighting[]): YamimNevukhimKavua | null {
  const regulars = sightings.filter(s => s.type === 'regular');
  if (regulars.length < 6) return null; // need at least 2 days × 3 sightings

  const byDay = countByDayOfMonth(regulars);

  // Section 69-70: must be exactly 2-3 adjacent days
  // Check there aren't too many non-adjacent days qualifying
  const qualifying = Array.from(byDay.entries()).filter(([_, l]) => l.length >= 3);
  if (qualifying.length > 3) return null; // too spread out

  const cluster = findAdjacentCluster(byDay);
  if (!cluster) return null;

  // Collect all sightings on cluster days
  const clusterSightings = regulars.filter(s => cluster.includes(s.hebrewDate.day));

  return {
    days: cluster,
    scope: 'chodesh',
    onah: dominantOnah(clusterSightings),
    establishedBy: clusterSightings.map(s => s.id),
  };
}

/**
 * Calculate worry days for a fixed Yamim Nevukhim (chodesh scope).
 *
 * @param kavua - The established kavua
 * @param targetYear - Target Hebrew year
 * @param targetMonth - Target Hebrew month
 * @returns Array of separation days (one per day in the cluster)
 */
export function calculateYamimNevukhimWorries(
  kavua: YamimNevukhimKavua,
  targetYear: number,
  targetMonth: number,
): SeparationDay[] {
  if (kavua.scope !== 'chodesh') return []; // haflaga scope handled separately

  return kavua.days.map(day => ({
    hebrewDate: { year: targetYear, month: targetMonth, day },
    onah: kavua.onah,
    reasons: [{
      vesetType: 'yamim_nevukhim' as const,
      description_he: `ימים נבוכים — יום ${day} (מתוך ${kavua.days.join(', ')})`,
      description_en: `Yamim Nevukhim — Day ${day} (cluster: ${kavua.days.join(', ')})`,
      sectionRef: 67,
    }],
  }));
}
