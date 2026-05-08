/**
 * Data Types for Vestos Calculator
 *
 * All TypeScript types used across the application.
 * Halachic terms use English transliteration with Hebrew comments.
 */

import type { HebrewDate, Onah } from '../calendar/hebrewDate';
import type { Location } from './locations';

// ===== ראיה (Sighting) =====

/** סוג ראיה — Type of sighting */
export type SightingType =
  | 'regular'  // ראיה רגילה — counts for all veset calculations (section 105)
  | 'ketem'    // כתם — does NOT count for veset (section 106)
  | 'bedika';  // בדיקה — only counts for establishing kavua (section 107)

/** עוצמת מאמץ — Exertion intensity */
export type ExertionIntensity = 'significant' | 'mild';

/** מידע על מאמץ גופני — Exertion info (for Veset HaKfitzot) */
export interface ExertionInfo {
  description: string;
  intensity: ExertionIntensity; // רק משמעותי נחשב — section 90
}

/** תופעת גוף — Body symptom (for Veset HaGuf) */
export interface BodySymptom {
  type: string;                        // e.g. 'headache', 'stomachache'
  timing: 'before' | 'during' | 'after'; // מתי ביחס לראיה
}

/** סטטוס תרופות — Medication status */
export type MedicationStatus = 'none' | 'taking' | 'stopped';

/** סטטוס הריון — Pregnancy status */
export type PregnancyStatus = 'none' | 'pregnant' | 'postpartum';

/**
 * ראיה בודדת — A single recorded sighting
 */
export interface Sighting {
  id: string;                         // UUID
  hebrewDate: HebrewDate;             // תאריך עברי
  onah: Onah;                         // עונת יום / לילה
  type: SightingType;                 // סוג הראיה
  exertion?: ExertionInfo;            // מאמץ גופני (אופציונלי)
  bodySymptoms?: BodySymptom[];       // תופעות גוף (אופציונלי)
  continuedFromId?: string;           // קישור לראיה קודמת אם תוך 7 ימים (section 112)
  medicationStatus: MedicationStatus; // סטטוס תרופות
  pregnancyStatus: PregnancyStatus;   // סטטוס הריון
  notes?: string;                     // הערות חופשיות
  createdAt: string;                  // ISO timestamp of when recorded
}

// ===== ווסת (Veset Record) =====

/** סוג ווסת — Veset type */
export type VesetType =
  | 'chodesh'         // ווסת החודש — Day of Hebrew month (sections 10-19)
  | 'haflaga'         // ווסת הפלגה — Interval between sightings (sections 20-31)
  | 'onah_beinonit'   // עונה בינונית — Average period, day 30+31 (sections 37-45)
  | 'shavua'          // ווסת השבוע — Day of week pattern (sections 46-52)
  | 'dilug'           // ווסת הדילוג — Skipping pattern (sections 53-63)
  | 'sirug'           // ווסת הסירוג — Alternating pattern (sections 64-66)
  | 'guf'             // ווסת הגוף — Body symptoms pattern (sections 75-87)
  | 'kfitzot'         // ווסת הקפיצות — Exertion pattern (sections 88-93)
  | 'yamim_nevukhim'; // ימים נבוכים — Confused days (sections 67-74)

/** סטטוס ווסת — Veset status */
export type VesetStatus =
  | 'non-fixed'  // לא קבוע — worry exists but not established
  | 'fixed'      // קבוע — established veset (3 times)
  | 'uprooted'   // נעקר — fully uprooted
  | 'dormant';   // ישן — was fixed, got uprooted, must be remembered (section 95)

// ===== פרטי ווסת — Veset-specific details (discriminated union) =====

/** ווסת החודש — Day of month details */
export interface VesetChodeshDetails {
  kind: 'chodesh';
  dayOfMonth: number;    // יום בחודש (1-30)
  onah: Onah;            // עונה
  isRoshChodesh: boolean; // האם ר"ח (section 19)
}

/** ווסת הפלגה — Interval details */
export interface VesetHaflagaDetails {
  kind: 'haflaga';
  interval: number;  // מספר ימי הפלגה (ספירה כוללנית)
  onah: Onah;
}

/** עונה בינונית — Always day 30+31, full 24hrs */
export interface VesetOnahBeinonitDetails {
  kind: 'onah_beinonit';
}

/** ווסת השבוע — Day of week details */
export interface VesetShavuaDetails {
  kind: 'shavua';
  dayOfWeek: number;     // 0=Sunday, 6=Saturday
  weekInterval: number;  // סירוג שבועות
  onah: Onah;
}

