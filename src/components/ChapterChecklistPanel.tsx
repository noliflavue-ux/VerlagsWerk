import React from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Loader2,
  MessageSquarePlus,
  Plus,
  Sparkles,
} from 'lucide-react';
import type { BookProject, Chapter } from '../types/book';
import type {
  ChapterChecklistItem,
  ChapterChecklistReport,
  ChecklistElementId,
  ChecklistStatus,
} from '../utils/chapterChecklist';

interface ChapterChecklistPanelProps {
  book: BookProject;
  activeChapter: Chapter;
  report: ChapterChecklistReport;
  allChapterChecklists: Record<string, ChapterChecklistReport>;
  manualOverrides: Partial<Record<ChecklistElementId, boolean>>;
  readOnly?: boolean;
  aiLoading: boolean;
  aiError: string;
  onInsertElement: (item: ChapterChecklistItem) => void;
  onSendToAnnotations: (item: ChapterChecklistItem) => void;
  onToggleManualOverride: (elementId: ChecklistElementId) => void;
  onRunAiRefineChecklist: () => void;
  onSelectChapter: (chapterId: string) => void;
}

const STATUS_CONFIG: Record<
  ChecklistStatus,
  { label: string; badgeClass: string; borderClass: string }
> = {
  present: {
    label: 'Enthalten',
    badgeClass: 'text-emerald-800 bg-emerald-50 border-emerald-200',
    borderClass: 'border-l-emerald-500',
  },
  partial: {
    label: 'Teilweise',
    badgeClass: 'text-amber-900 bg-amber-50 border-amber-200',
    borderClass: 'border-l-amber-500',
  },
  missing: {
    label: 'Fehlt',
    badgeClass: 'text-rose-900 bg-rose-50 border-rose-200',
    borderClass: 'border-l-rose-500',
  },
};

export function ChapterChecklistPanel({
  book,
  activeChapter,
  report,
  allChapterChecklists,
  manualOverrides,
  readOnly = false,
  aiLoading,
  aiError,
  onInsertElement,
  onSendToAnnotations,
  onToggleManualOverride,
  onRunAiRefineChecklist,
  onSelectChapter,
}: ChapterChecklistPanelProps) {
  const progressBarColor =
    report.completionPercent >= 85
      ? 'bg-emerald-600'
      : report.completionPercent >= 55
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <div
      data-testid="chapter-checklist-panel"
      className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-5"
    >
      {/* Header + Progress Summary */}
      <div className="space-y-3 border-b border-slate-200 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-800 mb-0.5">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Core-Promise-Prüfung pro Kapitel
            </div>
            <h2 className="text-sm font-semibold text-slate-900">
              Inhalts-Checkliste
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">
              {report.summaryLabel}
            </p>
          </div>

          <div className="text-right shrink-0">
            <div
              data-testid="checklist-progress-fraction"
              className="font-mono text-2xl font-bold tabular-nums leading-none text-slate-900"
            >
              {report.presentCount}
              <span className="text-xs font-normal text-slate-400">/{report.totalCount}</span>
            </div>
            <div className="text-[11px] font-mono text-slate-500 mt-1 tabular-nums">
              {report.completionPercent} % erfüllt
            </div>
          </div>
        </div>

        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressBarColor}`}
            style={{ width: `${report.completionPercent}%` }}
          />
        </div>

        {/* Active Core Promise Reference */}
        <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700 leading-relaxed">
          <span className="font-semibold text-slate-900">Basis Core Promise: </span>
          {report.corePromiseUsed}
        </div>
      </div>

      {/* 5 Checklist Items */}
      <div className="space-y-2.5" data-testid="checklist-items-list">
        {report.items.map((item) => {
          const cfg = STATUS_CONFIG[item.status];
          const isManuallyChecked = Boolean(manualOverrides[item.id]);
          const StatusIcon =
            item.status === 'present'
              ? CheckCircle2
              : item.status === 'partial'
                ? AlertCircle
                : CircleDashed;

          return (
            <div
              key={item.id}
              data-testid={`checklist-item-${item.id}`}
              data-checklist-status={item.status}
              className={`p-3 rounded-md border border-slate-200 border-l-4 ${cfg.borderClass} bg-white space-y-2`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <StatusIcon
                    className={`w-4 h-4 mt-0.5 shrink-0 ${
                      item.status === 'present'
                        ? 'text-emerald-600'
                        : item.status === 'partial'
                          ? 'text-amber-600'
                          : 'text-rose-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 leading-snug">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      {item.corePromiseRequirement}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded border shrink-0 whitespace-nowrap ${cfg.badgeClass}`}
                >
                  {cfg.label}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50 rounded px-2.5 py-1.5 leading-snug">
                {item.evidence}
              </div>

              {item.aiNote && (
                <div className="text-[11px] text-blue-900 bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 leading-snug">
                  <span className="font-semibold">KI-Prüfhinweis: </span>
                  {item.aiNote}
                </div>
              )}

              {!readOnly && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {item.status !== 'present' && (
                    <button
                      type="button"
                      onClick={() => onInsertElement(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded transition-colors whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3 shrink-0" />
                      Baustein einfügen
                    </button>
                  )}

                  {item.status !== 'present' && (
                    <button
                      type="button"
                      onClick={() => onSendToAnnotations(item)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors whitespace-nowrap"
                    >
                      <MessageSquarePlus className="w-3 h-3 shrink-0" />
                      Anmerkung
                    </button>
                  )}

                  {(item.status !== 'present' || isManuallyChecked) && (
                    <button
                      type="button"
                      onClick={() => onToggleManualOverride(item.id)}
                      aria-pressed={isManuallyChecked}
                      className="inline-flex items-center gap-1 px-1.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 rounded transition-colors whitespace-nowrap"
                    >
                      <Check className="w-3 h-3 shrink-0" />
                      {isManuallyChecked ? 'Abhaken aufheben' : 'Abhaken'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional AI Checklist Refinement */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={onRunAiRefineChecklist}
          disabled={aiLoading || readOnly}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors"
        >
          {aiLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              KI erstellt kapitelgenaue Bausteine...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Checkliste & Bausteine mit KI vertiefen
            </>
          )}
        </button>

        {aiError && (
          <div
            role="alert"
            className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-md px-2.5 py-2"
          >
            {aiError}
          </div>
        )}
      </div>

      {/* Book-wide Checklist Overview across all Chapters */}
      <div className="pt-3 border-t border-slate-200 space-y-2">
        <div className="text-xs font-semibold text-slate-900">
          Checklisten-Stand aller Kapitel
        </div>
        <div className="space-y-1.5">
          {book.chapters.map((ch, idx) => {
            const chCheck = allChapterChecklists[ch.id];
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
                    !chCheck || chCheck.isEmpty
                      ? 'text-slate-400'
                      : chCheck.presentCount === chCheck.totalCount
                        ? 'text-emerald-700'
                        : chCheck.presentCount >= 3
                          ? 'text-amber-700'
                          : 'text-rose-700'
                  }`}
                >
                  {chCheck ? `${chCheck.presentCount}/${chCheck.totalCount}` : '0/5'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
