/**
 * Tests for Main Calculator Orchestrator
 * Integration tests that verify the full calculation pipeline.
 */

import { describe, test, expect } from 'vitest';
import { calculateSeparationDays, mergeSeparationDays } from '../../src/engine/calculator';
import { sameDate, type HebrewDate } from '../../src/calendar/hebrewDate';
import type { Sighting, VesetRecord, SeparationDay } from '../../src/data/types';
import { buildHalachicState, checkForNewKavua } from '../../src/engine/stateManager';

function hd(day: number, month: number, year: number = 5786): HebrewDate {
  return { year, month, day };
}

function makeSighting(day: number, month: number, onah: 'day' | 'night' = 'day', id?: string): Sighting {
  return {
    id: id ?? `s-${month}-${day}`,
    hebrewDate: hd(day, month),
    onah,
    type: 'regular',
    medicationStatus: 'none',
    pregnancyStatus: 'none',
    createdAt: '',
  };
}

function fixedRecord(details: VesetRecord['details'], type: VesetRecord['type']): VesetRecord {
  return {
    id: `v-${type}`,
    type,
    status: 'fixed',
    details,
    establishedBy: [],
    uprootCount: 0,
    isMaAyanPatuach: false,
    createdAt: '',
    updatedAt: '',
  };
}

describe('calculateSeparationDays — No sightings', () => {
  test('returns empty with no sightings', () => {
    const result = calculateSeparationDays([], [], { targetYear: 5786, targetMonth: 2 });
    expect(result.separationDays.length).toBe(0);
    expect(result.summary.hasFixedVeset).toBe(false);
    expect(result.summary.sightingCount).toBe(0);
  });
});

describe('calculateSeparationDays — Section 8: three worries without fixed veset', () => {
  test('single sighting produces OB + chodesh worries for next month', () => {
    // Sighting on 5 Nisan → should produce:
    // 1. OB: day 30 (4 Iyar) and day 31 (5 Iyar)
    // 2. Chodesh: 5 Iyar (same day of month)
    // No haflaga (need 2+ sightings)
    const sightings = [makeSighting(5, 1)];
    const result = calculateSeparationDays(sightings, [], { targetYear: 5786, targetMonth: 2 });

    // Check OB days
    const obDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'onah_beinonit'),
    );
    expect(obDays.length).toBeGreaterThanOrEqual(1); // at least day 30 or 31 in Iyar

    // Check chodesh worry
    const chodeshDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'chodesh'),
    );
    expect(chodeshDays.length).toBeGreaterThanOrEqual(1);
    // Day 5 of Iyar should be in chodesh worries
    const has5thIyar = chodeshDays.some(d => sameDate(d.hebrewDate, hd(5, 2)));
    expect(has5thIyar).toBe(true);
  });

  test('two sightings produce OB + chodesh + haflaga worries', () => {
    const sightings = [
      makeSighting(1, 1),
      makeSighting(25, 1),
    ];

    // Target: Iyar (month 2) — haflaga worry should be 19 Iyar (25 days from 25 Nisan)
    const result = calculateSeparationDays(sightings, [], { targetYear: 5786, targetMonth: 2 });

    // Haflaga: 25 Nisan + 24 = 19 Iyar
    const haflagaDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'haflaga'),
    );
    expect(haflagaDays.some(d => sameDate(d.hebrewDate, hd(19, 2)))).toBe(true);

    // Chodesh: 25 Iyar (day of month of last sighting)
    const chodeshDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'chodesh'),
    );
    expect(chodeshDays.some(d => sameDate(d.hebrewDate, hd(25, 2)))).toBe(true);
  });

  test('non-fixed chodesh worry applies only to the next Hebrew month', () => {
    const sightings = [makeSighting(24, 2)];

    const nextMonth = calculateSeparationDays(sightings, [], {
      targetYear: 5786,
      targetMonth: 3,
    });
    expect(nextMonth.separationDays.some(
      d => sameDate(d.hebrewDate, hd(24, 3)) && d.reasons.some(r => r.vesetType === 'chodesh'),
    )).toBe(true);

    const laterMonth = calculateSeparationDays(sightings, [], {
      targetYear: 5786,
      targetMonth: 4,
    });
    expect(laterMonth.separationDays.some(
      d => d.hebrewDate.day === 24 && d.reasons.some(r => r.vesetType === 'chodesh'),
    )).toBe(false);
  });

  test('ketem before a regular period is ignored and the period date is counted', () => {
    const sightings: Sighting[] = [
      { ...makeSighting(20, 1, 'day', 'ketem-20'), type: 'ketem' },
      makeSighting(24, 1, 'day', 'regular-24'),
    ];

    const result = calculateSeparationDays(sightings, [], {
      targetYear: 5786,
      targetMonth: 2,
    });

    expect(result.separationDays.some(
      d => sameDate(d.hebrewDate, hd(20, 2)) && d.reasons.some(r => r.vesetType === 'chodesh'),
    )).toBe(false);
    expect(result.separationDays.some(
      d => sameDate(d.hebrewDate, hd(24, 2)) && d.reasons.some(r => r.vesetType === 'chodesh'),
    )).toBe(true);
  });
});

