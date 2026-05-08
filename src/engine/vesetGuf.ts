/**
 * Veset HaGuf Calculator — ווסת הגוף
 *
 * Sighting accompanied by specific body symptoms.
 *
 * Based on sections 75-87 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Fixed after 3 sightings with SAME unusual body symptom (section 75)
 * - Symptom must be unusual/significant, not a light feeling (section 76)
 * - Non-fixed worry after just 1 time (section 78): next time she feels
 *   the symptom, worry about a sighting
 * - Timing of sighting relative to symptoms determines the worry window:
 *   - Immediate: symptom start → end of onah (section 82)
 *   - Next day: day after symptoms (section 84)
 *   - Symptoms last multiple days: worry throughout (section 86)
 * - Compound veset (guf + chodesh, guf + haflaga): ASK RAV (section 87)
 */

import type { HebrewDate } from '../calendar/hebrewDate';
import { addHebrewDays } from '../calendar/hebrewDate';
import type { Sighting, SeparationDay } from '../data/types';

export interface GufPattern {
  symptomType: string;
  timing: 'immediate' | 'end_of_onah' | 'next_day';
  establishedBy: string[];
  isFixed: boolean;
}

/**
 * Classify the timing between symptom onset and sighting.
 * Used to determine the worry window for future symptoms.
 */
function classifyTiming(sighting: Sighting): 'immediate' | 'end_of_onah' | 'next_day' | null {
  if (!sighting.bodySymptoms || sighting.bodySymptoms.length === 0) return null;

  // Look at the primary symptom's timing
  const symptom = sighting.bodySymptoms[0]!;
  if (symptom.timing === 'during') return 'immediate';
  if (symptom.timing === 'before') return 'end_of_onah'; // symptom before → sighting at end
  if (symptom.timing === 'after') return 'next_day';
  return null;
}

/**
 * Check if a Veset HaGuf pattern exists.
 *
 * Returns a non-fixed pattern after 1 occurrence (section 78),
 * or a fixed pattern after 3 occurrences with same symptom type (section 75).
 *
 * @param sightings - Regular sightings with body symptoms
 * @returns The pattern details, or null
 */
export function checkGufPattern(sightings: Sighting[]): GufPattern | null {
  const withSymptoms = sightings.filter(
    s => s.type === 'regular' && s.bodySymptoms && s.bodySymptoms.length > 0,
  );
  if (withSymptoms.length === 0) return null;

  // Group by primary symptom type
  const byType = new Map<string, Sighting[]>();
  for (const s of withSymptoms) {
    const primary = s.bodySymptoms![0]!;
    const list = byType.get(primary.type) ?? [];
    list.push(s);
    byType.set(primary.type, list);
  }

  // Find the largest group (likely pattern)
  let bestGroup: Sighting[] = [];
  let bestSymptomType = '';
  for (const [type, list] of byType.entries()) {
    if (list.length > bestGroup.length) {
      bestGroup = list;
      bestSymptomType = type;
    }
  }

  if (bestGroup.length === 0) return null;

  const timing = classifyTiming(bestGroup[0]!) ?? 'immediate';
  const isFixed = bestGroup.length >= 3;

  return {
    symptomType: bestSymptomType,
    timing,
    establishedBy: bestGroup.slice(0, Math.min(3, bestGroup.length)).map(s => s.id),
    isFixed,
  };
}

/**
 * Calculate worry days triggered by current body symptoms.
 *
 * Called when the woman reports feeling the pattern's symptom today.
 *
 * @param pattern - The established guf pattern
 * @param symptomStartDate - When the symptoms started
 * @param symptomDurationDays - How many days symptoms lasted (default 1)
 * @returns Array of separation days covering the worry window
 */
export function calculateGufWorryForSymptom(
  pattern: GufPattern,
  symptomStartDate: HebrewDate,
  symptomDurationDays: number = 1,
): SeparationDay[] {
  const days: SeparationDay[] = [];
  const sectionRef = pattern.isFixed ? 75 : 78;
  const statusLabel = pattern.isFixed ? 'קבוע' : 'לא קבוע';

  const reason = {
    vesetType: 'guf' as const,
    description_he: `ווסת הגוף (${statusLabel}) — ${pattern.symptomType}`,
    description_en: `Veset HaGuf (${pattern.isFixed ? 'fixed' : 'non-fixed'}) — ${pattern.symptomType}`,
    sectionRef,
  };

  if (pattern.timing === 'immediate' || pattern.timing === 'end_of_onah') {
    // Section 82, 86: worry from symptom start through end of current onah,
    // and throughout all days symptoms continue
    for (let i = 0; i < symptomDurationDays; i++) {
      days.push({
        hebrewDate: addHebrewDays(symptomStartDate, i),
        onah: 'full', // worry entire day while symptoms persist
        reasons: [reason],
      });
    }
  } else if (pattern.timing === 'next_day') {
    // Section 84: worry on the day AFTER symptoms end
    const worryDate = addHebrewDays(symptomStartDate, symptomDurationDays);
    days.push({
      hebrewDate: worryDate,
      onah: 'full',
      reasons: [reason],
    });
  }

  return days;
}

/**
 * Check if this is a compound guf veset — guf + chodesh or guf + haflaga.
 * Section 87: defer to rabbi.
 *
 * @param pattern - The guf pattern
 * @param hasChodeshOrHaflagaOverlap - Whether the guf sightings also match chodesh/haflaga
 * @returns "Ask rav" separation day marker, or null
 */
export function checkCompoundGuf(
  pattern: GufPattern,
  hasChodeshOrHaflagaOverlap: boolean,
): SeparationDay | null {
  if (!hasChodeshOrHaflagaOverlap) return null;
  if (!pattern.isFixed) return null;

  // We don't produce a specific day; we mark for UI to show ask-rav notice.
  // The calling code should handle the actual date.
  return null; // Placeholder — the UI will surface the ask-rav banner
}
