<div dir="rtl">

# מחשבון ווסתות

מערכת לחישוב ימי פרישה על פי הלכות ווסתות, הזמינה כאפליקציית Windows וכהרחבת Chrome. הממשק והמנוע משותפים לשני המוצרים, הנתונים נשמרים מקומית, ובהרחבת Chrome ניתן להפעיל גיבוי פרטי וחינמי ב-Google Drive ותזכורות מערכת לפני ימי פרישה.

> הערה חשובה: האפליקציה אינה מחליפה פסיקה הלכתית. במקרים מורכבים או מסופקים יש לשאול רב. החישובים בפרויקט מבוססים על קובץ המקור `הלכות-ווסתות.txt` ועל ההחלטות ההלכתיות שתועדו בתיקיית `docs`.

## מצב הפרויקט

הפרויקט כולל כיום:

- מנוע חישוב הלכתי ב-TypeScript.
- לוח עברי-לועזי עם חישוב חודשים, שנים מעוברות וספירה כוללנית.
- חישוב עונה לפי הנץ ושקיעה בהתאם למיקום המשתמש.
- ממשק React מלא בעברית ובאנגלית.
- אשף הזנת ראיה.
- תצוגת לוח, היסטוריה, ציר זמן, הגדרות ועיון בסעיפי ההלכות.
- שמירה מקומית ב-IndexedDB.
- ייצוא וייבוא נתונים בקובץ JSON.
- אריזת Desktop באמצעות Tauri, כולל קונפיגורציית Windows installer.
- הרחבת Chrome מבוססת Manifest V3 עם popup ממוקד ו-Options Page מלא.
- התחברות יזומה לחשבון Google וגיבוי לתיקיית `appDataFolder` הפרטית.
- גיבוי אוטומטי לאחר שינוי, גיבוי ידני ושחזור מהענן.
- תזכורות Chrome לפי מספר ימים מראש ושעה שהמשתמש מגדיר.
- תמיכת PWA נשמרת כשכבת frontend/offline, אך היעד הסופי הוא אפליקציה שולחנית.
- בדיקות Vitest למנוע ולמודולי הלוח.

נכון לסריקה האחרונה, `npm run test:run` עובר עם 147 בדיקות.

## טכנולוגיות

- React 18
- TypeScript 5 במצב strict
- Vite 5
- Tailwind CSS
- Vitest
- `@hebcal/core` לחישובי לוח עברי וזמנים
- `idb` עבור IndexedDB
- `i18next` ו-`react-i18next` לתרגום עברית/אנגלית
- `vite-plugin-pwa` עבור PWA
- Tauri 2 עבור אפליקציית Windows שולחנית

## מבנה תיקיות

