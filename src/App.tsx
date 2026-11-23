import React, { useEffect, useMemo, useState } from 'react';
import { Lock, Menu } from 'lucide-react';
import type {
  BookFormatChannels,
  BookProject,
  KdpAccountProfile,
  PillarId,
  WorkspaceStep,
} from './types/book';
import {
  createNewBookProject,
  DEFAULT_KDP_ACCOUNT,
  PILLARS,
  SEED_BOOKS,
} from './data/seedBooks';
import { calculateKdpLayoutSpecs, countProjectWords } from './utils/kdpEngine';
import { isBookLocked, normalizeBookProject } from './utils/bookStatus';
import { Sidebar } from './components/Sidebar';
import { NewBookModal } from './components/NewBookModal';
import { BooksOverviewView } from './components/BooksOverviewView';
import { BookLockBanner } from './components/BookLockBanner';
import { ConceptView } from './components/ConceptView';
import { ManuscriptView } from './components/ManuscriptView';
import { CoverStudioView } from './components/CoverStudioView';
import { FormattingPreviewView } from './components/FormattingPreviewView';
import { MarketingPromptsView } from './components/MarketingPromptsView';
import { KdpPublishView } from './components/KdpPublishView';
import { AiModelsView } from './components/AiModelsView';
import type { AiModelRoutingConfig } from './utils/aiModelConfig';
import { loadAiModelConfig, saveAiModelConfig } from './utils/aiClient';

const BOOKS_STORAGE_KEY = 'verlagswerk_kdp_books_v1';
const ACCOUNT_STORAGE_KEY = 'verlagswerk_kdp_account_v1';

const STEP_LABELS: Record<WorkspaceStep, string> = {
  overview: '00. Buchübersicht',
  concept: '01. Thema & Konzept',
  manuscript: '02. Manuskript',
  cover: '03. Cover-Studio',
  format: '04. Format & Vorschau',
  marketing: '05. KDP-Marketing',
  publish: '06. KDP-Kopiervorlage',
  models: '07. KI-Modelle',
};

function loadInitialBooks(): BookProject[] {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item) => normalizeBookProject(item as BookProject));
      }
    }
  } catch {
    // Fallback to seed data
  }
  return SEED_BOOKS.map((item) => normalizeBookProject(item));
}

function loadInitialAccount(): KdpAccountProfile {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_KDP_ACCOUNT, ...JSON.parse(raw) };
    }
  } catch {
    // Fallback to default profile
  }
  return DEFAULT_KDP_ACCOUNT;
}

