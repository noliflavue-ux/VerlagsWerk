import React, { useState } from 'react';
import { ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import type { BookProject, PillarId } from '../types/book';
import { COVER_ARTWORKS, PILLAR_LIST, PILLARS } from '../data/seedBooks';

interface ConceptViewProps {
  book: BookProject;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
  onContinueToManuscript: () => void;
}

interface OutlineSuggestion {
  title: string;
  subtitle: string;
  corePromise: string;
  backCoverBlurb: string;
  chapters: { title: string; goal: string; keyPoints: string[] }[];
}

export function ConceptView({
  book,
  readOnly = false,
  onUpdateBook,
  onContinueToManuscript,
}: ConceptViewProps) {
  const [topicIdea, setTopicIdea] = useState(book.title);
  const [chapterCount, setChapterCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [suggestion, setSuggestion] = useState<OutlineSuggestion | null>(null);

  const activePillar = PILLARS[book.pillar];

  const handlePillarChange = (newPillar: PillarId) => {
    const def = PILLARS[newPillar];
    const matchingArt = COVER_ARTWORKS.find((a) => a.pillar === newPillar);
    onUpdateBook((prev) => ({
      ...prev,
      pillar: newPillar,
      cover: {
        ...prev.cover,
        artworkId: matchingArt ? matchingArt.id : prev.cover.artworkId,
        accentColor: def.defaultAccentColor,
      },
      kdp: {
        ...prev.kdp,
        categories: [...def.recommendedCategories] as [string, string, string],
      },
    }));
  };

  const handleGenerateOutline = async () => {
    const idea = topicIdea.trim() || book.title.trim();
    if (!idea) {
      setError('Bitte geben Sie zuerst eine Buchidee oder einen Arbeitstitel an.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar: book.pillar,
          topicIdea: idea,
          targetAudience: book.targetAudience,
          corePromise: book.corePromise,
          tone: book.tone,
          chapterCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der KI-Gliederung.');
      }
      setSuggestion(data as OutlineSuggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler bei der KI-Anfrage.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = () => {
    if (!suggestion) return;
    onUpdateBook((prev) => ({
      ...prev,
      title: suggestion.title || prev.title,
      subtitle: suggestion.subtitle || prev.subtitle,
      corePromise: suggestion.corePromise || prev.corePromise,
      cover: {
        ...prev.cover,
        backCoverBlurb: suggestion.backCoverBlurb || prev.cover.backCoverBlurb,
        spineText: `${suggestion.title || prev.title} · ${prev.author}`,
      },
      chapters: suggestion.chapters.map((ch, idx) => ({
        id: `ch-${Date.now()}-${idx + 1}`,
        title: ch.title,
        goal: ch.goal,
        content:
          ch.keyPoints && ch.keyPoints.length > 0
            ? `## Geplante Schwerpunkte\n\n${ch.keyPoints.map((kp) => `- ${kp}`).join('\n')}`
            : '',
        annotations: [],
      })),
    }));
    setSuggestion(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Section Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="text-xs font-medium text-slate-500 mb-1.5">
          Schritt 01 · Verpflichtendes Fundament jedes Bestsellers
        </div>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
          Grundbedürfnis & Buchkonzept festlegen
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-3xl leading-relaxed">
          Seit Jahrhunderten tragen genau vier zeitlose Themen dauerhaft Nachfrage auf dem Buchmarkt:
          Geld, Beziehung, Glück und Gesundheit. Wählen Sie den klaren Schwerpunkt dieses Manuskripts –
          die KI richtet Gliederung, Kapitelentwürfe, Cover und Amazon-KDP-Vermarktung konsequent darauf aus.
        </p>
      </div>

      {/* 4 Evergreen Pillars Grid */}
      <fieldset disabled={readOnly} className={`space-y-10 ${readOnly ? 'opacity-80' : ''}`}>
      <section aria-labelledby="pillars-heading">
        <h2 id="pillars-heading" className="text-sm font-semibold text-slate-900 mb-3">
          Zeitloses Grundbedürfnis als Schwerpunkt
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {PILLAR_LIST.map((item) => {
            const isSelected = book.pillar === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePillarChange(item.id)}
                aria-pressed={isSelected}
                className={`p-4 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-700 bg-white ring-1 ring-blue-700'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-serif text-lg font-semibold text-slate-900">
                      {item.label}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    >
                      {isSelected ? 'Aktiv' : 'Wählen'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {item.tagline}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  {item.coreDesire}
                </div>
              </button>
            );
          })}
        </div>

        {/* Pillar Guidance Strip */}
        <div className="mt-4 p-4 bg-white border border-slate-200 rounded-lg">
          <div className="text-xs font-semibold text-slate-900">
            Typische Kaufmotive im Schwerpunkt {activePillar.label}
          </div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-600">
            {activePillar.readerPainPoints.map((point, index) => (
              <div key={point} className="leading-relaxed">
                <span className="font-mono text-slate-400 mr-1.5 tabular-nums">
                  0{index + 1}.
                </span>
                {point}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Book Positioning Form + Guided AI Outline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Core Book Brief */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <h2 className="text-base font-semibold text-slate-900">
            Manuskript-Steckbrief
          </h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="concept-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Buchtitel
              </label>
              <input
                id="concept-title"
                type="text"
                value={book.title}
                onChange={(e) =>
                  onUpdateBook((prev) => ({
                    ...prev,
                    title: e.target.value,
                    cover: {
                      ...prev.cover,
                      spineText: `${e.target.value} · ${prev.author}`,
                    },
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label htmlFor="concept-subtitle" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Untertitel (Nutzenversprechen für Amazon-Suche)
              </label>
              <input
                id="concept-subtitle"
                type="text"
                value={book.subtitle}
                onChange={(e) =>
                  onUpdateBook((prev) => ({ ...prev, subtitle: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="concept-author" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Autor / Pseudonym
                </label>
                <input
                  id="concept-author"
                  type="text"
                  value={book.author}
                  onChange={(e) =>
                    onUpdateBook((prev) => ({ ...prev, author: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                />
              </div>
              <div>
                <label htmlFor="concept-tone" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Stil & Tonalität für die KI
                </label>
                <input
                  id="concept-tone"
                  type="text"
                  value={book.tone}
                  onChange={(e) =>
                    onUpdateBook((prev) => ({ ...prev, tone: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
                />
              </div>
            </div>

            <div>
              <label htmlFor="concept-audience" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Zielgruppe (Alter, Alltag, Ausgangslage)
              </label>
              <textarea
                id="concept-audience"
                rows={2}
                value={book.targetAudience}
                onChange={(e) =>
                  onUpdateBook((prev) => ({ ...prev, targetAudience: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>

            <div>
              <label htmlFor="concept-promise" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Zentrales Buchversprechen
              </label>
              <textarea
                id="concept-promise"
                rows={2}
                value={book.corePromise}
                onChange={(e) =>
                  onUpdateBook((prev) => ({ ...prev, corePromise: e.target.value }))
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
              />
            </div>
          </div>
        </div>

        {/* Guided LLM Outline Generator */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Geführte KI-Gliederung
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Das Sprachmodell entwickelt passend zum Schwerpunkt <strong>{activePillar.label}</strong> einen
              klaren Titelvorschlag, Klappentext und eine vollständige Kapitelstruktur.
            </p>
          </div>

          <div>
            <label htmlFor="ai-topic-idea" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Konkrete Buchidee oder Blickwinkel
            </label>
            <textarea
              id="ai-topic-idea"
              rows={3}
              value={topicIdea}
              onChange={(e) => setTopicIdea(e.target.value)}
              placeholder={`z. B. Praktischer Leitfaden im Bereich ${activePillar.label} für Berufstätige...`}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            />
          </div>

          <div>
            <label htmlFor="ai-chapter-count" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Anzahl geplanter Kapitel
            </label>
            <select
              id="ai-chapter-count"
              value={chapterCount}
              onChange={(e) => setChapterCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-700"
            >
              <option value={4}>4 Kapitel (Kompakt-Ratgeber)</option>
              <option value={6}>6 Kapitel (Standard-Sachbuch)</option>
              <option value={8}>8 Kapitel (Vertiefender Leitfaden)</option>
              <option value={10}>10 Kapitel (Umfassendes Handbuch)</option>
            </select>
          </div>

          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerateOutline}
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                KI erstellt Buchkonzept...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Buchkonzept & Gliederung mit KI generieren
              </>
            )}
          </button>

          {suggestion && (
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="text-xs font-semibold text-slate-900">
                KI-Vorschlag bereit zur Übernahme
              </div>
              <div className="text-sm font-serif font-semibold text-slate-900">
                {suggestion.title}
              </div>
              <div className="text-xs text-slate-600">{suggestion.subtitle}</div>
              <ol className="space-y-1.5 text-xs text-slate-700 max-h-48 overflow-y-auto pt-1">
                {suggestion.chapters.map((ch, idx) => (
                  <li key={idx} className="leading-snug">
                    <span className="font-mono text-slate-400 mr-1.5 tabular-nums">
                      0{idx + 1}.
                    </span>
                    <span className="font-medium text-slate-900">{ch.title}</span>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleApplySuggestion}
                  className="flex-1 px-3 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
                >
                  Konzept & Kapitel übernehmen
                </button>
                <button
                  type="button"
                  onClick={() => setSuggestion(null)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Verwerfen
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
      </fieldset>

      {/* Current Chapter Structure Summary & Next Step */}
      <section className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Aktuelle Kapitelstruktur ({book.chapters.length} Kapitel)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Jedes Kapitel wird im nächsten Schritt gezielt entworfen, gegengelesen und nach Ihren Anmerkungen verfeinert.
            </p>
          </div>
          <button
            type="button"
            onClick={onContinueToManuscript}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0"
          >
            Weiter zum Manuskript
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100 mt-2">
          {book.chapters.map((ch, idx) => (
            <div key={ch.id} className="py-3 flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900">
                  <span className="font-mono text-xs text-slate-400 mr-2 tabular-nums">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  {ch.title}
                </div>
                {ch.goal && (
                  <p className="text-xs text-slate-500 mt-0.5 pl-7">{ch.goal}</p>
                )}
              </div>
              <div className="text-xs font-mono text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                {ch.content.trim() ? `${ch.content.trim().split(/\s+/).length} Wörter` : 'Noch leer'}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
