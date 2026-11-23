import React, { useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Download,
  Tablet,
} from 'lucide-react';
import type {
  BookFontFamily,
  BookProject,
  KdpAccountProfile,
  PaperType,
  TrimSizeId,
} from '../types/book';
import {
  buildFormattedKdpHtml,
  calculateKdpLayoutSpecs,
  countProjectWords,
  TRIM_SIZES,
} from '../utils/kdpEngine';
import { FinalExportBundleCard } from './FinalExportBundleCard';

interface FormattingPreviewViewProps {
  book: BookProject;
  account: KdpAccountProfile;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
}

export function FormattingPreviewView({
  book,
  account,
  readOnly = false,
  onUpdateBook,
}: FormattingPreviewViewProps) {
  const [previewDevice, setPreviewDevice] = useState<'kindle' | 'paperback'>('paperback');
  const [kindleTheme, setKindleTheme] = useState<'light' | 'sepia' | 'dark'>('light');
  const [kindleScale, setKindleScale] = useState<number>(15);
  const [previewChapterIndex, setPreviewChapterIndex] = useState<number>(0);

  const totalWords = countProjectWords(book);
  const specs = calculateKdpLayoutSpecs(totalWords, book.format, book.chapters.length);
  const trim = TRIM_SIZES[book.format.trimSize];

  const safeChapterIndex = Math.min(previewChapterIndex, Math.max(0, book.chapters.length - 1));
  const currentChapter = book.chapters[safeChapterIndex];

  const updateFormat = (patch: Partial<BookProject['format']>) => {
    onUpdateBook((prev) => ({
      ...prev,
      format: { ...prev.format, ...patch },
    }));
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const slug =
    book.title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, '-')
      .replace(/^-|-$/g, '') || 'manuskript';

  const handleExportKindle = () => {
    const html = buildFormattedKdpHtml(book, account, 'kindle');
    triggerDownload(html, `${slug}-kindle-kdp.html`, 'text/html;charset=utf-8');
  };

  const handleExportPaperback = () => {
    const html = buildFormattedKdpHtml(book, account, 'paperback');
    triggerDownload(
      html,
      `${slug}-taschenbuch-${book.format.trimSize}.html`,
      'text/html;charset=utf-8'
    );
  };

  const handleExportWord = () => {
    const html = buildFormattedKdpHtml(book, account, 'paperback');
    triggerDownload(html, `${slug}-manuskript-kdp.doc`, 'application/msword;charset=utf-8');
  };

  const rawParagraphs = (currentChapter?.content || '')
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const leftPageBlocks = rawParagraphs.slice(0, Math.max(2, Math.ceil(rawParagraphs.length / 2)));
  const rightPageBlocks = rawParagraphs.slice(Math.max(2, Math.ceil(rawParagraphs.length / 2)));

  const fontStack =
    book.format.fontFamily === 'Georgia'
      ? 'Georgia, serif'
      : book.format.fontFamily === 'Baskerville'
        ? 'Baskerville, "Libre Baskerville", Georgia, serif'
        : 'Fraunces, Garamond, Georgia, serif';

  const kindleThemeClasses =
    kindleTheme === 'dark'
      ? 'bg-slate-950 text-slate-100 border-slate-800'
      : kindleTheme === 'sepia'
        ? 'bg-[#F5EFE2] text-[#2F261A] border-[#DFD5C2]'
        : 'bg-white text-slate-900 border-slate-200';

  const renderFormattedBlocks = (blocks: string[], isFirstPage: boolean) => {
    return blocks.map((block, idx) => {
      if (block.startsWith('## ')) {
        return (
          <h4
            key={idx}
            className="font-semibold text-[1.05em] mt-4 mb-1.5 tracking-tight"
          >
            {block.slice(3)}
          </h4>
        );
      }
      if (block.startsWith('- ')) {
        const items = block.split('\n').filter((l) => l.trim().startsWith('- '));
        return (
          <ul key={idx} className="list-disc pl-4 space-y-1 my-2 text-[0.94em]">
            {items.map((item, i) => (
              <li key={i}>{item.trim().slice(2).replace(/\*\*/g, '')}</li>
            ))}
          </ul>
        );
      }
      const shouldIndent = book.format.firstLineIndent && !(isFirstPage && idx === 0);
      return (
        <p
          key={idx}
          className={`mb-2 text-justify ${shouldIndent ? 'indent-5' : ''}`}
        >
          {block.replace(/\*\*/g, '')}
        </p>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            Schritt 04 · Automatisierter Buchsatz für Kindle & Print-on-Demand
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Formatierung & Live-Vorschau
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportKindle}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Kindle KDP-HTML exportieren
          </button>
          <button
            type="button"
            onClick={handleExportPaperback}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Taschenbuch Drucksatz (.html)
          </button>
          <button
            type="button"
            onClick={handleExportWord}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Word-Manuskript (.doc)
          </button>
        </div>
      </div>

      {/* Finale Ausgabe: 3 Dateien direkt nach Formatierung */}
      <FinalExportBundleCard book={book} account={account} compact />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Formatting Controls & Exact KDP Specs */}
        <div className="lg:col-span-5 space-y-5">
          <fieldset
            disabled={readOnly}
            className={`bg-white border border-slate-200 rounded-lg p-5 space-y-4 ${
              readOnly ? 'opacity-75' : ''
            }`}
          >
            <h2 className="text-sm font-semibold text-slate-900">
              Automatisierte KDP-Satzregeln
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="fmt-trim" className="block text-xs font-semibold text-slate-700 mb-1">
                  Taschenbuch-Format (Trim)
                </label>
                <select
                  id="fmt-trim"
                  value={book.format.trimSize}
                  onChange={(e) => updateFormat({ trimSize: e.target.value as TrimSizeId })}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
                >
                  <option value="6x9">6 × 9 Zoll (KDP Standard)</option>
                  <option value="5.5x8.5">5,5 × 8,5 Zoll</option>
                  <option value="5x8">5 × 8 Zoll</option>
                  <option value="a5">DIN A5 (14,8 × 21 cm)</option>
                </select>
              </div>

              <div>
                <label htmlFor="fmt-paper" className="block text-xs font-semibold text-slate-700 mb-1">
                  Papierfarbe
                </label>
                <select
                  id="fmt-paper"
                  value={book.format.paperType}
                  onChange={(e) => updateFormat({ paperType: e.target.value as PaperType })}
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
                >
                  <option value="cream">Creme (90 g/m²)</option>
                  <option value="white">Weiß (90 g/m²)</option>
                </select>
              </div>

              <div>
                <label htmlFor="fmt-font" className="block text-xs font-semibold text-slate-700 mb-1">
                  Buchsatz-Schriftart
                </label>
                <select
                  id="fmt-font"
                  value={book.format.fontFamily}
                  onChange={(e) =>
                    updateFormat({ fontFamily: e.target.value as BookFontFamily })
                  }
                  className="w-full px-2.5 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
                >
                  <option value="Garamond">Garamond (Klassik)</option>
                  <option value="Georgia">Georgia (E-Reader)</option>
                  <option value="Baskerville">Baskerville (Editorial)</option>
                </select>
              </div>

              <div>
                <label htmlFor="fmt-size" className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Schriftgröße</span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    {book.format.fontSizePt} pt
                  </span>
                </label>
                <input
                  id="fmt-size"
                  type="range"
                  min={9.5}
                  max={13}
                  step={0.5}
                  value={book.format.fontSizePt}
                  onChange={(e) => updateFormat({ fontSizePt: Number(e.target.value) })}
                  className="w-full accent-blue-700"
                />
              </div>
            </div>

            {/* Automated Toggles */}
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              {(
                [
                  { key: 'includeTitlePage', label: 'Titelei automatisch erzeugen' },
                  { key: 'includeImprint', label: 'Impressum & Urheberrecht' },
                  { key: 'includeToc', label: 'Verlinktes Inhaltsverzeichnis' },
                  { key: 'startChaptersOnRight', label: 'Kapitel auf rechter Seite' },
                  { key: 'runningHeaders', label: 'Lebende Kopfzeilen' },
                  { key: 'pageNumbers', label: 'Seitenzahlen im Fuß' },
                  { key: 'firstLineIndent', label: 'Erstzeileneinzug (Buchsatz)' },
                  { key: 'bleed', label: 'Mit Beschnitt (Bleed 3,175 mm)' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-2 text-slate-700 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={book.format[opt.key]}
                    onChange={(e) => updateFormat({ [opt.key]: e.target.checked })}
                    className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Calculated KDP Specification Table */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Berechnete KDP-Druckparameter
            </h2>
            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Gesamtwortzahl</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {specs.totalWords.toLocaleString('de-DE')} Wörter
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Kalkulierter Seitenumfang</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums" data-testid="estimated-pages">
                  {specs.estimatedPages} Seiten
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Endformat (Trim)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {trim.widthMm} × {trim.heightMm} mm
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Bundsteg (KDP-Innenrand)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums" data-testid="gutter-margin">
                  {specs.insideMarginMm} mm
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Außenrand (Mindestwert)</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums">
                  {specs.outsideMarginMm} mm
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Buchrückenbreite</dt>
                <dd className="font-mono font-semibold text-slate-900 tabular-nums" data-testid="spine-width">
                  {specs.spineWidthMm} mm ({specs.spineWidthInches}&Prime;)
                </dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Rückenbeschriftung (ab 79 S.)</dt>
                <dd className="font-medium text-slate-900">
                  {specs.spineTextAllowed ? 'Zulässig' : 'Erst ab 79 Seiten'}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Right: Live Reader Preview (Paperback Spread + Kindle E-Reader) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setPreviewDevice('paperback')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  previewDevice === 'paperback'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Taschenbuch-Doppelseite
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('kindle')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  previewDevice === 'kindle'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Tablet className="w-3.5 h-3.5" />
                Kindle E-Reader
              </button>
            </div>

            {/* Chapter Navigation */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={safeChapterIndex <= 0}
                onClick={() => setPreviewChapterIndex((i) => Math.max(0, i - 1))}
                aria-label="Vorheriges Kapitel in Vorschau"
                className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-600 tabular-nums whitespace-nowrap">
                Kapitel {safeChapterIndex + 1} / {Math.max(1, book.chapters.length)}
              </span>
              <button
                type="button"
                disabled={safeChapterIndex >= book.chapters.length - 1}
                onClick={() =>
                  setPreviewChapterIndex((i) => Math.min(book.chapters.length - 1, i + 1))
                }
                aria-label="Nächstes Kapitel in Vorschau"
                className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {previewDevice === 'paperback' ? (
            <div className="bg-[#EEF1F5] border border-slate-200 rounded-md p-4 sm:p-6 overflow-x-auto">
              <div
                className={`mx-auto max-w-[660px] grid grid-cols-1 sm:grid-cols-2 border border-slate-300 shadow-md ${
                  book.format.paperType === 'cream' ? 'bg-[#FBF7EE]' : 'bg-white'
                }`}
                style={{
                  fontFamily: fontStack,
                  fontSize: `${Math.max(11, book.format.fontSizePt + 1)}px`,
                  lineHeight: book.format.lineHeight,
                }}
              >
                {/* Left Page (Verso) */}
                <div className="min-h-[450px] flex flex-col justify-between p-6 sm:pr-8 border-b sm:border-b-0 sm:border-r border-slate-300/80">
                  <div>
                    {book.format.runningHeaders && (
                      <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-5 text-left font-sans">
                        {book.title}
                      </div>
                    )}
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-sans mb-1">
                      Kapitel {safeChapterIndex + 1}
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 leading-snug mb-4">
                      {currentChapter?.title || 'Ohne Titel'}
                    </h3>
                    <div className="text-slate-800">
                      {leftPageBlocks.length > 0 ? (
                        renderFormattedBlocks(leftPageBlocks, true)
                      ) : (
                        <p className="font-sans text-xs text-slate-400">
                          Noch kein Text in diesem Kapitel vorhanden.
                        </p>
                      )}
                    </div>
                  </div>
                  {book.format.pageNumbers && (
                    <div className="pt-4 text-[10px] font-mono text-slate-400 text-left tabular-nums">
                      {12 + safeChapterIndex * 14}
                    </div>
                  )}
                </div>

                {/* Right Page (Recto) */}
                <div className="min-h-[450px] flex flex-col justify-between p-6 sm:pl-8">
                  <div>
                    {book.format.runningHeaders && (
                      <div className="text-[9px] uppercase tracking-widest text-slate-400 mb-5 text-right font-sans truncate">
                        {currentChapter?.title}
                      </div>
                    )}
                    <div className="text-slate-800">
                      {rightPageBlocks.length > 0 ? (
                        renderFormattedBlocks(rightPageBlocks, false)
                      ) : (
                        <p className="font-sans text-xs text-slate-400">
                          Fortsetzungstext erscheint automatisch auf der rechten Buchseite.
                        </p>
                      )}
                    </div>
                  </div>
                  {book.format.pageNumbers && (
                    <div className="pt-4 text-[10px] font-mono text-slate-400 text-right tabular-nums">
                      {13 + safeChapterIndex * 14}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 text-center text-[11px] text-slate-500 font-mono tabular-nums">
                Doppelseite {trim.widthMm} × {trim.heightMm} mm · Bundsteg {specs.insideMarginMm} mm ·{' '}
                {book.format.paperType === 'cream' ? 'Cremepapier' : 'Weißes Papier'}
              </div>
            </div>
          ) : (
            <div className="bg-[#EEF1F5] border border-slate-200 rounded-md p-5 flex flex-col items-center gap-4">
              {/* Kindle Reader Theme & Font Controls */}
              <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1">
                  {(
                    [
                      { id: 'light', label: 'Hell' },
                      { id: 'sepia', label: 'Sepia' },
                      { id: 'dark', label: 'Nacht' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setKindleTheme(t.id)}
                      className={`px-2.5 py-1 rounded text-xs ${
                        kindleTheme === t.id
                          ? 'bg-slate-900 text-white font-medium'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1">
                  <span className="text-slate-500">Schrift:</span>
                  <button
                    type="button"
                    onClick={() => setKindleScale((s) => Math.max(12, s - 1))}
                    aria-label="Kindle Schrift verkleinern"
                    className="px-1.5 font-semibold hover:text-blue-700"
                  >
                    A-
                  </button>
                  <span className="font-mono tabular-nums">{kindleScale}px</span>
                  <button
                    type="button"
                    onClick={() => setKindleScale((s) => Math.min(20, s + 1))}
                    aria-label="Kindle Schrift vergrößern"
                    className="px-1.5 font-semibold hover:text-blue-700"
                  >
                    A+
                  </button>
                </div>
              </div>

              {/* Kindle Viewport Frame */}
              <div className="w-full max-w-[380px] rounded-2xl bg-slate-900 p-4 shadow-lg">
                <div
                  className={`rounded-md border p-6 min-h-[460px] max-h-[500px] overflow-y-auto transition-colors ${kindleThemeClasses}`}
                  style={{
                    fontFamily: fontStack,
                    fontSize: `${kindleScale}px`,
                    lineHeight: book.format.lineHeight,
                  }}
                >
                  <div className="text-[10px] font-sans uppercase tracking-wider opacity-60 mb-1">
                    {book.title} · Kapitel {safeChapterIndex + 1}
                  </div>
                  <h3 className="text-lg font-semibold leading-snug mb-4">
                    {currentChapter?.title}
                  </h3>
                  {rawParagraphs.length > 0 ? (
                    renderFormattedBlocks(rawParagraphs, true)
                  ) : (
                    <p className="font-sans text-xs opacity-60">
                      Noch kein Kapitelinhalt vorhanden.
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-2 pt-2.5 tabular-nums">
                  <span>Pos. {120 + safeChapterIndex * 340}</span>
                  <span>
                    {Math.round(((safeChapterIndex + 1) / Math.max(1, book.chapters.length)) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
