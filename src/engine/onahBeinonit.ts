/**
 * Onah Beinonit Calculator — עונה בינונית
 *
 * Calculates the "average period" worry days: day 30 and day 31
 * from the last sighting.
 *
 * Based on sections 37-45 of הלכות-ווסתות.txt
 *
 * Key rules:
 * - Day 30 AND day 31 from last sighting (section 38)
 * - Full 24-hour worry (both onahs) on both days (section 41)
 * - Only applies when NO fixed veset exists (section 43)
 * - Always counted from the LAST actual sighting only (section 39)
 * - Exception for fixed haflaga < 30 that was missed (section 44)
 * - Exception for fixed chodesh that was missed (section 45)
 */

import type { HebrewDate } from '../calendar/hebrewDate';
import { addHebrewDays } from '../calendar/hebrewDate';
import type { SeparationDay, VesetRecord } from '../data/types';

/**
 * Calculate Onah Beinonit separation days.
 *
 * @param lastSightingDate - The date of the last actual sighting
 * @param fixedVeset - The current fixed veset, if any (null if none)
 * @param fixedVesetMissed - Whether the fixed veset day was missed this cycle
 * @returns Array of separation days (0-2 days)
 */
export function calculateOnahBeinonit(
  lastSightingDate: HebrewDate,
  fixedVeset: VesetRecord | null,
  fixedVesetMissed: boolean = false,
): SeparationDay[] {
  // אשה שיש לה ווסת קבוע אינה צריכה לחשוש לעונה בינונית — section 43
  if (fixedVeset && fixedVeset.status === 'fixed') {
    // Fixed kfitzot is an exception: she still worries about Onah Beinonit
    // even though the exertion pattern is fixed — section 89.
    if (fixedVeset.details.kind !== 'kfitzot') {
      // Exception: fixed haflaga < 30 that was missed — section 44
      if (
        fixedVesetMissed &&
        fixedVeset.details.kind === 'haflaga' &&
        fixedVeset.details.interval < 30
      ) {
        // חוששת רק ביום 30, באותה עונה — section 44 (main psak)
        return [
          {
            hebrewDate: addHebrewDays(lastSightingDate, 29), // day 30 (inclusive)
            onah: fixedVeset.details.onah,
            reasons: [{
              vesetType: 'onah_beinonit',
              description_he: 'עונה בינונית — יום 30 (ווסת קבוע הפלגה קצרה שעבר)',
              description_en: 'Onah Beinonit — Day 30 (fixed short haflaga missed)',
              sectionRef: 44,
            }],
          },
        ];
      }

      // Exception: fixed chodesh that was missed — section 45
      // לא חוששת כלל לעו"ב
      if (fixedVesetMissed && fixedVeset.details.kind === 'chodesh') {
        return [];
      }

      // Normal case: has fixed veset, not missed — no OB worry
      if (!fixedVesetMissed) {
        return [];
      }
    }
  }

  // No fixed veset, or fixed kfitzot — worry about day 30 AND 31
  // עונה בינונית ביום 30 ו-31, כל המעת לעת — sections 37-38, 41
  const day30 = addHebrewDays(lastSightingDate, 29); // day 30 inclusive
  const day31 = addHebrewDays(lastSightingDate, 30); // day 31 inclusive

  return [
    {
      hebrewDate: day30,
      onah: 'full', // section 41: full 24-hour worry
      reasons: [{
        vesetType: 'onah_beinonit',
        description_he: 'עונה בינונית — יום 30 מהראיה האחרונה',
        description_en: 'Onah Beinonit — Day 30 from last sighting',
        sectionRef: 37,
      }],
    },
    {
      hebrewDate: day31,
      onah: 'full', // section 41: full 24-hour worry
      reasons: [{
        vesetType: 'onah_beinonit',
        description_he: 'עונה בינונית — יום 31 מהראיה האחרונה',
        description_en: 'Onah Beinonit — Day 31 from last sighting',
        sectionRef: 38,
      }],
    },
  ];
}
