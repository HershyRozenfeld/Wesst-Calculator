/**
 * parse-halacha.mjs — Parse הלכות-ווסתות.txt into structured TS data.
 *
 * Reads the halacha source file and emits src/data/halachaSections.ts
 * containing all 122 sections with their Hebrew letter, chapter heading,
 * and full text content.
 *
 * Run: node scripts/parse-halacha.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC_FILE = resolve(ROOT, 'הלכות-ווסתות.txt');
const OUT_FILE = resolve(ROOT, 'src/data/halachaSections.ts');

// Hebrew letter → numeric value (gematriya)
const GEMATRIYA_VALUES = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ל: 30, מ: 40, נ: 50, ס: 60, ע: 70, פ: 80, צ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
  ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90, // final forms
};

function gematriyaToNumber(letters) {
  let sum = 0;
  for (const ch of letters) {
    const v = GEMATRIYA_VALUES[ch];
    if (v === undefined) return null;
    sum += v;
  }
  return sum;
}

// Line pattern: Hebrew letters (1-3) + period + space
// e.g. "א. ", "כא. ", "קיד. "
const SECTION_RE = /^([א-ת]{1,4})\.\s+(.*)$/;

function parseFile(text) {
  const lines = text.split(/\r?\n/);
  const sections = [];
  let currentChapter = '';
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line → flush current section paragraph separator (keep as empty)
    if (trimmed === '') {
      if (currentSection) {
        currentSection.content += '\n';
      }
      continue;
    }

    const match = trimmed.match(SECTION_RE);
    if (match) {
      const letters = match[1];
      const num = gematriyaToNumber(letters);
      if (num !== null && num >= 1 && num <= 200) {
        // Push previous section
        if (currentSection) {
          currentSection.content = currentSection.content.trim();
          sections.push(currentSection);
        }
        currentSection = {
          number: num,
          letter: letters,
          chapter: currentChapter,
          content: match[2],
        };
        continue;
      }
    }

    // Not a section header. Check if it's a chapter heading.
    // Heuristic: a chapter heading is a short line (< ~60 chars) that's
    // immediately before a section start, AND the previous non-empty line
    // was either end-of-section or another chapter heading.
    // Simpler: if no current section yet, or the line right before was blank
    // AND this line is "pure title" (no period, <50 chars), treat as chapter.
    const isShort = trimmed.length < 55;
    const hasNoPeriod = !trimmed.includes('.') && !trimmed.includes(':');
    const prevLine = i > 0 ? lines[i - 1].trim() : '';
    const nextLine = i < lines.length - 1 ? lines[i + 1].trim() : '';
    const nextIsSection = SECTION_RE.test(nextLine);

    if (isShort && hasNoPeriod && prevLine === '' && nextIsSection) {
      currentChapter = trimmed;
      // Don't append to section
      continue;
    }

    // Otherwise, continuation of current section
    if (currentSection) {
      currentSection.content += '\n' + trimmed;
    }
  }

  // Flush last
  if (currentSection) {
    currentSection.content = currentSection.content.trim();
    sections.push(currentSection);
  }

  return sections;
}

function generateTS(sections) {
  const header = `/**
 * halachaSections.ts — Auto-generated from הלכות-ווסתות.txt
 *
 * DO NOT EDIT BY HAND. Regenerate with: node scripts/parse-halacha.mjs
 *
 * Each section has:
 *   - number: numeric value (1-${sections.at(-1)?.number ?? 0})
 *   - letter: Hebrew gematriya letter (e.g., "לח")
 *   - chapter: chapter heading the section belongs to
 *   - content: the full halachic text
 */

export interface HalachaSection {
  number: number;
  letter: string;
  chapter: string;
  content: string;
}

export const HALACHA_SECTIONS: HalachaSection[] = ${JSON.stringify(sections, null, 2)};

export const HALACHA_BY_NUMBER: Record<number, HalachaSection> = Object.fromEntries(
  HALACHA_SECTIONS.map(s => [s.number, s])
);

/**
 * Get all unique chapter headings in order of first appearance.
 */
export function getChapters(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of HALACHA_SECTIONS) {
    if (!seen.has(s.chapter)) {
      seen.add(s.chapter);
      out.push(s.chapter);
    }
  }
  return out;
}

/**
 * Get all sections belonging to a given chapter.
 */
export function getSectionsByChapter(chapter: string): HalachaSection[] {
  return HALACHA_SECTIONS.filter(s => s.chapter === chapter);
}
`;
  return header;
}

// Main
const text = readFileSync(SRC_FILE, 'utf8');
const sections = parseFile(text);

console.log(`Parsed ${sections.length} sections`);
console.log(`First: §${sections[0]?.number} (${sections[0]?.letter}) — chapter: "${sections[0]?.chapter}"`);
console.log(`Last:  §${sections.at(-1)?.number} (${sections.at(-1)?.letter}) — chapter: "${sections.at(-1)?.chapter}"`);

const ts = generateTS(sections);
writeFileSync(OUT_FILE, ts, 'utf8');
console.log(`Wrote ${OUT_FILE}`);
