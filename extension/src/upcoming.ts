import { getNextMonth } from '../../src/calendar/hebrewDate';
import { formatSightingDate, toGregorian } from '../../src/calendar/gregorianBridge';
import { halachicToday } from '../../src/calendar/zmanim';
import { getAllSightings, getAllVesetRecords, getSettings } from '../../src/data/storage';
import { calculateSeparationDays } from '../../src/engine/calculator';
import type { SeparationDay } from '../../src/data/types';

export interface UpcomingSeparation {
  day: SeparationDay;
  daysAway: number;
  label: string;
}

export async function getUpcomingSeparation(): Promise<UpcomingSeparation | null> {
  const [sightings, records, settings] = await Promise.all([
    getAllSightings(), getAllVesetRecords(), getSettings(),
  ]);
  const today = halachicToday(settings.location);
  const nextMonth = getNextMonth(today.year, today.month);
  const days = [
    ...calculateSeparationDays(sightings, records, { targetYear: today.year, targetMonth: today.month }).separationDays,
    ...calculateSeparationDays(sightings, records, {
      targetYear: nextMonth.year,
      targetMonth: nextMonth.month,
    }).separationDays,
  ];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const upcoming = days
    .map(day => ({ day, date: toGregorian(day.hebrewDate) }))
    .filter(item => item.date.getTime() >= start.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  if (!upcoming) return null;
  const daysAway = Math.round((upcoming.date.getTime() - start.getTime()) / 86_400_000);
  const onah = upcoming.day.onah === 'day' ? 'עונת יום' : upcoming.day.onah === 'night' ? 'עונת לילה' : 'יום ולילה';
  return {
    day: upcoming.day,
    daysAway,
    label: `${formatSightingDate(upcoming.day.hebrewDate, upcoming.day.onah === 'night' ? 'night' : 'day', 'he')} · ${onah}`,
  };
}
