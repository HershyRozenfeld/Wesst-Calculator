# 07 - Activity Log: יומן פעילות

## 2026-04-12 — אתחול פרויקט

### מה נעשה
1. **קריאת קובץ ההלכות** (`הלכות-ווסתות.txt`) — 418 שורות, 122 סעיפים
   - זיהוי 9 סוגי ווסתות
   - מיפוי כללי קביעה ועקירה
   - זיהוי מקרי קצה (מעין פתוח, קצרה לא עוקרת ארוכה, ווסת שנעקר וחזר)
   - מיפוי ספקות הלכתיים ופסיקה

2. **החלטות טכנולוגיות** (בהתייעצות עם המשתמש):
   - PWA במקום Electron (נמנע מחסימת SmartScreen)
   - לוח חודשי + ציר זמן
   - IndexedDB + JSON ייצוא (פרטיות מוחלטת)
   - עברית + אנגלית
   - פסק עיקרי בלבד, ללא חומרות

3. **יצירת מסמכי תיעוד** (Documentation-First):
   - `docs/01-overview.md` — סקירה כללית, מטרה, קהל יעד, scope
   - `docs/02-architecture.md` — stack, מבנה תיקיות, זרימת נתונים, PWA
   - `docs/03-specification.md` — אפיון מפורט: 9 ווסתות, כללים, אשף, לוח, ספקות
   - `docs/04-roadmap.md` — 5 פאזות, משימות מפורטות
   - `docs/05-decisions.md` — 8 ADRs
   - `docs/06-conventions.md` — קונבנציות קוד, שמות, מבנה, טסטים
   - `docs/07-activity-log.md` — קובץ זה

### קבצים שנוצרו/שונו
- `docs/01-overview.md` (חדש)
- `docs/02-architecture.md` (חדש)
- `docs/03-specification.md` (חדש)
- `docs/04-roadmap.md` (חדש)
- `docs/05-decisions.md` (חדש)
- `docs/06-conventions.md` (חדש)
- `docs/07-activity-log.md` (חדש)

### המשימה הבאה
~~**פאזה 1.1**: אתחול פרויקט טכני~~ — הושלם, ראה למטה.

---

## 2026-04-13 — פאזה 1 (בסיס) + תחילת פאזה 2 (מנוע ליבה)

### מה נעשה

