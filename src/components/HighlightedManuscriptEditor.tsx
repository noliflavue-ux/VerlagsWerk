import React, { useEffect, useMemo, useRef } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import {
  buildHighlightSegments,
  type EditorHighlightIssue,
  type PerformanceCategory,
} from '../utils/chapterPerformance';

interface HighlightedManuscriptEditorProps {
  value: string;
  readOnly?: boolean;
  highlightsEnabled: boolean;
  onToggleHighlights: () => void;
  issues: EditorHighlightIssue[];
  activeIssueId: string | null;
  categoryFilter: 'all' | PerformanceCategory;
  onSelectIssue: (issueId: string | null) => void;
  onChange: (nextValue: string) => void;
  onApplyIssueFix: (issue: EditorHighlightIssue) => void;
  onSendIssueToAnnotations: (issue: EditorHighlightIssue) => void;
}

const CATEGORY_META: Record<
  PerformanceCategory,
  { label: string; dotClass: string; markClass: string; activeMarkClass: string; badgeClass: string }
> = {
  readability: {
    label: 'Lesbarkeit',
    dotClass: 'bg-amber-500',
    markClass: 'bg-amber-200/70 border-b-2 border-amber-500 rounded-[2px]',
    activeMarkClass: 'bg-amber-300/90 border-b-2 border-amber-700 ring-1 ring-amber-600 rounded-[2px]',
    badgeClass: 'text-amber-900 bg-amber-50 border-amber-200',
  },
  density: {
    label: 'Wortdichte',
    dotClass: 'bg-rose-500',
    markClass: 'bg-rose-200/65 border-b-2 border-rose-500 rounded-[2px]',
    activeMarkClass: 'bg-rose-300/85 border-b-2 border-rose-700 ring-1 ring-rose-600 rounded-[2px]',
    badgeClass: 'text-rose-900 bg-rose-50 border-rose-200',
  },
  'core-promise': {
    label: 'Core Promise',
    dotClass: 'bg-blue-600',
    markClass: 'bg-blue-200/65 border-b-2 border-blue-600 rounded-[2px]',
    activeMarkClass: 'bg-blue-300/85 border-b-2 border-blue-800 ring-1 ring-blue-700 rounded-[2px]',
    badgeClass: 'text-blue-900 bg-blue-50 border-blue-200',
  },
};

