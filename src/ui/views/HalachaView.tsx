/**
 * HalachaView — Browse all halacha sections, organized by chapter.
 *
 * Features:
 *   - Collapsible chapters (table of contents at top, sections grouped)
 *   - Full-text search across all sections
 *   - Direct section number input ("go to section X")
 *   - Clickable section numbers throughout
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { gematriya } from '@hebcal/core';
import {
  HALACHA_SECTIONS,
  getChapters,
  type HalachaSection,
} from '../../data/halachaSections';
import { HalachaModal } from '../components/HalachaModal';

export function HalachaView() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [openSection, setOpenSection] = useState<number | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  const chapters = useMemo(() => getChapters(), []);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return HALACHA_SECTIONS.filter(
      s =>
        s.content.includes(q) ||
        s.chapter.includes(q) ||
        s.letter.includes(q) ||
        String(s.number).includes(q),
    );
  }, [query]);

  const toggleChapter = (chapter: string) => {
    setExpandedChapters(prev => {
      const next = new Set(prev);
      if (next.has(chapter)) next.delete(chapter);
      else next.add(chapter);
      return next;
    });
  };

  const expandAll = () => setExpandedChapters(new Set(chapters));
  const collapseAll = () => setExpandedChapters(new Set());

  return (
    <div className="space-y-4">
      {/* Intro */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-1">{t('halacha.title')}</h2>
        <p className="text-sm text-gray-600">{t('halacha.intro')}</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-3">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('halacha.searchPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-right"
        />
        {query && filteredSections && (
          <div className="text-xs text-gray-500 mt-2">
            {t('halacha.foundCount', { count: filteredSections.length })}
          </div>
        )}
      </div>

      {/* Search results */}
      {filteredSections && (
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
          {filteredSections.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('halacha.noResults')}</p>
          ) : (
            filteredSections.map(section => (
              <SectionRow key={section.number} section={section} query={query} onOpen={setOpenSection} />
            ))
          )}
        </div>
      )}

      {/* Chapters (only if no search) */}
      {!filteredSections && (
        <>
          <div className="bg-white rounded-lg shadow-sm p-3 flex gap-2 text-xs">
            <button
              type="button"
              onClick={expandAll}
              className="text-blue-600 hover:underline"
            >
              {t('halacha.expandAll')}
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-blue-600 hover:underline"
            >
              {t('halacha.collapseAll')}
            </button>
          </div>

          <div className="space-y-2">
            {chapters.map(chapter => {
              const sections = HALACHA_SECTIONS.filter(s => s.chapter === chapter);
              const isExpanded = expandedChapters.has(chapter);
              const firstLetter = sections[0]?.letter ?? '';
              const lastLetter = sections[sections.length - 1]?.letter ?? '';
              return (
                <div key={chapter} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleChapter(chapter)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 text-right"
                    aria-expanded={isExpanded}
                  >
                    <div>
                      <div className="font-semibold">{chapter}</div>
                      <div className="text-xs text-gray-500">
                        {t('halacha.section')} {firstLetter}'
                        {firstLetter !== lastLetter && ` – ${lastLetter}'`}
                        {' · '}
                        {sections.length} {t('halacha.sectionCount')}
                      </div>
                    </div>
                    <span className="text-gray-400 text-xl">{isExpanded ? '▾' : '◂'}</span>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                      {sections.map(section => (
                        <SectionRow
                          key={section.number}
                          section={section}
                          onOpen={setOpenSection}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <HalachaModal sectionNumber={openSection} onClose={() => setOpenSection(null)} />
    </div>
  );
}

function SectionRow({
  section,
  query,
  onOpen,
}: {
  section: HalachaSection;
  query?: string;
  onOpen: (n: number) => void;
}) {
  const { t } = useTranslation();
  const preview = section.content.length > 220
    ? section.content.substring(0, 220).replace(/\n/g, ' ') + '…'
    : section.content.replace(/\n/g, ' ');

  return (
    <div className="border-s-4 border-primary/40 ps-3 py-1">
      <button
        type="button"
        onClick={() => onOpen(section.number)}
        className="text-start w-full group"
      >
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-semibold text-primary group-hover:underline">
            {t('halacha.section')} {section.letter}'
          </span>
          {query && (
            <span className="text-xs text-gray-500">— {section.chapter}</span>
          )}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{preview}</p>
      </button>
    </div>
  );
}

// Keep gematriya import usable even if unused in this file
void gematriya;