```text
.
├── docs/                  תיעוד, אפיון, החלטות ויומן פעילות
├── extension/             הרחבת Chrome: popup, options, service worker ו-OAuth
├── public/                קבצי PWA, favicon ואייקונים
├── scripts/               סקריפטים ליצירת אייקונים ועיבוד מקור הלכתי
├── src-tauri/             מעטפת Tauri, קונפיגורציית Desktop ואייקוני installer
├── src/
│   ├── calendar/          לוח עברי, המרות וזמני הנץ/שקיעה
│   ├── data/              טיפוסים, מיקומים, אחסון IndexedDB וסעיפי הלכה
│   ├── engine/            מנוע החישוב ההלכתי
│   ├── i18n/              תרגומים עברית/אנגלית
│   └── ui/                ממשק React, רכיבים ומסכים
├── test/                  בדיקות Vitest
├── הלכות-ווסתות.txt       מקור ההלכות שעליו מבוסס הפרויקט
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## מודולים עיקריים

### מנוע הלכתי

נמצא תחת `src/engine/`.

המודולים המרכזיים:

- `calculator.ts` - אורקסטרטור ראשי לחישוב ימי פרישה.
- `onahBeinonit.ts` - עונה בינונית, יום 30 ויום 31.
- `vesetChodesh.ts` - וסת החודש.
- `vesetHaflaga.ts` - וסת הפלגה, כולל הכלל "הפלגה קצרה לא עוקרת ארוכה".
- `uprootingRules.ts` - כללי עקירה.
- `stateManager.ts` - בניית מצב הלכתי מתוך היסטוריית ראיות ורשומות וסת.
- `vesetShavua.ts`, `vesetDilug.ts`, `vesetSirug.ts`, `vesetGuf.ts`, `vesetKfitzot.ts`, `yamimNevukhim.ts` - וסתות מתקדמים.
- `medicationRules.ts` - כללי תרופות.
- `sightingClassifier.ts` - סיווג ראיות רגילות, כתמים ובדיקות.

### לוח וזמנים

נמצא תחת `src/calendar/`.

- `hebrewDate.ts` - טיפוסי תאריך עברי, ספירה כוללנית, מעבר חודשים ושנים.
- `gregorianBridge.ts` - המרה בין תאריך עברי לתאריך לועזי ופורמטים לתצוגה.
- `zmanim.ts` - חישוב עונה ותאריך עברי לפי זמן ראיה, מיקום, הנץ ושקיעה.

### ממשק משתמש

נמצא תחת `src/ui/`.

כולל:

- לוח חודשי.
- אשף הזנת ראיה.
- היסטוריית ראיות.
- ציר זמן.
- הגדרות, שפה, מיקום וייבוא/ייצוא.
- תצוגת סעיפי הלכות מתוך מקור ההלכה.

### אחסון וגיבוי

נמצא תחת `src/data/storage.ts`.

הנתונים נשמרים ב-IndexedDB בדפדפן:

- `sightings` - ראיות.
- `vesetRecords` - רשומות וסת.
- `settings` - הגדרות.

יש תמיכה בייצוא וייבוא JSON לצורך גיבוי ומעבר בין מכשירים.

באפליקציית Chrome הנתונים המקומיים נשמרים ב-IndexedDB של ההרחבה. כאשר המשתמש מתחבר ל-Google ומפעיל גיבוי, נוצר קובץ יחיד בשם `wesst-calculator-backup.json` בתיקיית האפליקציה הנסתרת של Google Drive. הקובץ אינו מופיע ב-My Drive ואינו משותף עם משתמשים אחרים.

> הנתונים של אפליקציית Windows, אתר הפיתוח והרחבת Chrome נמצאים במאגרי אחסון מקומיים נפרדים. מעבר ביניהם נעשה באמצעות ייצוא/ייבוא JSON; סנכרון ישיר בין אפליקציית Windows להרחבה אינו ממומש עדיין.

## התקנה והרצה

דרישות לפיתוח frontend:

- Node.js
- npm

דרישות לבניית אפליקציית Windows שולחנית:

- Rust/Cargo
- Microsoft C++ Build Tools / Windows SDK
- WebView2 Runtime, בדרך כלל מותקן כבר ב-Windows 10/11

התקנת תלויות:

```powershell
npm install
```

הרצת סביבת פיתוח:

```powershell
npm run dev
```

בניית גרסת production:

```powershell
npm run build
```

תצוגה מקדימה לאחר build:

```powershell
npm run preview
```

הרצת אפליקציית Desktop במצב פיתוח:

```powershell
npm run desktop:dev
```

בניית installer / אפליקציית Desktop:

```powershell
npm run desktop:build
```

אם אין Rust/Cargo או C++ Build Tools מותקנים במחשב, ניתן להשתמש ב-GitHub Actions: ה-workflow `Desktop Build` בונה את אפליקציית Windows ומעלה artifact להורדה.

הרצת בדיקות:

```powershell
npm run test:run
```

בדיקת TypeScript:

```powershell
npx tsc --noEmit
```

## הרחבת Chrome

בניית תיקיית הרחבה לטעינה מקומית:

```powershell
npm run extension:build
```

התוצאה נוצרת בתיקייה `dist-extension`. כדי לטעון אותה:

1. פתחו `chrome://extensions`.
2. הפעילו "מצב פיתוח".
3. בחרו "טעינת פריט שלא נארז".
4. בחרו את תיקיית `dist-extension`.

יצירת קובץ ZIP להפצה או להעלאה ל-Chrome Web Store:

```powershell
npm run extension:package
```

הקובץ נוצר תחת `release-artifacts/wesst-calculator-chrome-extension.zip`.

### הגדרת Google OAuth

