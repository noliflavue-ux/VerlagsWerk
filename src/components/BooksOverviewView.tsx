import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FileText,
  Headphones,
  Image as ImageIcon,
  Loader2,
  Lock,
  LockOpen,
  PenLine,
  Plus,
  Send,
  ShieldCheck,
  Tablet,
  X,
} from 'lucide-react';
import type {
  BookFormatChannels,
  BookProject,
  BookStatus,
  KdpAccountProfile,
  WorkspaceStep,
} from '../types/book';
import { PILLARS } from '../data/seedBooks';
import { calculateKdpLayoutSpecs, countProjectWords, TRIM_SIZES } from '../utils/kdpEngine';
import {
  countBooksByStatus,
  evaluateAudiobookReadiness,
  filterBooksByStatus,
  getBookFormats,
  getBookFormatSummary,
  isBookLocked,
} from '../utils/bookStatus';
import { getPrintCoverVariant } from '../utils/coverDesigner';
import { resolveVariantImageSource } from '../utils/coverCanvas';
import {
  downloadAllKdpPdfs,
  downloadCoverPrintPdf,
  downloadKindleEpub,
  downloadKindlePdf,
  downloadManuscriptPdf,
} from '../utils/kdpPdfDownloads';

interface BooksOverviewViewProps {
  books: BookProject[];
  activeBookId: string;
  account: KdpAccountProfile;
  onSelectBookAndStep: (bookId: string, step: WorkspaceStep) => void;
  onOpenNewBook: () => void;
  onSubmitBook: (bookId: string, formats: BookFormatChannels, note: string) => void;
  onUnlockBook: (bookId: string) => void;
  onUpdateBookFormats: (bookId: string, formats: BookFormatChannels) => void;
}

