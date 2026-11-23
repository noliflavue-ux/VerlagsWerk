import React from 'react';
import {
  BookOpen,
  Compass,
  Cpu,
  FileCheck2,
  Image as ImageIcon,
  LayoutTemplate,
  Library,
  Lock,
  Megaphone,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { BookProject, WorkspaceStep } from '../types/book';
import { PILLARS } from '../data/seedBooks';
import { isBookLocked } from '../utils/bookStatus';

interface SidebarProps {
  books: BookProject[];
  activeBook: BookProject;
  activeStep: WorkspaceStep;
  openAnnotationsCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectStep: (step: WorkspaceStep) => void;
  onSelectBook: (id: string) => void;
  onOpenNewBook: () => void;
  onDeleteBook: (id: string) => void;
}

const WORKFLOW_STEPS: {
  id: WorkspaceStep;
  num: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', num: '00', label: 'Buchübersicht', icon: Library },
  { id: 'concept', num: '01', label: 'Thema & Konzept', icon: Compass },
  { id: 'manuscript', num: '02', label: 'Manuskript', icon: BookOpen },
  { id: 'cover', num: '03', label: 'Cover-Studio', icon: ImageIcon },
  { id: 'format', num: '04', label: 'Format & Vorschau', icon: LayoutTemplate },
  { id: 'marketing', num: '05', label: 'KDP-Marketing', icon: Megaphone },
  { id: 'publish', num: '06', label: 'KDP-Kopiervorlage', icon: FileCheck2 },
  { id: 'models', num: '07', label: 'KI-Modelle', icon: Cpu },
];

export function Sidebar({
  books,
  activeBook,
  activeStep,
  openAnnotationsCount,
  mobileOpen,
  onCloseMobile,
  onSelectStep,
  onSelectBook,
  onOpenNewBook,
  onDeleteBook,
}: SidebarProps) {
  const activeLocked = isBookLocked(activeBook);

  const sidebarBody = (
    <div className="flex h-full flex-col bg-white border-r border-slate-200">
      {/* Brand Wordmark */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
        <span className="font-serif text-lg font-semibold tracking-tight text-slate-900 whitespace-nowrap">
          VerlagsWerk KDP
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Navigation schließen"
          className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Book Project Switcher */}
      <div className="px-4 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500">Manuskripte</span>
          <button
            type="button"
            onClick={() => {
              onOpenNewBook();
              onCloseMobile();
            }}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Neues Buch
          </button>
        </div>

        <div className="space-y-1 max-h-44 overflow-y-auto">
          {books.map((book) => {
            const isSelected = book.id === activeBook.id;
            const locked = isBookLocked(book);
            const pillar = PILLARS[book.pillar];
            return (
              <div
                key={book.id}
                className={`group flex items-center justify-between gap-2 rounded-md px-2.5 py-2 transition-colors ${
                  isSelected
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    onSelectBook(book.id);
                    onCloseMobile();
                  }}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    {locked && (
                      <Lock
                        className="w-3 h-3 text-emerald-700 shrink-0"
                        aria-label="Eingereicht und gesperrt"
                      />
                    )}
                    <span className="text-xs font-semibold truncate">{book.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {pillar.label} · {locked ? 'Eingereicht' : 'In Arbeit'}
                  </div>
                </button>
                {books.length > 1 && !locked && (
                  <button
                    type="button"
                    onClick={() => onDeleteBook(book.id)}
                    aria-label={`Buch '${book.title}' löschen`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-slate-400 hover:text-red-600 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Guided Workflow Navigation */}
      <nav aria-label="Verlags-Workflow" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="px-2 mb-2 text-xs font-medium text-slate-500">
          Verlags-Workflow
        </div>
        <ul className="space-y-1">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <li key={step.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectStep(step.id);
                    onCloseMobile();
                  }}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md text-left text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-900 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    />
                    <span className="whitespace-nowrap">
                      <span className="font-mono text-[11px] text-slate-400 mr-1.5 tabular-nums">
                        {step.num}.
                      </span>
                      {step.label}
                    </span>
                  </span>
                  {step.id === 'overview' && (
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums shrink-0 whitespace-nowrap">
                      {books.length}
                    </span>
                  )}
                  {step.id === 'manuscript' && openAnnotationsCount > 0 && (
                    <span className="font-mono text-[11px] text-amber-700 tabular-nums shrink-0 whitespace-nowrap">
                      {openAnnotationsCount} offen
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Quiet Editorial Footer Note */}
      <div className="px-5 py-3.5 border-t border-slate-200 text-[11px] text-slate-500">
        <div className="flex items-center justify-between gap-2">
          <span>Schwerpunkt: {PILLARS[activeBook.pillar].label}</span>
          {activeLocked && (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <Lock className="w-3 h-3" />
              Gesperrt
            </span>
          )}
        </div>
        <div className="text-slate-400 mt-0.5">Lokale Speicherung aktiv</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[272px] shrink-0 h-screen sticky top-0">
        {sidebarBody}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-[280px] max-w-[85vw] h-full z-10 shadow-xl">
            {sidebarBody}
          </aside>
        </div>
      )}
    </>
  );
}
