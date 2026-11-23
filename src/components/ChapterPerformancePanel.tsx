import React from 'react';
import {
  Activity,
  BookOpenCheck,
  Check,
  Crosshair,
  Gauge,
  Loader2,
  MessageSquarePlus,
  Sparkles,
} from 'lucide-react';
import type { BookProject, Chapter } from '../types/book';
import type {
  ChapterPerformanceReport,
  EditorHighlightIssue,
  PerformanceCategory,
} from '../utils/chapterPerformance';

interface ChapterPerformancePanelProps {
  book: BookProject;
  activeChapter: Chapter;
  report: ChapterPerformanceReport;
  allChapterReports: Record<string, ChapterPerformanceReport>;
  readOnly?: boolean;
  categoryFilter: 'all' | PerformanceCategory;
  activeIssueId: string | null;
  aiLoading: boolean;
  aiSummary: string;
  aiError: string;
  onChangeCategoryFilter: (filter: 'all' | PerformanceCategory) => void;
  onSelectIssue: (issueId: string) => void;
  onApplyIssueFix: (issue: EditorHighlightIssue) => void;
  onSendIssueToAnnotations: (issue: EditorHighlightIssue) => void;
  onSelectChapter: (chapterId: string) => void;
  onRunAiDeepAnalysis: () => void;
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return 'text-emerald-800';
  if (score >= 62) return 'text-amber-800';
  return 'text-rose-800';
}

function getScoreBarColor(score: number): string {
  if (score >= 80) return 'bg-emerald-600';
  if (score >= 62) return 'bg-amber-500';
  return 'bg-rose-500';
}

const CATEGORY_STYLE: Record<
  PerformanceCategory,
  { label: string; border: string; badge: string }
> = {
  readability: {
    label: 'Lesbarkeit',
    border: 'border-l-amber-500',
    badge: 'text-amber-900 bg-amber-50 border-amber-200',
  },
  density: {
    label: 'Wortdichte',
    border: 'border-l-rose-500',
    badge: 'text-rose-900 bg-rose-50 border-rose-200',
  },
  'core-promise': {
    label: 'Core Promise',
    border: 'border-l-blue-600',
    badge: 'text-blue-900 bg-blue-50 border-blue-200',
  },
};

