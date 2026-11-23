import React, { useState } from 'react';
import { Check, Copy, Loader2, Play } from 'lucide-react';
import type { BookProject } from '../types/book';
import {
  buildKdpPrompts,
  utf8ByteLength,
  validateKdpMetadata,
} from '../utils/kdpEngine';
import { PILLARS } from '../data/seedBooks';

interface MarketingPromptsViewProps {
  book: BookProject;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
}

export function MarketingPromptsView({
  book,
  readOnly = false,
  onUpdateBook,
}: MarketingPromptsViewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);
  const [promptOutputs, setPromptOutputs] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [descTab, setDescTab] = useState<'edit' | 'preview'>('edit');

  const prompts = buildKdpPrompts(book);
  const validation = validateKdpMetadata(book);

  const updateKdp = (patch: Partial<BookProject['kdp']>) => {
    onUpdateBook((prev) => ({
      ...prev,
      kdp: { ...prev.kdp, ...patch },
    }));
  };

  const handleKeywordChange = (index: number, value: string) => {
    const next = [...book.kdp.keywords] as BookProject['kdp']['keywords'];
    next[index] = value;
    updateKdp({ keywords: next });
  };

  const handleCategoryChange = (index: number, value: string) => {
    const next = [...book.kdp.categories] as BookProject['kdp']['categories'];
    next[index] = value;
    updateKdp({ categories: next });
  };

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleRunPrompt = async (promptItem: (typeof prompts)[number]) => {
    setRunningPromptId(promptItem.id);
    setError('');
    try {
      const res = await fetch('/api/ai/kdp-marketing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: promptItem.mode,
          customPrompt: promptItem.prompt,
          bookContext: {
            pillar: book.pillar,
            title: book.title,
            subtitle: book.subtitle,
            targetAudience: book.targetAudience,
            corePromise: book.corePromise,
            chapters: book.chapters.map((c) => ({ title: c.title, goal: c.goal })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'KI-Ausführung fehlgeschlagen.');

      if (promptItem.mode === 'full-metadata') {
        const keywords = [...book.kdp.keywords] as BookProject['kdp']['keywords'];
        if (Array.isArray(data.keywords)) {
          for (let i = 0; i < 7; i++) {
            if (typeof data.keywords[i] === 'string') {
              keywords[i] = data.keywords[i];
            }
          }
        }
        const categories = [...book.kdp.categories] as BookProject['kdp']['categories'];
        if (Array.isArray(data.categories)) {
          for (let i = 0; i < 3; i++) {
            if (typeof data.categories[i] === 'string') {
              categories[i] = data.categories[i];
            }
          }
        }
        updateKdp({
          descriptionHtml: data.descriptionHtml || book.kdp.descriptionHtml,
          keywords,
          categories,
          subtitleSuggestions: Array.isArray(data.subtitleSuggestions)
            ? data.subtitleSuggestions
            : book.kdp.subtitleSuggestions,
        });
        setPromptOutputs((prev) => ({
          ...prev,
          [promptItem.id]:
            'KDP-Beschreibung, alle 7 Backend-Keywords und 3 Kategorien wurden direkt in Ihre Buchdaten übernommen.',
        }));
      } else {
        setPromptOutputs((prev) => ({
          ...prev,
          [promptItem.id]: data.output || '',
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der KI-Anfrage.');
    } finally {
      setRunningPromptId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="text-xs font-medium text-slate-500 mb-1">
          Schritt 05 · Schwerpunkt {PILLARS[book.pillar].label} · Amazon-Sichtbarkeit & Konversion
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
          KDP-Marketing & KI-Prompt-Bibliothek
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl">
          Pflegen Sie KDP-HTML-Beschreibung, 7 Backend-Keywords (mit Echtzeit-Byte-Prüfung) und Kategorien – oder nutzen Sie die vorgefüllten KI-Prompts direkt per Klick oder zum Kopieren.
        </p>
      </div>

      {error && (
        <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {/* KDP Metadata Editor with Live Compliance Check */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* HTML Description */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Amazon KDP-Buchbeschreibung (HTML)
              </h2>
              <div
                className={`text-xs font-mono tabular-nums mt-0.5 ${
                  validation.descriptionTooLong ? 'text-red-700 font-semibold' : 'text-slate-500'
                }`}
              >
                {validation.descriptionLength} / 4.000 Zeichen
              </div>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setDescTab('edit')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  descTab === 'edit' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                HTML-Code
              </button>
              <button
                type="button"
                onClick={() => setDescTab('preview')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                  descTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                }`}
              >
                Amazon-Vorschau
              </button>
            </div>
          </div>

          {descTab === 'edit' ? (
            <textarea
              aria-label="KDP-Buchbeschreibung HTML"
              rows={13}
              disabled={readOnly}
              value={book.kdp.descriptionHtml}
              onChange={(e) => updateKdp({ descriptionHtml: e.target.value })}
              className="w-full font-mono text-xs leading-relaxed border border-slate-300 rounded-md p-3 focus:outline-none focus:border-blue-700 disabled:bg-slate-50 disabled:cursor-not-allowed"
            />
          ) : (
            <div
              className="min-h-[260px] p-4 border border-slate-200 rounded-md bg-slate-50/50 text-sm text-slate-800 space-y-2.5 [&_h4]:font-semibold [&_h4]:text-base [&_h4]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_b]:font-semibold"
              dangerouslySetInnerHTML={{ __html: book.kdp.descriptionHtml }}
            />
          )}

          {/* Subtitle Suggestions */}
          {book.kdp.subtitleSuggestions && book.kdp.subtitleSuggestions.length > 0 && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-xs font-semibold text-slate-700">
                Untertitel-Varianten (per Klick übernehmen)
              </div>
              <div className="space-y-1.5">
                {book.kdp.subtitleSuggestions.map((sub, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={readOnly}
                    onClick={() =>
                      onUpdateBook((prev) => ({ ...prev, subtitle: sub }))
                    }
                    className="w-full text-left text-xs text-slate-700 hover:text-blue-800 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 rounded-md px-3 py-2 transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 7 Backend Keywords & 3 Categories */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                7 Amazon Backend-Keywords (je max. 50 Bytes)
              </h2>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {book.kdp.keywords.filter((k) => k.trim()).length} / 7 befüllt
              </span>
            </div>

            {validation.duplicateWordsInKeywords.length > 0 && (
              <div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Hinweis: Folgende Wörter stehen bereits im Titel/Untertitel und kosten unnötig Keyword-Platz:{' '}
                <strong>{validation.duplicateWordsInKeywords.join(', ')}</strong>
              </div>
            )}

            <div className="mt-3 space-y-2">
              {book.kdp.keywords.map((kw, idx) => {
                const bytes = utf8ByteLength(kw.trim());
                const over = bytes > 50;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <label
                      htmlFor={`kdp-kw-${idx}`}
                      className="font-mono text-xs text-slate-400 w-5 shrink-0 tabular-nums"
                    >
                      {idx + 1}.
                    </label>
                    <input
                      id={`kdp-kw-${idx}`}
                      type="text"
                      disabled={readOnly}
                      value={kw}
                      onChange={(e) => handleKeywordChange(idx, e.target.value)}
                      placeholder={`Suchphrase ${idx + 1} (ohne Kommas)`}
                      className={`flex-1 px-3 py-1.5 text-xs border rounded-md focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed ${
                        over
                          ? 'border-red-400 bg-red-50/40 focus:border-red-600'
                          : 'border-slate-300 focus:border-blue-700'
                      }`}
                    />
                    <span
                      className={`font-mono text-[11px] w-16 text-right tabular-nums shrink-0 ${
                        over ? 'text-red-700 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      {bytes}/50 B
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2.5">
            <h3 className="text-sm font-semibold text-slate-900">
              Amazon KDP-Kategorien (bis zu 3)
            </h3>
            {book.kdp.categories.map((cat, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <label
                  htmlFor={`kdp-cat-${idx}`}
                  className="font-mono text-xs text-slate-400 w-5 shrink-0 tabular-nums"
                >
                  {idx + 1}.
                </label>
                <input
                  id={`kdp-cat-${idx}`}
                  type="text"
                  disabled={readOnly}
                  value={cat}
                  onChange={(e) => handleCategoryChange(idx, e.target.value)}
                  placeholder={`Kategoriepfad ${idx + 1}`}
                  className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 disabled:bg-slate-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curated Dynamic KI-Prompts Library */}
      <section aria-labelledby="prompt-library-heading" className="space-y-4">
        <div>
          <h2 id="prompt-library-heading" className="text-base font-semibold text-slate-900">
            Kuratierte KI-Prompts für Amazon KDP
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Alle Prompts sind automatisch mit Ihrem Buchtitel, Grundbedürfnis ({PILLARS[book.pillar].label}) und Kapitelplan befüllt. Sie können jeden Prompt direkt hier ausführen oder für externe Tools kopieren.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {prompts.map((item) => {
            const isRunning = runningPromptId === item.id;
            const output = promptOutputs[item.id];
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 min-w-0"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{item.purpose}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(item.id, item.prompt)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" />
                          Kopiert
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          Prompt kopieren
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunPrompt(item)}
                      disabled={runningPromptId !== null || readOnly}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {isRunning ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Wird ausgeführt...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" />
                          {item.mode === 'full-metadata'
                            ? 'Ausführen & übernehmen'
                            : 'Mit KI ausführen'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 overflow-x-auto">
                  {item.prompt}
                </pre>

                {output && (
                  <div className="pt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-800">
                        KI-Ergebnis
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyPrompt(`out-${item.id}`, output)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                      >
                        {copiedId === `out-${item.id}` ? 'Kopiert' : 'Ergebnis kopieren'}
                      </button>
                    </div>
                    <div className="whitespace-pre-wrap text-xs text-slate-800 bg-emerald-50/50 border border-emerald-200 rounded-md p-3 leading-relaxed">
                      {output}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
