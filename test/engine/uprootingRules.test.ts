/**
 * Tests for Uprooting Rules
 * Based on sections 14-18, 31, 91, 95-98, 103-104 of הלכות-ווסתות.txt
 */

import { describe, test, expect } from 'vitest';
import {
  checkNonFixedUprooting,
  checkFixedUprooting,
  getUprootedStatus,
  checkDormantRevival,
  medicationPreventsUprooting,
  birthUproots,
  newKavuaUproots,
  checkYamimNevukhimUprooting,
  processVesetAfterCycle,
} from '../../src/engine/uprootingRules';
import type { Sighting, VesetRecord } from '../../src/data/types';
import type { HebrewDate } from '../../src/calendar/hebrewDate';

function hd(day: number, month: number, year: number = 5786): HebrewDate {
  return { year, month, day };
}

function makeSighting(day: number, month: number, onah: 'day' | 'night' = 'day'): Sighting {
  return {
    id: `s-${month}-${day}`,
    hebrewDate: hd(day, month),
    onah,
    type: 'regular',
    medicationStatus: 'none',
    pregnancyStatus: 'none',
    createdAt: '',
  };
}

function makeVesetRecord(overrides: Partial<VesetRecord> = {}): VesetRecord {
  return {
    id: 'v1',
    type: 'chodesh',
    status: 'non-fixed',
    details: { kind: 'chodesh', dayOfMonth: 5, onah: 'day', isRoshChodesh: false },
    establishedBy: [],
    uprootCount: 0,
    isMaAyanPatuach: false,
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('checkNonFixedUprooting — Section 14', () => {
  test('section-14: no sighting on day → uprooted', () => {
    const result = checkNonFixedUprooting(null, false);
    expect(result.shouldUproot).toBe(true);
    expect(result.newStatus).toBe('uprooted');
  });

  test('sighting on day → not uprooted', () => {
    const sighting = makeSighting(5, 2);
    const result = checkNonFixedUprooting(sighting, false);
    expect(result.shouldUproot).toBe(false);
    expect(result.newStatus).toBe('non-fixed');
  });

  test('section-17: continued sighting on day → not uprooted', () => {
    const sighting = makeSighting(5, 2);
    const result = checkNonFixedUprooting(sighting, true);
    expect(result.shouldUproot).toBe(false);
  });
});

describe('checkFixedUprooting — Section 15', () => {
  test('section-15: 3 checked misses → uprooted', () => {
    const result = checkFixedUprooting(2, null, true, false, 'chodesh');
    expect(result.shouldUproot).toBe(true);
    expect(result.newStatus).toBe('uprooted');
    expect(result.newUprootCount).toBe(3);
  });

  test('section-15: 2 checked misses → not yet uprooted', () => {
    const result = checkFixedUprooting(1, null, true, false, 'chodesh');
    expect(result.shouldUproot).toBe(false);
    expect(result.newStatus).toBe('fixed');
    expect(result.newUprootCount).toBe(2);
  });

  test('sighting on day → resets uprootCount', () => {
    const sighting = makeSighting(5, 2);
    const result = checkFixedUprooting(2, sighting, false, false, 'chodesh');
    expect(result.shouldUproot).toBe(false);
    expect(result.newUprootCount).toBe(0);
  });

  test('day passed without bedika → no change to count', () => {
    const result = checkFixedUprooting(1, null, false, false, 'chodesh');
    expect(result.shouldUproot).toBe(false);
    expect(result.newUprootCount).toBe(1); // unchanged
  });

  test('section-91: kfitzot — uprooted after just 1 miss', () => {
    const result = checkFixedUprooting(0, null, true, false, 'kfitzot');
    expect(result.shouldUproot).toBe(true);
    expect(result.newStatus).toBe('uprooted');
  });
});

describe('getUprootedStatus — Section 95', () => {
  test('fixed veset becomes dormant', () => {
    const veset = makeVesetRecord({ status: 'fixed' });
    expect(getUprootedStatus(veset)).toBe('dormant');
  });

  test('non-fixed veset becomes uprooted', () => {
    const veset = makeVesetRecord({ status: 'non-fixed' });
    expect(getUprootedStatus(veset)).toBe('uprooted');
  });
});

describe('checkDormantRevival — Sections 95-98', () => {
  test('section-96: sighting on expected date revives dormant chodesh', () => {
    const dormant = makeVesetRecord({
      status: 'dormant',
      type: 'chodesh',
      details: { kind: 'chodesh', dayOfMonth: 5, onah: 'day', isRoshChodesh: false },
    });
    const sighting = makeSighting(5, 3);
    const expectedDate = hd(5, 3);
    expect(checkDormantRevival(dormant, sighting, expectedDate)).toBe(true);
  });

  test('section-96: sighting on wrong date does not revive', () => {
    const dormant = makeVesetRecord({
      status: 'dormant',
      type: 'chodesh',
      details: { kind: 'chodesh', dayOfMonth: 5, onah: 'day', isRoshChodesh: false },
    });
    const sighting = makeSighting(10, 3);
    const expectedDate = hd(5, 3);
    expect(checkDormantRevival(dormant, sighting, expectedDate)).toBe(false);
  });

  test('section-97: ma\'ayan patuach does NOT return', () => {
    const dormant = makeVesetRecord({
      status: 'dormant',
      type: 'chodesh',
      isMaAyanPatuach: true,
    });
    const sighting = makeSighting(5, 3);
    expect(checkDormantRevival(dormant, sighting, hd(5, 3))).toBe(false);
  });

  test('section-98: shavua does NOT return', () => {
    const dormant = makeVesetRecord({
      status: 'dormant',
      type: 'shavua',
    });
    const sighting = makeSighting(5, 3);
    expect(checkDormantRevival(dormant, sighting, hd(5, 3))).toBe(false);
  });

  test('section-98: dilug does NOT return', () => {
    const dormant = makeVesetRecord({
      status: 'dormant',
      type: 'dilug',
    });
    const sighting = makeSighting(5, 3);
    expect(checkDormantRevival(dormant, sighting, hd(5, 3))).toBe(false);
  });

  test('section-98: sirug does NOT return', () => {
    const dormant = makeVesetRecord({
      status: 'dormant',
      type: 'sirug',
    });
    const sighting = makeSighting(5, 3);
    expect(checkDormantRevival(dormant, sighting, hd(5, 3))).toBe(false);
  });

  test('non-dormant veset returns false', () => {
    const veset = makeVesetRecord({ status: 'fixed' });
    const sighting = makeSighting(5, 3);
    expect(checkDormantRevival(veset, sighting, hd(5, 3))).toBe(false);
  });
});

describe('medicationPreventsUprooting — Sections 103-104', () => {
  test('section-103: taking medication prevents uprooting', () => {
    expect(medicationPreventsUprooting('taking')).toBe(true);
  });

  test('no medication → does not prevent', () => {
    expect(medicationPreventsUprooting('none')).toBe(false);
  });

  test('stopped medication → does not prevent', () => {
    expect(medicationPreventsUprooting('stopped')).toBe(false);
  });
});

describe('birthUproots — Section 31b', () => {
  test('non-fixed veset is uprooted by birth', () => {
    const veset = makeVesetRecord({ status: 'non-fixed' });
    expect(birthUproots(veset)).toBe(true);
  });

  test('fixed veset is NOT uprooted by birth', () => {
    const veset = makeVesetRecord({ status: 'fixed' });
    expect(birthUproots(veset)).toBe(false);
  });
});

describe('newKavuaUproots — Section 9, 31c', () => {
  test('non-fixed veset is uprooted by new kavua', () => {
    const veset = makeVesetRecord({ status: 'non-fixed' });
    expect(newKavuaUproots(veset)).toBe(true);
  });

  test('fixed veset is NOT uprooted by new kavua', () => {
    const veset = makeVesetRecord({ status: 'fixed' });
    expect(newKavuaUproots(veset)).toBe(false);
  });
});

describe('checkYamimNevukhimUprooting — Sections 73-74', () => {
  test('section-73: all days uprooted → full uprooting', () => {
    expect(checkYamimNevukhimUprooting([26, 27, 28], [26, 27, 28])).toBe(true);
  });

  test('section-74: partial uprooting → not uprooted', () => {
    expect(checkYamimNevukhimUprooting([26, 27], [26, 27, 28])).toBe(false);
  });

  test('no days uprooted → not uprooted', () => {
    expect(checkYamimNevukhimUprooting([], [26, 27, 28])).toBe(false);
  });
});

describe('processVesetAfterCycle — Integration', () => {
  test('medication prevents uprooting of non-fixed', () => {
    const veset = makeVesetRecord({ status: 'non-fixed' });
    const result = processVesetAfterCycle(veset, null, false, false, 'taking');
    expect(result.shouldUproot).toBe(false);
  });

  test('non-fixed without sighting → uprooted', () => {
    const veset = makeVesetRecord({ status: 'non-fixed' });
    const result = processVesetAfterCycle(veset, null, false, false, 'none');
    expect(result.shouldUproot).toBe(true);
    expect(result.newStatus).toBe('uprooted');
  });

  test('fixed with sighting → confirmed, count reset', () => {
    const veset = makeVesetRecord({ status: 'fixed', uprootCount: 2 });
    const sighting = makeSighting(5, 2);
    const result = processVesetAfterCycle(veset, sighting, true, false, 'none');
    expect(result.shouldUproot).toBe(false);
    expect(result.newUprootCount).toBe(0);
  });
});
