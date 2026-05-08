/**
 * LocationPicker — Select residence location for zmanim calculations.
 *
 * Shows a grouped dropdown of predefined cities, plus a "custom" option
 * that reveals lat/lng/timezone inputs.
 */

import { useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCATIONS, groupedLocations, findLocation, type Location } from '../../data/locations';

interface Props {
  value: Location;
  onChange: (loc: Location) => void;
}

const GROUP_ORDER: Array<Location['country']> = ['IL', 'US', 'UK', 'EU', 'OTHER'];

export function LocationPicker({ value, onChange }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as 'he' | 'en';
  const [isCustom, setIsCustom] = useState(value.id === 'custom');
  const [customLat, setCustomLat] = useState(value.id === 'custom' ? String(value.lat) : '');
  const [customLng, setCustomLng] = useState(value.id === 'custom' ? String(value.lng) : '');
  const [customTz, setCustomTz] = useState(value.id === 'custom' ? value.timezone : 'Asia/Jerusalem');
  const [customName, setCustomName] = useState(value.id === 'custom' ? value.name_he : '');

  const groups = groupedLocations();

  const handleSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    if (id === 'custom') {
      setIsCustom(true);
      return;
    }
    const loc = findLocation(id);
    if (loc) {
      setIsCustom(false);
      onChange(loc);
    }
  };

  const applyCustom = () => {
    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (isNaN(lat) || isNaN(lng) || !customTz) return;
    onChange({
      id: 'custom',
      name_he: customName || 'מיקום מותאם',
      name_en: customName || 'Custom',
      lat,
      lng,
      timezone: customTz,
      country: 'CUSTOM',
    });
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude, longitude } = pos.coords;
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        setIsCustom(true);
        setCustomLat(String(latitude.toFixed(4)));
        setCustomLng(String(longitude.toFixed(4)));
        setCustomTz(tz);
        setCustomName(lang === 'he' ? 'מיקום נוכחי' : 'Current location');
        onChange({
          id: 'custom',
          name_he: 'מיקום נוכחי',
          name_en: 'Current location',
          lat: latitude,
          lng: longitude,
          timezone: tz,
          country: 'CUSTOM',
        });
      },
      () => {
        /* silent fail; user can pick manually */
      }
    );
  };

  return (
    <div className="space-y-2">
      <select
        value={isCustom ? 'custom' : value.id}
        onChange={handleSelect}
        className="w-full rounded border border-gray-300 px-3 py-2"
        aria-label={t('settings.location')}
      >
        {GROUP_ORDER.map(country => {
          const list = groups[country];
          if (!list || list.length === 0) return null;
          return (
            <optgroup key={country} label={t(`location.groups.${country}`)}>
              {list.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {lang === 'he' ? loc.name_he : loc.name_en}
                </option>
              ))}
            </optgroup>
          );
        })}
        <optgroup label={t('location.groups.CUSTOM')}>
          <option value="custom">{t('settings.locationCustom')}</option>
        </optgroup>
      </select>

      <button
        type="button"
        onClick={detectLocation}
        className="text-xs text-blue-600 hover:underline"
      >
        📍 {t('settings.locationDetect')}
      </button>

      {isCustom && (
        <div className="bg-gray-50 p-3 rounded space-y-2">
          <input
            type="text"
            value={customName}
            onChange={e => setCustomName(e.target.value)}
            placeholder={lang === 'he' ? 'שם המיקום' : 'Location name'}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm"
            aria-label={lang === 'he' ? 'שם המיקום' : 'Location name'}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.0001"
              value={customLat}
              onChange={e => setCustomLat(e.target.value)}
              placeholder={t('settings.locationLat')}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              aria-label={t('settings.locationLat')}
            />
            <input
              type="number"
              step="0.0001"
              value={customLng}
              onChange={e => setCustomLng(e.target.value)}
              placeholder={t('settings.locationLng')}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              aria-label={t('settings.locationLng')}
            />
          </div>
          <input
            type="text"
            value={customTz}
            onChange={e => setCustomTz(e.target.value)}
            placeholder="Asia/Jerusalem"
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono"
            aria-label={t('settings.locationTimezone')}
          />
          <button
            type="button"
            onClick={applyCustom}
            className="px-3 py-1 rounded bg-primary text-white text-sm hover:bg-primary-dark"
          >
            {t('common.save')}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500">{t('settings.locationHelp')}</p>
      {!isCustom && (
        <p className="text-xs text-gray-600">
          {value.lat.toFixed(3)}°, {value.lng.toFixed(3)}° — {value.timezone}
        </p>
      )}
    </div>
  );
}

// Suppress unused-import warning for LOCATIONS (only types are used here at top level)
void LOCATIONS;