export function HighlightedManuscriptEditor({
  value,
  readOnly = false,
  highlightsEnabled,
  onToggleHighlights,
  issues,
  activeIssueId,
  categoryFilter,
  onSelectIssue,
  onChange,
  onApplyIssueFix,
  onSendIssueToAnnotations,
}: HighlightedManuscriptEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);

  const visibleIssues = useMemo(
    () =>
      categoryFilter === 'all'
        ? issues
        : issues.filter((issue) => issue.category === categoryFilter),
    [issues, categoryFilter]
  );

  const segments = useMemo(
    () => (highlightsEnabled ? buildHighlightSegments(value, visibleIssues) : []),
    [highlightsEnabled, value, visibleIssues]
  );

  const activeIssue = useMemo(
    () => visibleIssues.find((i) => i.id === activeIssueId) || null,
    [visibleIssues, activeIssueId]
  );

  const activeIndex = activeIssue
    ? visibleIssues.findIndex((i) => i.id === activeIssue.id)
    : -1;

  // Keep backdrop scroll position strictly locked to textarea scroll position
  const handleSyncScroll = () => {
    if (!textareaRef.current || !backdropRef.current) return;
    backdropRef.current.scrollTop = textareaRef.current.scrollTop;
    backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
  };

  // Scroll highlighted passage into view and select it in the textarea when user clicks an issue
  useEffect(() => {
    if (!activeIssue || !highlightsEnabled || !textareaRef.current) return;
    const el = textareaRef.current;

    // Estimate vertical scroll position based on line index before activeIssue.start
    const textBefore = value.slice(0, activeIssue.start);
    const approxLines = textBefore.split('\n').reduce((acc, line) => acc + Math.max(1, Math.ceil(line.length / 62)), 0);
    const lineHeightPx = 28; // matches leading-7 (1.75rem = 28px)
    const targetTop = Math.max(0, (approxLines - 3) * lineHeightPx);

    el.scrollTop = targetTop;
    if (backdropRef.current) {
      backdropRef.current.scrollTop = targetTop;
    }

    if (!readOnly) {
      try {
        el.setSelectionRange(activeIssue.start, activeIssue.end);
      } catch {
        // Ignore selection errors if element is blurred/unfocusable
      }
    }
  }, [activeIssueId]); // eslint-disable-line react-hooks/exhaustive-deps

  // When author clicks or moves caret inside a highlighted range, activate that issue
  const handleCursorInspect = () => {
    if (!highlightsEnabled || !textareaRef.current) return;
    const pos = textareaRef.current.selectionStart;
    const hit = visibleIssues.find((issue) => pos >= issue.start && pos <= issue.end);
    if (hit && hit.id !== activeIssueId) {
      onSelectIssue(hit.id);
    }
  };

  const handleStepIssue = (direction: -1 | 1) => {
    if (visibleIssues.length === 0) return;
    const nextIdx =
      activeIndex === -1
        ? direction === 1
          ? 0
          : visibleIssues.length - 1
        : (activeIndex + direction + visibleIssues.length) % visibleIssues.length;
    onSelectIssue(visibleIssues[nextIdx].id);
  };

  const counts = useMemo(
    () => ({
      readability: issues.filter((i) => i.category === 'readability').length,
      density: issues.filter((i) => i.category === 'density').length,
      corePromise: issues.filter((i) => i.category === 'core-promise').length,
    }),
    [issues]
  );

  return (
    <div className="space-y-3">
      {/* Compact Editor Highlight Legend & Stepping Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-[11px]">
        <div className="flex flex-wrap items-center gap-3 text-slate-600">
          <button
            type="button"
            onClick={onToggleHighlights}
            aria-pressed={highlightsEnabled}
            className={`inline-flex items-center gap-1.5 font-semibold transition-colors ${
              highlightsEnabled ? 'text-blue-800' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {highlightsEnabled ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            <span>
              {highlightsEnabled ? 'Editor-Markierungen aktiv' : 'Editor-Markierungen aus'}
            </span>
          </button>

          {highlightsEnabled && (
            <>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Lesbarkeit ({counts.readability})
              </span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Wortdichte ({counts.density})
              </span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Core Promise ({counts.corePromise})
              </span>
            </>
          )}
        </div>

        {highlightsEnabled && visibleIssues.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="font-mono text-[11px] text-slate-500 tabular-nums mr-1">
              {activeIndex >= 0 ? `${activeIndex + 1}/${visibleIssues.length}` : `${visibleIssues.length} Stellen`}
            </span>
            <button
              type="button"
              onClick={() => handleStepIssue(-1)}
              aria-label="Vorherige Markierung im Editor"
              className="p-1 text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleStepIssue(1)}
              aria-label="Nächste Markierung im Editor"
              className="p-1 text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Synchronized Highlight Backdrop + Native Editable Textarea */}
      <div
        data-testid="highlighted-manuscript-editor"
        className={`relative rounded-md border border-slate-200 focus-within:ring-2 focus-within:ring-blue-600/20 focus-within:border-blue-700 overflow-hidden ${
          readOnly ? 'bg-slate-50' : 'bg-white'
        }`}
      >
        <label htmlFor="chapter-editor" className="sr-only">
          Kapiteltext bearbeiten
        </label>

        {/* Backdrop Layer displaying color-coded inline improvement highlights */}
        {highlightsEnabled && (
          <div
            ref={backdropRef}
            aria-hidden="true"
            data-testid="editor-highlight-backdrop"
            className="pointer-events-none absolute inset-0 h-[460px] overflow-y-scroll p-4 font-serif text-[15px] leading-7 whitespace-pre-wrap break-words text-transparent select-none"
          >
            {segments.map((seg, idx) => {
              if (!seg.issue) {
                return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
              }
              const meta = CATEGORY_META[seg.issue.category];
              const isActive = seg.issue.id === activeIssueId;
              return (
                <mark
                  key={seg.issue.id}
                  data-highlight-category={seg.issue.category}
                  data-highlight-active={isActive ? 'true' : 'false'}
                  className={`text-transparent ${isActive ? meta.activeMarkClass : meta.markClass}`}
                >
                  {seg.text}
                </mark>
              );
            })}
            {'\n '}
          </div>
        )}

        {/* Interactive Native Textarea directly aligned on top */}
        <textarea
          ref={textareaRef}
          id="chapter-editor"
          disabled={readOnly}
          value={value}
          onScroll={handleSyncScroll}
          onClick={handleCursorInspect}
          onKeyUp={handleCursorInspect}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Schreiben Sie hier Ihr Kapitel oder nutzen Sie 'Kapitel mit KI entwerfen'..."
          className={`relative z-10 block w-full h-[460px] overflow-y-scroll p-4 font-serif text-[15px] leading-7 text-slate-900 caret-slate-900 focus:outline-none resize-none whitespace-pre-wrap break-words ${
            highlightsEnabled ? 'bg-transparent' : readOnly ? 'bg-slate-50' : 'bg-white'
          } disabled:text-slate-800 disabled:cursor-not-allowed`}
        />
      </div>

      {/* Inline Callout Card directly beneath the editor for the selected highlight */}
      {highlightsEnabled && activeIssue && (
        <div
          data-testid="editor-active-suggestion-card"
          className="p-3.5 rounded-md border border-slate-200 bg-slate-50 space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold border rounded ${CATEGORY_META[activeIssue.category].badgeClass}`}
              >
                {activeIssue.source === 'ai' && <Sparkles className="w-3 h-3" />}
                {CATEGORY_META[activeIssue.category].label}
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {activeIssue.title}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectIssue(null)}
              className="text-[11px] text-slate-500 hover:text-slate-900"
            >
              Ausblenden
            </button>
          </div>

          <div className="text-xs text-slate-700 leading-relaxed">
            <span className="font-medium text-slate-900">Diagnose: </span>
            {activeIssue.explanation}{' '}
            <span className="font-medium text-slate-900">Empfehlung: </span>
            {activeIssue.suggestion}
          </div>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeIssue.replacement !== undefined && (
                <button
                  type="button"
                  onClick={() => onApplyIssueFix(activeIssue)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  {activeIssue.replacementLabel || 'Verbesserung direkt anwenden'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onSendIssueToAnnotations(activeIssue)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Als Anmerkung ins Gegenlesen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