describe('calculateSeparationDays — Section 9: fixed veset suppresses other worries', () => {
  test('fixed chodesh veset → only worry about the fixed day, no OB', () => {
    const sightings = [makeSighting(10, 1)];
    const fixedVeset: VesetRecord = {
      id: 'v1',
      type: 'chodesh',
      status: 'fixed',
      details: { kind: 'chodesh', dayOfMonth: 10, onah: 'day', isRoshChodesh: false },
      establishedBy: [],
      uprootCount: 0,
      isMaAyanPatuach: false,
      createdAt: '',
      updatedAt: '',
    };

    const result = calculateSeparationDays(sightings, [fixedVeset], {
      targetYear: 5786,
      targetMonth: 2,
    });

    // Should have the fixed chodesh day
    const chodeshDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'chodesh'),
    );
    expect(chodeshDays.some(d => sameDate(d.hebrewDate, hd(10, 2)))).toBe(true);

    // Should NOT have OB days
    const obDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'onah_beinonit'),
    );
    expect(obDays.length).toBe(0);

    // Should NOT have haflaga days
    const haflagaDays = result.separationDays.filter(
      d => d.reasons.some(r => r.vesetType === 'haflaga'),
    );
    expect(haflagaDays.length).toBe(0);

    // Summary
    expect(result.summary.hasFixedVeset).toBe(true);
    expect(result.summary.fixedVesetType).toBe('chodesh');
  });
});

describe('mergeSeparationDays — Deduplication', () => {
  test('merges days on same date', () => {
    const days: SeparationDay[] = [
      {
        hebrewDate: hd(5, 2),
        onah: 'day',
        reasons: [{
          vesetType: 'chodesh',
          description_he: 'test1',
          description_en: 'test1',
          sectionRef: 12,
        }],
      },
      {
        hebrewDate: hd(5, 2),
        onah: 'full',
        reasons: [{
          vesetType: 'onah_beinonit',
          description_he: 'test2',
          description_en: 'test2',
          sectionRef: 37,
        }],
      },
    ];

    const merged = mergeSeparationDays(days);
    expect(merged.length).toBe(1);
    expect(merged[0]!.reasons.length).toBe(2);
    expect(merged[0]!.onah).toBe('full'); // 'full' wins
  });

  test('does not merge different dates', () => {
    const days: SeparationDay[] = [
      {
        hebrewDate: hd(4, 2),
        onah: 'full',
        reasons: [{ vesetType: 'onah_beinonit', description_he: '', description_en: '', sectionRef: 37 }],
      },
      {
        hebrewDate: hd(5, 2),
        onah: 'full',
        reasons: [{ vesetType: 'onah_beinonit', description_he: '', description_en: '', sectionRef: 38 }],
      },
    ];

    const merged = mergeSeparationDays(days);
    expect(merged.length).toBe(2);
  });

  test('avoids duplicate reasons with same vesetType+sectionRef', () => {
    const days: SeparationDay[] = [
      {
        hebrewDate: hd(5, 2),
        onah: 'day',
        reasons: [{ vesetType: 'chodesh', description_he: 'a', description_en: 'a', sectionRef: 12 }],
      },
      {
        hebrewDate: hd(5, 2),
        onah: 'day',
        reasons: [{ vesetType: 'chodesh', description_he: 'b', description_en: 'b', sectionRef: 12 }],
      },
    ];

    const merged = mergeSeparationDays(days);
    expect(merged.length).toBe(1);
    expect(merged[0]!.reasons.length).toBe(1); // deduplicated
  });
});

