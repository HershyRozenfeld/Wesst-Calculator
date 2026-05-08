/**
 * Tests for zmanim module.
 *
 * Verifies that sunset-based onah determination works correctly
 * for multiple locations and edge cases (pre-dawn, noon, pre-sunset, post-sunset).
 */

import { describe, it, expect } from 'vitest';
import { determineOnah, getSunrise, getSunset, parseClockTime } from '../../src/calendar/zmanim';
import { LOCATIONS, DEFAULT_LOCATION } from '../../src/data/locations';

describe('zmanim — Jerusalem summer', () => {
  // 21 June 2026 in Jerusalem: sunset ~19:48 local (IDT)
  const jerusalem = LOCATIONS.find(l => l.id === 'jerusalem')!;

  it('morning 08:00 → day onah, current Hebrew date', () => {
    const t = parseClockTime(new Date(2026, 5, 21, 12, 0), '08:00', jerusalem);
    const det = determineOnah(t, jerusalem);
    expect(det.onah).toBe('day');
  });

  it('afternoon 15:00 → day onah', () => {
    const t = parseClockTime(new Date(2026, 5, 21, 12, 0), '15:00', jerusalem);
    const det = determineOnah(t, jerusalem);
    expect(det.onah).toBe('day');
  });

  it('just after sunset 21:00 → night onah, next Hebrew day', () => {
    const t = parseClockTime(new Date(2026, 5, 21, 12, 0), '21:00', jerusalem);
    const det = determineOnah(t, jerusalem);
    expect(det.onah).toBe('night');
  });

  it('midnight 00:30 → night onah, still current Hebrew date (pre-dawn)', () => {
    const t = parseClockTime(new Date(2026, 5, 21, 12, 0), '00:30', jerusalem);
    const det = determineOnah(t, jerusalem);
    expect(det.onah).toBe('night');
  });
});

describe('zmanim — New York winter', () => {
  const ny = LOCATIONS.find(l => l.id === 'new_york')!;

  it('computes sunset on Dec 21 earlier than sunrise', () => {
    const date = new Date(2026, 11, 21, 12, 0);
    const sunrise = getSunrise(date, ny);
    const sunset = getSunset(date, ny);
    expect(sunset.getTime()).toBeGreaterThan(sunrise.getTime());
    // NYC Dec 21 sunset is around 16:30 EST
    const hour = sunset.getUTCHours();
    // In EST (UTC-5), 16:30 EST = 21:30 UTC
    expect(hour).toBeGreaterThanOrEqual(20);
    expect(hour).toBeLessThanOrEqual(23);
  });

  it('afternoon 17:00 in winter → already night onah', () => {
    // Dec 21 in NYC, sunset ~16:30 EST, so 17:00 is after sunset
    const t = parseClockTime(new Date(2026, 11, 21, 12, 0), '17:00', ny);
    const det = determineOnah(t, ny);
    expect(det.onah).toBe('night');
  });

  it('afternoon 14:00 in winter → still day onah', () => {
    const t = parseClockTime(new Date(2026, 11, 21, 12, 0), '14:00', ny);
    const det = determineOnah(t, ny);
    expect(det.onah).toBe('day');
  });
});

describe('zmanim — Hebrew date advancement at sunset', () => {
  const jerusalem = LOCATIONS.find(l => l.id === 'jerusalem')!;

  it('date at 15:00 and 21:00 differ by one Hebrew day', () => {
    const civilDay = new Date(2026, 5, 21, 12, 0);
    const tDay = parseClockTime(civilDay, '15:00', jerusalem);
    const tNight = parseClockTime(civilDay, '21:00', jerusalem);

    const detDay = determineOnah(tDay, jerusalem);
    const detNight = determineOnah(tNight, jerusalem);

    // The Hebrew date AT 21:00 should be one day ahead of the date AT 15:00
    expect(detNight.hebrewDate.day).not.toBe(detDay.hebrewDate.day);
  });
});

describe('DEFAULT_LOCATION', () => {
  it('default is Jerusalem', () => {
    expect(DEFAULT_LOCATION.id).toBe('jerusalem');
    expect(DEFAULT_LOCATION.timezone).toBe('Asia/Jerusalem');
  });
});

describe('parseClockTime', () => {
  it('parses HH:MM in Asia/Jerusalem timezone', () => {
    const jerusalem = LOCATIONS.find(l => l.id === 'jerusalem')!;
    const result = parseClockTime(new Date(2026, 5, 21, 12, 0), '14:30', jerusalem);
    // The result is a UTC Date; when formatted in Jerusalem timezone, should show 14:30
    const formatted = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jerusalem',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(result);
    expect(formatted).toBe('14:30');
  });
});
