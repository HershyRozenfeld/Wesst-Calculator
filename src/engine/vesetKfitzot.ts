/**
 * Veset HaKfitzot Calculator — ווסת הקפיצות
 *
 * Sighting triggered by physical exertion (jumping, heavy lifting, etc.).
 *
 * Based on sections 88-93 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Fixed after 3 exertion+sighting instances (section 88)
 * - ONLY significant exertion counts (section 90)
 * - Uprooted after just 1 miss (section 91) — unique to kfitzot
 * - STILL worries about Onah Beinonit even with fixed kfitzot (section 89)
 * - Before establishment (1-2 times): no kfitzot worry,
 *   only OB worry (section 92). Chodesh/haflaga applies only if she does
 *   the action on that day.
 * - Compound (kfitzot + chodesh, kfitzot + haflaga): ASK RAV (section 93)
 */

import type { Sighting, SeparationDay } from '../data/types';
import { isSignificantExertion } from './sightingClassifier';

export interface KfitzotKavua {
  exertionType: string;
  establishedBy: string[];
}

/**
 * Check if a sighting has significant exertion that matches a given type.
 * Section 90: only significant exertion counts.
 */
function matchesExertion(s: Sighting, exertionType: string): boolean {
  if (!s.exertion) return false;
  if (!isSignificantExertion(s)) return false;
  return s.exertion.description === exertionType;
}

/**
 * Check if a fixed Veset HaKfitzot exists.
 *
 * Requires 3 sightings, each preceded by (or concurrent with) the same
 * significant exertion type.
 *
 * @param sightings - Regular sightings in chronological order
 * @returns The kavua details, or null
 */
export function checkKfitzotKavua(sightings: Sighting[]): KfitzotKavua | null {
  const withExertion = sightings.filter(
    s => s.type === 'regular' && s.exertion && isSignificantExertion(s),
  );
  if (withExertion.length < 3) return null;

  // Group by exertion description
  const byType = new Map<string, Sighting[]>();
  for (const s of withExertion) {
    const key = s.exertion!.description;
    const list = byType.get(key) ?? [];
    list.push(s);
    byType.set(key, list);
  }

  // Find any group with 3+ matching sightings
  for (const [exertionType, list] of byType.entries()) {
    if (list.length >= 3) {
      return {
        exertionType,
        establishedBy: list.slice(0, 3).map(s => s.id),
      };
    }
  }

  return null;
}

/**
 * Produce a worry day when a fixed kfitzot is triggered by current exertion.
 *
 * Kfitzot doesn't have a "next expected date" — the worry only arises
 * when the woman performs the exertion. This function produces a worry
 * for the day she did significant exertion of the matching type.
 */
export function calculateKfitzotWorryForExertion(
  kavua: KfitzotKavua,
  currentSighting: Sighting,
): SeparationDay | null {
  if (!matchesExertion(currentSighting, kavua.exertionType)) return null;

  return {
    hebrewDate: currentSighting.hebrewDate,
    onah: currentSighting.onah,
    reasons: [{
      vesetType: 'kfitzot',
      description_he: `ווסת קפיצות — לאחר ${kavua.exertionType}`,
      description_en: `Veset HaKfitzot — after ${kavua.exertionType}`,
      sectionRef: 88,
    }],
  };
}

/**
 * Check if a sighting combined with chodesh or haflaga should be flagged as "ask rav".
 * Section 93: compound kfitzot is complex — app defers to rabbi.
 *
 * This is called when a kfitzot kavua exists AND the current worry also
 * matches a chodesh or haflaga pattern.
 */
export function isCompoundKfitzot(
  hasKfitzotKavua: boolean,
  hasChodeshOrHaflagaOverlap: boolean,
): boolean {
  return hasKfitzotKavua && hasChodeshOrHaflagaOverlap;
}