הקוד אינו מכיל מזהה OAuth פרטי. לפני שההתחברות והגיבוי יעבדו:

1. צרו פרויקט ב-Google Cloud Console והפעילו בו את Google Drive API.
2. הגדירו OAuth consent screen.
3. טענו את ההרחבה ב-Chrome והעתיקו את מזהה ההרחבה מהעמוד `chrome://extensions`.
4. צרו OAuth Client מסוג Chrome Extension והזינו את מזהה ההרחבה.
5. החליפו את הערך `YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com` בקובץ `extension/public/manifest.json`.
6. בנו מחדש באמצעות `npm run extension:build` וטענו מחדש את ההרחבה.

ההרשאה היחידה מול Drive היא `drive.appdata`, הרשאה לא רגישה שמוגבלת לתיקיית האפליקציה הפרטית. ההתחברות מוצגת רק לאחר לחיצה מפורשת של המשתמש בחלון התוסף.

## פקודות npm זמינות

```json
{
  "dev": "vite",
  "build": "tsc -b && vite build",
  "preview": "vite preview",
  "desktop:dev": "tauri dev",
  "desktop:build": "tauri build",
  "extension:dev": "vite --config extension/vite.config.ts",
  "extension:check": "TypeScript check for the extension",
  "extension:build": "vite build --config extension/vite.config.ts",
  "extension:package": "build + zip",
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

## מה כבר עובד

- חישובי לוח עברי והמרות תאריכים.
- ספירה כוללנית של הפלגות.
- עונה בינונית.
- וסת החודש.
- וסת הפלגה.
- כללי עקירה בסיסיים ומתקדמים.
- מודולים לווסתות מתקדמים עם בדיקות ייעודיות וחיבור בסיסי לאורקסטרטור עבור וסתות קבועים.
- חישוב תאריך ועונה לפי שקיעה/הנץ ומיקום.
- ממשק משתמש מלא להזנת נתונים וצפייה בתוצאות.
- שמירה מקומית וגיבוי.
- מעטפת Desktop עם Tauri, אייקונים ופקודות build.
- הרחבת Chrome עם Options Page מלא, גיבוי Google Drive ותזכורות.
- PWA עם אייקונים ו-Service Worker כשכבת frontend.

## נקודות המשך ידועות

- להשלים תרחישי UI עבור וסתות שמופעלים על ידי טריגר בזמן אמת, כמו וסת הגוף ווסת הקפיצות.
- להרחיב את ניהול העקירה והחזרה של `VesetRecord` לאורך זמן.
- להשלים מעקב אפליקטיבי אחרי תרופה שהוכחה בשלוש פעמים, במקום `medicationProven = false` שמופיע כרגע ב-`stateManager.ts`.
- להשלים build חתום/לא חתום של Windows installer ולהריץ QA על האפליקציה השולחנית.
- להגדיר OAuth Client קבוע ולפרסם את ההרחבה ב-Chrome Web Store.
- להחליט אם נדרש סנכרון ישיר גם עבור אפליקציית Windows; כרגע הגיבוי הענני קיים בהרחבה בלבד.
- לבצע ביקורת הלכתית מסודרת על ידי סמכות רבנית לפני שימוש מעשי.

## תיעוד

התיעוד נמצא בתיקיית `docs`:

- `01-overview.md` - סקירה כללית ומטרות.
- `02-architecture.md` - ארכיטקטורה וטכנולוגיות.
- `03-specification.md` - אפיון הלכתי ופונקציונלי.
- `04-roadmap.md` - תוכנית עבודה לפי פאזות.
- `05-decisions.md` - החלטות ארכיטקטוניות.
- `06-conventions.md` - קונבנציות קוד.
- `07-activity-log.md` - יומן פעילות מפורט.

## פרטיות

אין שרת בבעלות הפרויקט. בגרסת Desktop הנתונים נשמרים מקומית בתוך סביבת ה-WebView. בהרחבת Chrome הנתונים נשמרים מקומית, ואם המשתמש בוחר להתחבר, עותק גיבוי נשלח ישירות מההרחבה לתיקיית האפליקציה הפרטית בחשבון Google Drive שלו. פרטים נוספים נמצאים ב-[מדיניות הפרטיות](PRIVACY.md).

</div>
