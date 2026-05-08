# 02 - Architecture: ארכיטקטורה טכנית

## Technology Stack

| רכיב | טכנולוגיה | גרסה | סיבת הבחירה |
|------|-----------|-------|-------------|
| UI Framework | React | 18+ | ecosystem עשיר, RTL support, component-based |
| Language | TypeScript | 5+ | type safety קריטי למנוע הלכתי |
| Build Tool | Vite | 5+ | מהיר, PWA plugin מובנה |
| Testing | Vitest | 1+ | תואם Vite, מהיר |
| Hebrew Calendar | @hebcal/core | latest | ספריית לוח עברי הכי בוגרת ב-JS |
| CSS | Tailwind CSS | 3+ | RTL plugin, utility-first |
| RTL | tailwindcss-rtl | latest | היפוך אוטומטי של margins/paddings |
| PWA | vite-plugin-pwa (Workbox) | latest | Service Worker generation |
| i18n | react-i18next | latest | תמיכה בריבוי שפות + RTL |
| State Management | React Context + useReducer | built-in | מספיק למורכבות הזו, אין צורך ב-Redux |
| Storage | IndexedDB (via idb) | latest | אחסון מקומי מתמיד, API פשוט |

## מבנה תיקיות

```
Wesst-Calculator/
├── docs/                          # תיעוד הפרויקט (7 קבצים)
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # אייקונים ב-192px ו-512px
│   └── favicon.ico
├── src/
│   ├── calendar/                  # מודול לוח עברי
│   │   ├── hebrewDate.ts          # טיפוס HebrewDate, חישובי ימים
│   │   └── gregorianBridge.ts     # המרות עברי-לועזי, פורמטים
│   │
│   ├── engine/                    # מנוע הלכתי טהור (PURE LOGIC - ללא UI)
│   │   ├── calculator.ts          # אורקסטרטור ראשי
│   │   ├── vesetChodesh.ts        # ווסת החודש (סעיפים י-יט)
│   │   ├── vesetHaflaga.ts        # ווסת הפלגה (סעיפים כ-לא)
│   │   ├── onahBeinonit.ts        # עונה בינונית (סעיפים לז-מה)
│   │   ├── vesetShavua.ts         # ווסת שבוע (סעיפים מו-נב)
│   │   ├── vesetDilug.ts          # ווסת דילוג (סעיפים נג-סג)
│   │   ├── vesetSirug.ts          # ווסת סירוג (סעיפים סד-סו)
│   │   ├── vesetGuf.ts            # ווסת הגוף (סעיפים עה-פז)
│   │   ├── vesetKfitzot.ts        # ווסת קפיצות (סעיפים פח-צג)
│   │   ├── yamimNevukhim.ts       # ימים נבוכים (סעיפים סז-עד)
│   │   ├── uprootingRules.ts      # כללי עקירה חוצי-ווסתות
│   │   ├── vesetReturn.ts         # ווסת שנעקר וחזר (סעיפים צד-צח)
│   │   ├── medicationRules.ts     # תרופות (סעיפים צט-קד)
│   │   ├── sightingClassifier.ts  # סיווג ראיות (סעיפים קה-קיב)
│   │   └── stateManager.ts        # ניהול מצב הלכתי (יש/אין ווסת קבוע)
│   │
│   ├── data/                      # שכבת נתונים
│   │   ├── types.ts               # כל הטיפוסים
│   │   ├── store.ts               # IndexedDB read/write
│   │   └── importExport.ts        # ייצוא/ייבוא JSON
│   │
│   ├── ui/                        # ממשק משתמש React
│   │   ├── App.tsx                # Root component
│   │   ├── components/
│   │   │   ├── Calendar/
│   │   │   │   ├── HebrewCalendar.tsx   # לוח חודשי ראשי
│   │   │   │   └── DayCell.tsx          # תא יום בודד
│   │   │   ├── Timeline/
│   │   │   │   └── TimelineView.tsx     # ציר זמן אופקי
│   │   │   ├── Input/
│   │   │   │   └── SightingWizard.tsx   # אשף הזנת ראיה (7 שלבים)
│   │   │   ├── Results/
│   │   │   │   ├── SeparationDaysList.tsx  # רשימת ימי פרישה
│   │   │   │   └── ReasonExplainer.tsx    # הסבר הלכתי לכל יום
│   │   │   ├── History/
│   │   │   │   └── SightingHistory.tsx    # היסטוריית ראיות
│   │   │   └── Settings/
│   │   │       └── SettingsPanel.tsx      # הגדרות
│   │   ├── hooks/                 # React hooks
│   │   ├── contexts/              # Language, Theme contexts
│   │   └── i18n/
│   │       ├── he.json            # תרגומים עבריים
│   │       └── en.json            # תרגומים אנגליים
│   │
│   ├── sw.ts                      # Service Worker entry
│   ├── main.tsx                   # React entry point
│   └── index.html                 # HTML template
│
├── test/
│   ├── engine/                    # טסטים למנוע הלכתי
│   │   ├── vesetChodesh.test.ts
│   │   ├── vesetHaflaga.test.ts
│   │   ├── onahBeinonit.test.ts
│   │   ├── ...                    # טסט לכל מודול
│   │   └── scenarios.test.ts      # תסריטים אינטגרטיביים
│   ├── calendar/
│   │   └── hebrewDate.test.ts
│   └── fixtures/                  # נתוני בדיקה JSON
│       └── sightingScenarios.json
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── הלכות-ווסתות.txt              # מקור הלכתי (reference only)
```