/** ווסת הדילוג — Skipping pattern details */
export interface VesetDilugDetails {
  kind: 'dilug';
  direction: 'ascending' | 'descending'; // עולה / יורד
  step: number;                          // כמה מדלג כל פעם
  lastDay: number;                       // היום האחרון שראתה
  scope: 'chodesh' | 'haflaga';         // דילוג ביום חודש או בהפלגה
  onah: Onah;
}

/** ווסת הסירוג — Alternating pattern details */
export interface VesetSirugDetails {
  kind: 'sirug';
  dayOfMonth: number;    // יום בחודש
  monthInterval: number; // כל כמה חודשים
  onah: Onah;
}

/** ווסת הגוף — Body symptoms details */
export interface VesetGufDetails {
  kind: 'guf';
  symptomType: string;                             // סוג המיחוש
  timing: 'immediate' | 'end_of_onah' | 'next_day'; // תזמון הראיה ביחס למיחוש
}

/** ווסת הקפיצות — Exertion details */
export interface VesetKfitzotDetails {
  kind: 'kfitzot';
  exertionType: string; // סוג המאמץ
}

/** ימים נבוכים — Confused days details */
export interface VesetYamimNevukhimDetails {
  kind: 'yamim_nevukhim';
  days: number[];                // הימים (2-3 ימים סמוכים)
  scope: 'chodesh' | 'haflaga'; // האם ימי חודש או ימי הפלגה
}

/** All possible veset detail types */
export type VesetDetails =
  | VesetChodeshDetails
  | VesetHaflagaDetails
  | VesetOnahBeinonitDetails
  | VesetShavuaDetails
  | VesetDilugDetails
  | VesetSirugDetails
  | VesetGufDetails
  | VesetKfitzotDetails
  | VesetYamimNevukhimDetails;

/**
 * רשומת ווסת — A tracked veset pattern
 */
export interface VesetRecord {
  id: string;                  // UUID
  type: VesetType;             // סוג הווסת
  status: VesetStatus;         // סטטוס (קבוע/לא קבוע/נעקר/ישן)
  details: VesetDetails;       // פרטים ספציפיים לסוג
  establishedBy: string[];     // IDs of sightings that established it
  uprootCount: number;         // כמה פעמים נבדק ולא נראה (0-3)
  isMaAyanPatuach: boolean;    // האם נקבע ע"י מעין פתוח (section 35)
  replacedBy?: string;         // ID of veset that replaced this one
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}

// ===== ימי פרישה (Separation Days) =====

/**
 * סיבת פרישה — Reason for a separation day
 */
export interface SeparationReason {
  vesetType: VesetType;
  description_he: string;    // הסבר בעברית
  description_en: string;    // הסבר באנגלית
  sectionRef: number;        // הפניה לסעיף בהלכות
  askRav?: boolean;          // "שאל רב" (for complex cases)
}

/**
 * יום פרישה מחושב — A calculated separation day
 */
export interface SeparationDay {
  hebrewDate: HebrewDate;
  onah: Onah | 'full';      // 'full' = 24 hours (used for Onah Beinonit, section 41)
  reasons: SeparationReason[];
}

// ===== הפלגה פעילה (Active Haflaga) =====

/**
 * הפלגה פעילה — Tracks an active (non-uprooted) haflaga worry
 * Used for the "short doesn't uproot long" rule (section 29)
 */
export interface ActiveHaflaga {
  interval: number;          // מספר ימי ההפלגה
  fromSightingId: string;    // מאיזו ראיה נוצרה
  isFixed: boolean;          // האם חלק מווסת קבוע
}

// ===== מצב אפליקציה (App State) =====

/** הגדרות משתמש */
export interface AppSettings {
  language: 'he' | 'en';
  theme: 'light' | 'dark';
  backupReminder: boolean;   // תזכורת גיבוי חודשית
  location: Location;        // מיקום למחשבי שקיעה/הנץ
}

/** Schema של קובץ ייצוא */
export interface ExportSchema {
  version: number;
  exportDate: string;        // ISO timestamp
  sightings: Sighting[];
  vesetRecords: VesetRecord[];
  settings: AppSettings;
}

/** Default settings */
import { DEFAULT_LOCATION } from './locations';
export const DEFAULT_SETTINGS: AppSettings = {
  language: 'he',
  theme: 'light',
  backupReminder: true,
  location: DEFAULT_LOCATION,
};
