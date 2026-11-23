import React, { useState } from 'react';
import {
  ArrowRight,
  BookMarked,
  Check,
  Compass,
  Dices,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import type { BookProject, Chapter, PillarId } from '../types/book';
import { COVER_ARTWORKS, PILLAR_LIST, PILLARS } from '../data/seedBooks';
import {
  appendSegmentToChapter,
  type BookIdeaProposal,
  drawLuckyBookIdeas,
} from '../utils/ideaGenerator';

export interface CopilotSegmentSuggestion {
  id: string;
  label: string;
  subheading: string;
  promiseAlignment: string;
  content: string;
}

interface WritingCopilotPanelProps {
  book: BookProject;
  activeChapter: Chapter;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
  onSelectChapter: (chapterId: string) => void;
  onStatusMessage: (msg: string) => void;
}

const SEGMENT_TYPES = [
  'Einstieg & Leser-Hook',
  'Kernargument vertiefen',
  'Konkretes Praxisbeispiel',
  'Übung & Checkliste',
  'Kapitel-Abschluss & Übergang',
];

export function WritingCopilotPanel({
  book,
  activeChapter,
  readOnly = false,
  onUpdateBook,
  onSelectChapter,
  onStatusMessage,
}: WritingCopilotPanelProps) {
  const [subTab, setSubTab] = useState<'segments' | 'ideas'>('segments');

  // Segment suggestions state
  const [segmentType, setSegmentType] = useState(SEGMENT_TYPES[0]);
  const [directionHint, setDirectionHint] = useState('');
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [segmentsError, setSegmentsError] = useState('');
  const [suggestions, setSuggestions] = useState<CopilotSegmentSuggestion[]>([]);
  const [insertedIds, setInsertedIds] = useState<Record<string, boolean>>({});

  // Book research & step-by-step elaboration state
  const [researchPillar, setResearchPillar] = useState<PillarId | 'all'>(book.pillar);
  const [nicheHint, setNicheHint] = useState('');
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState('');
  const [ideas, setIdeas] = useState<BookIdeaProposal[]>(() =>
    drawLuckyBookIdeas(book.pillar, 3)
  );
  const [selectedIdea, setSelectedIdea] = useState<BookIdeaProposal | null>(null);
  const [elaborationStepDone, setElaborationStepDone] = useState<{
    step1: boolean;
    step2: boolean;
    step3: boolean;
  }>({ step1: false, step2: false, step3: false });
  const [elaborationBusy, setElaborationBusy] = useState<null | 'step2' | 'step3'>(null);

  const handleGenerateSegments = async () => {
    setSegmentsLoading(true);
    setSegmentsError('');
    try {
      const res = await fetch('/api/ai/copilot-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: book.title,
          bookSubtitle: book.subtitle,
          pillar: book.pillar,
          corePromise: book.corePromise,
          targetAudience: book.targetAudience,
          tone: book.tone,
          chapterTitle: activeChapter.title,
          chapterGoal: activeChapter.goal,
          existingContent: activeChapter.content,
          segmentType,
          directionHint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Vorschläge konnten nicht generiert werden.');
      }
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      setInsertedIds({});
    } catch (err) {
      setSegmentsError(
        err instanceof Error ? err.message : 'Fehler beim Abrufen der Co-Pilot-Vorschläge.'
      );
    } finally {
      setSegmentsLoading(false);
    }
  };

  const handleInsertSegment = (
    suggestion: CopilotSegmentSuggestion,
    replaceAll: boolean
  ) => {
    onUpdateBook((prev) => ({
      ...prev,
      chapters: prev.chapters.map((ch) => {
        if (ch.id !== activeChapter.id) return ch;
        const nextContent = replaceAll
          ? appendSegmentToChapter('', suggestion.subheading, suggestion.content)
          : appendSegmentToChapter(ch.content, suggestion.subheading, suggestion.content);
        return {
          ...ch,
          previousContent: ch.content,
          content: nextContent,
          lastRevisionSummary: replaceAll
            ? `Co-Pilot: Kapitel durch „${suggestion.subheading}“ ersetzt`
            : `Co-Pilot: Abschnitt „${suggestion.subheading}“ eingefügt`,
        };
      }),
    }));
    setInsertedIds((prev) => ({ ...prev, [suggestion.id]: true }));
    onStatusMessage(
      replaceAll
        ? `Kapiteltext durch Co-Pilot-Abschnitt „${suggestion.subheading}“ ersetzt.`
        : `Co-Pilot-Abschnitt „${suggestion.subheading}“ am Kapitelende eingefügt.`
    );
  };

  const handleResearchWithAi = async () => {
    setIdeasLoading(true);
    setIdeasError('');
    try {
      const res = await fetch('/api/ai/research-books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillarFilter: researchPillar,
          nicheHint,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Buchideen konnten nicht recherchiert werden.');
      }
      const validPillars: PillarId[] = ['geld', 'beziehung', 'glueck', 'gesundheit'];
      const normalized: BookIdeaProposal[] = (Array.isArray(data.ideas) ? data.ideas : []).map(
        (item: Partial<BookIdeaProposal>, idx: number) => ({
          id: item.id || `ai-idea-${Date.now()}-${idx}`,
          pillar: validPillars.includes(item.pillar as PillarId)
            ? (item.pillar as PillarId)
            : researchPillar === 'all'
              ? 'geld'
              : researchPillar,
          title: item.title || 'Unbenannte Buchidee',
          subtitle: item.subtitle || '',
          targetAudience: item.targetAudience || '',
          corePromise: item.corePromise || '',
          marketAngle: item.marketAngle || '',
          sampleChapters: Array.isArray(item.sampleChapters) ? item.sampleChapters : [],
        })
      );
      setIdeas(normalized);
      setSelectedIdea(null);
    } catch (err) {
      setIdeasError(
        err instanceof Error ? err.message : 'Fehler bei der KI-Buchideen-Recherche.'
      );
    } finally {
      setIdeasLoading(false);
    }
  };

  const handleShuffleCuratedIdeas = () => {
    setIdeasError('');
    const next = drawLuckyBookIdeas(
      researchPillar,
      3,
      ideas.map((i) => i.id)
    );
    setIdeas(next);
    setSelectedIdea(null);
  };

  const handleSelectIdeaForElaboration = (idea: BookIdeaProposal) => {
    setSelectedIdea(idea);
    setElaborationStepDone({ step1: false, step2: false, step3: false });
    setIdeasError('');
  };

  // Step 1: Apply positioning & Core Promise to current manuscript
  const handleApplyStep1Positioning = () => {
    if (!selectedIdea) return;
    const pillarDef = PILLARS[selectedIdea.pillar];
    const matchingArt = COVER_ARTWORKS.find((a) => a.pillar === selectedIdea.pillar);
    onUpdateBook((prev) => ({
      ...prev,
      pillar: selectedIdea.pillar,
      title: selectedIdea.title,
      subtitle: selectedIdea.subtitle,
      targetAudience: selectedIdea.targetAudience,
      corePromise: selectedIdea.corePromise,
      cover: {
        ...prev.cover,
        artworkId: matchingArt ? matchingArt.id : prev.cover.artworkId,
        accentColor: pillarDef.defaultAccentColor,
        eyebrow: `Schwerpunkt ${pillarDef.label}`,
        spineText: `${selectedIdea.title} · ${prev.author}`,
        backCoverBlurb: `${selectedIdea.title}: ${selectedIdea.corePromise}`,
      },
      kdp: {
        ...prev.kdp,
        categories: [...pillarDef.recommendedCategories] as [string, string, string],
      },
    }));
    setElaborationStepDone((s) => ({ ...s, step1: true }));
    onStatusMessage(
      `Schritt 1 erledigt: Buchpositionierung & Core Promise für „${selectedIdea.title}“ übernommen.`
    );
  };

  // Step 2: Elaborate full chapter plan (using researched chapters or AI outline refinement)
  const handleApplyStep2Outline = async (useAiOutline: boolean) => {
    if (!selectedIdea) return;
    setIdeasError('');

    if (!useAiOutline && selectedIdea.sampleChapters.length > 0) {
      const createdChapters: Chapter[] = selectedIdea.sampleChapters.map((title, idx) => ({
        id: `ch-${Date.now()}-${idx + 1}`,
        title,
        goal: `Zahlt direkt auf das Core Promise ein: ${selectedIdea.corePromise}`,
        content: '',
        annotations: [],
      }));
      onUpdateBook((prev) => ({ ...prev, chapters: createdChapters }));
      onSelectChapter(createdChapters[0].id);
      setElaborationStepDone((s) => ({ ...s, step2: true }));
      onStatusMessage(
        `Schritt 2 erledigt: ${createdChapters.length} Kapitel für „${selectedIdea.title}“ angelegt.`
      );
      return;
    }

    setElaborationBusy('step2');
    try {
      const res = await fetch('/api/ai/outline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar: selectedIdea.pillar,
          topicIdea: `${selectedIdea.title}: ${selectedIdea.subtitle}`,
          targetAudience: selectedIdea.targetAudience,
          corePromise: selectedIdea.corePromise,
          tone: book.tone,
          chapterCount: 6,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kapitelplan konnte nicht generiert werden.');
      const nextChapters: Chapter[] = (data.chapters || []).map(
        (ch: { title: string; goal: string; keyPoints?: string[] }, idx: number) => ({
          id: `ch-${Date.now()}-${idx + 1}`,
          title: ch.title,
          goal: ch.goal,
          content:
            ch.keyPoints && ch.keyPoints.length > 0
              ? `## Geplante Schwerpunkte\n\n${ch.keyPoints.map((kp) => `- ${kp}`).join('\n')}`
              : '',
          annotations: [],
        })
      );
      if (nextChapters.length > 0) {
        onUpdateBook((prev) => ({ ...prev, chapters: nextChapters }));
        onSelectChapter(nextChapters[0].id);
      }
      setElaborationStepDone((s) => ({ ...s, step2: true }));
      onStatusMessage(
        `Schritt 2 erledigt: Detaillierte KI-Kapitelstruktur mit ${nextChapters.length} Kapiteln erstellt.`
      );
    } catch (err) {
      setIdeasError(err instanceof Error ? err.message : 'Fehler bei Schritt 2.');
    } finally {
      setElaborationBusy(null);
    }
  };

  // Step 3: Draft Chapter 1 anchored to the selected idea
  const handleApplyStep3DraftFirstChapter = async () => {
    const firstChapter = book.chapters[0];
    if (!firstChapter) return;
    setElaborationBusy('step3');
    setIdeasError('');
    try {
      const res = await fetch('/api/ai/write-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookTitle: selectedIdea?.title || book.title,
          bookSubtitle: selectedIdea?.subtitle || book.subtitle,
          pillar: selectedIdea?.pillar || book.pillar,
          targetAudience: selectedIdea?.targetAudience || book.targetAudience,
          tone: book.tone,
          chapterTitle: firstChapter.title,
          chapterGoal: firstChapter.goal,
          existingContent: firstChapter.content,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kapitelentwurf fehlgeschlagen.');
      onUpdateBook((prev) => ({
        ...prev,
        chapters: prev.chapters.map((ch, idx) =>
          idx === 0
            ? {
                ...ch,
                previousContent: ch.content,
                content: data.content,
                lastRevisionSummary: 'Co-Pilot Schritt 3: Kapitel 1 entworfen',
              }
            : ch
        ),
      }));
      onSelectChapter(firstChapter.id);
      setElaborationStepDone((s) => ({ ...s, step3: true }));
      onStatusMessage('Schritt 3 erledigt: Das erste Kapitel wurde vollständig entworfen.');
    } catch (err) {
      setIdeasError(err instanceof Error ? err.message : 'Fehler bei Schritt 3.');
    } finally {
      setElaborationBusy(null);
    }
  };

  return (
    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Schreib-Co-Pilot</h2>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          Generieren Sie kapitelweise Textabschnitte entlang Ihres Buchversprechens oder recherchieren und erarbeiten Sie neue Buchkonzepte Schritt für Schritt.
        </p>
      </div>

      {/* Sub-Tab Switcher */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
        <button
          type="button"
          onClick={() => setSubTab('segments')}
          className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
            subTab === 'segments'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Textabschnitte
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ideas')}
          className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap truncate ${
            subTab === 'ideas'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Buchideen
        </button>
      </div>

      {/* SUB-TAB 1: Chapter-level Core Promise Text Segments */}
      {subTab === 'segments' && (
        <fieldset disabled={readOnly} className={`space-y-4 ${readOnly ? 'opacity-65' : ''}`}>
          {/* Active Core Promise Anchor */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
            <div className="text-[11px] font-semibold text-slate-700">
              Aktives Core Promise · Schwerpunkt {PILLARS[book.pillar].label}
            </div>
            <p className="text-xs text-slate-800 leading-relaxed">
              {book.corePromise || 'Noch kein Kernversprechen in Schritt 01 definiert.'}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label
                htmlFor="copilot-segment-type"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Art des Textabschnitts
              </label>
              <select
                id="copilot-segment-type"
                value={segmentType}
                onChange={(e) => setSegmentType(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
              >
                {SEGMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="copilot-direction"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Schwerpunkt oder Beispiel-Wunsch (optional)
              </label>
              <input
                id="copilot-direction"
                type="text"
                value={directionHint}
                onChange={(e) => setDirectionHint(e.target.value)}
                placeholder="z. B. Fokus auf wenig Zeit im Berufsalltag..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
              />
            </div>

            {segmentsError && (
              <div
                role="alert"
                className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
              >
                {segmentsError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerateSegments}
              disabled={segmentsLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 transition-colors"
            >
              {segmentsLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Co-Pilot entwirft 3 Abschnitte...
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5" />
                  3 Textabschnitt-Vorschläge generieren
                </>
              )}
            </button>
          </div>

          {/* Generated Suggestions List */}
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {suggestions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">
                Wählen Sie einen Abschnittstyp für Kapitel „{activeChapter.title}“ und starten Sie den Co-Piloten.
              </p>
            ) : (
              suggestions.map((sug, idx) => {
                const inserted = Boolean(insertedIds[sug.id]);
                return (
                  <div
                    key={sug.id || idx}
                    className="p-3.5 border border-slate-200 rounded-md bg-slate-50/60 space-y-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900">
                        {idx + 1}. {sug.subheading}
                      </span>
                      <span className="text-[11px] text-slate-500 shrink-0">{sug.label}</span>
                    </div>
                    <p className="text-[11px] text-blue-800 leading-snug">
                      Core-Promise-Bezug: {sug.promiseAlignment}
                    </p>
                    <p className="font-serif text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                      {sug.content}
                    </p>
                    <div className="flex items-center gap-2 pt-1.5">
                      <button
                        type="button"
                        onClick={() => handleInsertSegment(sug, false)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
                      >
                        {inserted ? (
                          <>
                            <Check className="w-3 h-3" />
                            Eingefügt
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
                            Ans Kapitel anhängen
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInsertSegment(sug, true)}
                        className="px-2.5 py-1.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md"
                      >
                        Ersetzen
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </fieldset>
      )}

      {/* SUB-TAB 2: Research Complete Book Proposals & Step-by-Step Elaboration */}
      {subTab === 'ideas' && (
        <fieldset disabled={readOnly} className={`space-y-4 ${readOnly ? 'opacity-65' : ''}`}>
          <div className="space-y-2.5">
            <div>
              <label
                htmlFor="copilot-research-pillar"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Grundbedürfnis-Filter
              </label>
              <select
                id="copilot-research-pillar"
                value={researchPillar}
                onChange={(e) => {
                  const val = e.target.value as PillarId | 'all';
                  setResearchPillar(val);
                  setIdeas(drawLuckyBookIdeas(val, 3));
                  setSelectedIdea(null);
                }}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
              >
                <option value="all">Alle 4 Grundbedürfnisse mischen</option>
                {PILLAR_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.tagline.split(',')[0]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="copilot-niche-hint"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Nische oder Themenimpuls (optional)
              </label>
              <input
                id="copilot-niche-hint"
                type="text"
                value={nicheHint}
                onChange={(e) => setNicheHint(e.target.value)}
                placeholder="z. B. Selbstständige, Eltern ab 40, Schlaf..."
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResearchWithAi}
                disabled={ideasLoading}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
              >
                {ideasLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Recherchiert...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Mit KI recherchieren
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleShuffleCuratedIdeas}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                <Dices className="w-3.5 h-3.5" />
                Überrasch mich
              </button>
            </div>
          </div>

          {ideasError && (
            <div
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {ideasError}
            </div>
          )}

          {/* Step-by-Step Elaboration Panel for Selected Idea */}
          {selectedIdea ? (
            <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-md space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-blue-800">
                    Schrittweise Ausarbeitung · {PILLARS[selectedIdea.pillar].label}
                  </div>
                  <div className="font-serif text-base font-semibold text-slate-900 mt-0.5">
                    {selectedIdea.title}
                  </div>
                  <div className="text-xs text-slate-600">{selectedIdea.subtitle}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedIdea(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-900 underline shrink-0"
                >
                  Andere Idee
                </button>
              </div>

              <div className="text-xs text-slate-700 bg-white border border-slate-200 rounded p-2.5">
                <span className="font-semibold text-slate-900">Core Promise: </span>
                {selectedIdea.corePromise}
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleApplyStep1Positioning}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 bg-white hover:border-blue-600 text-left transition-colors"
                >
                  <span>
                    <span className="font-mono text-slate-400 mr-1.5">1.</span>
                    Titel, Grundbedürfnis & Core Promise übernehmen
                  </span>
                  {elaborationStepDone.step1 ? (
                    <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={elaborationBusy !== null}
                    onClick={() => handleApplyStep2Outline(false)}
                    className="flex-1 flex items-center justify-between gap-1.5 px-3 py-2 text-xs font-medium rounded-md border border-slate-200 bg-white hover:border-blue-600 text-left transition-colors"
                  >
                    <span>
                      <span className="font-mono text-slate-400 mr-1.5">2.</span>
                      {selectedIdea.sampleChapters.length || 5} Kapitel übernehmen
                    </span>
                    {elaborationStepDone.step2 && (
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={elaborationBusy !== null}
                    onClick={() => handleApplyStep2Outline(true)}
                    className="px-2.5 py-2 text-[11px] font-medium text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 rounded-md whitespace-nowrap"
                  >
                    {elaborationBusy === 'step2' ? 'KI plant...' : 'Mit KI vertiefen'}
                  </button>
                </div>

                <button
                  type="button"
                  disabled={elaborationBusy !== null}
                  onClick={handleApplyStep3DraftFirstChapter}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-xs font-semibold rounded-md text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-left transition-colors"
                >
                  <span>
                    <span className="font-mono opacity-75 mr-1.5">3.</span>
                    {elaborationBusy === 'step3'
                      ? 'KI entwirft Kapitel 1...'
                      : 'Kapitel 1 direkt mit KI ausformulieren'}
                  </span>
                  {elaborationStepDone.step3 ? (
                    <Check className="w-4 h-4 shrink-0" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-3.5 border border-slate-200 rounded-md bg-slate-50/60 space-y-1.5"
                >
                  <div className="text-[11px] font-medium text-slate-500">
                    {PILLARS[idea.pillar].label} · {idea.sampleChapters.length} Kapitel-Ideen
                  </div>
                  <div className="font-serif text-sm font-semibold text-slate-900">
                    {idea.title}
                  </div>
                  <div className="text-xs text-slate-600 leading-snug">{idea.subtitle}</div>
                  <div className="text-[11px] text-slate-700 pt-1">
                    <span className="font-semibold">Core Promise:</span> {idea.corePromise}
                  </div>
                  {idea.marketAngle && (
                    <div className="text-[11px] text-slate-500">{idea.marketAngle}</div>
                  )}
                  <div className="pt-1.5">
                    <button
                      type="button"
                      onClick={() => handleSelectIdeaForElaboration(idea)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
                    >
                      <BookMarked className="w-3.5 h-3.5" />
                      Auswählen & schrittweise ausarbeiten
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </fieldset>
      )}
    </div>
  );
}
