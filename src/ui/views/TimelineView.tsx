/**
 * TimelineView — Continuous scrolling "cycle calendar" with haflaga overlay.
 *
 * Design goal: bird's-eye macro view of menstrual cycles AND haflaga patterns.
 *
 * Two parallel "clocks" are rendered per day cell:
 *
 *   BOTTOM band — cycle-day counter (1..31 from most recent sighting):
 *       • Days 1–30: calm sky band (the 30-day "period" stretch)
 *       • Day 31:    warm amber band (the onah beinonit separation day)
 *       • Cycle-day number written on the band.
 *
 *   TOP band — haflaga context (days between consecutive sightings):
 *       • Pale violet:   single haflaga, no pattern
 *       • Medium violet: 2 consecutive same haflagas (emerging pattern)
 *       • Deep violet:   3+ same haflagas = veset haflaga kavua (section כ)
 *       • Faded violet:  pending interval (after latest sighting, no N+1 yet)
 *       • A chip on each new sighting day shows the numeric haflaga ("25").
 *
 *   PROJECTED HAFLAGA MARKER: if a recent haflaga is known, the expected
 *   day of the next sighting (= last-sighting + last-haflaga) gets a dashed
 *   violet outline. Implements sections כ"ה–ל of the halacha.
 *
 *   HAFLAGA SPARKLINE: a summary strip at the top shows the sequence of
 *   recent haflagas as pill chips — matching pills share color, making a
 *   kavua visible at a glance.
 *
 *   Additionally: auto-scrolls to today, sticky weekday header and month
 *   dividers, a "return to today" button.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { gematriya } from '@hebcal/core';
import { useAppContext } from '../AppContext';
import {
  addHebrewDays,
  hebrewDaysBetween,
  dayOfWeek,
  sameDate,
  isBefore,
  isAfter,
  type HebrewDate,
} from '../../calendar/hebrewDate';
import { halachicToday } from '../../calendar/zmanim';
import type { Sighting } from '../../data/types';

// -------------- Range-building helpers --------------

const PAST_BUFFER = 45;   // days before earliest sighting / today
const FUTURE_BUFFER = 120; // days after latest sighting / today

/**
 * Build the continuous date range (Sunday-aligned) to render.
 * Covers all sightings with buffers, and always includes today.
 */
function buildTimelineRange(
  sightings: Sighting[],
  today: HebrewDate,
): { start: HebrewDate; end: HebrewDate } {
  let earliest = today;
  let latest = today;

  for (const s of sightings) {
    if (isBefore(s.hebrewDate, earliest)) earliest = s.hebrewDate;
    if (isAfter(s.hebrewDate, latest)) latest = s.hebrewDate;
  }

  // Pad with buffers
  let start = addHebrewDays(earliest, -PAST_BUFFER);
  const end = addHebrewDays(latest, FUTURE_BUFFER);

  // Snap start to the preceding Sunday (dayOfWeek 0)
  const weekday = dayOfWeek(start);
  if (weekday !== 0) {
    start = addHebrewDays(start, -weekday);
  }

  return { start, end };
}

// -------------- Cycle logic --------------

interface CycleInfo {
  dayInCycle: number; // 1..31
  sightingDate: HebrewDate;
  isOnahBeinonit: boolean; // true for day 31
}

// -------------- Haflaga logic --------------

type HaflagaStrength = 'single' | 'emerging' | 'kavua' | 'pending';

function strengthRank(s: HaflagaStrength): number {
  return { pending: 0, single: 1, emerging: 2, kavua: 3 }[s];
}

interface HaflagaIntervalInfo {
  length: number | null;    // null when pending (after last sighting)
  strength: HaflagaStrength;
  startSighting: HebrewDate;
  endSighting: HebrewDate | null; // null when pending
  /** Does this date mark the START of a new haflaga (i.e., a sighting day 2+)? */
  isIntervalEnd: boolean; // day equal to endSighting
}