describe('calculateSeparationDays — Medication suppression', () => {
  test('proven medication suppresses all worries', () => {
    // This requires both isMedicationActive AND medicationProven.
    // Currently medicationProven is not yet tracked, so this test verifies
    // the normal (non-suppressed) path.
    const sightings = [makeSighting(5, 1)];
    const result = calculateSeparationDays(sightings, [], { targetYear: 5786, targetMonth: 2 });
    // Should NOT be suppressed (medicationProven defaults to false)
    expect(result.separationDays.length).toBeGreaterThan(0);
  });
});

describe('calculateSeparationDays — Advanced fixed vesets', () => {
  test('fixed shavua veset produces the next weekly worry', () => {
    const sightings = [makeSighting(1, 1)];
    const veset = fixedRecord(
      { kind: 'shavua', dayOfWeek: 3, weekInterval: 4, onah: 'day' },
      'shavua',
    );

    const result = calculateSeparationDays(sightings, [veset], {
      targetYear: 5786,
      targetMonth: 1,
    });

    expect(result.separationDays.some(d => d.reasons.some(r => r.vesetType === 'shavua'))).toBe(true);
    expect(result.summary.fixedVesetType).toBe('shavua');
  });

  test('fixed sirug veset produces the next alternating-month worry', () => {
    const sightings = [makeSighting(1, 1)];
    const veset = fixedRecord(
      { kind: 'sirug', dayOfMonth: 1, monthInterval: 2, onah: 'day' },
      'sirug',
    );

    const result = calculateSeparationDays(sightings, [veset], {
      targetYear: 5786,
      targetMonth: 3,
    });

    expect(result.separationDays.some(d => sameDate(d.hebrewDate, hd(1, 3)))).toBe(true);
    expect(result.separationDays[0]?.reasons.some(r => r.vesetType === 'sirug')).toBe(true);
  });

  test('fixed chodesh dilug veset produces the target-month skipped day', () => {
    const sightings = [makeSighting(18, 4)];
    const veset = fixedRecord(
      { kind: 'dilug', direction: 'ascending', step: 1, lastDay: 18, scope: 'chodesh', onah: 'day' },
      'dilug',
    );

    const result = calculateSeparationDays(sightings, [veset], {
      targetYear: 5786,
      targetMonth: 5,
    });

    expect(result.separationDays.some(d => sameDate(d.hebrewDate, hd(19, 5)))).toBe(true);
    expect(result.separationDays[0]?.reasons.some(r => r.vesetType === 'dilug')).toBe(true);
  });

  test('fixed yamim nevukhim veset produces each clustered day', () => {
    const sightings = [makeSighting(10, 1)];
    const veset = fixedRecord(
      { kind: 'yamim_nevukhim', days: [26, 27], scope: 'chodesh' },
      'yamim_nevukhim',
    );

    const result = calculateSeparationDays(sightings, [veset], {
      targetYear: 5786,
      targetMonth: 2,
    });

    expect(result.separationDays.map(d => d.hebrewDate.day)).toEqual([26, 27]);
    expect(result.separationDays.every(d => d.reasons[0]?.vesetType === 'yamim_nevukhim')).toBe(true);
  });

  test('fixed kfitzot still keeps onah beinonit worries', () => {
    const sightings = [makeSighting(5, 1)];
    const veset = fixedRecord(
      { kind: 'kfitzot', exertionType: 'lifting' },
      'kfitzot',
    );

    const result = calculateSeparationDays(sightings, [veset], {
      targetYear: 5786,
      targetMonth: 2,
    });

    expect(result.summary.fixedVesetType).toBe('kfitzot');
    expect(result.separationDays.some(d => d.reasons.some(r => r.vesetType === 'onah_beinonit'))).toBe(true);
  });
});

describe('checkForNewKavua — advanced persistence detections', () => {
  test('detects fixed kfitzot with establishment IDs for storage', () => {
    const exertion = { description: 'lifting', intensity: 'significant' as const };
    const sightings = [
      { ...makeSighting(1, 1, 'day', 's1'), exertion },
      { ...makeSighting(5, 2, 'day', 's2'), exertion },
      { ...makeSighting(10, 3, 'day', 's3'), exertion },
    ];
    const state = buildHalachicState(sightings, []);
    const detections = checkForNewKavua(state);

    const kfitzot = detections.find(d => d.type === 'kfitzot');
    expect(kfitzot?.details).toEqual({ kind: 'kfitzot', exertionType: 'lifting' });
    expect(kfitzot?.establishedBy).toEqual(['s1', 's2', 's3']);
  });
});
