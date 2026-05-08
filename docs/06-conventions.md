# 06 - Conventions: קונבנציות קוד

## שפת תכנות

- **TypeScript** בלבד — strict mode מופעל
- אין `any` — אם צריך טיפוס גנרי, להשתמש ב-`unknown` ולצמצם
- כל פונקציה חייבת טיפוסי כניסה ויציאה מפורשים

## שמות

### קבצים
- **camelCase** לכל הקבצים: `vesetChodesh.ts`, `hebrewDate.ts`
- קבצי React: **PascalCase**: `HebrewCalendar.tsx`, `DayCell.tsx`
- קבצי טסט: שם הקובץ + `.test.ts`: `vesetChodesh.test.ts`

### טיפוסים ו-interfaces
- **PascalCase**: `HebrewDate`, `Sighting`, `VesetRecord`
- Enums: **PascalCase** לשם, **UPPER_SNAKE** לערכים (אם נשתמש)

### משתנים ופונקציות
- **camelCase**: `calculateSeparationDays`, `lastSighting`
- קבועים: **UPPER_SNAKE_CASE**: `MAX_HAFLAGA_DAYS`

### מונחי הלכה
- שמות פונקציות וטיפוסים: **באנגלית** עם תעתיק עברי
- הערה בעברית ליד כל מונח הלכתי:
  ```typescript
  // ווסת החודש — Day of Hebrew month pattern
  function calculateVesetChodesh(...)
  ```
- מילון מונחים:
  | עברית | אנגלית | שימוש בקוד |
  |-------|---------|------------|
  | ווסת | Veset | `veset`, `VesetRecord` |
  | ראיה | Sighting | `sighting`, `Sighting` |
  | הפלגה | Haflaga (interval) | `haflaga` |
  | עונה | Onah (half-day) | `onah` |
  | עונה בינונית | Onah Beinonit (average period) | `onahBeinonit` |
  | קבוע | Kavua (fixed) | `'fixed'` |
  | עקירה | Uprooting | `uproot`, `uprootCount` |
  | כתם | Ketem (stain) | `'ketem'` |
  | בדיקה | Bedika (check) | `'bedika'` |
  | מעין פתוח | Ma'ayan Patuach (open spring) | `maAyanPatuach` |
  | דילוג | Dilug (skip) | `dilug` |
  | סירוג | Sirug (alternation) | `sirug` |

## מבנה מודולים

### מנוע הלכתי (`src/engine/`)
- **Pure functions בלבד** — אין side effects, אין IO, אין UI
- כל מודול מקבל נתונים ומחזיר תוצאות
- לא תלוי ב-React, ב-DOM, או ב-IndexedDB
- ניתן לבדיקה בטסטים ללא כל setup

### שכבת נתונים (`src/data/`)
- אחראית על IO (IndexedDB, ייצוא/ייבוא)
- מספקת נתונים למנוע ולממשק
- לא מכילה לוגיקה הלכתית

### ממשק (`src/ui/`)
- React components בלבד
- לא מכיל לוגיקה הלכתית — קורא למנוע ומציג תוצאות
- כל טקסט מוצג דרך i18n (לא hardcoded)

## טסטים

### שמות טסטים
- כל טסט כולל **הפניה לסעיף** בקובץ ההלכות:
  ```typescript
  test('section-21: 1 Nisan to 25 Nisan = haflaga of 25 days', () => {
    // ...
  });
  
  test('section-29: short haflaga does not uproot long haflaga', () => {
    // ...
  });
  ```

### מבנה טסטים
- `describe` לפי מודול ונושא
- `test` לפי סעיף ומקרה ספציפי
- נתוני בדיקה: fixtures ב-JSON כשמתאים, inline כשקצר

### כיסוי
- כל מודול engine חייב כיסוי של כל הסעיפים הרלוונטיים
- כל דוגמה מספרית בקובץ ההלכות חייבת להיות טסט
- טסטים אינטגרטיביים: הטבלאות מסעיפים ל"ה-ל"ו וקי"ז

## Git

### Commits
- הודעות באנגלית
- פורמט: `type(scope): description`
- סוגים: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`
- דוגמאות:
  - `feat(engine): implement veset haflaga with short-doesnt-uproot-long rule`
  - `test(engine): add section-117 comprehensive scenario test`
  - `docs: update activity log for phase 2 completion`

### Branches
- `main` — קוד יציב
- `feat/xxx` — פיצ'ר חדש
- `fix/xxx` — תיקון

## CSS / Tailwind

- Tailwind utility classes בלבד — אין CSS files נפרדים
- RTL: להשתמש ב-`rtl:` prefix של Tailwind RTL plugin
- צבעים: להגדיר ב-`tailwind.config.ts` — לא inline hex values
- Responsive: `sm:`, `md:`, `lg:` — mobile-first

## i18n

- כל טקסט UI עובר דרך `t('key')` של react-i18next
- מפתחות: dot notation: `calendar.month.nisan`, `wizard.step1.title`
- ברירת מחדל: עברית
- כל מפתח חייב להיות בשני הקבצים (he.json, en.json)
