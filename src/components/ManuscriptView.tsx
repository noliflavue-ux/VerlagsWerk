import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  ClipboardCheck,
  Compass,
  ListTree,
  Loader2,
  MessageSquarePlus,
  PenLine,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  Wand2,
} from 'lucide-react';
import type {
  AnnotationCategory,
  AuthorAnnotation,
  BookProject,
  Chapter,
} from '../types/book';
import { countWords } from '../utils/kdpEngine';
import { PILLARS } from '../data/seedBooks';
import {
  analyzeAllChaptersPerformance,
  analyzeChapterPerformance,
  anchorAiSuggestionsToContent,
  applyHighlightFix,
  type EditorHighlightIssue,
  type PerformanceCategory,
} from '../utils/chapterPerformance';
import {
  evaluateAllChaptersChecklist,
  evaluateChapterChecklist,
  insertChecklistSnippet,
  type ChapterChecklistItem,
  type ChecklistElementId,
} from '../utils/chapterChecklist';
import { WritingCopilotPanel } from './WritingCopilotPanel';
import { HighlightedManuscriptEditor } from './HighlightedManuscriptEditor';
import { ChapterPerformancePanel } from './ChapterPerformancePanel';
import { ChapterChecklistPanel } from './ChapterChecklistPanel';
import { ChapterTocGeneratorModal } from './ChapterTocGeneratorModal';

interface ManuscriptViewProps {
  book: BookProject;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
}

const ANNOTATION_CATEGORIES: AnnotationCategory[] = [
  'Inhaltlich',
  'Stil & Ton',
  'Beispiel / Fakten',
  'Kürzen / Erweitern',
];