#### פאזה 1.1 — אתחול פרויקט
- יצירת `package.json` עם כל ה-dependencies (React 18, TypeScript, Vite, @hebcal/core, Tailwind, Vitest, idb, i18next)
- הגדרת `tsconfig.json` (strict mode, path aliases)
- הגדרת `vite.config.ts` (React plugin, PWA plugin עם manifest)
- הגדרת `tailwind.config.ts` עם צבעים מותאמים (sep-onah-beinonit, sep-haflaga, sep-chodesh, sep-kavua וכו')
- יצירת `index.html` (RTL, עברית) + `src/main.tsx` + `src/ui/App.tsx` (שלד React)
- מבנה תיקיות מלא: `src/engine/`, `src/calendar/`, `src/data/`, `src/ui/components/`, `test/`
- התקנת npm dependencies (488 packages)

#### פאזה 1.2 — מודול לוח עברי
- `src/calendar/hebrewDate.ts` — wrapping @hebcal/core:
  - טיפוסים: `HebrewDate`, `Onah`, `SightingMoment`
  - ספירה כוללנית: `hebrewDaysBetween()` — סעיף כ"א
  - חיבור ימים: `addHebrewDays()`
  - אורך חודש: `hebrewMonthLength()`
  - ר"ח: `getRoshChodeshDays()` — סעיף י"ט
  - השוואות: `sameDate()`, `isBefore()`, `isAfter()`
  - ניווט חודשים: `getNextMonth()`, `getPreviousMonth()`
  - המרת מספור: halachic (ניסן=1) ↔ hebcal (תשרי=1)
- `src/calendar/gregorianBridge.ts` — המרות עברי↔לועזי, פורמטים
- **33 טסטים** עברו (`test/calendar/hebrewDate.test.ts`)

#### פאזה 1.3 — טיפוסי נתונים
- `src/data/types.ts` — כל הטיפוסים:
  - `Sighting` (9 שדות כולל תופעות גוף, מאמץ, תרופות, הריון)
  - `VesetRecord` (סטטוסים: non-fixed/fixed/uprooted/dormant)
  - `VesetDetails` — discriminated union ל-9 סוגי ווסת
  - `SeparationDay`, `SeparationReason`, `ActiveHaflaga`
  - `AppSettings`, `ExportSchema`

#### פאזה 2.1 — סיווג ראיות
- `src/engine/sightingClassifier.ts`:
  - `countsForNonFixedVeset()` — regular only (סעיף קה-קו)
  - `countsForFixedVeset()` — regular + bedika (סעיף קז)
  - `isContinuedSighting()` — תוך 7 ימים = ראיה אחת (סעיף קיב)
  - `getEffectiveSightings()` — סינון + מיזוג

#### פאזה 2.2 — עונה בינונית
- `src/engine/onahBeinonit.ts`:
  - חישוב יום 30 ויום 31 מהראיה האחרונה
  - 'full' = 24 שעות (סעיף מא)
  - חריגים: ווסת קבוע (סעיף מג), הפלגה < 30 (סעיף מד), יום חודש (סעיף מה)
- **5 טסטים** עברו

#### פאזה 2.3 — ווסת החודש
- `src/engine/vesetChodesh.ts`:
  - חשש לא-קבוע: אחרי ראיה אחת (סעיף יב)
  - קביעה: 3 ראיות + אותה עונה (סעיף י)
  - ר"ח: שני ימים (סעיף יט)
  - `checkChodeshKavua()` — זיהוי ווסת קבוע

#### פאזה 2.4 — ווסת הפלגה
- `src/engine/vesetHaflaga.ts`:
  - ספירה כוללנית (סעיף כא)
  - **כלל "קצרה לא עוקרת ארוכה"** (סעיף כט) — מימוש מלא
  - עקירה ע"י הפלגה שווה או ארוכה
  - `checkHaflagaKavua()` — 4 ראיות, 3 הפלגות שוות + אותה עונה
  - ראיה ראשונה לא חייבת באותה עונה (סעיף כג)
- **13 טסטים** עברו, כולל דוגמה מקיפה מסעיף קי"ז

### סה"כ טסטים: 51, כולם עוברים ✓

### קבצים שנוצרו/שונו
- `package.json` (חדש)
- `tsconfig.json` (חדש)
- `vite.config.ts` (חדש)
- `tailwind.config.ts` (חדש)
- `postcss.config.js` (חדש)
- `index.html` (חדש)
- `.gitignore` (חדש)
- `src/main.tsx` (חדש)
- `src/index.css` (חדש)
- `src/vite-env.d.ts` (חדש)
- `src/ui/App.tsx` (חדש)
- `src/calendar/hebrewDate.ts` (חדש)
- `src/calendar/gregorianBridge.ts` (חדש)
- `src/data/types.ts` (חדש)
- `src/engine/sightingClassifier.ts` (חדש)
- `src/engine/onahBeinonit.ts` (חדש)
- `src/engine/vesetChodesh.ts` (חדש)
- `src/engine/vesetHaflaga.ts` (חדש)
- `test/calendar/hebrewDate.test.ts` (חדש)
- `test/engine/onahBeinonit.test.ts` (חדש)
- `test/engine/vesetHaflaga.test.ts` (חדש)

### המשימה הבאה
~~**פאזה 2.5-2.7**: כללי עקירה (`uprootingRules.ts`), מנהל מצב (`stateManager.ts`), אורקסטרטור ראשי (`calculator.ts`).~~ — הושלם, ראה למטה.

---

## 2026-04-13 (המשך) — פאזה 2.5-2.7 (השלמת מנוע ליבה)

### מה נעשה

#### פאזה 2.5 — כללי עקירה
- `src/engine/uprootingRules.ts`:
  - `checkNonFixedUprooting()` — עקירה אחרי פעם אחת (סעיף יד)
  - `checkFixedUprooting()` — עקירה אחרי 3 בדיקות (סעיף טו)
  - `getUprootedStatus()` — ווסת קבוע הופך ל-dormant (סעיף צה)
  - `checkDormantRevival()` — ווסת ישן חוזר עם ראיה אחת (סעיפים צה-צח)
  - `medicationPreventsUprooting()` — תרופות לא עוקרות (סעיפים קג-קד)
  - `birthUproots()` — לידה עוקרת ווסת לא-קבוע (סעיף לא)
  - `newKavuaUproots()` — ווסת קבוע חדש עוקר לא-קבועים (סעיף ט)
  - `checkYamimNevukhimUprooting()` — עקירה רק כשכל הימים נעקרו (סעיפים עג-עד)
  - `processVesetAfterCycle()` — נקודת כניסה ראשית לעקירה
  - ווסת קפיצות: נעקר אחרי פעם אחת גם כשקבוע (סעיף צא)
  - ראיה נמשכת ביום הווסת לא עוקרת (סעיפים יז-יח)
- **30 טסטים** עברו

#### פאזה 2.6 — מנהל מצב
- `src/engine/stateManager.ts`:
  - `buildHalachicState()` — בניית מצב הלכתי מלא מנתונים גולמיים
  - `checkForNewKavua()` — בדיקת קביעת ווסת חדש (חודש + הפלגה)
  - `checkDormantRevivals()` — בדיקת החזרת ווסתות ישנים
  - `getExpectedDateForVeset()` — חישוב יום צפוי לפי סוג ווסת
  - `getApplicableWorryTypes()` — קביעת חששות רלוונטיים (סעיפים ח-ט)
  - `shouldSuppressForMedication()` — דיכוי חששות בזמן תרופות
  - סעיף ט: ווסת קבוע → רק חשש ליום הווסת + סעיף יג

#### פאזה 2.7 — אורקסטרטור ראשי
- `src/engine/calculator.ts`:
  - `calculateSeparationDays()` — נקודת כניסה יחידה ל-UI
  - `mergeSeparationDays()` — מיזוג ימי פרישה כפולים
  - `calculateFixedVesetWorry()` — חישוב יום ווסת קבוע
  - `filterToMonth()` — סינון לחודש יעד
  - סעיף ח: ללא קבוע → חשש לחודש + הפלגה + עו"ב
  - סעיף ט: עם קבוע → חשש ליום הקבוע בלבד
  - תמיכה בתרופות (דיכוי חששות כשהוכח)
- **8 טסטים** עברו

### סה"כ טסטים: 89, כולם עוברים ✓

### קבצים שנוצרו/שונו
- `src/engine/uprootingRules.ts` (חדש)
- `src/engine/stateManager.ts` (חדש)
- `src/engine/calculator.ts` (חדש)
- `test/engine/uprootingRules.test.ts` (חדש)
- `test/engine/calculator.test.ts` (חדש)

### המשימה הבאה
~~**פאזה 3**: ווסתות מתקדמים~~ — הושלם, ראה למטה.

---

## 2026-04-15 — פאזה 3 (ווסתות מתקדמים)

### מה נעשה

#### פאזה 3.1 — ווסת השבוע (`vesetShavua.ts`)
- `checkShavuaKavua()` — זיהוי 3 ראיות באותו יום בשבוע + סירוג שבועות שווה (סעיף מו)
- `calculateShavuaWorry()` — חישוב יום החשש הבא
- סעיף מז: אין חשש לא-קבוע (שונה מחודש/הפלגה)
- תמיכה ב-edge case סעיף מח (22/29/36 הפלגה = ווסת שבוע)

#### פאזה 3.2 — ווסת הסירוג (`vesetSirug.ts`)
- `checkSirugKavua()` — 3 ראיות, אותו יום בחודש, סירוג חודשים שווה
- `monthsBetween()` — חישוב מרווח חודשי
- סעיף סה: ראיה ביניים פוסלת (נבדק)
- סעיף סו: אין חשש לפני קביעה
- `calculateSirugWorry()` — ערב החודש הבא באותו יום

#### פאזה 3.3 — ווסת הקפיצות (`vesetKfitzot.ts`)
- `checkKfitzotKavua()` — 3 ראיות עם אותו מאמץ משמעותי
- סעיף צ: רק מאמץ משמעותי (לא mild)
- `calculateKfitzotWorryForExertion()` — חשש רק כשעושה את הפעולה
- סעיף צג: חיבור לחודש/הפלגה מסומן כ"שאל רב"

#### פאזה 3.4 — ווסת הגוף (`vesetGuf.ts`)
- `checkGufPattern()` — זיהוי תופעה חוזרת (1 לא-קבוע, 3 קבוע)
- `calculateGufWorryForSymptom()` — חשש לפי תזמון:
  - immediate (סעיף פב): מהתחלה עד סוף העונה
  - next_day (סעיף פד): למחרת
  - multi-day (סעיף פו): לכל אורך התופעה
- סעיף פז: גוף + חודש/הפלגה = "שאל רב"

#### פאזה 3.5 — ימים נבוכים (`yamimNevukhim.ts`)
- `checkYamimNevukhimChodesh()` — זיהוי 2-3 ימים צמודים, כל יום 3+ פעמים
- סעיף סט-ע: יותר מ-3 ימים מפוזרים = אין ווסת כלל
- `calculateYamimNevukhimWorries()` — חשש לכל יום באשכול
- תמיכה בסעיפים עג-עד: עקירה רק של כל הימים (ב-uprootingRules)

#### פאזה 3.6 — ווסת הדילוג (`vesetDilug.ts`)
- `checkDilugChodesh()` — 4 ראיות, 3 דילוגים שווים ביום חודש (סעיפים נג-נד)
- `checkDilugHaflaga()` — 5 ראיות, 3 דילוגים שווים בהפלגה (סעיף נה)
- תמיכה בעולה ויורד (סעיף נו)
- `calculateDilugWorry()`:
  - Chodesh scope: פוקע בסוף חודש (סעיף סב)
  - Haflaga scope: לא פוקע (סעיף סג)

#### פאזה 3.7 — כללי תרופות (`medicationRules.ts`)
- `isMedicationProven()` — סעיף צט (3 מחזורים)
- `sightingsForEstablishment()` — מסנן ראיות בזמן תרופות מקביעת ווסת
- `medicationTransition()` — זיהוי מעברי סטטוס
- `getEffectiveVesetStatus()` — שימור ווסת קבוע בזמן תרופות (סעיפים קג-קד)

### ניקוי קוד
- תוקנו כל ה-unused imports בקבצי engine מ-TS strict mode (`tsc --noEmit` נקי)

### טסטים שנוספו
- `test/engine/phase3.test.ts` — **40 טסטים** לכל סוגי הווסתות המתקדמים
- כולל בדיקות edge cases חשובות (non-uniform steps, mild exertion, intermediate sightings)

### סה"כ טסטים: 129, כולם עוברים ✓

### קבצים שנוצרו
- `src/engine/vesetShavua.ts`
- `src/engine/vesetSirug.ts`
- `src/engine/vesetKfitzot.ts`
- `src/engine/vesetGuf.ts`
- `src/engine/yamimNevukhim.ts`
- `src/engine/vesetDilug.ts`
- `src/engine/medicationRules.ts`
- `test/engine/phase3.test.ts`

### הערות לעתיד
- אינטגרציה של ווסתות מתקדמים ב-`calculator.ts` תתבצע לאחר UI (הם דורשים קלט נוסף מה-wizard — מאמץ, מיחושים).
- ווסת גוף מורכב וקפיצות מורכב מוצגים רק כ-"שאל רב" (סעיפים פז, צג) — לפי ADR-005.

### המשימה הבאה
~~**פאזה 4**: UI~~ — הושלם, ראה למטה.

---

## 2026-04-15 (המשך) — פאזה 4 (UI)

### מה נעשה

#### פאזה 4.1 — תשתיות
- **`src/i18n/`** — i18next עם `he` ו-`en`, קובצי תרגום מלאים (~150 מפתחות)
  - `setLanguage()` מעדכן גם `<html dir>` + `<html lang>`
  - ברירת מחדל: עברית RTL
- **`src/data/storage.ts`** — שכבת IndexedDB באמצעות `idb`:
  - 3 object stores: sightings, vesetRecords, settings
  - `downloadExport()` — הורדת JSON מלא
  - `importAllData()` — ייבוא עם validation
  - `clearAllData()` — איפוס מלא
- **`src/ui/AppContext.tsx`** — React Context (לפי ADR-008, ללא Redux)
  - מספק: sightings, vesetRecords, settings, loading
  - פעולות: addSighting, removeSighting, updateSettings, refresh
  - UUID אוטומטי + createdAt לכל ראיה

#### פאזה 4.2 — רכיבים
- **`CalendarGrid.tsx`** — רשת לוח חודש עברי
  - חודש עברי מלא בצורת 7×N עם כותרות ימי שבוע
  - סימון היום הנוכחי (ring כחול), תאריך נבחר (ring כתום)
  - נקודת סימון ירוקה לימים עם ראיה
  - צביעה לפי סוג ווסת: עו"ב (אדום), הפלגה (כתום), חודש (כחול), שאל רב (צהוב)
  - תמיכה בגימטריה לעברית וספרות לאנגלית
  - לוגית נגישות: aria-labels, keyboard navigation
- **`SeparationDaysList.tsx`** — רשימת ימי פרישה עם סיבות מלאות
  - מציג תאריך, עונה, סעיף הלכה
  - באנר "שאל רב" כשרלוונטי
  - דגל "יש ווסת קבוע" או "אין ווסת קבוע — 3 חששות"
- **`HebrewDatePicker.tsx`** — בחירת תאריך עברי דרך מסלול גריגוריאני
  - משתמש ב-`<input type="date">` בורר מקורי של הדפדפן
  - תצוגה מקבילה של התאריך העברי מתחתיו

#### פאזה 4.3 — מסכים (Views)
- **`CalendarView.tsx`** — מסך ראשי: ניווט חודשים (הקודם/הבא/היום) + לוח + רשימת ימי פרישה
  - משתמש ב-`calculateSeparationDays()` דרך `useMemo`
- **`SightingWizard.tsx`** — אשף 8 שלבים:
  1. תאריך + עונה
  2. סוג ראיה (רגילה/כתם/בדיקה)
  3. מאמץ גופני (עם תיאור ועוצמה)
  4. תופעות גוף (מרובות)
  5. סטטוס תרופות + הריון
  6. קישור לראיה נמשכת
  7. הערות חופשיות
  8. סיכום ושמירה
  - ניווט הבא/חזור + אינדיקטור מספר שלבים
- **`HistoryView.tsx`** — רשימת ראיות לפי סדר כרונולוגי
  - כל ראיה כולל כל הפרטים (עונה, סוג, תרופות, מיחושים, הערות)
  - כפתור מחיקה עם confirm
- **`TimelineView.tsx`** — ציר זמן מקובץ לפי חודש
  - סיכום ווסתות קבועים וישנים למעלה
  - רשימת ראיות לפי חודש עם מסלול חזותי
- **`SettingsView.tsx`** — הגדרות:
  - החלפת שפה (עברית/English) — מתעדכן בזמן אמת
  - תזכורת גיבוי חודשית
  - ייצוא/ייבוא JSON
  - banner הבהרה

#### פאזה 4.4 — Shell ראשי
- **`App.tsx`** — מסך ראשי עם:
  - header עם כותרת ותת-כותרת
  - ניווט תחתון קבוע (5 טאבים: לוח, הוסף, היסטוריה, ציר זמן, הגדרות)
  - תצוגת loading בזמן טעינת מסד הנתונים
  - עטיפה ב-`AppProvider`

### ניקוי קוד
- הוסרו כל `import React from 'react'` (jsx-transform החדש)
- תוקנו unused imports, `React.ChangeEvent` → `ChangeEvent`, `React.ReactNode` → `ReactNode`

### תוצאות

#### TypeScript
✓ `tsc --noEmit` — נקי לחלוטין

#### Tests
✓ **129 טסטים עוברים** (ללא שינוי)

#### Build
✓ `npm run build` — הצליח:
- 332KB JS (110KB gzipped)
- 14KB CSS (3.3KB gzipped)
- PWA: service worker נוצר, precache 342KB
- 5 entries precached

### קבצים שנוצרו (13)
- `src/i18n/index.ts`
- `src/i18n/locales/he.ts`
- `src/i18n/locales/en.ts`
- `src/data/storage.ts`
- `src/ui/AppContext.tsx`
- `src/ui/components/CalendarGrid.tsx`
- `src/ui/components/SeparationDaysList.tsx`
- `src/ui/components/HebrewDatePicker.tsx`
- `src/ui/views/CalendarView.tsx`
- `src/ui/views/SightingWizard.tsx`
- `src/ui/views/HistoryView.tsx`
- `src/ui/views/TimelineView.tsx`
- `src/ui/views/SettingsView.tsx`

### המשימה הבאה
~~**פאזה 5**: PWA polish~~ — הושלם, ראה למטה.

---

## 2026-04-16 — פאזה 5 (PWA Polish)

### מה נעשה

#### 5.1 — אייקונים
- **`scripts/icon-source.svg`** — אייקון מקור 512×512:
  - רקע כחול (#1e3a5f), לוח לבן עם header כחול, טבעות כריכה
  - 24 נקודות ימים, עם נקודה אדומה (יום פרישה) וירוקה (ראיה)
- **`scripts/generate-icons.mjs`** — סקריפט Node עם `@resvg/resvg-js`:
  - מייצר: icon-192, icon-512, icon-maskable-192, icon-maskable-512, apple-touch-icon (180), favicon.svg
  - Maskable variant עם 10% padding (safe zone)
- **תוצאות**: 5 PNG + 1 SVG ב-`public/icons/` ו-`public/favicon.svg`

#### 5.2 — PWA manifest
- עודכן `vite.config.ts`:
  - הוספת 2 maskable icons (`purpose: 'maskable'`)
  - שינוי favicon ל-SVG
- עודכן `index.html`:
  - `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
  - `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
  - `<meta name="description">`

#### 5.3 — תזכורת גיבוי
- **`storage.ts`** — הוספת:
  - `getLastBackupDate()` / `setLastBackupDate()` (מתעדכן ב-export)
  - `getBackupDismissedUntil()` / `setBackupDismissedUntil()`
- **`BackupReminder.tsx`** — banner חכם:
  - מופיע אם לא גובה 30 יום + יש ראיות שמורות
  - 3 פעולות: ייצא עכשיו, דחה שבוע, סגור
  - לא מופיע אם `backupReminder` כבוי בהגדרות
  - משולב ב-`App.tsx` מעל התוכן הראשי

#### 5.4 — מקרא צבעים
- **`CalendarLegend.tsx`** — מקרא 6 צבעים:
  - ירוק (ראיה), אדום (עו"ב), כתום (הפלגה), כחול (חודש), צהוב (ווסת קבוע), טבעת כחולה (היום)
- משולב ב-`CalendarView.tsx` מתחת ללוח

#### 5.5 — נגישות
- **`CalendarGrid.tsx`**:
  - `role="grid"`, `role="row"`, `role="columnheader"`, `role="gridcell"`
  - `aria-current="date"` ליום הנוכחי
  - `aria-selected` ליום הנבחר
  - `aria-label` משופר עם פרטי ראיה ויום פרישה
  - `aria-hidden="true"` על נקודות דקורטיביות
- **`BackupReminder.tsx`**: `role="alert"`, `aria-hidden` על אימוג'י
- **`CalendarLegend.tsx`**: `aria-hidden` על עיגולי צבע

#### 5.6 — תרגומים
- הוספת מפתחות `backup.*` (5) ו-`legend.*` (6) בעברית ובאנגלית

### תוצאות

#### TypeScript
✓ `tsc --noEmit` — נקי לחלוטין

#### Tests
✓ **129 טסטים עוברים**

#### Build
✓ `npm run build` — הצליח:
- 336KB JS (111KB gzipped)
- 15KB CSS (3.5KB gzipped)
- PWA: service worker נוצר, precache 11 entries (348KB)

### קבצים שנוצרו/עודכנו
- `scripts/icon-source.svg` (נוצר קודם)
- `scripts/generate-icons.mjs`
- `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-touch-icon.png`
- `public/favicon.svg`
- `src/ui/components/BackupReminder.tsx`
- `src/ui/components/CalendarLegend.tsx`
- עודכנו: `vite.config.ts`, `index.html`, `storage.ts`, `App.tsx`, `CalendarView.tsx`, `CalendarGrid.tsx`, `he.ts`, `en.ts`

### סטטוס כללי של הפרויקט
- **פאזה 1** ✓ — 7 מסמכי תיעוד
- **פאזה 2** ✓ — מנוע ליבה (6 מודולים + אורקסטרטור)
- **פאזה 3** ✓ — ווסתות מתקדמים (7 מודולים)
- **פאזה 4** ✓ — ממשק משתמש מלא (13 קבצים)
- **פאזה 5** ✓ — PWA polish (אייקונים, manifest, גיבוי, נגישות, לגנדה)

### מה נשאר (אופציונלי / עתידי)
- מבחן ידני מלא דרך `npm run dev`
- בדיקה בדפדפנים שונים
- ביקורת הלכתית ע"י סמכות רבנית
- תיעוד משתמש מובנה באפליקציה

---

## 2026-04-18 — פאזה 6 (זמנים ומיקום)

### ההקשר
התגלתה בעיה הלכתית קריטית: התאריך העברי ועונות היום תלויים בזמני השמש (שקיעה/הנץ), לא בחצות האזרחי. ראיה בשעה 19:00 בירושלים בקיץ = יום; באותה שעה בחורף = כבר לילה (ותאריך עברי הבא).

### החלטות הלכתיות (מהמשתמש)
1. **גבול**: שקיעה הנראית = סוף עונת יום
2. **בין השמשות**: נחשב כלילה (כשאין חמה נראית)
3. **אין אזור אפור** — חיתוך נקי, בלי התרעות

### מה נעשה

#### 6.1 — מסד ערים (`src/data/locations.ts`)
- `Location` interface: id, name_he, name_en, lat, lng, timezone, country
- **38 ערים מובנות**: ישראל (16), ארה״ב/קנדה (9), בריטניה (3), אירופה (6), אחר (5)
- `DEFAULT_LOCATION` = ירושלים
- `findLocation()`, `groupedLocations()`

#### 6.2 — מודול zmanim (`src/calendar/zmanim.ts`)
- מבוסס על `@hebcal/core` Zmanim + GeoLocation
- `getSunrise()`, `getSunset()`, `getTzeit()` — לתאריך ומיקום
- `determineOnah(clockTime, location)` — הפונקציה המרכזית:
  - לפני שקיעה → day onah + תאריך אזרחי
  - אחרי שקיעה → night onah + תאריך עברי הבא (+1)
  - לפני הזריחה (אחר חצות) → night onah + תאריך אזרחי (כבר התחלף בערב הקודם)
- `halachicToday(location)` — תאריך עברי הלכתי נוכחי
- `formatLocalTime()`, `parseClockTime()` — עבודה עם timezone של המיקום

#### 6.3 — עדכון types + storage
- `AppSettings.location: Location` — נוסף עם ברירת מחדל ירושלים
- לא נדרשה מיגרציית DB (שדה חדש אופציונלי)

#### 6.4 — LocationPicker (`src/ui/components/LocationPicker.tsx`)
- dropdown מקובץ לפי מדינה (עם `<optgroup>`)
- 📍 כפתור "זהה אוטומטית" → `navigator.geolocation`
- אופציית "מיקום מותאם" עם lat/lng/timezone

#### 6.5 — עדכון SettingsView
- מקטע חדש "מיקום מגורים" עם `LocationPicker`
- נשמר באמצעות `updateSettings()`

#### 6.6 — עדכון SightingWizard (שלב 1)
- **לפני**: בחירת תאריך עברי ידנית + רדיו יום/לילה
- **אחרי**:
  - `<input type="date">` (תאריך לועזי)
  - `<input type="time">` (שעת ראיה ב-timezone של המיקום)
  - **תצוגה חיה** של החישוב: תאריך עברי + עונה + זמני הנץ/שקיעה
  - checkbox "בחירה ידנית של עונה" לעקיפה כשהמשתמש יודע בוודאות

#### 6.7 — עדכון CalendarView + CalendarGrid
- `today()` הוחלף ב-`halachicToday(settings.location)` — "היום" בלוח הוא התאריך ההלכתי
- `today()` המקורי נשאר ב-`hebrewDate.ts` לבדיקות ו-backwards compat, עם אזהרה ב-JSDoc

#### 6.8 — תרגומים
- 6 מפתחות חדשים ב-`settings.*` (location, locationHelp, locationCustom, locationLat, locationLng, locationTimezone, locationDetect)
- מפתח חדש `location.groups.*` (6 קבוצות)
- מפתח חדש `zmanim.*` (sunrise, sunset, tzeit, computedAs, hebrewDateFor)
- `wizard.step1` עודכן ל"תאריך ושעה"; 3 מפתחות חדשים: `clockTime`, `manualOnah`, `autoComputed`

#### 6.9 — טסטים
- `test/calendar/zmanim.test.ts` — **10 טסטים**:
  - ירושלים קיץ (בוקר/צהריים/אחרי שקיעה/אחר חצות)
  - ניו יורק חורף (זמני שקיעה שונים משמעותית)
  - מעבר תאריך עברי בשקיעה
  - parseClockTime ב-timezone נכון

### ADR חדש
- **ADR-009**: תאריך עברי משתנה בשקיעה — חישוב לפי מיקום

### תוצאות

#### TypeScript
✓ `tsc --noEmit` — נקי

#### Tests
✓ **139 טסטים עוברים** (129 קיימים + 10 חדשים)

#### Build
✓ `npm run build` — הצליח:
- 361KB JS (118KB gzipped) — תוספת ~25KB בגלל Zmanim
- 15.8KB CSS (3.5KB gzipped)
- PWA: 11 entries precached (373KB)

### קבצים חדשים (3)
- `src/data/locations.ts`
- `src/calendar/zmanim.ts`
- `src/ui/components/LocationPicker.tsx`
- `test/calendar/zmanim.test.ts`

### קבצים שעודכנו (7)
- `src/data/types.ts` — AppSettings.location
- `src/calendar/hebrewDate.ts` — הערה ב-today()
- `src/ui/views/SettingsView.tsx` — מקטע מיקום
- `src/ui/views/SightingWizard.tsx` — שלב 1 חדש
- `src/ui/views/CalendarView.tsx` — halachicToday
- `src/ui/components/CalendarGrid.tsx` — halachicToday
- `src/i18n/locales/he.ts`, `en.ts` — תרגומים חדשים
- `docs/05-decisions.md` — ADR-009

### סטטוס כללי מעודכן
- **פאזה 1-5** ✓
- **פאזה 6** ✓ — זמני יום ומיקום (דיוק הלכתי של תאריך+עונה)
