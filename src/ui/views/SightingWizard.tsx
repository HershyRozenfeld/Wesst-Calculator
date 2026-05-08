/**
 * SightingWizard — Step-by-step form for entering a new sighting.
 *
 * 8 steps:
 *  1. Date & Onah
 *  2. Sighting type (regular/ketem/bedika)
 *  3. Physical exertion
 *  4. Body symptoms
 *  5. Medication & pregnancy status
 *  6. Continued sighting link (optional)
 *  7. Notes
 *  8. Summary & save
 */

import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../AppContext';
import { HebrewDatePickerFull } from '../components/HebrewDatePickerFull';
import type {
  Sighting,
  SightingType,
  MedicationStatus,
  PregnancyStatus,
  ExertionInfo,
  BodySymptom,
} from '../../data/types';
import type { HebrewDate, Onah } from '../../calendar/hebrewDate';
import { formatSightingDate } from '../../calendar/gregorianBridge';
import { determineOnah, parseClockTime, formatLocalTime, halachicToday } from '../../calendar/zmanim';
import { addHebrewDays } from '../../calendar/hebrewDate';

interface Props {
  onComplete: () => void;
  onCancel: () => void;
}

interface WizardData {
  /** The Hebrew date of the sighting (primary storage). */
  hebrewDate: HebrewDate;
  /** The onah of the sighting (day or night). Night = "אור ל[hebrewDate]". */
  onah: Onah;
  type: SightingType;
  hasExertion: boolean;
  exertion?: ExertionInfo;
  hasSymptoms: boolean;
  bodySymptoms: BodySymptom[];
  medicationStatus: MedicationStatus;
  pregnancyStatus: PregnancyStatus;
  continuedFromId?: string;
  notes: string;
}

