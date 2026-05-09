/**
 * SeparationDaysList — Display calculated separation days with reasons.
 *
 * Section references (e.g. "סעיף לח'") are clickable and open a HalachaModal
 * showing the full halachic text for that section.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CalculationResult } from '../../engine/calculator';
import { formatSightingDate, formatHebrewDate, toGregorian } from '../../calendar/gregorianBridge';
import { getSunrise, getSunset, formatLocalTime } from '../../calendar/zmanim';
import { gematriya } from '@hebcal/core';
import { HalachaModal } from './HalachaModal';
import { HALACHA_BY_NUMBER } from '../../data/halachaSections';
import type { Location } from '../../data/locations';
import type { HebrewDate, Onah } from '../../calendar/hebrewDate';

interface Props {
  result: CalculationResult;
  location: Location;
}

export function SeparationDaysList({ result, location }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const [openSection, setOpenSection] = useState<number | null>(null);

  if (result.separationDays.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-lg font-semibold mb-2">{t('results.title')}</h3>
        <p className="text-gray-500">
          {result.summary.sightingCount === 0
            ? t('history.noSightings')
            : t('results.noSeparationDays')}
        </p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-3">{t('results.title')}</h3>

      {/* Status banner */}
      <div className="text-sm text-gray-600 mb-3">
        {result.summary.hasFixedVeset
          ? `${t('results.hasFixedVeset')}: ${t(`vesetType.${result.summary.fixedVesetType}`)}`
          : t('results.noFixedVeset')}
      </div>

      {result.summary.hasAskRav && (
        <div className="bg-sep-ask-rav/20 border border-sep-ask-rav text-sep-ask-rav rounded p-2 mb-3 text-sm font-medium">
          ⚠️ {t('results.askRav')}
        </div>
      )}

      {/* Days */}
      <ul className="space-y-2">
        {result.separationDays.map((day, idx) => {
          // For separation days: onah can be 'full' (24 hours, e.g. Onah Beinonit).
          // 'full' gets a plain date; 'day'/'night' use the formatSightingDate convention.
          const dateStr =
            day.onah === 'full'
              ? formatHebrewDate(day.hebrewDate, lang)
              : formatSightingDate(day.hebrewDate, day.onah, lang);
          const checkTimes = getSeparationCheckTimes(day.hebrewDate, day.onah, location);
          return (
            <li key={idx} className="border-s-4 border-sep-onah-beinonit ps-3 py-1">
              <div className="font-semibold">
                {dateStr}
                {day.onah === 'full' && (
                  <span className="text-sm font-normal"> — {t('onah.full')}</span>
                )}
              </div>
              <ul className="text-sm text-gray-600 mt-1 space-y-0.5">
                {day.reasons.map((r, ri) => {
                  const sectionNum = typeof r.sectionRef === 'number'
                    ? r.sectionRef
                    : parseInt(String(r.sectionRef), 10);
                  const hasHalacha = !isNaN(sectionNum) && HALACHA_BY_NUMBER[sectionNum] != null;
                  const letter = !isNaN(sectionNum) ? gematriya(sectionNum) : String(r.sectionRef);
                  return (
                    <li key={ri}>
                      • {lang === 'he' ? r.description_he : r.description_en}
                      {hasHalacha ? (
                        <button
                          type="button"
                          onClick={() => setOpenSection(sectionNum)}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline ms-1 cursor-pointer"
                          title={t('halacha.viewSection')}
                        >
                          ({t('halacha.section')} {letter}')
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 ms-1">
                          ({t('halacha.section')} {letter}')
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 rounded border border-sky-100 bg-sky-50 p-2 text-xs leading-5 text-sky-950">
                <div className="font-semibold">{t('checking.title')}</div>
                <div className="text-sky-800">
                  {t('checking.location', {
                    location: lang === 'he' ? location.name_he : location.name_en,
                  })}
                </div>
                <dl className="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {checkTimes.map(item => (
                    <div key={item.key} className="flex justify-between gap-3 rounded bg-white/70 px-2 py-1">
                      <dt className="text-gray-600">{t(`checking.${item.key}`)}</dt>
                      <dd className="font-medium text-gray-900">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-2">{t('checking.instruction')}</p>
                <p className="mt-1 text-sky-800">{t('checking.notTaharah')}</p>
                <p className="mt-1 text-[11px] text-sky-700">{t('checking.source')}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
    <HalachaModal sectionNumber={openSection} onClose={() => setOpenSection(null)} />
    </>
  );
}

function getSeparationCheckTimes(
  hebrewDate: HebrewDate,
  onah: Onah | 'full',
  location: Location,
): Array<{ key: string; value: string }> {
  const civilDate = toGregorian(hebrewDate);
  const previousCivilDate = new Date(civilDate);
  previousCivilDate.setDate(previousCivilDate.getDate() - 1);

  const nightStart = getSunset(previousCivilDate, location);
  const dayStart = getSunrise(civilDate, location);
  const dayEnd = getSunset(civilDate, location);

  if (onah === 'night') {
    return [
      { key: 'nightStart', value: formatLocalTime(nightStart, location) },
      { key: 'nightEnd', value: formatLocalTime(dayStart, location) },
    ];
  }

  if (onah === 'day') {
    return [
      { key: 'dayStart', value: formatLocalTime(dayStart, location) },
      { key: 'dayEnd', value: formatLocalTime(dayEnd, location) },
    ];
  }

  return [
    { key: 'nightStart', value: formatLocalTime(nightStart, location) },
    { key: 'dayStart', value: formatLocalTime(dayStart, location) },
    { key: 'dayEnd', value: formatLocalTime(dayEnd, location) },
  ];
}
