/**
 * CalendarView — Main calendar screen with month navigation and results panel.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../AppContext';
import { CalendarGrid } from '../components/CalendarGrid';
import { CalendarLegend } from '../components/CalendarLegend';
import { SeparationDaysList } from '../components/SeparationDaysList';
import {
  getNextMonth,
  getPreviousMonth,
  type HebrewDate,
} from '../../calendar/hebrewDate';
import { halachicToday } from '../../calendar/zmanim';
import { calculateSeparationDays } from '../../engine/calculator';
import { gematriya } from '@hebcal/core';

export function CalendarView() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const { sightings, vesetRecords, settings } = useAppContext();

  const now = halachicToday(settings.location);
  const [viewMonth, setViewMonth] = useState<{ year: number; month: number }>({
    year: now.year,
    month: now.month,
  });
  const [selectedDate, setSelectedDate] = useState<HebrewDate | null>(null);

  const result = useMemo(() => {
    return calculateSeparationDays(sightings, vesetRecords, {
      targetYear: viewMonth.year,
      targetMonth: viewMonth.month,
    });
  }, [sightings, vesetRecords, viewMonth]);

  const goToPrev = () => {
    setViewMonth(prev => getPreviousMonth(prev.year, prev.month));
  };
  const goToNext = () => {
    setViewMonth(prev => getNextMonth(prev.year, prev.month));
  };
  const goToToday = () => {
    setViewMonth({ year: now.year, month: now.month });
  };

  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-3 lg:space-y-0">
      {/* Left column: navigation + calendar + legend */}
      <div className="space-y-3 lg:space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between bg-white rounded-lg shadow-sm p-2">
          <button
            type="button"
            onClick={goToPrev}
            className="px-3 py-1 rounded hover:bg-gray-100"
            aria-label={t('calendar.prev')}
          >
            ‹
          </button>
          <div className="text-center">
            <div className="text-base lg:text-lg font-semibold">
              {t(`months.${viewMonth.month}`)}{' '}
              {lang === 'he' ? gematriya(viewMonth.year % 1000) : viewMonth.year}
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="text-xs text-blue-600 hover:underline"
            >
              {t('calendar.today')}
            </button>
          </div>
          <button
            type="button"
            onClick={goToNext}
            className="px-3 py-1 rounded hover:bg-gray-100"
            aria-label={t('calendar.next')}
          >
            ›
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-white rounded-lg shadow-sm p-2 lg:p-3">
          <CalendarGrid
            year={viewMonth.year}
            month={viewMonth.month}
            separationDays={result.separationDays}
            sightings={sightings}
            onDayClick={setSelectedDate}
            selectedDate={selectedDate}
          />
        </div>

        {/* Color legend */}
        <CalendarLegend />
      </div>

      {/* Right column on desktop: results */}
      <div className="space-y-3 lg:space-y-3 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto">
        <SeparationDaysList result={result} />
      </div>
    </div>
  );
}