/**
 * Build ordered list of haflagas between consecutive sightings, with strength
 * classification (single / emerging / kavua).
 *
 * "Kavua" strictly per section כ: 4 sightings with 3 equal consecutive haflagas.
 * "Emerging" = exactly 2 equal consecutive haflagas so far.
 */
interface HaflagaSegment {
  from: Sighting;
  to: Sighting;
  length: number;
  strength: HaflagaStrength;
}

function computeHaflagaSegments(sortedSightings: Sighting[]): HaflagaSegment[] {
  const segments: HaflagaSegment[] = [];
  for (let i = 1; i < sortedSightings.length; i++) {
    const from = sortedSightings[i - 1]!;
    const to = sortedSightings[i]!;
    const length = hebrewDaysBetween(from.hebrewDate, to.hebrewDate);
    segments.push({ from, to, length, strength: 'single' });
  }

  // Classify each segment looking at consecutive run-length of equal lengths
  // ending at (or crossing) this segment.
  for (let i = 0; i < segments.length; i++) {
    const len = segments[i]!.length;
    // Count backwards including i
    let runBack = 1;
    for (let j = i - 1; j >= 0 && segments[j]!.length === len; j--) runBack++;
    // Count forward including i
    let runForward = 1;
    for (let j = i + 1; j < segments.length && segments[j]!.length === len; j++) runForward++;
    const maxRun = Math.max(runBack, runForward);
    if (maxRun >= 3) segments[i]!.strength = 'kavua';
    else if (maxRun === 2) segments[i]!.strength = 'emerging';
    else segments[i]!.strength = 'single';
  }

  return segments;
}

/**
 * For a date, find the haflaga interval covering it.
 *   - If the date lies between two sightings, returns that completed segment.
 *   - If the date lies AFTER the last sighting (within reasonable range),
 *     returns a 'pending' info with length=null.
 *   - If before the first sighting, returns null.
 */
function haflagaForDate(
  date: HebrewDate,
  sortedSightings: Sighting[],
  segments: HaflagaSegment[],
): HaflagaIntervalInfo | null {
  if (sortedSightings.length === 0) return null;

  // Before first sighting
  if (isBefore(date, sortedSightings[0]!.hebrewDate)) return null;

  // Find index of the latest sighting at-or-before `date`
  let latestIdx = -1;
  for (let i = 0; i < sortedSightings.length; i++) {
    if (!isAfter(sortedSightings[i]!.hebrewDate, date)) latestIdx = i;
    else break;
  }
  if (latestIdx < 0) return null;

  // If there's a next sighting, we're in a completed segment.
  if (latestIdx < sortedSightings.length - 1) {
    const seg = segments[latestIdx]!; // segments[i] goes from sightings[i] to sightings[i+1]
    return {
      length: seg.length,
      strength: seg.strength,
      startSighting: seg.from.hebrewDate,
      endSighting: seg.to.hebrewDate,
      isIntervalEnd: sameDate(date, seg.to.hebrewDate),
    };
  }

  // Otherwise we're AFTER the last sighting → pending haflaga
  return {
    length: null,
    strength: 'pending',
    startSighting: sortedSightings[latestIdx]!.hebrewDate,
    endSighting: null,
    isIntervalEnd: false,
  };
}

/**
 * Identify UNUPROOTED haflagas per sections כ"ט–ל"א:
 *   "A short haflaga does not uproot a long one." A historical haflaga H is
 *   uprooted only when a LATER haflaga exceeded H (day H passed without a
 *   sighting in that later cycle). Until then, she must continue to worry
 *   about H from every subsequent sighting.
 *
 * Returns the set of haflaga-lengths that remain unuprooted, paired with
 * each one's strength classification.
 */
interface UnuprootedHaflaga {
  length: number;
  strength: HaflagaStrength;
  /** Index into segments where this length was first observed in the unbroken run. */
  firstSegIdx: number;
}

