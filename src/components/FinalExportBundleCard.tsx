import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  PackageCheck,
} from 'lucide-react';
import type { BookProject, KdpAccountProfile } from '../types/book';
import { calculateKdpLayoutSpecs, countProjectWords, TRIM_SIZES } from '../utils/kdpEngine';
import { buildFileSlug } from '../utils/finalExporter';
import { exportCoverPng } from '../utils/coverCanvas';
import {
  downloadAllKdpPdfs,
  downloadCoverPrintPdf,
  downloadKindleEpub,
  downloadKindlePdf,
  downloadManuscriptPdf,
  type DownloadedFileInfo,
} from '../utils/kdpPdfDownloads';

interface FinalExportBundleCardProps {
  book: BookProject;
  account: KdpAccountProfile;
  compact?: boolean;
}

export function FinalExportBundleCard({
  book,
  account,
  compact = false,
}: FinalExportBundleCardProps) {
  const [busy, setBusy] = useState<
    'all' | 'manuscript' | 'cover' | 'kindle-pdf' | 'kindle-epub' | null
  >(null);
  const [exported, setExported] = useState<{
    manuscript?: DownloadedFileInfo;
    cover?: DownloadedFileInfo;
    kindlePdf?: DownloadedFileInfo;
    kindleEpub?: DownloadedFileInfo;
  }>({});
  const [error, setError] = useState('');

  const words = countProjectWords(book);
  const specs = calculateKdpLayoutSpecs(words, book.format, book.chapters.length);
  const trim = TRIM_SIZES[book.format.trimSize];
  const slug = buildFileSlug(book.title);

  const handleSingle = async (
    kind: 'manuscript' | 'cover' | 'kindle-pdf' | 'kindle-epub'
  ) => {
    setBusy(kind);
    setError('');
    try {
      if (kind === 'manuscript') {
        const info = await downloadManuscriptPdf(book, account);
        setExported((prev) => ({ ...prev, manuscript: info }));
      } else if (kind === 'cover') {
        const info = await downloadCoverPrintPdf(book);
        setExported((prev) => ({ ...prev, cover: info }));
      } else if (kind === 'kindle-pdf') {
        const info = await downloadKindlePdf(book, account);
        setExported((prev) => ({ ...prev, kindlePdf: info }));
      } else {
        const info = await downloadKindleEpub(book, account);
        setExported((prev) => ({ ...prev, kindleEpub: info }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF-Export fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  const handleExportAllThreePdfs = async () => {
    setBusy('all');
    setError('');
    try {
      const res = await downloadAllKdpPdfs(book, account);
      setExported((prev) => ({
        ...prev,
        manuscript: res.manuscript,
        cover: res.cover,
        kindlePdf: res.kindle,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF-Komplett-Export fehlgeschlagen.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section
      data-testid="final-export-bundle"
      className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <PackageCheck className="w-4 h-4 text-blue-700" />
            <h2 className="text-base font-semibold text-slate-900">
              KDP-Upload-Dateien: 3 fertig formatierte PDFs
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Erzeugt Ihre drei druck- und uploadfertigen PDF-Dateien für Amazon KDP: geschnittenes Taschenbuch-Manuskript (.pdf), KDP-Druckcover (.pdf mit Rücken & Rückseite) und formatierte Kindle-Ausgabe (.pdf + optional .epub).
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportAllThreePdfs}
          disabled={busy !== null}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          {busy === 'all' ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Erzeuge 3 KDP-PDFs...
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Alle 3 KDP-PDFs herunterladen
            </>
          )}
        </button>
      </div>

      {error && (
        <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* File 1: Trimmed Manuscript PDF */}
        <div className="border border-slate-200 rounded-md p-4 flex flex-col justify-between gap-4 bg-slate-50/40">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-500">DATEI 01 · KDP-PDF</span>
              {exported.manuscript && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {exported.manuscript.sizeKb}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">
                Geschnittenes Manuskript (.pdf)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Druckfertiges Taschenbuch-PDF mit exaktem KDP-Endformat ({trim.widthMm} × {trim.heightMm} mm), gespiegeltem Bundsteg ({specs.insideMarginMm} mm){book.format.bleed ? ' sowie 3,175 mm Beschnitt & Schnittmarken' : ''}.
            </p>
            {!compact && (
              <div className="font-mono text-[11px] text-slate-500 truncate">
                {slug}-01-manuskript-geschnitten-{book.format.trimSize}.pdf
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => handleSingle('manuscript')}
            disabled={busy !== null}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 rounded-md transition-colors"
          >
            {busy === 'manuscript' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Manuskript (.pdf) laden
          </button>
        </div>

        {/* File 2: Paperback Full-Wrap Cover PDF (KDP Print Requirement) */}
        <div className="border border-slate-200 rounded-md p-4 flex flex-col justify-between gap-4 bg-slate-50/40">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-500">DATEI 02 · KDP-PDF</span>
              {exported.cover && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {exported.cover.sizeKb}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-slate-700 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">
                Buch-Cover Druckumschlag (.pdf)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Offizielles KDP-Druckcover-PDF inkl. Rückseite, Klappentext, Barcode-Zone und Buchrücken ({specs.spineWidthMm} mm · {specs.fullWrapWidthMm} × {specs.fullWrapHeightMm} mm).
            </p>
            {!compact && (
              <div className="font-mono text-[11px] text-slate-500 truncate">
                {slug}-02-kdp-cover-taschenbuch-druck.pdf
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleSingle('cover')}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 rounded-md transition-colors"
            >
              {busy === 'cover' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Buch-Cover (.pdf) laden
            </button>
            <div className="flex items-center justify-between gap-2 text-[11px] px-0.5">
              <button
                type="button"
                onClick={() => exportCoverPng(book, 'paperback-wrap')}
                disabled={busy !== null}
                className="font-medium text-slate-600 hover:text-slate-900"
              >
                + Cover als PNG
              </button>
              <button
                type="button"
                onClick={() => exportCoverPng(book, 'kindle')}
                disabled={busy !== null}
                className="font-medium text-blue-700 hover:text-blue-900"
              >
                + Kindle-Cover PNG
              </button>
            </div>
          </div>
        </div>

        {/* File 3: Kindle Formatted PDF + EPUB 3 */}
        <div className="border border-slate-200 rounded-md p-4 flex flex-col justify-between gap-4 bg-slate-50/40">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-slate-500">DATEI 03 · PDF / EPUB</span>
              {(exported.kindlePdf || exported.kindleEpub) && (
                <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  {(exported.kindlePdf || exported.kindleEpub)?.sizeKb}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-700 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-900">
                Kindle-Ausgabe (.pdf & .epub)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Fertig formatiertes Kindle-Lese-PDF mit eigenständigem Kindle-Cover auf Seite 1 sowie optional als offizielles KDP-EPUB-3 ({book.chapters.length} Kapitel).
            </p>
            {!compact && (
              <div className="font-mono text-[11px] text-slate-500 truncate">
                {slug}-03-kdp-kindle-ausgabe.pdf
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => handleSingle('kindle-pdf')}
              disabled={busy !== null}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 rounded-md transition-colors"
            >
              {busy === 'kindle-pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Kindle-Ausgabe (.pdf) laden
            </button>
            <button
              type="button"
              onClick={() => handleSingle('kindle-epub')}
              disabled={busy !== null}
              className="w-full text-[11px] font-medium text-blue-700 hover:text-blue-900 py-0.5"
            >
              {busy === 'kindle-epub'
                ? 'Erzeuge EPUB...'
                : '+ Zusätzlich als Kindle-EPUB (.epub) laden'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
