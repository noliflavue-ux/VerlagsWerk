import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ListTree,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import type { BookProject, Chapter } from '../types/book';
import { PILLARS } from '../data/seedBooks';
import {
  convertTocProposalsToChapters,
  formatTocAsPlainText,
  generateTocFromCorePromise,
  TOC_STRUCTURE_STYLES,
  type TocChapterProposal,
  type TocProposalResult,
  type TocStructureStyle,
} from '../utils/tocGenerator';

interface ChapterTocGeneratorModalProps {
  book: BookProject;
  onClose: () => void;
  onApplyChapters: (chapters: Chapter[], mode: 'append' | 'replace') => void;
}

const CHAPTER_COUNT_OPTIONS = [5, 6, 8, 10] as const;

export function ChapterTocGeneratorModal({
  book,
  onClose,
  onApplyChapters,
}: ChapterTocGeneratorModalProps) {
  const [chapterCount, setChapterCount] = useState<number>(6);
  const [structureStyle, setStructureStyle] = useState<TocStructureStyle>('praxis-leitfaden');
  const [focusHint, setFocusHint] = useState('');
  const [includeSectionsInContent, setIncludeSectionsInContent] = useState(true);

  const [proposal, setProposal] = useState<TocProposalResult>(() =>
    generateTocFromCorePromise(book, {
      chapterCount: 6,
      structureStyle: 'praxis-leitfaden',
    })
  );

  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [copied, setCopied] = useState(false);

  const regenerateAuto = (nextCount: number, nextStyle: TocStructureStyle) => {
    setChapterCount(nextCount);
    setStructureStyle(nextStyle);
    setAiError('');
    setProposal(
      generateTocFromCorePromise(book, {
        chapterCount: nextCount,
        structureStyle: nextStyle,
      })
    );
  };

  const handleRefineWithAi = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/toc-from-promise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: book.title,
          subtitle: book.subtitle,
          pillar: book.pillar,
          corePromise: book.corePromise,
          targetAudience: book.targetAudience,
          tone: book.tone,
          chapterCount,
          structureStyle,
          focusHint: focusHint.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'KI-Inhaltsverzeichnis konnte nicht generiert werden.');
      }

      const rawChapters = Array.isArray(data.chapters) ? data.chapters : [];
      if (rawChapters.length === 0) {
        throw new Error('Die KI hat keine Kapitel zurückgegeben.');
      }

      const mapped: TocChapterProposal[] = rawChapters.map(
        (
          ch: {
            partLabel?: string;
            title?: string;
            goal?: string;
            promiseLink?: string;
            sections?: string[];
            estimatedWords?: number;
          },
          idx: number
        ) => ({
          id: `toc-ai-${Date.now()}-${idx + 1}`,
          chapterNumber: idx + 1,
          partLabel: ch.partLabel || 'Buchstruktur',
          title: ch.title || `Kapitel ${idx + 1}`,
          goal: ch.goal || 'Kapitelziel ergänzen',
          promiseLink: ch.promiseLink || `Zahlt direkt auf das Core Promise ein.`,
          sections:
            Array.isArray(ch.sections) && ch.sections.length > 0
              ? ch.sections
              : ['Einstieg', 'Kernmethode', 'Praxis-Umsetzung'],
          estimatedWords: Number(ch.estimatedWords) || 1800,
          included: true,
        })
      );

      setProposal({
        structureStyle,
        corePromiseUsed: book.corePromise.trim() || PILLARS[book.pillar].coreDesire,
        extractedConcepts: proposal.extractedConcepts,
        totalEstimatedWords: mapped.reduce((sum, ch) => sum + ch.estimatedWords, 0),
        chapters: mapped,
        source: 'ai',
      });
    } catch (err) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'KI-Verfeinerung fehlgeschlagen. Der automatische Strukturvorschlag bleibt aktiv.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const toggleChapterIncluded = (id: string) => {
    setProposal((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) =>
        ch.id === id ? { ...ch, included: !ch.included } : ch
      ),
    }));
  };

  const updateChapterField = (id: string, field: 'title' | 'goal', value: string) => {
    setProposal((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) =>
        ch.id === id ? { ...ch, [field]: value } : ch
      ),
    }));
  };

  const selectedCount = useMemo(
    () => proposal.chapters.filter((ch) => ch.included).length,
    [proposal.chapters]
  );

  const selectedWordTotal = useMemo(
    () =>
      proposal.chapters
        .filter((ch) => ch.included)
        .reduce((sum, ch) => sum + ch.estimatedWords, 0),
    [proposal.chapters]
  );

  // Group chapters by book part while keeping original order
  const groupedParts = useMemo(() => {
    const groups: Array<{ partLabel: string; items: TocChapterProposal[] }> = [];
    for (const ch of proposal.chapters) {
      const last = groups[groups.length - 1];
      if (last && last.partLabel === ch.partLabel) {
        last.items.push(ch);
      } else {
        groups.push({ partLabel: ch.partLabel, items: [ch] });
      }
    }
    return groups;
  }, [proposal.chapters]);

  const handleCopyPlainText = async () => {
    const text = formatTocAsPlainText(proposal, book.title);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be unavailable in restricted frames
    }
  };

  const handleApply = (mode: 'append' | 'replace') => {
    const created = convertTocProposalsToChapters(proposal.chapters, {
      includeSectionsInContent,
    });
    if (created.length === 0) return;
    onApplyChapters(created, mode);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
      role="dialog"
      aria-modal="true"
      aria-labelledby="toc-generator-modal-title"
      data-testid="toc-generator-modal"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800 mb-0.5">
              <ListTree className="w-3.5 h-3.5" />
              Core-Promise-Strukturgenerator · {PILLARS[book.pillar].label}
            </div>
            <h2
              id="toc-generator-modal-title"
              className="font-serif text-xl font-semibold text-slate-900"
            >
              Strukturiertes Kapitel-Inhaltsverzeichnis
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Inhaltsverzeichnis-Generator schließen"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Active Core Promise Anchor */}
          <div className="p-4 rounded-md bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Basis: Core Promise von „{book.title}“
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                {proposal.source === 'ai'
                  ? 'KI-verfeinerter Vorschlag'
                  : 'Automatisch aus Core Promise erstellt'}
              </span>
            </div>
            <p className="font-serif text-sm text-slate-800 leading-relaxed">
              {proposal.corePromiseUsed}
            </p>
            {proposal.extractedConcepts.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-slate-500">Erkannte Kernbegriffe:</span>
                {proposal.extractedConcepts.map((concept) => (
                  <span
                    key={concept}
                    className="text-[11px] font-medium px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Controls: Chapter Count, Structure Style & Optional AI Refinement */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4 space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">Kapitelanzahl</div>
              <div
                role="group"
                aria-label="Kapitelanzahl wählen"
                className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md"
              >
                {CHAPTER_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => regenerateAuto(count, structureStyle)}
                    aria-pressed={chapterCount === count}
                    className={`py-1.5 text-xs font-mono font-semibold rounded transition-colors ${
                      chapterCount === count
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <label
                htmlFor="toc-structure-style"
                className="block text-xs font-semibold text-slate-700"
              >
                Buch-Dramaturgie
              </label>
              <select
                id="toc-structure-style"
                value={structureStyle}
                onChange={(e) =>
                  regenerateAuto(chapterCount, e.target.value as TocStructureStyle)
                }
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
              >
                {TOC_STRUCTURE_STYLES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label} — {st.description.split(':')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRefineWithAi}
                disabled={aiLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    KI plant...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Mit KI verfeinern
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => regenerateAuto(chapterCount, structureStyle)}
                title="Automatische Struktur zurücksetzen"
                aria-label="Automatische Struktur zurücksetzen"
                className="p-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <label htmlFor="toc-focus-hint" className="sr-only">
              Optionaler Schwerpunkt für die KI-Verfeinerung
            </label>
            <input
              id="toc-focus-hint"
              type="text"
              value={focusHint}
              onChange={(e) => setFocusHint(e.target.value)}
              placeholder="Optionaler Schwerpunkt für KI-Verfeinerung (z. B. Fokus auf junge Familien oder Selbstständige)..."
              className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
            />
            <button
              type="button"
              onClick={handleCopyPlainText}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                  Gliederung kopiert
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Als Text kopieren
                </>
              )}
            </button>
          </div>

          {aiError && (
            <div
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {aiError}
            </div>
          )}

          {/* Structured Table of Contents Proposal Grouped by Parts */}
          <div className="space-y-5" data-testid="toc-proposal-list">
            {groupedParts.map((group) => (
              <div key={group.partLabel} className="space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {group.partLabel}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {group.items.length} Kapitel
                  </span>
                </div>

                <div className="space-y-2.5">
                  {group.items.map((ch) => (
                    <div
                      key={ch.id}
                      data-testid={`toc-chapter-item-${ch.chapterNumber}`}
                      className={`p-3.5 rounded-md border transition-colors ${
                        ch.included
                          ? 'border-slate-200 bg-white'
                          : 'border-slate-200 bg-slate-50 opacity-55'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={ch.included}
                          onChange={() => toggleChapterIncluded(ch.id)}
                          aria-label={`Kapitel ${ch.chapterNumber} übernehmen`}
                          className="mt-1 rounded border-slate-300 text-blue-700"
                        />

                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-400 tabular-nums shrink-0">
                              {String(ch.chapterNumber).padStart(2, '0')}.
                            </span>
                            <input
                              type="text"
                              aria-label={`Titel für Kapitel ${ch.chapterNumber}`}
                              value={ch.title}
                              onChange={(e) =>
                                updateChapterField(ch.id, 'title', e.target.value)
                              }
                              className="flex-1 font-serif text-sm font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-700 focus:outline-none py-0.5"
                            />
                            <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                              ca. {ch.estimatedWords.toLocaleString('de-DE')} W.
                            </span>
                          </div>

                          <input
                            type="text"
                            aria-label={`Ziel für Kapitel ${ch.chapterNumber}`}
                            value={ch.goal}
                            onChange={(e) =>
                              updateChapterField(ch.id, 'goal', e.target.value)
                            }
                            className="w-full text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded border border-slate-200 focus:outline-none focus:border-blue-700"
                          />

                          <div className="text-[11px] text-blue-800 leading-snug">
                            <span className="font-semibold">Core-Promise-Bezug: </span>
                            {ch.promiseLink}
                          </div>

                          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-0.5">
                            {ch.sections.map((sec, sIdx) => (
                              <li
                                key={sIdx}
                                className="text-[11px] text-slate-700 bg-slate-50 border border-slate-200/80 rounded px-2 py-1 leading-snug"
                              >
                                <span className="font-mono text-slate-400 mr-1">
                                  {ch.chapterNumber}.{sIdx + 1}
                                </span>
                                {sec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSectionsInContent}
                onChange={(e) => setIncludeSectionsInContent(e.target.checked)}
                className="rounded border-slate-300 text-blue-700"
              />
              <span>Unterkapitel (## ) direkt als Gliederung einfügen</span>
            </label>
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              Ausgewählt: {selectedCount} Kapitel · Zielumfang ca.{' '}
              {selectedWordTotal.toLocaleString('de-DE')} Wörter
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md whitespace-nowrap"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleApply('append')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              {selectedCount} Kapitel anhängen
            </button>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => handleApply('replace')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              Inhaltsverzeichnis übernehmen ({selectedCount})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