function computeUnuprootedHaflagas(segments: HaflagaSegment[]): UnuprootedHaflaga[] {
  const unuprooted: UnuprootedHaflaga[] = [];
  const seenLengths = new Set<number>();
  for (let i = 0; i < segments.length; i++) {
    const H = segments[i]!.length;
    // Uprooted if any LATER segment's length > H
    let uprooted = false;
    for (let j = i + 1; j < segments.length; j++) {
      if (segments[j]!.length > H) {
        uprooted = true;
        break;
      }
    }
    if (!uprooted && !seenLengths.has(H)) {
      seenLengths.add(H);
      unuprooted.push({
        length: H,
        strength: segments[i]!.strength,
        firstSegIdx: i,
      });
    }
  }
  // Sort by length descending (longest/oldest worry first)
  unuprooted.sort((a, b) => b.length - a.length);
  return unuprooted;
}

/**
 * Returns all PROJECTED next-sighting dates from the latest sighting,
 * one per unuprooted haflaga. Each remains live until uprooted.
 */
interface ProjectedHaflaga {
  date: HebrewDate;
  length: number;
  strength: HaflagaStrength;
}

function projectedHaflagaDates(
  sortedSightings: Sighting[],
  segments: HaflagaSegment[],
): ProjectedHaflaga[] {
  if (sortedSightings.length === 0 || segments.length === 0) return [];
  const last = sortedSightings[sortedSightings.length - 1]!;
  const unuprooted = computeUnuprootedHaflagas(segments);
  return unuprooted.map(u => ({
    date: addHebrewDays(last.hebrewDate, u.length - 1), // inclusive counting
    length: u.length,
    strength: u.strength,
  }));
}

/**
 * Given a date, find the most recent sighting at-or-before it,
 * and return the cycle-day number (1..31) if within the 31-day window.
 * Returns null if no sighting covers this date within 31 days.
 *
 * Sightings must be pre-sorted ascending by Hebrew date.
 */
function cycleForDate(date: HebrewDate, sortedSightings: Sighting[]): CycleInfo | null {
  // Find the most recent sighting on-or-before this date
  let latest: Sighting | null = null;
  for (const s of sortedSightings) {
    if (isAfter(s.hebrewDate, date)) break;
    latest = s;
  }
  if (!latest) return null;

  const dayInCycle = hebrewDaysBetween(latest.hebrewDate, date); // inclusive
  if (dayInCycle < 1 || dayInCycle > 31) return null;

  return {
    dayInCycle,
    sightingDate: latest.hebrewDate,
    isOnahBeinonit: dayInCycle === 31,
  };
}

// -------------- View --------------

