/**
 * i18n Configuration — הגדרות רב-לשוניות
 *
 * Hebrew (he) is the primary/default language with RTL.
 * English (en) provides translations for all UI strings.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { he } from './locales/he';
import { en } from './locales/en';

export const DEFAULT_LANG: 'he' | 'en' = 'he';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      he: { translation: he },
      en: { translation: en },
    },
    lng: DEFAULT_LANG,
    fallbackLng: 'he',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

export function setLanguage(lang: 'he' | 'en'): void {
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

export default i18n;
