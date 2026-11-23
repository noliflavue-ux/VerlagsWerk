import React, { useState } from 'react';
import { Check, Dices, Loader2, Search, X } from 'lucide-react';
import type { PillarId } from '../types/book';
import { PILLAR_LIST, PILLARS } from '../data/seedBooks';
import {
  type BookIdeaProposal,
  drawLuckyBookIdeas,
} from '../utils/ideaGenerator';

interface NewBookModalProps {
  open: boolean;
  defaultAuthor: string;
  onClose: () => void;
  onCreate: (data: {
    pillar: PillarId;
    title: string;
    subtitle: string;
    author: string;
    targetAudience: string;
    corePromise: string;
    sampleChapters?: string[];
  }) => void;
}

export function NewBookModal({
  open,
  defaultAuthor,
  onClose,
  onCreate,
}: NewBookModalProps) {
  const [pillar, setPillar] = useState<PillarId | ''>('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [author, setAuthor] = useState(defaultAuthor);
  const [targetAudience, setTargetAudience] = useState('');
  const [corePromise, setCorePromise] = useState('');
  const [sampleChapters, setSampleChapters] = useState<string[] | undefined>(undefined);
  const [error, setError] = useState('');

  // Lucky Try / Überrasch-mich state
  const [luckyProposals, setLuckyProposals] = useState<BookIdeaProposal[]>([]);
  const [selectedLuckyId, setSelectedLuckyId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [luckyError, setLuckyError] = useState('');

  if (!open) return null;

  const handleLuckyTry = () => {
    setLuckyError('');
    const filter: PillarId | 'all' = pillar || 'all';
    const next = drawLuckyBookIdeas(
      filter,
      3,
      luckyProposals.map((p) => p.id)
    );
    setLuckyProposals(next);
    setSelectedLuckyId(null);
  };

  const handleAiLuckyResearch = async () => {
    setAiLoading(true);
    setLuckyError('');
    try {
      const res = await fetch('/api/ai/research-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillarFilter: pillar || 'all',
          nicheHint: title.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'KI-Vorschläge konnten nicht geladen werden.');
      }
      const validPillars: PillarId[] = ['geld', 'beziehung', 'glueck', 'gesundheit'];
      const normalized: BookIdeaProposal[] = (Array.isArray(data.ideas) ? data.ideas : []).map(
        (item: Partial<BookIdeaProposal>, idx: number) => ({
          id: item.id || `lucky-ai-${Date.now()}-${idx}`,
          pillar: validPillars.includes(item.pillar as PillarId)
            ? (item.pillar as PillarId)
            : pillar || 'geld',
          title: item.title || 'Neues Buchkonzept',
          subtitle: item.subtitle || '',
          targetAudience: item.targetAudience || '',
          corePromise: item.corePromise || '',
          marketAngle: item.marketAngle || '',
          sampleChapters: Array.isArray(item.sampleChapters) ? item.sampleChapters : [],
        })
      );
      setLuckyProposals(normalized);
      setSelectedLuckyId(null);
    } catch (err) {
      setLuckyError(
        err instanceof Error ? err.message : 'Fehler beim Laden der KI-Buchvorschläge.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handlePickProposal = (proposal: BookIdeaProposal) => {
    setSelectedLuckyId(proposal.id);
    setPillar(proposal.pillar);
    setTitle(proposal.title);
    setSubtitle(proposal.subtitle);
    setTargetAudience(proposal.targetAudience);
    setCorePromise(proposal.corePromise);
    setSampleChapters(
      proposal.sampleChapters.length > 0 ? proposal.sampleChapters : undefined
    );
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pillar) {
      setError('Bitte wählen Sie eines der vier zeitlosen Grundbedürfnisse als Schwerpunkt.');
      return;
    }
    if (!title.trim()) {
      setError('Bitte geben Sie einen Arbeitstitel für das Manuskript ein.');
      return;
    }
    if (!author.trim()) {
      setError('Bitte geben Sie einen Autorennamen ein.');
      return;
    }

    onCreate({
      pillar,
      title,
      subtitle,
      author,
      targetAudience,
      corePromise,
      sampleChapters,
    });
    setPillar('');
    setTitle('');
    setSubtitle('');
    setTargetAudience('');
    setCorePromise('');
    setSampleChapters(undefined);
    setLuckyProposals([]);
    setSelectedLuckyId(null);
    setError('');
    setLuckyError('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-book-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 id="new-book-title" className="font-serif text-xl font-semibold text-slate-900">
            Neues KDP-Manuskript anlegen
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Dialog schließen"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Lucky Try / Überrasch mich Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Inspiration gesucht? Überrasch mich (Lucky Try)
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Lassen Sie sich 3 konkrete KDP-Buchideen mit starkem Core Promise vorschlagen und wählen Sie Ihren Favoriten per Klick aus.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleLuckyTry}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors whitespace-nowrap"
                >
                  <Dices className="w-3.5 h-3.5" />
                  {luckyProposals.length > 0 ? 'Neu würfeln (Lucky Try)' : 'Überrasch mich (Lucky Try)'}
                </button>
                <button
                  type="button"
                  onClick={handleAiLuckyResearch}
                  disabled={aiLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      KI recherchiert...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Mit KI recherchieren
                    </>
                  )}
                </button>
              </div>
            </div>

            {luckyError && (
              <div
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {luckyError}
              </div>
            )}

            {luckyProposals.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {luckyProposals.map((proposal) => {
                  const isPicked = selectedLuckyId === proposal.id;
                  return (
                    <button
                      key={proposal.id}
                      type="button"
                      onClick={() => handlePickProposal(proposal)}
                      className={`p-3 rounded-md border text-left transition-colors flex flex-col justify-between gap-2 ${
                        isPicked
                          ? 'border-blue-700 bg-white ring-1 ring-blue-700'
                          : 'border-slate-200 bg-white hover:border-slate-400'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="font-semibold text-blue-800">
                            {PILLARS[proposal.pillar].label}
                          </span>
                          {isPicked && (
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 font-semibold">
                              <Check className="w-3 h-3" />
                              Gewählt
                            </span>
                          )}
                        </div>
                        <div className="font-serif text-sm font-semibold text-slate-900 leading-snug">
                          {proposal.title}
                        </div>
                        <div className="text-[11px] text-slate-600 leading-relaxed">
                          {proposal.subtitle}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 leading-snug">
                        {proposal.corePromise}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-1">
              1. Verpflichtender Schwerpunkt (Grundbedürfnis)
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Jedes Manuskript richtet Gliederung, Tonalität, Cover und KDP-Vermarktung konsequent auf eines der vier zeitlosen Verkaufsthemen aus.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PILLAR_LIST.map((item) => {
                const selected = pillar === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPillar(item.id);
                      setError('');
                    }}
                    className={`p-3.5 rounded-md border text-left transition-colors ${
                      selected
                        ? 'border-blue-700 bg-blue-50/70 text-slate-900'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.tagline}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="modal-book-title"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Arbeitstitel *
              </label>
              <input
                id="modal-book-title"
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setError('');
                }}
                placeholder="z. B. Ruhiger schlafen, länger leben"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="modal-book-author"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Autor / Pseudonym *
              </label>
              <input
                id="modal-book-author"
                type="text"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  setError('');
                }}
                placeholder="z. B. Martin Lindner"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="modal-book-subtitle"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Untertitel (optional, später mit KI verfeinerbar)
            </label>
            <input
              id="modal-book-subtitle"
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="z. B. Evidenzbasierte Abendroutinen für messbar tiefere Regeneration"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="modal-book-audience"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Zielgruppe
              </label>
              <input
                id="modal-book-audience"
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="z. B. Berufstätige mit Schlafproblemen, 30–55 Jahre"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label
                htmlFor="modal-book-promise"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Zentrales Nutzenversprechen (Core Promise)
              </label>
              <input
                id="modal-book-promise"
                type="text"
                value={corePromise}
                onChange={(e) => setCorePromise(e.target.value)}
                placeholder="z. B. In 14 Tagen zu spürbar mehr Tagesenergie"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
          </div>

          {sampleChapters && sampleChapters.length > 0 && (
            <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
              <span className="font-semibold text-slate-900">
                Kapitelstruktur aus Vorschlag wird übernommen ({sampleChapters.length} Kapitel):{' '}
              </span>
              {sampleChapters.join(' · ')}
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors"
            >
              Manuskript anlegen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