export function TimelineView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const { sightings, vesetRecords, settings } = useAppContext();

  const today = useMemo(() => halachicToday(settings.location), [settings.location]);
  const todayRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Sort sightings ascending by date
  const sortedSightings = useMemo(() => {
    return [...sightings].sort((a, b) =>
      isBefore(a.hebrewDate, b.hebrewDate) ? -1 : 1,
    );
  }, [sightings]);

  const range = useMemo(
    () => buildTimelineRange(sortedSightings, today),
    [sortedSightings, today],
  );

  const haflagaSegments = useMemo(
    () => computeHaflagaSegments(sortedSightings),
    [sortedSightings],
  );

  const projectedHaflagas = useMemo(
    () => projectedHaflagaDates(sortedSightings, haflagaSegments),
    [sortedSightings, haflagaSegments],
  );

  // Map of projected dates keyed by "y-m-d" for fast cell lookup
  const projectedByKey = useMemo(() => {
    const m = new Map<string, ProjectedHaflaga>();
    for (const p of projectedHaflagas) {
      const k = `${p.date.year}-${p.date.month}-${p.date.day}`;
      // If multiple unuprooted haflagas hit the same day (rare), keep the strongest
      const existing = m.get(k);
      if (!existing) m.set(k, p);
      else if (strengthRank(p.strength) > strengthRank(existing.strength)) m.set(k, p);
    }
    return m;
  }, [projectedHaflagas]);

  // Build array of weeks. Each week = 7 consecutive HebrewDates starting Sunday.
  const weeks = useMemo(() => {
    const result: HebrewDate[][] = [];
    let cursor = range.start;
    const endPlusOne = addHebrewDays(range.end, 1);
    while (isBefore(cursor, endPlusOne)) {
      const week: HebrewDate[] = [];
      for (let i = 0; i < 7; i++) {
        week.push(cursor);
        cursor = addHebrewDays(cursor, 1);
      }
      result.push(week);
    }
    return result;
  }, [range]);

  // Map of sighting dates (by year-month-day key) for fast lookup
  const sightingByKey = useMemo(() => {
    const m = new Map<string, Sighting>();
    for (const s of sortedSightings) {
      const k = `${s.hebrewDate.year}-${s.hebrewDate.month}-${s.hebrewDate.day}`;
      m.set(k, s);
    }
    return m;
  }, [sortedSightings]);

  // Scroll today into view on first paint
  useEffect(() => {
    if (todayRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const el = todayRef.current;
      // Scroll so today's week is ~30% from top of container
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset =
        elRect.top - containerRect.top + container.scrollTop - containerRect.height * 0.3;
      container.scrollTo({ top: Math.max(0, offset), behavior: 'auto' });
    }
  }, [weeks.length]);

  const scrollToToday = () => {
    if (todayRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const el = todayRef.current;
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const offset =
        elRect.top - containerRect.top + container.scrollTop - containerRect.height * 0.3;
      container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
    }
  };

  // Weekday short labels (localized), Sunday-first
  const weekdayKeys = [0, 1, 2, 3, 4, 5, 6];

  // Vesets summary
  const fixed = vesetRecords.filter(v => v.status === 'fixed');
  const dormant = vesetRecords.filter(v => v.status === 'dormant');

  // Format year in Hebrew gematriya (last 3 digits, e.g., 5786 → תשפ"ו)
  const fmtYear = (y: number) => (lang === 'he' ? gematriya(y % 1000) : String(y));

  return (
    <div className="space-y-3">
      {/* Header with legend + today button */}
      <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-base font-semibold">{t('timeline.title')}</h3>
          <button
            type="button"
            onClick={scrollToToday}
            className="text-xs text-blue-600 hover:underline px-2 py-1"
          >
            ↓ {t('timeline.scrollToToday')}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <LegendDot className="bg-red-500" label={t('timeline.legendSighting')} />
          <LegendBand className="bg-sky-400" label={t('timeline.legendPeriod')} />
          <LegendBand className="bg-amber-500" label={t('timeline.legendOnahBeinonit')} />
          <LegendBand className="bg-violet-500" label={t('timeline.legendHaflaga')} />
          <LegendBand className="bg-violet-700 shadow-[0_0_6px_rgba(109,40,217,0.5)]" label={t('timeline.legendHaflagaKavua')} />
          <LegendDot
            className="bg-white border-2 border-blue-500"
            label={t('timeline.legendToday')}
          />
        </div>
      </div>

      {/* Haflaga sparkline summary */}
      {haflagaSegments.length > 0 && (
        <HaflagaSparkline
          segments={haflagaSegments}
          projections={projectedHaflagas}
          lang={lang}
        />
      )}

      {/* Vesets summary — compact */}
      {(fixed.length > 0 || dormant.length > 0) && (
        <div className="bg-white rounded-lg shadow-sm p-3">
          <div className="text-xs font-semibold text-gray-500 mb-1">
            {t('timeline.showVesets')}
          </div>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {fixed.map(v => (
              <li key={v.id} className="text-green-700">
                ✓ {t(`vesetType.${v.type}`)}
              </li>
            ))}
            {dormant.map(v => (
              <li key={v.id} className="text-gray-400">
                ◌ {t(`vesetType.${v.type}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Continuous scrolling calendar */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {/* Sticky weekday header */}
        <div className="sticky top-0 z-10 grid grid-cols-7 bg-gray-100 border-b border-gray-200">
          {weekdayKeys.map(wk => (
            <div
              key={wk}
              className="text-center text-xs font-semibold py-1.5 text-gray-600"
            >
              {t(`weekdaysShort.${wk}`)}
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 16rem)' }}
        >
          {weeks.map((week, wi) => {
            // Detect whether this week opens a new Hebrew month
            const prevWeekLastDay = wi > 0 ? weeks[wi - 1]![6] : null;
            const firstDay = week[0]!;
            const needsMonthHeader =
              wi === 0 ||
              (prevWeekLastDay && prevWeekLastDay.month !== firstDay.month);

            // Pick a day in this week that represents the month header
            // (first day of month if visible, else firstDay)
            const dayInNewMonth = week.find(d => d.day === 1);
            const headerRef = dayInNewMonth ?? firstDay;

            const hasToday = week.some(d => sameDate(d, today));

            return (
              <div key={wi} ref={hasToday ? todayRef : null}>
                {needsMonthHeader && (
                  <div className="bg-gradient-to-b from-gray-100 to-gray-50 px-3 py-1.5 border-b border-gray-200 sticky top-7 z-[5]">
                    <div className="text-sm font-bold text-gray-800">
                      {t(`months.${headerRef.month}`)} {fmtYear(headerRef.year)}
                    </div>
                  </div>
                )}
                <div
                  className={[
                    'grid grid-cols-7 relative',
                    hasToday ? 'bg-blue-50/40' : '',
                  ].join(' ')}
                >
                  {week.map(date => {
                    const key = `${date.year}-${date.month}-${date.day}`;
                    const sighting = sightingByKey.get(key) ?? null;
                    const cycle = cycleForDate(date, sortedSightings);
                    const haflaga = haflagaForDate(date, sortedSightings, haflagaSegments);
                    const isToday = sameDate(date, today);
                    const projection = projectedByKey.get(key) ?? null;
                    // haflaga number to show on sighting day (end of interval)
                    const haflagaChipLength =
                      sighting && haflaga && haflaga.isIntervalEnd ? haflaga.length : null;
                    return (
                      <DayCell
                        key={key}
                        date={date}
                        sighting={sighting}
                        cycle={cycle}
                        haflaga={haflaga}
                        haflagaChipLength={haflagaChipLength}
                        isToday={isToday}
                        projection={projection}
                        lang={lang}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// -------------- Sub-components --------------

interface DayCellProps {
  date: HebrewDate;
  sighting: Sighting | null;
  cycle: CycleInfo | null;
  haflaga: HaflagaIntervalInfo | null;
  haflagaChipLength: number | null;
  isToday: boolean;
  projection: ProjectedHaflaga | null;
  lang: 'he' | 'en';
}

/** Tailwind class for a haflaga top-band by strength. */
function haflagaBandClass(strength: HaflagaStrength): string {
  switch (strength) {
    case 'kavua':    return 'bg-violet-700';
    case 'emerging': return 'bg-violet-500';
    case 'single':   return 'bg-violet-300';
    case 'pending':  return 'bg-violet-200';
  }
}

function DayCell({
  date,
  sighting,
  cycle,
  haflaga,
  haflagaChipLength,
  isToday,
  projection,
  lang,
}: DayCellProps) {
  const dayLabel = lang === 'he' ? gematriya(date.day) : String(date.day);

  // Cell background tint (cycle tint + projected-haflaga ghost)
  const tintClass = cycle
    ? cycle.isOnahBeinonit
      ? 'bg-amber-50'
      : 'bg-sky-50'
    : 'bg-white';

  // Bottom cycle-day strip
  const cycleStripClass = cycle
    ? cycle.isOnahBeinonit
      ? 'bg-amber-500'
      : 'bg-sky-400'
    : 'bg-transparent';

  // Top haflaga strip
  const haflagaStripClass = haflaga ? haflagaBandClass(haflaga.strength) : 'bg-transparent';

  // Projected-next-haflaga outline (dashed violet box inset) —
  // if a projection falls on this day, mark it with a dashed outline.
  const projectedRing = projection
    ? projection.strength === 'kavua'
      ? 'outline outline-2 outline-dashed outline-violet-700 -outline-offset-2'
      : 'outline outline-2 outline-dashed outline-violet-500 -outline-offset-2'
    : '';

  return (
    <div
      className={[
        'relative h-16 lg:h-[72px] border-b border-e border-gray-100 overflow-hidden',
        tintClass,
        isToday ? 'ring-1 ring-inset ring-blue-400' : '',
        projectedRing,
      ].join(' ')}
    >
      {/* Haflaga top band (always rendered full width, even if transparent — keeps heights aligned) */}
      <div
        className={[
          'absolute inset-x-0 top-0 h-1.5 transition-colors',
          haflagaStripClass,
          haflaga?.strength === 'kavua' ? 'shadow-[0_0_6px_rgba(109,40,217,0.5)]' : '',
        ].join(' ')}
        aria-hidden="true"
      />

      {/* Haflaga numeric chip on the sighting day (end of interval) */}
      {haflagaChipLength != null && (
        <div
          className={[
            'absolute top-2 start-1 px-1 py-0.5 rounded text-[9px] lg:text-[10px] font-bold text-white leading-none shadow-sm',
            haflaga ? haflagaBandClass(haflaga.strength) : 'bg-violet-400',
          ].join(' ')}
          title={`הפלגה: ${haflagaChipLength} ימים`}
        >
          {lang === 'he' ? gematriya(haflagaChipLength) : haflagaChipLength}
        </div>
      )}

      {/* Hebrew day number (top-right / end) */}
      <div className="absolute top-2 end-1 text-xs lg:text-sm font-semibold text-gray-800 leading-none">
        {dayLabel}
      </div>

      {/* Sighting red dot (middle-right under the day number) */}
      {sighting && (
        <div
          className="absolute top-2 end-6 w-2 h-2 rounded-full bg-red-500 shadow"
          aria-label="sighting"
        />
      )}

      {/* Projected-next-haflaga chip with the haflaga length */}
      {projection && !sighting && (
        <div className="absolute inset-x-0 top-5 text-center pointer-events-none">
          <span
            className={[
              'inline-block text-[8px] lg:text-[9px] font-bold bg-white/90 rounded px-1 border',
              projection.strength === 'kavua'
                ? 'text-violet-800 border-violet-700'
                : 'text-violet-700 border-violet-500',
            ].join(' ')}
          >
            ⚠ {lang === 'he' ? gematriya(projection.length) : projection.length}
          </span>
        </div>
      )}

      {/* Bottom cycle-day strip */}
      {cycle && (
        <div
          className={[
            'absolute inset-x-0 bottom-0 h-5 flex items-center justify-center',
            cycleStripClass,
          ].join(' ')}
          aria-hidden="true"
        >
          <span className="text-[10px] lg:text-xs font-bold text-white leading-none drop-shadow">
            {cycle.dayInCycle}
          </span>
        </div>
      )}
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-2.5 h-2.5 rounded-full inline-block ${className}`} aria-hidden="true" />
      <span className="text-gray-700">{label}</span>
    </span>
  );
}

function LegendBand({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`w-5 h-2 rounded-sm inline-block ${className}`} aria-hidden="true" />
      <span className="text-gray-700">{label}</span>
    </span>
  );
}

// -------------- Haflaga sparkline --------------

interface HaflagaSparklineProps {
  segments: HaflagaSegment[];
  projections: ProjectedHaflaga[];
  lang: 'he' | 'en';
}

/**
 * Summary card showing:
 *   (1) the recent haflaga sequence as pill chips (matching lengths share color);
 *   (2) a distinct "live" list of ALL unuprooted haflagas projected forward
 *       — this implements section כ"ט–ל"א: a short haflaga does not uproot
 *       a longer one, so BOTH (or all) remain live concerns until the long
 *       one's day passes without a sighting.
 */
function HaflagaSparkline({ segments, projections, lang }: HaflagaSparklineProps) {
  const { t } = useTranslation();
  const MAX = 10;
  const shown = segments.slice(-MAX);
  const firstShownIdx = segments.length - shown.length;

  // Determine which segments are uprooted for dimming display.
  const uprootedFlags = useMemo(() => {
    return segments.map((seg, i) => {
      for (let j = i + 1; j < segments.length; j++) {
        if (segments[j]!.length > seg.length) return true;
      }
      return false;
    });
  }, [segments]);

  // Detect active kavua (any of the LAST run-of-3-equal segments)
  const kavuaLength = (() => {
    if (segments.length < 3) return null;
    const lastLen = segments[segments.length - 1]!.length;
    const prev = segments[segments.length - 2]!.length;
    const prev2 = segments[segments.length - 3]!.length;
    return lastLen === prev && prev === prev2 ? lastLen : null;
  })();

  const fmt = (n: number) => (lang === 'he' ? gematriya(n) : String(n));

  return (
    <div className="bg-white rounded-lg shadow-sm p-3 space-y-2">
      {/* Row 1: historical haflagas */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs font-semibold text-gray-500">{t('timeline.haflagaSeq')}</div>
        {kavuaLength != null && (
          <div className="text-xs font-bold text-violet-700 bg-violet-100 rounded-full px-2 py-0.5">
            ★ {t('timeline.kavuaFound', { n: fmt(kavuaLength) })}
          </div>
        )}
      </div>
      <div className="flex items-center flex-wrap gap-1.5">
        {shown.map((seg, idx) => {
          const globalIdx = firstShownIdx + idx;
          const isUprooted = uprootedFlags[globalIdx];
          const color = haflagaBandClass(seg.strength);
          const isLast = idx === shown.length - 1;
          return (
            <span key={idx} className="inline-flex items-center gap-1.5">
              <span
                className={[
                  'px-2 py-0.5 rounded-full text-xs font-bold shadow-sm',
                  isUprooted ? 'bg-gray-200 text-gray-400 line-through' : `${color} text-white`,
                  !isUprooted && seg.strength === 'kavua'
                    ? 'shadow-[0_0_6px_rgba(109,40,217,0.5)]'
                    : '',
                ].join(' ')}
                title={
                  isUprooted
                    ? (t('timeline.uprootedTooltip') as string)
                    : `${seg.length} ${t('timeline.days')}`
                }
              >
                {fmt(seg.length)}
              </span>
              {!isLast && <span className="text-gray-300 text-xs">→</span>}
            </span>
          );
        })}
      </div>

      {/* Row 2: live (unuprooted) haflaga projections — all of them */}
      {projections.length > 0 && (
        <>
          <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-gray-100 mt-1">
            <div className="text-xs font-semibold text-gray-500">
              {t('timeline.liveHaflagas')}:
            </div>
            {projections.map((p, idx) => (
              <span
                key={idx}
                className={[
                  'px-2 py-0.5 rounded-full text-xs font-bold border-2 border-dashed',
                  p.strength === 'kavua'
                    ? 'border-violet-700 text-violet-700 bg-violet-50'
                    : 'border-violet-500 text-violet-600',
                ].join(' ')}
                title={t('timeline.projectedHaflagaTooltip') as string}
              >
                {fmt(p.length)}?
              </span>
            ))}
          </div>
          {projections.length > 1 && (
            <div className="text-[10px] text-gray-500 italic">
              {t('timeline.shortDoesntUproot')}
            </div>
          )}
        </>
      )}

      {segments.length > MAX && (
        <div className="text-[10px] text-gray-400">
          {t('timeline.showingLastN', { n: MAX, total: segments.length })}
        </div>
      )}
    </div>
  );
}