export function BooksOverviewView({
  books,
  activeBookId,
  account,
  onSelectBookAndStep,
  onOpenNewBook,
  onSubmitBook,
  onUnlockBook,
  onUpdateBookFormats,
}: BooksOverviewViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | BookStatus>('all');
  const [submitModalBookId, setSubmitModalBookId] = useState<string | null>(null);
  const [modalFormats, setModalFormats] = useState<BookFormatChannels>({
    kindleEbook: true,
    paperback: true,
    hardcover: false,
    audiobook: false,
  });
  const [modalNote, setModalNote] = useState('');
  const [modalError, setModalError] = useState('');

  // Download feedback per book
  const [busyDownload, setBusyDownload] = useState<string | null>(null);
  const [downloadFeedback, setDownloadFeedback] = useState<Record<string, string>>({});

  const counts = countBooksByStatus(books);
  const visibleBooks = filterBooksByStatus(books, statusFilter);
  const modalBook = books.find((b) => b.id === submitModalBookId) || null;

  const openSubmitModal = (book: BookProject) => {
    setSubmitModalBookId(book.id);
    setModalFormats(getBookFormats(book));
    setModalNote(book.submittedNote || '');
    setModalError('');
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalBook) return;
    if (!modalFormats.kindleEbook && !modalFormats.paperback && !modalFormats.hardcover) {
      setModalError('Bitte wählen Sie mindestens ein KDP-Buchformat (Taschenbuch, Kindle oder Hardcover) aus.');
      return;
    }
    onSubmitBook(modalBook.id, modalFormats, modalNote.trim());
    setSubmitModalBookId(null);
  };

  const runDownload = async (
    book: BookProject,
    kind: 'all-pdf' | 'manuscript-pdf' | 'cover-pdf' | 'kindle-pdf' | 'epub'
  ) => {
    const key = `${book.id}:${kind}`;
    setBusyDownload(key);
    try {
      if (kind === 'all-pdf') {
        const res = await downloadAllKdpPdfs(book, account);
        setDownloadFeedback((prev) => ({
          ...prev,
          [book.id]: `3 KDP-PDFs geladen (${res.manuscript.sizeKb}, ${res.cover.sizeKb}, ${res.kindle.sizeKb})`,
        }));
      } else if (kind === 'manuscript-pdf') {
        const res = await downloadManuscriptPdf(book, account);
        setDownloadFeedback((prev) => ({
          ...prev,
          [book.id]: `Manuskript-PDF geladen (${res.sizeKb})`,
        }));
      } else if (kind === 'cover-pdf') {
        const res = await downloadCoverPrintPdf(book);
        setDownloadFeedback((prev) => ({
          ...prev,
          [book.id]: `Cover-Druck-PDF geladen (${res.sizeKb})`,
        }));
      } else if (kind === 'kindle-pdf') {
        const res = await downloadKindlePdf(book, account);
        setDownloadFeedback((prev) => ({
          ...prev,
          [book.id]: `Kindle-PDF geladen (${res.sizeKb})`,
        }));
      } else {
        const res = await downloadKindleEpub(book, account);
        setDownloadFeedback((prev) => ({
          ...prev,
          [book.id]: `Kindle-EPUB geladen (${res.sizeKb})`,
        }));
      }
    } finally {
      setBusyDownload(null);
    }
  };

  const toggleDraftFormat = (book: BookProject, key: keyof BookFormatChannels) => {
    if (isBookLocked(book)) return;
    const current = getBookFormats(book);
    onUpdateBookFormats(book.id, {
      ...current,
      [key]: !current[key],
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            Schritt 00 · Verlagsregal · Status, Formate, Hörbuch-Check & KDP-PDF-Export
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Übersicht Ihrer Bücher
          </h1>
          <p className="text-sm text-slate-600 mt-1.5 max-w-3xl">
            Verwalten Sie alle Manuskripte nach Status (In Arbeit vs. Eingereicht). Eingereichte Bücher werden automatisch gegen versehentliche Änderungen gesperrt, zeigen alle veröffentlichten Formate inklusive Hörbuch-Check und liefern jederzeit die fertig formatierten KDP-Upload-PDFs.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenNewBook}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Neues Buch anlegen
        </button>
      </div>

      {/* KPI Strip + Status Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Buchstatus filtern"
          className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
        >
          {(
            [
              { id: 'all', label: `Alle Bücher (${counts.all})` },
              { id: 'in-arbeit', label: `In Arbeit (${counts.inArbeit})` },
              { id: 'eingereicht', label: `Eingereicht (${counts.eingereicht})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-mono tabular-nums">
          <span>
            <strong className="text-slate-900">{counts.inArbeit}</strong> in Bearbeitung
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-emerald-800">{counts.eingereicht}</strong> bei KDP eingereicht (gesperrt)
          </span>
        </div>
      </div>

      {/* Books List */}
      {visibleBooks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">
            Keine Bücher in dieser Status-Ansicht vorhanden.
          </p>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className="px-3.5 py-2 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
          >
            Alle Bücher anzeigen
          </button>
        </div>
      ) : (
        <div className="space-y-6" data-testid="books-overview-list">
          {visibleBooks.map((book) => {
            const locked = isBookLocked(book);
            const isSelected = book.id === activeBookId;
            const pillar = PILLARS[book.pillar];
            const words = countProjectWords(book);
            const specs = calculateKdpLayoutSpecs(words, book.format, book.chapters.length);
            const trim = TRIM_SIZES[book.format.trimSize];
            const formatSummary = getBookFormatSummary(book);
            const audioReport = evaluateAudiobookReadiness(book);
            const printVariant = getPrintCoverVariant(book);
            const thumbSrc = resolveVariantImageSource(printVariant, 'print');
            const feedback = downloadFeedback[book.id];

            return (
              <article
                key={book.id}
                data-testid={`book-card-${book.id}`}
                data-book-status={locked ? 'eingereicht' : 'in-arbeit'}
                className={`bg-white border rounded-lg p-5 sm:p-6 transition-colors ${
                  locked
                    ? 'border-slate-300 bg-slate-50/30'
                    : isSelected
                      ? 'border-blue-300'
                      : 'border-slate-200'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left: Cover Thumbnail + Core Book Info */}
                  <div className="lg:col-span-4 flex items-start gap-4 min-w-0">
                    {/* Mini Cover Preview */}
                    <div
                      className="w-20 sm:w-24 aspect-[5/8] rounded-sm border border-slate-200 overflow-hidden relative shrink-0 shadow-sm flex flex-col justify-between p-2"
                      style={{
                        backgroundColor: printVariant.accentColor,
                      }}
                    >
                      {thumbSrc && (
                        <img
                          src={thumbSrc}
                          alt={`Cover von ${book.title}`}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            printVariant.textColor === 'light'
                              ? 'linear-gradient(to bottom, rgba(15,23,42,0.5), rgba(15,23,42,0.2), rgba(15,23,42,0.65))'
                              : 'linear-gradient(to bottom, rgba(255,255,255,0.72), rgba(255,255,255,0.25), rgba(255,255,255,0.65))',
                        }}
                      />
                      <div
                        className={`relative z-10 font-serif text-[10px] font-semibold leading-tight line-clamp-3 ${
                          printVariant.textColor === 'light' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {book.title}
                      </div>
                      <div
                        className={`relative z-10 text-[8px] font-medium truncate ${
                          printVariant.textColor === 'light' ? 'text-white/90' : 'text-slate-800'
                        }`}
                      >
                        {book.author}
                      </div>
                    </div>

                    {/* Title, Status & Metrics */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {locked ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            Eingereicht · Bearbeitung gesperrt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                            <PenLine className="w-3 h-3" />
                            In Arbeit
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-500">
                          {pillar.label}
                        </span>
                      </div>

                      <div>
                        <h2 className="font-serif text-xl font-semibold text-slate-900 leading-snug">
                          {book.title}
                        </h2>
                        {book.subtitle && (
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {book.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500 tabular-nums pt-0.5">
                        <span>{book.chapters.length} Kapitel</span>
                        <span>·</span>
                        <span>{words.toLocaleString('de-DE')} Wörter</span>
                        <span>·</span>
                        <span>ca. {specs.estimatedPages} S. ({trim.widthMm}×{trim.heightMm} mm)</span>
                      </div>

                      <div className="text-[11px] text-slate-500">
                        {locked && book.submittedAt
                          ? `Eingereicht am ${book.submittedAt}${book.submittedNote ? ` — ${book.submittedNote}` : ''}`
                          : `Zuletzt bearbeitet: ${book.updatedAt}`}
                      </div>
                    </div>
                  </div>

                  {/* Center: Formats Overview + Explicit Audiobook Check */}
                  <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-5 space-y-3 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {locked ? 'Eingereichte Formate & Hörbuch-Check' : 'Geplante Formate & Hörbuch-Check'}
                      </span>
                      {!locked && (
                        <span className="text-[11px] text-slate-400">Anklickbar</span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {formatSummary.map((item) => {
                        const Icon =
                          item.id === 'paperback'
                            ? BookOpen
                            : item.id === 'kindleEbook'
                              ? Tablet
                              : item.id === 'audiobook'
                                ? Headphones
                                : FileText;

                        if (locked) {
                          return (
                            <div
                              key={item.id}
                              className={`px-2.5 py-2 rounded-md border text-xs min-w-0 ${
                                item.active
                                  ? 'border-emerald-200 bg-emerald-50/50 text-slate-900'
                                  : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1.5">
                                <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap">
                                  <Icon className="w-3.5 h-3.5 shrink-0" />
                                  {item.label}
                                </span>
                                <span className="text-[11px] font-mono shrink-0">
                                  {item.active ? 'Ja' : 'Nein'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                                {item.detail}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleDraftFormat(book, item.id)}
                            aria-pressed={item.active}
                            className={`px-2.5 py-2 rounded-md border text-left text-xs transition-colors min-w-0 ${
                              item.active
                                ? 'border-blue-700 bg-blue-50/50 text-slate-900'
                                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="inline-flex items-center gap-1.5 font-semibold whitespace-nowrap">
                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                {item.label}
                              </span>
                              <span className="text-[11px] font-mono shrink-0">
                                {item.active ? 'Aktiv' : 'Aus'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                              {item.detail}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Explicit Audiobook Check Box */}
                    <div
                      data-testid={`audiobook-check-${book.id}`}
                      className={`p-2.5 rounded-md border text-xs space-y-1 ${
                        audioReport.plannedOrSubmitted
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 font-semibold">
                          <Headphones className="w-3.5 h-3.5 shrink-0" />
                          Hörbuch-Check (Audible / ACX):{' '}
                          {audioReport.plannedOrSubmitted ? 'Ja (vorgesehen)' : 'Nein'}
                        </span>
                        <span className="font-mono text-[11px] tabular-nums shrink-0">
                          ca. {audioReport.formattedDuration}
                        </span>
                      </div>
                      <div className="text-[11px] opacity-85 leading-snug">
                        {audioReport.readinessLabel} · {audioReport.notes[0]}
                      </div>
                    </div>
                  </div>

                  {/* Right: KDP Upload PDF Downloads + Status Actions */}
                  <div className="lg:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-200 pt-4 lg:pt-0 lg:pl-5 flex flex-col justify-between gap-4">
                    {/* Direct KDP Upload PDFs */}
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-slate-900">
                        KDP-Upload-Dateien (fertige PDFs)
                      </div>

                      <button
                        type="button"
                        onClick={() => runDownload(book, 'all-pdf')}
                        disabled={busyDownload !== null}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
                      >
                        {busyDownload === `${book.id}:all-pdf` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        Alle 3 KDP-PDFs laden
                      </button>

                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => runDownload(book, 'manuscript-pdf')}
                          disabled={busyDownload !== null}
                          title="Geschnittenes Taschenbuch-Manuskript als KDP-PDF laden"
                          className="inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10.5px] font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span>Buch-PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => runDownload(book, 'cover-pdf')}
                          disabled={busyDownload !== null}
                          title="Taschenbuch-Druckcover (Full-Wrap) als KDP-PDF laden"
                          className="inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10.5px] font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                          <span>Cover-PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => runDownload(book, 'kindle-pdf')}
                          disabled={busyDownload !== null}
                          title="Fertig formatierte Kindle-Ausgabe als PDF inkl. Kindle-Cover laden"
                          className="inline-flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10.5px] font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
                        >
                          <Tablet className="w-3.5 h-3.5 text-slate-600" />
                          <span>Kindle-PDF</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => runDownload(book, 'epub')}
                          disabled={busyDownload !== null}
                          className="font-medium text-blue-700 hover:text-blue-900"
                        >
                          + Kindle EPUB laden
                        </button>
                        {feedback && (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium truncate max-w-[160px]">
                            <Check className="w-3 h-3 shrink-0" />
                            <span className="truncate">{feedback}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lifecycle / Lock Controls */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      {locked ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectBookAndStep(book.id, 'publish')}
                            className="w-full px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Schreibgeschützt öffnen (KDP-Daten)
                          </button>
                          <button
                            type="button"
                            onClick={() => onUnlockBook(book.id)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            <LockOpen className="w-3.5 h-3.5" />
                            Bearbeitung entsperren
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectBookAndStep(book.id, 'manuscript')}
                            className="w-full px-3 py-1.5 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            Im Studio weiterbearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => openSubmitModal(book)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Als eingereicht markieren & sperren
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Submission & Lock Confirmation Modal */}
      {modalBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-book-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="text-xs font-medium text-emerald-800 mb-0.5">
                  Amazon KDP Einreichung abschließen
                </div>
                <h2
                  id="submit-book-modal-title"
                  className="font-serif text-xl font-semibold text-slate-900"
                >
                  „{modalBook.title}“ als eingereicht markieren
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSubmitModalBookId(null)}
                aria-label="Dialog schließen"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmSubmit} className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-900 mb-2">
                  Welche Formate wurden / werden bei KDP eingereicht?
                </div>
                <div className="space-y-2">
                  {(
                    [
                      {
                        key: 'paperback',
                        label: 'Taschenbuch (KDP Print-PDF + Druckcover-PDF)',
                      },
                      {
                        key: 'kindleEbook',
                        label: 'Kindle eBook (EPUB & formatiertes Kindle-PDF)',
                      },
                      {
                        key: 'hardcover',
                        label: 'Gebundene Ausgabe (KDP Hardcover)',
                      },
                    ] as const
                  ).map((item) => (
                    <label
                      key={item.key}
                      className="flex items-center gap-2.5 p-2.5 border border-slate-200 rounded-md text-xs text-slate-800 cursor-pointer hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={modalFormats[item.key]}
                        onChange={(e) =>
                          setModalFormats((prev) => ({
                            ...prev,
                            [item.key]: e.target.checked,
                          }))
                        }
                        className="rounded border-slate-300 text-blue-700"
                      />
                      <span className="font-medium">{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Audiobook Check inside Submission Modal */}
              {(() => {
                const audio = evaluateAudiobookReadiness(modalBook);
                return (
                  <div className="p-3.5 rounded-md border border-slate-200 bg-slate-50 space-y-2">
                    <label className="flex items-start gap-2.5 text-xs text-slate-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={modalFormats.audiobook}
                        onChange={(e) =>
                          setModalFormats((prev) => ({
                            ...prev,
                            audiobook: e.target.checked,
                          }))
                        }
                        className="mt-0.5 rounded border-slate-300 text-blue-700"
                      />
                      <span>
                        <strong className="inline-flex items-center gap-1">
                          <Headphones className="w-3.5 h-3.5 text-blue-700" />
                          Auch als Hörbuch (Audible / ACX) einreichen
                        </strong>
                        <span className="block text-[11px] text-slate-600 mt-0.5">
                          Automatischer Hörbuch-Check: {audio.readinessLabel} · geschätzte Laufzeit ca.{' '}
                          {audio.formattedDuration}
                        </span>
                      </span>
                    </label>
                  </div>
                );
              })()}

              <div>
                <label
                  htmlFor="submit-note"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Einreichungsnotiz (optional, z. B. Auflage oder ASIN)
                </label>
                <input
                  id="submit-note"
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="z. B. 1. Auflage auf Amazon.de hochgeladen"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Nach dem Bestätigen wird dieses Buch in den Status <strong>Eingereicht</strong> gesetzt und die Bearbeitung im gesamten Studio gesperrt. Alle fertigen KDP-Upload-PDFs bleiben jederzeit herunterladbar.
                </span>
              </div>

              {modalError && (
                <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {modalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModalBookId(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verbindlich einreichen & sperren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