export function SightingWizard({ onComplete, onCancel }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const { sightings, addSighting, settings } = useAppContext();
  const location = settings.location;

  const [step, setStep] = useState(1);

  // Initialize with current halachic moment
  const initialDetermination = determineOnah(new Date(), location);

  const [data, setData] = useState<WizardData>({
    hebrewDate: initialDetermination.hebrewDate,
    onah: initialDetermination.onah,
    type: 'regular',
    hasExertion: false,
    hasSymptoms: false,
    bodySymptoms: [],
    medicationStatus: 'none',
    pregnancyStatus: 'none',
    notes: '',
  });

  // ==== Optional "unsure of onah" helper: Gregorian date + clock time ====
  const [showTimeHelper, setShowTimeHelper] = useState(false);
  const nowForInit = new Date();
  const initGregDate = (() => {
    const y = nowForInit.getFullYear();
    const m = (nowForInit.getMonth() + 1).toString().padStart(2, '0');
    const d = nowForInit.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  })();
  const [helperDate, setHelperDate] = useState(initGregDate);
  const [helperTime, setHelperTime] = useState(formatLocalTime(nowForInit, location));

  const applyTimeHelper = () => {
    const [y, m, d] = helperDate.split('-').map(Number);
    if (!y || !m || !d) return;
    const greg = new Date(y, m - 1, d, 12, 0, 0);
    const instant = parseClockTime(greg, helperTime, location);
    const det = determineOnah(instant, location);
    setData(prev => ({ ...prev, hebrewDate: det.hebrewDate, onah: det.onah }));
  };

  // Mark halachicToday as used (re-exported for possible future needs)
  void halachicToday;

  const totalSteps = 8;
  const update = (patch: Partial<WizardData>) => setData(d => ({ ...d, ...patch }));

  const handleSave = async () => {
    const sighting: Omit<Sighting, 'id' | 'createdAt'> = {
      hebrewDate: data.hebrewDate,
      onah: data.onah,
      type: data.type,
      medicationStatus: data.medicationStatus,
      pregnancyStatus: data.pregnancyStatus,
    };

    if (data.hasExertion && data.exertion) sighting.exertion = data.exertion;
    if (data.hasSymptoms && data.bodySymptoms.length > 0) sighting.bodySymptoms = data.bodySymptoms;
    if (data.continuedFromId) sighting.continuedFromId = data.continuedFromId;
    if (data.notes.trim()) sighting.notes = data.notes.trim();

    await addSighting(sighting);
    onComplete();
  };

  // Recent sightings for continuation (last 14 days)
  const recentSightings = sightings
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{t(`wizard.step${step}`)}</h2>
        <div className="text-sm text-gray-500">
          {step} / {totalSteps}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[200px] mb-6">
        {step === 1 && (
          <div className="space-y-4">
            {/* Hebrew date picker */}
            <div>
              <label className="text-sm font-medium block mb-1">
                {lang === 'he' ? 'תאריך עברי' : 'Hebrew date'}
              </label>
              <HebrewDatePickerFull
                value={data.hebrewDate}
                onChange={d => update({ hebrewDate: d })}
              />
            </div>

            {/* Onah radio with "אור ל" semantic label for night */}
            <fieldset>
              <legend className="text-sm font-medium mb-2">
                {lang === 'he' ? 'עונה' : 'Onah'}
              </legend>
              <div className="flex gap-2">
                <label className="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer flex-1 justify-center">
                  <input
                    type="radio"
                    name="onah"
                    checked={data.onah === 'day'}
                    onChange={() => update({ onah: 'day' })}
                  />
                  {t('onah.day')}
                </label>
                <label className="flex items-center gap-2 px-3 py-2 border rounded cursor-pointer flex-1 justify-center">
                  <input
                    type="radio"
                    name="onah"
                    checked={data.onah === 'night'}
                    onChange={() => update({ onah: 'night' })}
                  />
                  {lang === 'he' ? 'לילה (אור ל־)' : 'Night (Eve of)'}
                </label>
              </div>
            </fieldset>

            {/* Live preview of final notation */}
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <span className="font-semibold">
                {lang === 'he' ? 'ייווצר: ' : 'Will be recorded as: '}
              </span>
              {formatSightingDate(data.hebrewDate, data.onah, lang)}
              {data.onah === 'night' && (
                <div className="text-xs text-gray-600 mt-1">
                  {lang === 'he'
                    ? `(הלילה שאחרי שקיעת ${formatSightingDate(
                        addHebrewDays(data.hebrewDate, -1),
                        'day',
                        lang,
                        { short: true }
                      )})`
                    : `(the night following sunset on ${formatSightingDate(
                        addHebrewDays(data.hebrewDate, -1),
                        'day',
                        lang,
                        { short: true }
                      )})`}
                </div>
              )}
            </div>

            {/* Optional: clock-time helper */}
            <div className="border-t pt-3">
              <button
                type="button"
                onClick={() => setShowTimeHelper(s => !s)}
                className="text-sm text-blue-600 hover:underline"
              >
                {lang === 'he'
                  ? '📅 לא בטוח? חשב לפי שעה ושקיעה'
                  : '📅 Unsure? Compute from clock time'}
              </button>

              {showTimeHelper && (
                <div className="bg-gray-50 rounded p-3 mt-2 space-y-2">
                  <label className="block">
                    <span className="text-xs text-gray-600">
                      {lang === 'he' ? 'תאריך לועזי' : 'Gregorian date'}
                    </span>
                    <input
                      type="date"
                      value={helperDate}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setHelperDate(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600">{t('wizard.clockTime')}</span>
                    <input
                      type="time"
                      value={helperTime}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setHelperTime(e.target.value)}
                      className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm"
                    />
                    <span className="text-xs text-gray-500 block mt-0.5">
                      {lang === 'he' ? location.name_he : location.name_en}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={applyTimeHelper}
                    className="w-full px-3 py-1.5 rounded bg-primary text-white text-sm hover:bg-primary-dark"
                  >
                    {lang === 'he' ? 'חשב ומלא למעלה' : 'Compute and fill above'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <fieldset className="space-y-2">
            {(['regular', 'ketem', 'bedika'] as SightingType[]).map(type => (
              <label
                key={type}
                className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="radio"
                  name="type"
                  checked={data.type === type}
                  onChange={() => update({ type })}
                />
                <span>{t(`sighting.type.${type}`)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.hasExertion}
                onChange={e => update({ hasExertion: e.target.checked })}
              />
              {t('sighting.exertion.label')}
            </label>
            {data.hasExertion && (
              <div className="space-y-2 ps-6">
                <input
                  type="text"
                  placeholder={t('sighting.exertion.description')}
                  value={data.exertion?.description ?? ''}
                  onChange={e =>
                    update({
                      exertion: {
                        description: e.target.value,
                        intensity: data.exertion?.intensity ?? 'significant',
                      },
                    })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <div className="flex gap-2">
                  {(['significant', 'mild'] as const).map(i => (
                    <label key={i} className="flex items-center gap-2 flex-1 px-3 py-2 border rounded cursor-pointer justify-center">
                      <input
                        type="radio"
                        name="intensity"
                        checked={data.exertion?.intensity === i}
                        onChange={() =>
                          update({
                            exertion: {
                              description: data.exertion?.description ?? '',
                              intensity: i,
                            },
                          })
                        }
                      />
                      {t(`sighting.exertion.${i}`)}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <div className="rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
              {t('sighting.bodySymptom.help')}
            </div>
            <label className="flex items-start gap-2 rounded border border-gray-200 p-3 cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={data.hasSymptoms}
                onChange={e => update({ hasSymptoms: e.target.checked, bodySymptoms: e.target.checked ? [{ type: '', timing: 'during' }] : [] })}
                className="mt-1"
              />
              <span>{t('sighting.bodySymptom.label')}</span>
            </label>
            {data.hasSymptoms && data.bodySymptoms.map((sym, idx) => (
              <div key={idx} className="ps-6 space-y-2 border-s-2 border-gray-200 py-2">
                <input
                  type="text"
                  placeholder={t('sighting.bodySymptom.type')}
                  value={sym.type}
                  onChange={e => {
                    const newSymptoms = [...data.bodySymptoms];
                    newSymptoms[idx] = { ...sym, type: e.target.value };
                    update({ bodySymptoms: newSymptoms });
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
                <label className="block text-xs font-medium text-gray-600">
                  {t('sighting.bodySymptom.timingLabel')}
                </label>
                <select
                  value={sym.timing}
                  onChange={e => {
                    const newSymptoms = [...data.bodySymptoms];
                    newSymptoms[idx] = { ...sym, timing: e.target.value as BodySymptom['timing'] };
                    update({ bodySymptoms: newSymptoms });
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="before">{t('sighting.bodySymptom.timing.before')}</option>
                  <option value="during">{t('sighting.bodySymptom.timing.during')}</option>
                  <option value="after">{t('sighting.bodySymptom.timing.after')}</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <fieldset>
              <legend className="text-sm font-medium mb-2">{t('sighting.medication.none')}</legend>
              <div className="space-y-1">
                {(['none', 'taking', 'stopped'] as MedicationStatus[]).map(m => (
                  <label key={m} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="medication"
                      checked={data.medicationStatus === m}
                      onChange={() => update({ medicationStatus: m })}
                    />
                    {t(`sighting.medication.${m}`)}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium mb-2">{t('sighting.pregnancy.none')}</legend>
              <div className="space-y-1">
                {(['none', 'pregnant', 'postpartum'] as PregnancyStatus[]).map(p => (
                  <label key={p} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="pregnancy"
                      checked={data.pregnancyStatus === p}
                      onChange={() => update({ pregnancyStatus: p })}
                    />
                    {t(`sighting.pregnancy.${p}`)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3">
            <p className="text-sm">{t('wizard.continuedFrom')}</p>
            <select
              value={data.continuedFromId ?? ''}
              onChange={e => update({ continuedFromId: e.target.value || undefined })}
              className="w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="">—</option>
              {recentSightings.map(s => (
                <option key={s.id} value={s.id}>
                  {formatSightingDate(s.hebrewDate, s.onah, lang)}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === 7 && (
          <textarea
            value={data.notes}
            onChange={e => update({ notes: e.target.value })}
            placeholder={t('sighting.notes')}
            rows={5}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        )}

        {step === 8 && (
          <div className="space-y-2 text-sm">
            <div><strong>{lang === 'he' ? 'תאריך:' : 'Date:'}</strong> {formatSightingDate(data.hebrewDate, data.onah, lang)}</div>
            <div><strong>{t('wizard.step2')}:</strong> {t(`sighting.type.${data.type}`)}</div>
            {data.hasExertion && data.exertion && (
              <div><strong>{t('sighting.exertion.label')}:</strong> {data.exertion.description} ({t(`sighting.exertion.${data.exertion.intensity}`)})</div>
            )}
            {data.hasSymptoms && (
              <div><strong>{t('sighting.bodySymptom.label')}:</strong> {data.bodySymptoms.map(s => s.type).filter(Boolean).join(', ')}</div>
            )}
            <div><strong>{t('settings.language')}:</strong> {t(`sighting.medication.${data.medicationStatus}`)}</div>
            {data.notes && <div><strong>{t('sighting.notes')}:</strong> {data.notes}</div>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        >
          {step === 1 ? t('common.cancel') : t('common.back')}
        </button>
        {step < totalSteps ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            className="px-4 py-2 rounded bg-primary text-white hover:bg-primary-dark"
          >
            {t('common.next')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
          >
            {t('common.save')}
          </button>
        )}
      </div>
    </div>
  );
}