## ארכיטקטורת מערכת — 4 שכבות

```
┌──────────────────────────────────────────────┐
│                  UI Layer                      │
│  (React Components, Calendar, Timeline,       │
│   Wizard, Results, i18n, RTL)                 │
├──────────────────────────────────────────────┤
│               Data Layer                       │
│  (IndexedDB Store, Import/Export,             │
│   Types, State Management)                    │
├──────────────────────────────────────────────┤
│            Halachic Engine                     │
│  (Pure Logic — 9 Veset Calculators,           │
│   Uprooting Rules, Sighting Classifier,       │
│   State Manager, Main Orchestrator)           │
├──────────────────────────────────────────────┤
│           Hebrew Calendar                      │
│  (@hebcal/core wrapper, HebrewDate type,      │
│   Inclusive day counting, Conversions)         │
└──────────────────────────────────────────────┘
```

## זרימת נתונים

### הזנת ראיה חדשה:
```
User Input (Wizard)
    ↓
SightingWizard.tsx — אוסף: תאריך, עונה, סוג, נסיבות
    ↓
sightingClassifier.ts — מסווג: regular/ketem/bedika
    ↓
store.ts — שומר ב-IndexedDB
    ↓
calculator.ts — מחשב מחדש את כל ימי הפרישה:
    ├── onahBeinonit.ts — יום 30+31
    ├── vesetChodesh.ts — יום בחודש
    ├── vesetHaflaga.ts — הפלגה (+ קצרה לא עוקרת ארוכה)
    ├── stateManager.ts — בודק אם נקבע/נעקר ווסת
    ├── vesetReturn.ts — בודק ווסתות dormant
    └── ... (שאר הווסתות)
    ↓
SeparationDay[] — רשימת ימי פרישה עם סיבות
    ↓
UI — מציג בלוח (צביעה), ברשימה (הסברים), ובציר זמן
```

### ייצוא נתונים:
```
User clicks "Export"
    ↓
importExport.ts — reads all data from IndexedDB
    ↓
Serializes to JSON with schema version
    ↓
Browser download dialog — saves .json file
```

### ייבוא נתונים:
```
User selects .json file
    ↓
importExport.ts — validates schema + version
    ↓
Prompts: merge or replace?
    ↓
Writes to IndexedDB
    ↓
Triggers full recalculation
```

## PWA Architecture

### Service Worker (Workbox):
- **Precaching**: כל ה-assets (HTML, CSS, JS, fonts) נטענים מראש
- **Runtime caching**: לא רלוונטי — אין API calls חיצוניים
- **Offline**: עובד 100% אופליין אחרי טעינה ראשונה

### manifest.json:
```json
{
  "name": "מחשבון ווסתות",
  "short_name": "ווסתות",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#1e3a5f",
  "background_color": "#ffffff",
  "dir": "rtl",
  "lang": "he"
}
```

### התקנה:
- Chrome/Edge: כפתור "Install" בסרגל הכתובות
- Safari (iOS): "Add to Home Screen"
- לאחר ההתקנה: נפתח בחלון נפרד, בלי סרגלי דפדפן

## אחסון נתונים — IndexedDB

### Database Schema:
```
Database: "vestos-calculator"
├── Object Store: "sightings"
│   Key: id (UUID)
│   Indexes: hebrewDate, type
│
├── Object Store: "vesetRecords"
│   Key: id (UUID)
│   Indexes: type, status
│
└── Object Store: "settings"
    Key: key (string)
    Values: language, theme, etc.
```

### גיבוי:
- אזהרה למשתמש: "הנתונים שמורים בדפדפן בלבד. מומלץ לייצא גיבוי מעת לעת"
- כפתור ייצוא בולט בעמוד ההגדרות
- אפשרות לתזכורת תקופתית (כל חודש)

## RTL Support

- `dir="rtl"` על `<html>` כשהשפה עברית
- Tailwind RTL plugin: מחליף `mr-` ↔ `ml-`, `pl-` ↔ `pr-` אוטומטית
- לוח: ימים מסודרים מימין לשמאל (ש, ו, ה, ד, ג, ב, א)
- ציר זמן: מימין (עבר) לשמאל (עתיד)
