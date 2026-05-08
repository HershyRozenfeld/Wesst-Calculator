/**
 * Zmanim Module — Sunrise/sunset calculations for halachic date boundaries.
 *
 * Halachic rule (ADR-009):
 *   - The Hebrew date changes at SUNSET (שקיעה), not at midnight.
 *   - Onah Yom (day) = sunrise → sunset.
 *   - Onah Layla (night) = sunset → sunrise (next Hebrew day).
 *   - Sunset is the CLEAN boundary. Before sunset = day, at/after sunset = night
 *     AND the Hebrew date advances by 1.
 *
 * This is per the user's halachic ruling:
 *   "ראיה ביום תלוי בחמה וכל זמן החמה עד השקיעה נחשב כיום,
 *    בין השמשות שכבר אין חמה נראית לעין נחשב כלילה"
 */

import { Zmanim, GeoLocation } from '@hebcal/core';
import type { Onah, HebrewDate } from './hebrewDate';
import { fromGregorian } from './gregorianBridge';
import { addHebrewDays } from './hebrewDate';
import type { Location } from '../data/locations';

/**
 * Build a hebcal GeoLocation from our Location type.
 */
function toGeoLocation(loc: Location): GeoLocation {
  return new GeoLocation(loc.name_en, loc.lat, loc.lng, 0, loc.timezone);
}

/**
 * Get the sunset for a given Gregorian date at a location.
 * Returns a Date object (UTC instant).
 */
export function getSunset(gregorianDate: Date, location: Location): Date {
  const gl = toGeoLocation(location);
  // Zmanim wants a Date in the local timezone. Pass the Gregorian date,
  // hebcal computes shkia for that civil day.
  const z = new Zmanim(gl, gregorianDate, false);
  return z.sunset();
}

/**
 * Get the sunrise for a given Gregorian date at a location.
 */
export function getSunrise(gregorianDate: Date, location: Location): Date {
  const gl = toGeoLocation(location);
  const z = new Zmanim(gl, gregorianDate, false);
  return z.sunrise();
}

/**
 * Get tzeit hakokhavim (nightfall) — used for display only.
 * Sunset is the halachic boundary per user's ruling.
 */
export function getTzeit(gregorianDate: Date, location: Location): Date {
  const gl = toGeoLocation(location);
  const z = new Zmanim(gl, gregorianDate, false);
  return z.tzeit();
}

export interface OnahDetermination {
  hebrewDate: HebrewDate;
  onah: Onah;
  sunset: Date;       // The sunset that defined the boundary
  sunrise: Date;      // The sunrise of the day period
}

/**
 * Determine the Hebrew date and onah for a given clock-time at a location.
 *
 * Halachic logic:
 *   - If clockTime < sunset of the Gregorian day → onah = DAY, hebrewDate = hebrewDate(gregorianDay)
 *   - If clockTime >= sunset of the Gregorian day → onah = NIGHT, hebrewDate = hebrewDate(gregorianDay) + 1
 *   - Special case: if clockTime is BEFORE sunrise (early morning), it's still the PREVIOUS
 *     Hebrew date's night onah. But since Hebrew date already advanced at previous sunset,
 *     hebrewDate(gregorianDay) is actually correct — we just need onah=night.
 *
 * We calculate as follows:
 *   1. Get sunset of the civil day.
 *   2. Get sunrise of the civil day.
 *   3. If clockTime < sunrise: night onah, hebrewDate = gregorian date (Hebrew date already
 *      advanced at previous evening's sunset).
 *   4. If sunrise <= clockTime < sunset: day onah, hebrewDate = gregorian date.
 *   5. If clockTime >= sunset: night onah, hebrewDate = gregorian date + 1 (Hebrew date
 *      just advanced now).
 */
export function determineOnah(
  clockTime: Date,
  location: Location
): OnahDetermination {
  const sunrise = getSunrise(clockTime, location);
  const sunset = getSunset(clockTime, location);

  const gregorianHebrewDate = fromGregorian(clockTime);

  if (clockTime < sunrise) {
    // Pre-dawn: still the "night" of the current Hebrew date
    return {
      hebrewDate: gregorianHebrewDate,
      onah: 'night',
      sunset,
      sunrise,
    };
  }

  if (clockTime < sunset) {
    // Daytime
    return {
      hebrewDate: gregorianHebrewDate,
      onah: 'day',
      sunset,
      sunrise,
    };
  }

  // Post-sunset: Hebrew date advances
  return {
    hebrewDate: addHebrewDays(gregorianHebrewDate, 1),
    onah: 'night',
    sunset,
    sunrise,
  };
}

/**
 * Get the current halachic Hebrew date at a location.
 * Takes into account sunset boundary.
 */
export function halachicToday(location: Location): HebrewDate {
  return determineOnah(new Date(), location).hebrewDate;
}

/**
 * Format a Date as a local time string "HH:MM" in the location's timezone.
 */
export function formatLocalTime(date: Date, location: Location): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: location.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    // Fallback: user's local timezone
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Parse a clock time "HH:MM" on a given Gregorian date, interpreting
 * it in the LOCATION's timezone (not the user's browser timezone).
 *
 * Returns a Date representing that instant (UTC-aware).
 */
export function parseClockTime(
  gregorianDate: Date,
  hhmm: string,
  location: Location
): Date {
  const [hStr, mStr] = hhmm.split(':');
  const h = parseInt(hStr ?? '0', 10);
  const m = parseInt(mStr ?? '0', 10);

  // We need to find the UTC instant that, when rendered in location.timezone,
  // shows as YYYY-MM-DD HH:MM.
  const y = gregorianDate.getFullYear();
  const mo = gregorianDate.getMonth();
  const d = gregorianDate.getDate();

  // Start with a guess: treat as if the browser's local time equals the location's time
  const guess = new Date(y, mo, d, h, m, 0);

  // Compute offset between location's timezone and the browser's offset
  // by formatting the guess and measuring the delta.
  const tzName = location.timezone;
  try {
    // What does the guess look like in the target timezone?
    const asTz = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).formatToParts(guess);
    const get = (t: string) => parseInt(asTz.find(p => p.type === t)?.value ?? '0', 10);
    const tzY = get('year'), tzMo = get('month') - 1, tzD = get('day');
    const tzH = get('hour') === 24 ? 0 : get('hour'), tzMi = get('minute'), tzS = get('second');
    const tzAsLocal = new Date(tzY, tzMo, tzD, tzH, tzMi, tzS).getTime();
    const offset = tzAsLocal - guess.getTime();
    return new Date(guess.getTime() - offset);
  } catch {
    return guess;
  }
}