export function ManuscriptView({
  book,
  readOnly = false,
  onUpdateBook,
}: ManuscriptViewProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string>(
    book.chapters[0]?.id || ''
  );
  const [mode, setMode] = useState<'write' | 'copilot' | 'performance' | 'checklist' | 'review'>('copilot');
  const [tocModalOpen, setTocModalOpen] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [reviseLoading, setReviseLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Content checklist state (manual overrides + optional AI notes/snippets per chapter)
  const [checklistOverrides, setChecklistOverrides] = useState<
    Record<string, Partial<Record<ChecklistElementId, boolean>>>
  >({});
  const [checklistAiData, setChecklistAiData] = useState<
    Record<string, Partial<Record<ChecklistElementId, { aiNote?: string; suggestedSnippet?: string }>>>
  >({});
  const [checklistAiLoading, setChecklistAiLoading] = useState(false);
  const [checklistAiError, setChecklistAiError] = useState('');

  // Performance analysis & inline editor highlight state
  const [showEditorHighlights, setShowEditorHighlights] = useState(true);
  const [perfCategoryFilter, setPerfCategoryFilter] = useState<'all' | PerformanceCategory>('all');
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [aiPerfLoading, setAiPerfLoading] = useState(false);
  const [aiPerfError, setAiPerfError] = useState('');
  const [aiPerfSummaries, setAiPerfSummaries] = useState<Record<string, string>>({});
  const [aiPerfRawByChapter, setAiPerfRawByChapter] = useState<
    Record<
      string,
      Array<{
        id?: string;
        category: PerformanceCategory;
        severity?: 'high' | 'medium' | 'low';
        title: string;
        explanation: string;
        suggestion: string;
        excerpt: string;
        replacement?: string;
      }>
    >
  >({});

  // New annotation form state
  const [annCategory, setAnnCategory] = useState<AnnotationCategory>('Inhaltlich');
  const [annQuote, setAnnQuote] = useState('');
  const [annNote, setAnnNote] = useState('');
  const [annError, setAnnError] = useState('');

  const activeChapter =
    book.chapters.find((c) => c.id === selectedChapterId) || book.chapters[0];
  const activeIndex = book.chapters.findIndex((c) => c.id === activeChapter?.id);

  const allChapterReports = useMemo(
    () => analyzeAllChaptersPerformance(book),
    [book]
  );

  const anchoredAiIssues = useMemo(() => {
    if (!activeChapter) return [];
    const rawList = aiPerfRawByChapter[activeChapter.id] || [];
    return anchorAiSuggestionsToContent(activeChapter.content, rawList);
  }, [activeChapter, aiPerfRawByChapter]);

  const activePerformanceReport = useMemo(() => {
    if (!activeChapter) return null;
    return analyzeChapterPerformance(book, activeChapter, anchoredAiIssues);
  }, [book, activeChapter, anchoredAiIssues]);

  const allChapterChecklists = useMemo(
    () => evaluateAllChaptersChecklist(book, checklistOverrides),
    [book, checklistOverrides]
  );

  const activeChecklistReport = useMemo(() => {
    if (!activeChapter) return null;
    return evaluateChapterChecklist(
      book,
      activeChapter,
      checklistOverrides[activeChapter.id],
      checklistAiData[activeChapter.id]
    );
  }, [book, activeChapter, checklistOverrides, checklistAiData]);

  if (!activeChapter) {
    return (
      <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-lg p-8 text-center">
        <h2 className="font-serif text-xl font-semibold text-slate-900">
          Noch keine Kapitel angelegt
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Fügen Sie Ihr erstes Kapitel hinzu, um mit dem Schreiben und Gegenlesen zu beginnen.
        </p>
        <button
          type="button"
          onClick={() => {
            const newId = `ch-${Date.now()}`;
            onUpdateBook((prev) => ({
              ...prev,
              chapters: [
                {
                  id: newId,
                  title: 'Kapitel 1: Einstieg',
                  goal: 'Klare Einführung in das Kernthema',
                  content: '',
                  annotations: [],
                },
              ],
            }));
            setSelectedChapterId(newId);
          }}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800"
        >
          <Plus className="w-4 h-4" />
          Erstes Kapitel anlegen
        </button>
      </div>
    );
  }

  const openAnnotations = activeChapter.annotations.filter((a) => a.status === 'open');
  const appliedAnnotations = activeChapter.annotations.filter((a) => a.status === 'applied');

  const updateActiveChapter = (
    updater: (ch: typeof activeChapter) => typeof activeChapter
  ) => {
    onUpdateBook((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) =>
        ch.id === activeChapter.id ? updater(ch) : ch
      ),
    }));
  };

  const handleAddChapter = () => {
    const nextNum = book.chapters.length + 1;
    const newId = `ch-${Date.now()}`;
    onUpdateBook((prev) => ({
      ...prev,
      chapters: [
        ...prev.chapters,
        {
          id: newId,
          title: `Neues Kapitel ${nextNum}`,
          goal: 'Ziel dieses Kapitels kurz beschreiben',
          content: '',
          annotations: [],
        },
      ],
    }));
    setSelectedChapterId(newId);
    setMode('write');
  };

  const handleApplyGeneratedToc = (newChapters: Chapter[], applyMode: 'append' | 'replace') => {
    if (readOnly || newChapters.length === 0) return;
    onUpdateBook((prev) => ({
      ...prev,
      chapters:
        applyMode === 'replace' ? newChapters : [...prev.chapters, ...newChapters],
    }));
    setSelectedChapterId(newChapters[0].id);
    setActiveIssueId(null);
    setTocModalOpen(false);
    setStatusMessage(
      applyMode === 'replace'
        ? `Neues Inhaltsverzeichnis mit ${newChapters.length} Kapiteln aus dem Core Promise übernommen.`
        : `${newChapters.length} neue Kapitel aus dem Core-Promise-Inhaltsverzeichnis ans Manuskript angehängt.`
    );
  };

  const handleDeleteChapter = (id: string) => {
    if (book.chapters.length <= 1) return;
    const remaining = book.chapters.filter((c) => c.id !== id);
    onUpdateBook((prev) => ({ ...prev, chapters: remaining }));
    if (selectedChapterId === id) {
      setSelectedChapterId(remaining[0].id);
    }
  };

  const handleDraftWithAi = async () => {
    setDraftLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const prevChapter = activeIndex > 0 ? book.chapters[activeIndex - 1] : null;
      const res = await fetch('/api/ai/write-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          bookSubtitle: book.subtitle,
          pillar: book.pillar,
          targetAudience: book.targetAudience,
          tone: book.tone,
          chapterTitle: activeChapter.title,
          chapterGoal: activeChapter.goal,
          existingContent: activeChapter.content,
          previousChapterSummary: prevChapter
            ? `${prevChapter.title}: ${prevChapter.goal}`
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kapitel konnte nicht generiert werden.');
      updateActiveChapter((ch) => ({
        ...ch,
        previousContent: ch.content,
        content: data.content,
        lastRevisionSummary: 'Kapitelentwurf durch KI erstellt',
      }));
      setStatusMessage('Kapitelentwurf erstellt. Sie können jetzt direkt gegenlesen und Anmerkungen setzen.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der KI-Kapitelerstellung.');
    } finally {
      setDraftLoading(false);
    }
  };

  const handleAddAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!annNote.trim()) {
      setAnnError('Bitte beschreiben Sie Ihre gewünschte Korrektur oder Anmerkung.');
      return;
    }

    const newAnn: AuthorAnnotation = {
      id: `ann-${Date.now()}`,
      category: annCategory,
      quote: annQuote.trim(),
      note: annNote.trim(),
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    updateActiveChapter((ch) => ({
      ...ch,
      annotations: [newAnn, ...ch.annotations],
    }));

    setAnnQuote('');
    setAnnNote('');
    setAnnError('');
  };

  const handleCaptureSelection = () => {
    const selected = window.getSelection()?.toString().trim();
    if (selected && selected.length > 3) {
      setAnnQuote(selected.slice(0, 260));
    }
  };

  const handleReturnAnnotationsToAi = async () => {
    if (openAnnotations.length === 0) return;
    setReviseLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const res = await fetch('/api/ai/revise-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          pillar: book.pillar,
          tone: book.tone,
          chapterTitle: activeChapter.title,
          content: activeChapter.content,
          annotations: openAnnotations,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Überarbeitung fehlgeschlagen.');

      const resolutionMap = new Map<string, string>();
      if (Array.isArray(data.appliedAnnotations)) {
        for (const item of data.appliedAnnotations) {
          resolutionMap.set(item.id, item.resolutionNote);
        }
      }

      const now = new Date().toISOString().slice(0, 10);
      updateActiveChapter((ch) => ({
        ...ch,
        previousContent: ch.content,
        content: data.revisedContent || ch.content,
        lastRevisionSummary:
          data.summary || `${openAnnotations.length} Anmerkungen wurden eingearbeitet.`,
        annotations: ch.annotations.map((ann) =>
          ann.status === 'open'
            ? {
                ...ann,
                status: 'applied',
                resolvedAt: now,
                resolutionNote:
                  resolutionMap.get(ann.id) || 'Im überarbeiteten Kapiteltext umgesetzt.',
              }
            : ann
        ),
      }));

      setStatusMessage(
        data.summary || 'Alle offenen Korrekturen wurden erfolgreich in das Kapitel eingearbeitet.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Lektorats-Überarbeitung.');
    } finally {
      setReviseLoading(false);
    }
  };

  const handleRevertChapter = () => {
    if (!activeChapter.previousContent) return;
    updateActiveChapter((ch) => ({
      ...ch,
      content: ch.previousContent || ch.content,
      previousContent: undefined,
      lastRevisionSummary: 'Vorherige Fassung wiederhergestellt',
    }));
    setStatusMessage('Die vorherige Kapitelfassung wurde wiederhergestellt.');
  };

  const toggleAnnotationStatus = (annId: string) => {
    updateActiveChapter((ch) => ({
      ...ch,
      annotations: ch.annotations.map((ann) =>
        ann.id === annId
          ? { ...ann, status: ann.status === 'open' ? 'applied' : 'open' }
          : ann
      ),
    }));
  };

  const deleteAnnotation = (annId: string) => {
    updateActiveChapter((ch) => ({
      ...ch,
      annotations: ch.annotations.filter((ann) => ann.id !== annId),
    }));
  };

  const handleApplyPerformanceFix = (issue: EditorHighlightIssue) => {
    if (readOnly || issue.replacement === undefined) return;
    const updatedContent = applyHighlightFix(activeChapter.content, issue);
    if (updatedContent === activeChapter.content) return;
    updateActiveChapter((ch) => ({
      ...ch,
      previousContent: ch.content,
      content: updatedContent,
      lastRevisionSummary: `Performance-Analyse: ${issue.title} umgesetzt`,
    }));
    setActiveIssueId(null);
    setStatusMessage(`Verbesserung „${issue.title}“ direkt im Kapiteltext angewendet.`);
  };

  const handleSendIssueToAnnotations = (issue: EditorHighlightIssue) => {
    if (readOnly) return;
    const mappedCategory: AnnotationCategory =
      issue.category === 'core-promise'
        ? 'Inhaltlich'
        : issue.category === 'density'
          ? 'Kürzen / Erweitern'
          : 'Stil & Ton';

    const newAnn: AuthorAnnotation = {
      id: `ann-perf-${Date.now()}`,
      category: mappedCategory,
      quote: issue.excerpt.slice(0, 260),
      note: `${issue.title}: ${issue.suggestion}`,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    updateActiveChapter((ch) => ({
      ...ch,
      annotations: [newAnn, ...ch.annotations],
    }));
    setStatusMessage(
      `Vorschlag „${issue.title}“ wurde als offene Anmerkung ins Gegenlesen übernommen.`
    );
  };

  const handleRunAiDeepAnalysis = async () => {
    if (!activeChapter.content.trim()) return;
    setAiPerfLoading(true);
    setAiPerfError('');
    try {
      const res = await fetch('/api/ai/chapter-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          pillar: book.pillar,
          corePromise: book.corePromise,
          chapterTitle: activeChapter.title,
          chapterGoal: activeChapter.goal,
          content: activeChapter.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'KI-Tiefenanalyse fehlgeschlagen.');
      }
      const validCats: PerformanceCategory[] = ['readability', 'density', 'core-promise'];
      const normalized = (Array.isArray(data.suggestions) ? data.suggestions : []).map(
        (
          s: {
            id?: string;
            category?: string;
            severity?: string;
            title?: string;
            explanation?: string;
            suggestion?: string;
            excerpt?: string;
            replacement?: string;
          },
          idx: number
        ) => ({
          id: s.id || `ai-perf-${Date.now()}-${idx}`,
          category: validCats.includes(s.category as PerformanceCategory)
            ? (s.category as PerformanceCategory)
            : 'core-promise',
          severity:
            s.severity === 'high' || s.severity === 'low' ? s.severity : ('medium' as const),
          title: s.title || 'KI-Verbesserungsvorschlag',
          explanation: s.explanation || '',
          suggestion: s.suggestion || '',
          excerpt: s.excerpt || '',
          replacement: s.replacement || undefined,
        })
      );
      setAiPerfRawByChapter((prev) => ({
        ...prev,
        [activeChapter.id]: normalized,
      }));
      if (data.summary) {
        setAiPerfSummaries((prev) => ({
          ...prev,
          [activeChapter.id]: data.summary,
        }));
      }
      setShowEditorHighlights(true);
      const firstAnchored = anchorAiSuggestionsToContent(activeChapter.content, normalized)[0];
      if (firstAnchored) {
        setActiveIssueId(firstAnchored.id);
      }
      setStatusMessage(
        'KI-Tiefenanalyse abgeschlossen und passende Textstellen direkt im Editor hervorgehoben.'
      );
    } catch (err) {
      setAiPerfError(
        err instanceof Error ? err.message : 'Fehler bei der KI-Tiefenanalyse.'
      );
    } finally {
      setAiPerfLoading(false);
    }
  };

  const handleInsertChecklistElement = (item: ChapterChecklistItem) => {
    if (readOnly) return;
    const nextContent = insertChecklistSnippet(activeChapter.content, item);
    updateActiveChapter((ch) => ({
      ...ch,
      previousContent: ch.content,
      content: nextContent,
      lastRevisionSummary: `Inhalts-Checkliste: Baustein „${item.label}“ ergänzt`,
    }));
    setStatusMessage(
      `Baustein „${item.label}“ wurde direkt ins Kapitel eingefügt und live geprüft.`
    );
  };

  const handleSendChecklistToAnnotations = (item: ChapterChecklistItem) => {
    if (readOnly) return;
    const newAnn: AuthorAnnotation = {
      id: `ann-chk-${Date.now()}`,
      category: item.id === 'practical-tip' ? 'Beispiel / Fakten' : 'Inhaltlich',
      quote: activeChapter.title,
      note: `Checkliste – ${item.label}: ${item.corePromiseRequirement}`,
      status: 'open',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    updateActiveChapter((ch) => ({
      ...ch,
      annotations: [newAnn, ...ch.annotations],
    }));
    setStatusMessage(
      `Checklisten-Punkt „${item.label}“ als offene Anmerkung ins Gegenlesen übernommen.`
    );
  };

  const handleToggleChecklistOverride = (elementId: ChecklistElementId) => {
    if (readOnly) return;
    setChecklistOverrides((prev) => {
      const currentChapterOverrides = prev[activeChapter.id] || {};
      return {
        ...prev,
        [activeChapter.id]: {
          ...currentChapterOverrides,
          [elementId]: !currentChapterOverrides[elementId],
        },
      };
    });
  };

  const handleRunAiRefineChecklist = async () => {
    if (readOnly) return;
    setChecklistAiLoading(true);
    setChecklistAiError('');
    try {
      const res = await fetch('/api/ai/chapter-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          pillar: book.pillar,
          corePromise: book.corePromise,
          chapterTitle: activeChapter.title,
          chapterGoal: activeChapter.goal,
          content: activeChapter.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'KI-Checkliste konnte nicht erstellt werden.');
      }
      const validIds: ChecklistElementId[] = [
        'intro',
        'core-promise',
        'core-argument',
        'practical-tip',
        'summary',
      ];
      const mapped: Partial<Record<ChecklistElementId, { aiNote?: string; suggestedSnippet?: string }>> = {};
      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          if (validIds.includes(item.id)) {
            mapped[item.id as ChecklistElementId] = {
              aiNote: item.aiNote,
              suggestedSnippet: item.suggestedSnippet,
            };
          }
        }
      }
      setChecklistAiData((prev) => ({
        ...prev,
        [activeChapter.id]: mapped,
      }));
      setStatusMessage(
        'KI-Prüfhinweise und kapitelgenaue Bausteine für alle 5 Checklisten-Punkte erstellt.'
      );
    } catch (err) {
      setChecklistAiError(
        err instanceof Error ? err.message : 'Fehler bei der KI-Checklisten-Prüfung.'
      );
    } finally {
      setChecklistAiLoading(false);
    }
  };

  // Render chapter paragraphs cleanly in proofreading mode
  const paragraphs = activeChapter.content.split(/\n\n+/).filter((p) => p.trim().length > 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Row */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="min-w-0">
          <div className="text-xs font-medium text-slate-500 mb-1">
            Schritt 02 · Schwerpunkt {PILLARS[book.pillar].label} · Autoren-Lektorat
          </div>
          <h1 className="font-serif text-2xl xl:text-[26px] font-semibold tracking-tight text-slate-900 leading-tight">
            Manuskript & Lektorat
          </h1>
        </div>

        {/* Mode Switcher */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start xl:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'write'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            Schreiben
          </button>
          <button
            type="button"
            onClick={() => setMode('copilot')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'copilot'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Co-Pilot
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('performance');
              setShowEditorHighlights(true);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'performance'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Analyse
            {activePerformanceReport && !activePerformanceReport.isEmpty && (
              <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 tabular-nums">
                {activePerformanceReport.overallScore}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMode('checklist')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'checklist'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            Checkliste
            {activeChecklistReport && (
              <span className="font-mono text-[10.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 tabular-nums">
                {activeChecklistReport.presentCount}/{activeChecklistReport.totalCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMode('review')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              mode === 'review'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Gegenlesen ({openAnnotations.length})
          </button>
        </div>
      </div>

      {/* Main 3-Zone Editorial Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Chapter List */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-700">Kapitel ({book.chapters.length})</h2>
            {!readOnly && (
              <button
                type="button"
                onClick={handleAddChapter}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Hinzufügen
              </button>
            )}
          </div>

          {!readOnly && (
            <button
              type="button"
              onClick={() => setTocModalOpen(true)}
              data-testid="open-toc-generator-btn"
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50/70 hover:bg-blue-100/80 border border-blue-200 rounded-md transition-colors"
            >
              <ListTree className="w-3.5 h-3.5 shrink-0" />
              <span>Inhaltsverzeichnis generieren</span>
            </button>
          )}

          <div className="space-y-1">
            {book.chapters.map((ch, idx) => {
              const isSelected = ch.id === activeChapter.id;
              const openCount = ch.annotations.filter((a) => a.status === 'open').length;
              const chPerf = allChapterReports[ch.id];
              return (
                <div
                  key={ch.id}
                  className={`group flex items-start justify-between gap-2 rounded-md px-2.5 py-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-950'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChapterId(ch.id);
                      setActiveIssueId(null);
                    }}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="text-xs font-semibold leading-snug">
                      <span className="font-mono text-[11px] text-slate-400 mr-1.5 tabular-nums">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      {ch.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 font-mono tabular-nums flex flex-wrap items-center gap-x-1.5">
                      <span>{countWords(ch.content)} Wörter</span>
                      {chPerf && !chPerf.isEmpty && (
                        <>
                          <span>·</span>
                          <span
                            className={
                              chPerf.overallScore >= 80
                                ? 'text-emerald-700 font-semibold'
                                : chPerf.overallScore >= 62
                                  ? 'text-amber-700 font-semibold'
                                  : 'text-rose-700 font-semibold'
                            }
                          >
                            Score {chPerf.overallScore}
                          </span>
                        </>
                      )}
                      {openCount > 0 && <span>· {openCount} offen</span>}
                    </div>
                  </button>
                  {book.chapters.length > 1 && !readOnly && (
                    <button
                      type="button"
                      onClick={() => handleDeleteChapter(ch.id)}
                      aria-label={`Kapitel '${ch.title}' löschen`}
                      className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Center Writing / Proofreading Sheet */}
        <div
          className={`${
            mode === 'write' ? 'lg:col-span-9' : 'lg:col-span-5'
          } bg-white border border-slate-200 rounded-lg p-6 space-y-4`}
        >
          {/* Chapter Metadata & Actions */}
          <div className="space-y-3 pb-4 border-b border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                Kapitel {activeIndex + 1} von {book.chapters.length} · {countWords(activeChapter.content)} Wörter
              </span>
              <div className="flex items-center gap-2">
                {activeChapter.previousContent && !readOnly && (
                  <button
                    type="button"
                    onClick={handleRevertChapter}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Vorherige Fassung
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDraftWithAi}
                  disabled={draftLoading || readOnly}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {draftLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      KI schreibt...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Kapitel mit KI entwerfen
                    </>
                  )}
                </button>
              </div>
            </div>

            <input
              type="text"
              aria-label="Kapiteltitel"
              disabled={readOnly}
              value={activeChapter.title}
              onChange={(e) =>
                updateActiveChapter((ch) => ({ ...ch, title: e.target.value }))
              }
              className="w-full font-serif text-xl font-semibold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-700 focus:outline-none pb-1 disabled:opacity-80 disabled:cursor-not-allowed"
            />
            <input
              type="text"
              aria-label="Kapitelziel"
              disabled={readOnly}
              value={activeChapter.goal}
              onChange={(e) =>
                updateActiveChapter((ch) => ({ ...ch, goal: e.target.value }))
              }
              placeholder="Ziel und Kernaussage dieses Kapitels..."
              className="w-full text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-md border border-slate-200 focus:outline-none focus:border-blue-700 disabled:opacity-80 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {statusMessage}
            </div>
          )}

          {activeChapter.lastRevisionSummary && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              <span className="font-semibold text-slate-900">Letzte Überarbeitung: </span>
              {activeChapter.lastRevisionSummary}
            </div>
          )}

          {mode === 'write' || mode === 'copilot' || mode === 'performance' || mode === 'checklist' ? (
            <HighlightedManuscriptEditor
              value={activeChapter.content}
              readOnly={readOnly}
              highlightsEnabled={showEditorHighlights}
              onToggleHighlights={() => setShowEditorHighlights((prev) => !prev)}
              issues={activePerformanceReport?.issues || []}
              activeIssueId={activeIssueId}
              categoryFilter={perfCategoryFilter}
              onSelectIssue={(id) => setActiveIssueId(id)}
              onChange={(nextVal) =>
                updateActiveChapter((ch) => ({ ...ch, content: nextVal }))
              }
              onApplyIssueFix={handleApplyPerformanceFix}
              onSendIssueToAnnotations={handleSendIssueToAnnotations}
            />
          ) : (
            <div
              onMouseUp={handleCaptureSelection}
              className="space-y-4 font-serif text-[15.5px] leading-7 text-slate-800 max-h-[600px] overflow-y-auto pr-2"
            >
              <div className="font-sans text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
                Gegenlese-Hinweis: Markieren Sie beliebigen Text mit der Maus, um das Zitat automatisch in das Anmerkungsfeld rechts zu übernehmen.
              </div>
              {paragraphs.length === 0 ? (
                <p className="font-sans text-sm text-slate-500 py-8 text-center">
                  Dieses Kapitel enthält noch keinen Text. Klicken Sie oben auf „Kapitel mit KI entwerfen“ oder wechseln Sie in den Modus „Schreiben“.
                </p>
              ) : (
                paragraphs.map((block, i) => {
                  const trimmed = block.trim();
                  if (trimmed.startsWith('## ')) {
                    return (
                      <h3
                        key={i}
                        className="font-serif text-lg font-semibold text-slate-900 pt-2"
                      >
                        {trimmed.slice(3)}
                      </h3>
                    );
                  }
                  if (trimmed.startsWith('- ')) {
                    const items = trimmed
                      .split('\n')
                      .filter((l) => l.trim().startsWith('- '));
                    return (
                      <ul key={i} className="list-disc pl-5 space-y-1.5">
                        {items.map((item, idx) => (
                          <li key={idx}>{item.trim().slice(2).replace(/\*\*/g, '')}</li>
                        ))}
                      </ul>
                    );
                  }
                  return <p key={i}>{trimmed.replace(/\*\*/g, '')}</p>;
                })
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Author Proofreading & AI Revision Feedback Loop */}
        {mode === 'review' && (
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Gegenlesen: Korrekturen & Anmerkungen
              </h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Sammeln Sie alle Änderungswünsche zu diesem Kapitel und geben Sie sie gesammelt an das Sprachmodell zur präzisen Anpassung zurück.
              </p>
            </div>

            {/* Add New Annotation Form */}
            <fieldset disabled={readOnly} className={readOnly ? 'opacity-65' : ''}>
            <form onSubmit={handleAddAnnotation} className="space-y-3 pb-4 border-b border-slate-200">
              <div>
                <label htmlFor="ann-category" className="block text-xs font-semibold text-slate-700 mb-1">
                  Art der Korrektur
                </label>
                <select
                  id="ann-category"
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value as AnnotationCategory)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
                >
                  {ANNOTATION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ann-quote" className="block text-xs font-semibold text-slate-700 mb-1">
                  Betroffene Textstelle (optional)
                </label>
                <input
                  id="ann-quote"
                  type="text"
                  value={annQuote}
                  onChange={(e) => setAnnQuote(e.target.value)}
                  placeholder="Text im Kapitel markieren oder hier einfügen..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label htmlFor="ann-note" className="block text-xs font-semibold text-slate-700 mb-1">
                  Anmerkung / Korrekturanweisung *
                </label>
                <textarea
                  id="ann-note"
                  rows={3}
                  value={annNote}
                  onChange={(e) => {
                    setAnnNote(e.target.value);
                    setAnnError('');
                  }}
                  placeholder="z. B. Konkretes Alltagsbeispiel ergänzen, Absatz prägnanter formulieren..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              {annError && (
                <div role="alert" className="text-xs text-red-700">
                  {annError}
                </div>
              )}

              <button
                type="submit"
                className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              >
                Anmerkung hinzufügen
              </button>
            </form>

            {/* Send All Open Annotations Back to AI */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleReturnAnnotationsToAi}
                disabled={readOnly || openAnnotations.length === 0 || reviseLoading || !activeChapter.content.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
              >
                {reviseLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    KI arbeitet {openAnnotations.length} Korrekturen ein...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    {openAnnotations.length} offene Anmerkungen zurückgeben & anpassen
                  </>
                )}
              </button>
            </div>
            </fieldset>

            {/* Annotations List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {activeChapter.annotations.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">
                  Noch keine Anmerkungen in diesem Kapitel.
                </p>
              ) : (
                <>
                  {openAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 border border-slate-200 rounded-md bg-slate-50/70 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-amber-800">
                          Offen · {ann.category}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleAnnotationStatus(ann.id)}
                            aria-label="Anmerkung als erledigt markieren"
                            className="text-slate-500 hover:text-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteAnnotation(ann.id)}
                            aria-label="Anmerkung löschen"
                            className="text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {ann.quote && (
                        <div className="text-[11px] italic text-slate-600">
                          „{ann.quote}“
                        </div>
                      )}
                      <div className="text-xs text-slate-800 leading-relaxed">{ann.note}</div>
                    </div>
                  ))}

                  {appliedAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="p-3 border border-slate-200 rounded-md bg-white space-y-1.5 opacity-80"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-emerald-700">
                          Eingearbeitet · {ann.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleAnnotationStatus(ann.id)}
                          className="text-[11px] text-slate-500 hover:text-slate-900 underline"
                        >
                          Wieder öffnen
                        </button>
                      </div>
                      <div className="text-xs text-slate-700">{ann.note}</div>
                      {ann.resolutionNote && (
                        <div className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-1 rounded">
                          KI-Notiz: {ann.resolutionNote}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
        {/* Right Panel: Schreib-Co-Pilot */}
        {mode === 'copilot' && (
          <WritingCopilotPanel
            book={book}
            activeChapter={activeChapter}
            readOnly={readOnly}
            onUpdateBook={onUpdateBook}
            onSelectChapter={setSelectedChapterId}
            onStatusMessage={(msg) => setStatusMessage(msg)}
          />
        )}

        {/* Right Panel: Performance-Analyse */}
        {mode === 'performance' && activePerformanceReport && (
          <ChapterPerformancePanel
            book={book}
            activeChapter={activeChapter}
            report={activePerformanceReport}
            allChapterReports={allChapterReports}
            readOnly={readOnly}
            categoryFilter={perfCategoryFilter}
            activeIssueId={activeIssueId}
            aiLoading={aiPerfLoading}
            aiSummary={aiPerfSummaries[activeChapter.id] || ''}
            aiError={aiPerfError}
            onChangeCategoryFilter={(filter) => {
              setPerfCategoryFilter(filter);
              setActiveIssueId(null);
            }}
            onSelectIssue={(issueId) => {
              setShowEditorHighlights(true);
              setActiveIssueId(issueId);
            }}
            onApplyIssueFix={handleApplyPerformanceFix}
            onSendIssueToAnnotations={handleSendIssueToAnnotations}
            onSelectChapter={(chId) => {
              setSelectedChapterId(chId);
              setActiveIssueId(null);
            }}
            onRunAiDeepAnalysis={handleRunAiDeepAnalysis}
          />
        )}

        {/* Right Panel: Core-Promise Inhalts-Checkliste */}
        {mode === 'checklist' && activeChecklistReport && (
          <ChapterChecklistPanel
            book={book}
            activeChapter={activeChapter}
            report={activeChecklistReport}
            allChapterChecklists={allChapterChecklists}
            manualOverrides={checklistOverrides[activeChapter.id] || {}}
            readOnly={readOnly}
            aiLoading={checklistAiLoading}
            aiError={checklistAiError}
            onInsertElement={handleInsertChecklistElement}
            onSendToAnnotations={handleSendChecklistToAnnotations}
            onToggleManualOverride={handleToggleChecklistOverride}
            onRunAiRefineChecklist={handleRunAiRefineChecklist}
            onSelectChapter={(chId) => {
              setSelectedChapterId(chId);
              setActiveIssueId(null);
            }}
          />
        )}
      </div>

      {/* Structured TOC Generator Modal anchored to Core Promise */}
      {tocModalOpen && !readOnly && (
        <ChapterTocGeneratorModal
          book={book}
          onClose={() => setTocModalOpen(false)}
          onApplyChapters={handleApplyGeneratedToc}
        />
      )}
    </div>
  );
}