export function ChapterPerformancePanel({
  book,
  activeChapter,
  report,
  allChapterReports,
  readOnly = false,
  categoryFilter,
  activeIssueId,
  aiLoading,
  aiSummary,
  aiError,
  onChangeCategoryFilter,
  onSelectIssue,
  onApplyIssueFix,
  onSendIssueToAnnotations,
  onSelectChapter,
  onRunAiDeepAnalysis,
}: ChapterPerformancePanelProps) {
  const filteredIssues =
    categoryFilter === 'all'
      ? report.issues
      : report.issues.filter((i) => i.category === categoryFilter);

  return (
    <div
      data-testid="chapter-performance-panel"
      className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-5"
    >
      {/* Header + Overall Score */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 mb-0.5">
            <Activity className="w-3.5 h-3.5" />
            Live-Kapitelanalyse
          </div>
          <h2 className="text-sm font-semibold text-slate-900">
            Performance-Analyse
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
            {report.overallLabel}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div
            data-testid="chapter-overall-score"
            className={`font-mono text-2xl font-bold tabular-nums leading-none ${
              report.isEmpty ? 'text-slate-400' : getScoreTextColor(report.overallScore)
            }`}
          >
            {report.overallScore}
            <span className="text-xs font-normal text-slate-400">/100</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Kapitel-Score</div>
        </div>
      </div>

      {report.isEmpty ? (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 leading-relaxed">
          Dieses Kapitel enthält noch keinen Text. Schreiben Sie erste Absätze oder nutzen Sie den Schreib-Co-Piloten, um Lesbarkeit, Wortdichte und Core-Promise-Einhaltung live zu bewerten.
        </div>
      ) : (
        <>
          {/* 3 Core Dimension Metric Cards */}
          <div className="space-y-3">
            {/* 1. Lesbarkeit */}
            <div
              data-testid="metric-readability"
              className="p-3 rounded-md border border-slate-200 bg-slate-50/60 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <BookOpenCheck className="w-3.5 h-3.5 text-amber-600" />
                  Lesbarkeit
                </span>
                <span className={`font-mono text-xs font-bold tabular-nums ${getScoreTextColor(report.readability.score)}`}>
                  {report.readability.score}/100
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBarColor(report.readability.score)}`}
                  style={{ width: `${report.readability.score}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Flesch-DE: {report.readability.fleschDe}</span>
                <span>Ø {report.readability.avgSentenceLength} W./Satz</span>
                <span>{report.readability.longSentenceCount} lange Sätze</span>
              </div>
              <div className="text-[11px] text-slate-600">
                {report.readability.ratingLabel}
              </div>
            </div>

            {/* 2. Wortdichte */}
            <div
              data-testid="metric-density"
              className="p-3 rounded-md border border-slate-200 bg-slate-50/60 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Gauge className="w-3.5 h-3.5 text-rose-600" />
                  Wortdichte
                </span>
                <span className={`font-mono text-xs font-bold tabular-nums ${getScoreTextColor(report.density.score)}`}>
                  {report.density.score}/100
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBarColor(report.density.score)}`}
                  style={{ width: `${report.density.score}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 text-[11px] text-slate-600 font-mono tabular-nums">
                <span>Inhaltswörter: {report.density.contentWordRatioPercent}%</span>
                <span>Vielfalt: {report.density.lexicalDiversityPercent}%</span>
                <span>Füllwörter: {report.density.fillerWordCount}</span>
              </div>
              <div className="text-[11px] text-slate-600">
                {report.density.ratingLabel}
              </div>
            </div>

            {/* 3. Core Promise Alignment */}
            <div
              data-testid="metric-core-promise"
              className="p-3 rounded-md border border-slate-200 bg-slate-50/60 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <Crosshair className="w-3.5 h-3.5 text-blue-700" />
                  Core-Promise-Einhaltung
                </span>
                <span className={`font-mono text-xs font-bold tabular-nums ${getScoreTextColor(report.corePromise.score)}`}>
                  {report.corePromise.score}/100
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getScoreBarColor(report.corePromise.score)}`}
                  style={{ width: `${report.corePromise.score}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-700 leading-snug">
                <span className="font-semibold text-slate-900">Versprechen: </span>
                {book.corePromise}
              </p>

              {(report.corePromise.matchedTerms.length > 0 ||
                report.corePromise.missingTerms.length > 0) && (
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {report.corePromise.matchedTerms.slice(0, 5).map((term) => (
                    <span
                      key={`m-${term}`}
                      className="text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200"
                    >
                      ✓ {term}
                    </span>
                  ))}
                  {report.corePromise.missingTerms.slice(0, 4).map((term) => (
                    <span
                      key={`x-${term}`}
                      className="text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200"
                    >
                      Fehlt: {term}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Optional AI Deep Analysis Trigger */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onRunAiDeepAnalysis}
              disabled={aiLoading}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-md transition-colors"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  KI prüft Kapitel gegen Core Promise...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  KI-Tiefenanalyse & Editor-Markierungen ergänzen
                </>
              )}
            </button>

            {aiSummary && (
              <div className="p-2.5 text-[11px] text-blue-950 bg-blue-50 border border-blue-200 rounded-md leading-relaxed">
                <span className="font-semibold">KI-Lektoratsfazit: </span>
                {aiSummary}
              </div>
            )}

            {aiError && (
              <div role="alert" className="p-2.5 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md">
                {aiError}
              </div>
            )}
          </div>

          {/* Filterable Inline Improvement Suggestions List */}
          <div className="space-y-2.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-semibold text-slate-900">
                Verbesserungsvorschläge im Editor ({filteredIssues.length})
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-md text-[11px]">
              {(
                [
                  { id: 'all', label: 'Alle' },
                  { id: 'readability', label: 'Lesbar' },
                  { id: 'density', label: 'Dichte' },
                  { id: 'core-promise', label: 'Promise' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onChangeCategoryFilter(tab.id)}
                  className={`px-1.5 py-1 font-medium rounded transition-colors whitespace-nowrap ${
                    categoryFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {filteredIssues.length === 0 ? (
                <div className="p-3 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md">
                  Keine offenen Markierungen in dieser Kategorie – sehr sauber geschrieben!
                </div>
              ) : (
                filteredIssues.map((issue) => {
                  const style = CATEGORY_STYLE[issue.category];
                  const isActive = issue.id === activeIssueId;
                  return (
                    <div
                      key={issue.id}
                      data-testid={`performance-issue-${issue.id}`}
                      className={`p-3 rounded-md border border-l-4 transition-colors space-y-1.5 ${style.border} ${
                        isActive
                          ? 'border-blue-300 bg-blue-50/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSelectIssue(issue.id)}
                        className="w-full text-left space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 leading-snug">
                            {issue.title}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${style.badge}`}
                          >
                            {issue.source === 'ai' ? 'KI · ' : ''}
                            {style.label}
                          </span>
                        </div>
                        <div className="text-[11px] font-serif italic text-slate-600 line-clamp-2">
                          „{issue.excerpt}“
                        </div>
                        <div className="text-[11px] text-slate-700 leading-snug">
                          {issue.suggestion}
                        </div>
                      </button>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => onSelectIssue(issue.id)}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                        >
                          Im Editor zeigen
                        </button>
                        {!readOnly && issue.replacement !== undefined && (
                          <button
                            type="button"
                            onClick={() => onApplyIssueFix(issue)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors"
                          >
                            <Check className="w-3 h-3" />
                            Anwenden
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => onSendIssueToAnnotations(issue)}
                            title="Als Gegenlese-Anmerkung für die KI-Überarbeitung speichern"
                            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors"
                          >
                            <MessageSquarePlus className="w-3 h-3" />
                            Anmerkung
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Book-wide Chapter Performance Comparison */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <div className="text-xs font-semibold text-slate-900">
              Kapitel-Vergleich im Buch
            </div>
            <div className="space-y-1.5">
              {book.chapters.map((ch, idx) => {
                const chReport = allChapterReports[ch.id];
                const chScore = chReport ? chReport.overallScore : 0;
                const isCurrent = ch.id === activeChapter.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onSelectChapter(ch.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded text-left text-[11px] transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 text-blue-950 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono text-slate-400 mr-1.5">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      {ch.title}
                    </span>
                    <span
                      className={`font-mono font-semibold tabular-nums shrink-0 ${
                        chReport?.isEmpty ? 'text-slate-400' : getScoreTextColor(chScore)
                      }`}
                    >
                      {chReport?.isEmpty ? '–' : `${chScore}/100`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
