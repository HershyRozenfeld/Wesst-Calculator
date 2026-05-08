/**
 * HalachaModal — Popup displaying a single halacha section.
 *
 * Triggered by clicking a section reference (e.g. "סעיף לח'") in results.
 * Shows the Hebrew letter, chapter name, and full content text.
 * Includes "previous/next section" navigation for easy browsing.
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HALACHA_BY_NUMBER, HALACHA_SECTIONS } from '../../data/halachaSections';

interface Props {
  sectionNumber: number | null;
  onClose: () => void;
}

export function HalachaModal({ sectionNumber, onClose }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<number | null>(sectionNumber);

  // Sync when the triggering section changes
  useEffect(() => {
    setCurrent(sectionNumber);
  }, [sectionNumber]);

  // Close on Escape
  useEffect(() => {
    if (current === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goPrev();
      if (e.key === 'ArrowLeft') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (current === null) return null;

  const section = HALACHA_BY_NUMBER[current];
  if (!section) return null;

  const idx = HALACHA_SECTIONS.findIndex(s => s.number === current);
  const prevSection = idx > 0 ? HALACHA_SECTIONS[idx - 1] : null;
  const nextSection = idx >= 0 && idx < HALACHA_SECTIONS.length - 1 ? HALACHA_SECTIONS[idx + 1] : null;

  const goPrev = () => {
    if (prevSection) setCurrent(prevSection.number);
  };
  const goNext = () => {
    if (nextSection) setCurrent(nextSection.number);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="halacha-modal-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200">
          <div>
            <div className="text-xs text-gray-500">{section.chapter}</div>
            <h2 id="halacha-modal-title" className="text-xl font-bold">
              {t('halacha.section')} {section.letter}'
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1">
          <div className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
            {section.content}
          </div>
        </div>

        {/* Footer with navigation */}
        <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            type="button"
            onClick={goPrev}
            disabled={!prevSection}
            className="px-3 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {prevSection ? `‹ ${t('halacha.section')} ${prevSection.letter}'` : '—'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-blue-600 hover:underline"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!nextSection}
            className="px-3 py-1 rounded text-sm hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {nextSection ? `${t('halacha.section')} ${nextSection.letter}' ›` : '—'}
          </button>
        </div>
      </div>
    </div>
  );
}
