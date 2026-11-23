import React, { useState } from 'react';
import {
  Check,
  Download,
  Headphones,
  Loader2,
  Lock,
  LockOpen,
} from 'lucide-react';
import type { BookProject, KdpAccountProfile } from '../types/book';
import { evaluateAudiobookReadiness, getBookFormatSummary } from '../utils/bookStatus';
import { downloadAllKdpPdfs } from '../utils/kdpPdfDownloads';

interface BookLockBannerProps {
  book: BookProject;
  account: KdpAccountProfile;
  onUnlock: () => void;
  onGoToOverview: () => void;
}

export function BookLockBanner({
  book,
  account,
  onUnlock,
  onGoToOverview,
}: BookLockBannerProps) {
  const [downloading, setDownloading] = useState(false);
  const [doneMessage, setDoneMessage] = useState('');

  const formats = getBookFormatSummary(book);
  const activeFormats = formats.filter((f) => f.active);
  const audio = evaluateAudiobookReadiness(book);

  const handleDownloadPdfs = async () => {
    setDownloading(true);
    setDoneMessage('');
    try {
      await downloadAllKdpPdfs(book, account);
      setDoneMessage('Alle 3 KDP-PDFs geladen');
      setTimeout(() => setDoneMessage(''), 3000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      data-testid="book-locked-banner"
      role="status"
      className="max-w-7xl mx-auto mb-6 bg-slate-900 text-white rounded-lg p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
    >
      <div className="space-y-1.5 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-300">
          <Lock className="w-3.5 h-3.5 shrink-0" />
          <span>
            Status: Eingereicht{book.submittedAt ? ` am ${book.submittedAt}` : ''} · Bearbeitung gesperrt
          </span>
        </div>
        <div className="text-xs text-slate-200 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <strong className="text-white">Formate:</strong>{' '}
            {activeFormats.length > 0
              ? activeFormats.map((f) => f.label).join(', ')
              : 'Keine Formate hinterlegt'}
          </span>
          <span aria-hidden="true" className="text-slate-500">·</span>
          <span className="inline-flex items-center gap-1">
            <Headphones className="w-3.5 h-3.5 text-emerald-300" />
            Hörbuch-Check:{' '}
            <strong className="text-white">
              {audio.plannedOrSubmitted ? `Ja (ca. ${audio.formattedDuration})` : 'Nein'}
            </strong>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleDownloadPdfs}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : doneMessage ? (
            <Check className="w-3.5 h-3.5 text-emerald-700" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          {doneMessage || 'Alle KDP-PDFs laden'}
        </button>
        <button
          type="button"
          onClick={onGoToOverview}
          className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
        >
          Buchübersicht
        </button>
        <button
          type="button"
          onClick={onUnlock}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap"
        >
          <LockOpen className="w-3.5 h-3.5" />
          Bearbeitung entsperren
        </button>
      </div>
    </div>
  );
}