export default function App() {
  const [books, setBooks] = useState<BookProject[]>(loadInitialBooks);
  const [activeBookId, setActiveBookId] = useState<string>(() => loadInitialBooks()[0].id);
  const [account, setAccount] = useState<KdpAccountProfile>(loadInitialAccount);
  const [aiModelConfig, setAiModelConfig] = useState<AiModelRoutingConfig>(loadAiModelConfig);
  const [activeStep, setActiveStep] = useState<WorkspaceStep>('overview');
  const [newBookOpen, setNewBookOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books));
    } catch {
      // Ignore storage quota errors
    }
  }, [books]);

  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
    } catch {
      // Ignore storage quota errors
    }
  }, [account]);

  useEffect(() => {
    saveAiModelConfig(aiModelConfig);
  }, [aiModelConfig]);

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeBookId) || books[0],
    [books, activeBookId]
  );

  const activeBookLocked = isBookLocked(activeBook);

  const openAnnotationsCount = useMemo(
    () =>
      activeBook.chapters.reduce(
        (sum, ch) => sum + ch.annotations.filter((a) => a.status === 'open').length,
        0
      ),
    [activeBook]
  );

  const wordCount = useMemo(() => countProjectWords(activeBook), [activeBook]);
  const layoutSpecs = useMemo(
    () => calculateKdpLayoutSpecs(wordCount, activeBook.format, activeBook.chapters.length),
    [wordCount, activeBook.format, activeBook.chapters.length]
  );

  // Hard state lock: refuse edits when the active book is marked as "eingereicht"
  const handleUpdateBook = (updater: (prev: BookProject) => BookProject) => {
    if (isBookLocked(activeBook)) return;
    const today = new Date().toISOString().slice(0, 10);
    setBooks((prevList) =>
      prevList.map((item) => {
        if (item.id !== activeBook.id || isBookLocked(item)) return item;
        return { ...updater(item), updatedAt: today };
      })
    );
  };

  const handleSubmitBook = (
    bookId: string,
    formats: BookFormatChannels,
    note: string
  ) => {
    const today = new Date().toISOString().slice(0, 10);
    setBooks((prevList) =>
      prevList.map((item) =>
        item.id === bookId
          ? {
              ...item,
              status: 'eingereicht',
              submittedAt: today,
              submittedNote: note,
              formats,
              updatedAt: today,
            }
          : item
      )
    );
  };

  const handleUnlockBook = (bookId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    setBooks((prevList) =>
      prevList.map((item) =>
        item.id === bookId
          ? {
              ...item,
              status: 'in-arbeit',
              updatedAt: today,
            }
          : item
      )
    );
  };

  const handleUpdateBookFormats = (bookId: string, formats: BookFormatChannels) => {
    const today = new Date().toISOString().slice(0, 10);
    setBooks((prevList) =>
      prevList.map((item) =>
        item.id === bookId && !isBookLocked(item)
          ? { ...item, formats, updatedAt: today }
          : item
      )
    );
  };

  const handleCreateBook = (data: {
    pillar: PillarId;
    title: string;
    subtitle: string;
    author: string;
    targetAudience: string;
    corePromise: string;
    sampleChapters?: string[];
  }) => {
    const created = normalizeBookProject(createNewBookProject(data));
    setBooks((prev) => [created, ...prev]);
    setActiveBookId(created.id);
    setActiveStep('concept');
  };

  const handleDeleteBook = (id: string) => {
    setBooks((prev) => {
      const target = prev.find((b) => b.id === id);
      if (prev.length <= 1 || (target && isBookLocked(target))) return prev;
      const next = prev.filter((b) => b.id !== id);
      if (id === activeBookId && next[0]) {
        setActiveBookId(next[0].id);
      }
      return next;
    });
  };

  const handleSelectBookAndStep = (bookId: string, step: WorkspaceStep) => {
    setActiveBookId(bookId);
    setActiveStep(step);
  };

  return (
    <div className="min-h-screen flex bg-[#F8F9FB] text-slate-900 overflow-x-clip">
      <Sidebar
        books={books}
        activeBook={activeBook}
        activeStep={activeStep}
        openAnnotationsCount={openAnnotationsCount}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onSelectStep={setActiveStep}
        onSelectBook={(id) => setActiveBookId(id)}
        onOpenNewBook={() => setNewBookOpen(true)}
        onDeleteBook={handleDeleteBook}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean 3-Zone Top Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Navigation öffnen"
              className="lg:hidden p-1.5 -ml-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
              {activeStep === 'overview' ? (
                <span className="font-semibold text-slate-900 truncate">
                  Verlagsregal · {books.length} Bücher
                </span>
              ) : activeStep === 'models' ? (
                <span className="font-semibold text-slate-900 truncate">
                  Studio-Einstellungen · {STEP_LABELS.models}
                </span>
              ) : (
                <>
                  <span className="font-semibold text-slate-900 truncate max-w-[180px] sm:max-w-[260px]">
                    {activeBook.title}
                  </span>
                  {activeBookLocked && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                      <Lock className="w-3 h-3" />
                      Gesperrt
                    </span>
                  )}
                  <span aria-hidden="true">/</span>
                  <span className="truncate">{STEP_LABELS[activeStep]}</span>
                </>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums whitespace-nowrap shrink-0">
            <span className="font-sans text-slate-700 font-medium">
              {PILLARS[activeBook.pillar].label}
            </span>
            <span aria-hidden="true">·</span>
            <span>{wordCount.toLocaleString('de-DE')} Wörter</span>
            <span aria-hidden="true">·</span>
            <span>ca. {layoutSpecs.estimatedPages} S.</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeStep !== 'overview' && (
              <button
                type="button"
                onClick={() => setActiveStep('overview')}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                Buchübersicht
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveStep('publish')}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
            >
              KDP-Kopiervorlage
            </button>
          </div>
        </header>

        {/* Active Workspace Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          {activeStep === 'overview' && (
            <BooksOverviewView
              books={books}
              activeBookId={activeBook.id}
              account={account}
              onSelectBookAndStep={handleSelectBookAndStep}
              onOpenNewBook={() => setNewBookOpen(true)}
              onSubmitBook={handleSubmitBook}
              onUnlockBook={handleUnlockBook}
              onUpdateBookFormats={handleUpdateBookFormats}
            />
          )}

          {activeStep !== 'overview' && activeStep !== 'models' && activeBookLocked && (
            <BookLockBanner
              book={activeBook}
              account={account}
              onUnlock={() => handleUnlockBook(activeBook.id)}
              onGoToOverview={() => setActiveStep('overview')}
            />
          )}

          {activeStep === 'concept' && (
            <ConceptView
              book={activeBook}
              readOnly={activeBookLocked}
              onUpdateBook={handleUpdateBook}
              onContinueToManuscript={() => setActiveStep('manuscript')}
            />
          )}

          {activeStep === 'manuscript' && (
            <ManuscriptView
              book={activeBook}
              readOnly={activeBookLocked}
              onUpdateBook={handleUpdateBook}
            />
          )}

          {activeStep === 'cover' && (
            <CoverStudioView
              book={activeBook}
              readOnly={activeBookLocked}
              onUpdateBook={handleUpdateBook}
            />
          )}

          {activeStep === 'format' && (
            <FormattingPreviewView
              book={activeBook}
              account={account}
              readOnly={activeBookLocked}
              onUpdateBook={handleUpdateBook}
            />
          )}

          {activeStep === 'marketing' && (
            <MarketingPromptsView
              book={activeBook}
              readOnly={activeBookLocked}
              onUpdateBook={handleUpdateBook}
            />
          )}

          {activeStep === 'publish' && (
            <KdpPublishView
              book={activeBook}
              account={account}
              readOnly={activeBookLocked}
              onUpdateBook={handleUpdateBook}
              onUpdateAccount={setAccount}
            />
          )}

          {activeStep === 'models' && (
            <AiModelsView
              config={aiModelConfig}
              onChangeConfig={setAiModelConfig}
            />
          )}
        </main>
      </div>

      <NewBookModal
        open={newBookOpen}
        defaultAuthor={account.penName || account.authorLegalName}
        onClose={() => setNewBookOpen(false)}
        onCreate={handleCreateBook}
      />
    </div>
  );
}
