import type { BookProject, Chapter } from '../types/book';
import { PILLARS } from '../data/seedBooks';
import { extractCorePromiseConcepts } from './tocGenerator';
import { extractKeyTerms, normalizeGermanToken } from './chapterPerformance';

export type ChecklistElementId =
  | 'intro'
  | 'core-promise'
  | 'core-argument'
  | 'practical-tip'
  | 'summary';

export type ChecklistStatus = 'present' | 'partial' | 'missing';

export interface ChapterChecklistItem {
  id: ChecklistElementId;
  label: string;
  status: ChecklistStatus;
  corePromiseRequirement: string;
  evidence: string;
  insertPosition: 'prepend' | 'append';
  suggestedSnippet: string;
  aiNote?: string;
}

export interface ChapterChecklistReport {
  chapterId: string;
  corePromiseUsed: string;
  items: ChapterChecklistItem[];
  presentCount: number;
  partialCount: number;
  missingCount: number;
  totalCount: number;
  completionPercent: number;
  summaryLabel: string;
  isEmpty: boolean;
}

interface ParsedBlock {
  raw: string;
  trimmed: string;
  isHeading: boolean;
  isList: boolean;
  isQuote: boolean;
  wordCount: number;
}

function parseBlocks(content: string): ParsedBlock[] {
  return content
    .split(/\n\n+/)
    .map((raw) => {
      const trimmed = raw.trim();
      const isHeading = /^#{1,3}\s+/.test(trimmed);
      const isQuote = trimmed.startsWith('>');
      const lines = trimmed.split('\n').filter((l) => l.trim().length > 0);
      const isList = lines.length > 0 && lines.every((l) => /^\s*[-•*]\s+/.test(l));
      const plain = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
      const words = plain.match(/[A-Za-zÄÖÜäöüß0-9]+(?:-[A-Za-zÄÖÜäöüß0-9]+)*/g) || [];
      return {
        raw,
        trimmed,
        isHeading,
        isList,
        isQuote,
        wordCount: words.length,
      };
    })
    .filter((b) => b.trimmed.length > 0);
}

function countMatchedTerms(haystackLower: string, terms: string[]): string[] {
  const matched: string[] = [];
  for (const term of terms) {
    const stem = normalizeGermanToken(term);
    if (!stem) continue;
    if (haystackLower.includes(stem)) {
      matched.push(term);
      continue;
    }
    if (stem.includes('-')) {
      const parts = stem.split('-').filter((p) => p.length >= 3);
      if (parts.some((p) => haystackLower.includes(normalizeGermanToken(p)))) {
        matched.push(term);
      }
    }
  }
  return matched;
}

/**
 * Evaluates a single chapter against a 5-point German non-fiction Content Checklist
 * anchored to the book's Core Promise:
 * 1. Einleitung & Leser-Hook
 * 2. Core-Promise-Verankerung
 * 3. Kernargument & Struktur
 * 4. Praxis-Tipp & Umsetzung
 * 5. Zusammenfassung & Abschluss
 */
export function evaluateChapterChecklist(
  book: BookProject,
  chapter: Chapter,
  overrides?: Partial<Record<ChecklistElementId, boolean>>,
  aiOverrides?: Partial<Record<ChecklistElementId, { aiNote?: string; suggestedSnippet?: string }>>
): ChapterChecklistReport {
  const pillarDef = PILLARS[book.pillar];
  const { corePromiseText, concepts, timeAnchor } = extractCorePromiseConcepts(book);
  const primaryConcept = concepts[0] || pillarDef.label;
  const secondaryConcept = concepts[1] || pillarDef.tagline.split('&')[0].trim();

  const content = chapter.content || '';
  const trimmed = content.trim();
  const blocks = parseBlocks(content);
  const proseBlocks = blocks.filter((b) => !b.isHeading && !b.isList && !b.isQuote);
  const headingBlocks = blocks.filter((b) => b.isHeading);
  const listBlocks = blocks.filter((b) => b.isList);
  const totalWords = blocks.reduce((acc, b) => acc + b.wordCount, 0);
  const lowerContent = content.toLowerCase();
  const lowerFull = `${chapter.title} ${content}`.toLowerCase();

  // -------------------------------------------------------------------------
  // 1. EINLEITUNG & LESER-HOOK
  // -------------------------------------------------------------------------
  const firstBlock = blocks.find((b) => !b.isQuote);
  let introStatus: ChecklistStatus = 'missing';
  let introEvidence = 'Das Kapitel hat noch keinen einleitenden Einstiegsabsatz.';

  if (firstBlock) {
    if (!firstBlock.isHeading && !firstBlock.isList && firstBlock.wordCount >= 22) {
      introStatus = 'present';
      introEvidence = `Klarer Einstiegsabsatz vorhanden (${firstBlock.wordCount} Wörter) – holt den Leser direkt ab.`;
    } else if (!firstBlock.isHeading && !firstBlock.isList && firstBlock.wordCount >= 10) {
      introStatus = 'partial';
      introEvidence = `Kurzer Einstieg (${firstBlock.wordCount} Wörter) – lässt sich als stärkerer Leser-Hook ausbauen.`;
    } else {
      introStatus = 'missing';
      introEvidence =
        'Das Kapitel beginnt direkt mit einer Überschrift oder Liste ohne einführenden Fließtext-Einstieg.';
    }
  }

  const introSnippet = `Viele Leser wünschen sich rund um ${pillarDef.label} mehr Verlässlichkeit, scheitern im Alltag aber an unnötiger Komplexität. In diesem Kapitel erfahren Sie, wie Sie „${chapter.title}“ konkret nutzen, um Ihrem Ziel unmittelbar näherzukommen: ${corePromiseText}`;

  // -------------------------------------------------------------------------
  // 2. CORE-PROMISE-VERANKERUNG
  // -------------------------------------------------------------------------
  const allPromiseTerms =
    concepts.length > 0 ? concepts : extractKeyTerms(corePromiseText).map((t) => t.display);
  const matchedPromise = countMatchedTerms(lowerFull, allPromiseTerms);
  const missingPromise = allPromiseTerms.filter((t) => !matchedPromise.includes(t));

  const goalTerms = extractKeyTerms(chapter.goal).map((t) => t.display);
  const matchedGoal = countMatchedTerms(lowerFull, goalTerms);

  let cpStatus: ChecklistStatus = 'missing';
  let cpEvidence = 'Noch keine Kernbegriffe aus dem Core Promise im Kapiteltext erkannt.';
  if (trimmed) {
    const coverage = allPromiseTerms.length > 0 ? matchedPromise.length / allPromiseTerms.length : 0;
    if (coverage >= 0.5 || (matchedPromise.length >= 2 && matchedGoal.length >= 1)) {
      cpStatus = 'present';
      cpEvidence = `Stark verankert: ${matchedPromise.join(', ')} im Kapitel enthalten.`;
    } else if (matchedPromise.length >= 1 || matchedGoal.length >= 1) {
      cpStatus = 'partial';
      cpEvidence =
        missingPromise.length > 0
          ? `Teilweise enthalten (${matchedPromise.join(', ') || 'Kapitelziel'}). Noch offen: ${missingPromise.slice(0, 3).join(', ')}.`
          : 'Kapitelziel berührt, aber direkte Brücke zum Core Promise noch schwach.';
    }
  }

  const cpSnippet = `## Warum das direkt auf Ihr Ziel einzahlt\n\nDieser Baustein ist kein isoliertes Detail, sondern ein zentraler Hebel für das Gesamtversprechen dieses Buches: ${corePromiseText} Indem Sie ${primaryConcept}${timeAnchor ? ` (${timeAnchor})` : ''} konsequent mit ${secondaryConcept} verbinden, entsteht im Alltag spürbare Entlastung.`;

  // -------------------------------------------------------------------------
  // 3. KERNARGUMENT & STRUKTUR
  // -------------------------------------------------------------------------
  const argumentSignalRegex =
    /\b(weil|deshalb|darum|zeigt|bedeutet|führt|dadurch|entscheidend|prinzip|system|grund|muster|mechanik|warum|jedoch|doch|folge|ursache|wirkung)\b/gi;
  const argumentHits = (content.match(argumentSignalRegex) || []).length;

  let argStatus: ChecklistStatus = 'missing';
  let argEvidence = 'Noch kein ausgearbeitetes Kernargument mit nachvollziehbarer Begründung.';

  if (totalWords >= 80 && (headingBlocks.length >= 1 || proseBlocks.length >= 2) && argumentHits >= 2) {
    argStatus = 'present';
    argEvidence = `Tragendes Kernargument erkannt (${headingBlocks.length} Zwischenüberschriften, ${argumentHits} Begründungs-Signale).`;
  } else if (totalWords >= 40 && (proseBlocks.length >= 1 || argumentHits >= 1)) {
    argStatus = 'partial';
    argEvidence =
      'Erste Argumentation vorhanden – eine klare Zwischenüberschrift (## ) und ein vertiefender Absatz stärken die Substanz.';
  }

  const argSnippet = `## Das Kernprinzip hinter diesem Kapitel\n\nEntscheidend für dauerhaften Erfolg bei ${primaryConcept} ist nicht punktueller Ehrgeiz, sondern eine verlässliche Struktur. Weil im vollen Alltag immer wieder unvorhergesehene Situationen auftreten, trägt nur ein Ansatz, der einfache Regeln mit klarer Wirkung verbindet. Genau deshalb konzentriert sich dieses Kapitel auf: ${chapter.goal || corePromiseText}`;

  // -------------------------------------------------------------------------
  // 4. PRAXIS-TIPP & UMSETZUNG
  // -------------------------------------------------------------------------
  const explicitPraxisHeadingRegex =
    /^#{1,3}\s+.*(praxis|tipp|check|übung|umsetzung|schritt|anleitung|beispiel|protokoll|start|fahrplan)/im;
  const imperativeActionRegex =
    /\b(notieren sie|prüfen sie|schreiben sie|legen sie|starten sie|setzen sie|planen sie|testen sie|teilen sie|schließen sie|ergänzen sie|stabilisieren sie|nehmen sie sich|praxis-tipp|praxis-check|konkreter tipp|schritt 1|beispiel:|rechenbeispiel)\b/gi;

  const hasPraxisHeading = explicitPraxisHeadingRegex.test(content);
  const imperativeHits = (content.match(imperativeActionRegex) || []).length;

  let praxisStatus: ChecklistStatus = 'missing';
  let praxisEvidence = 'Kein konkreter Praxis-Tipp, Rechenbeispiel oder direkter Handlungsschritt für den Leser gefunden.';

  if (hasPraxisHeading || imperativeHits >= 2 || (imperativeHits >= 1 && listBlocks.length >= 1)) {
    praxisStatus = 'present';
    praxisEvidence = hasPraxisHeading
      ? 'Eigener Praxis-/Umsetzungsabschnitt mit direktem Leser-Impuls enthalten.'
      : `Konkrete Handlungsanweisungen für den Leser erkannt (${imperativeHits} Praxis-Impulse).`;
  } else if (listBlocks.length >= 1 || imperativeHits === 1) {
    praxisStatus = 'partial';
    praxisEvidence =
      'Strukturierte Punkte vorhanden – ein expliziter „Praxis-Tipp“ mit direktem 5-Minuten-Startschritt erhöht den Nutzwert deutlich.';
  }

  const praxisSnippet = `## Praxis-Tipp für Ihren Alltag\n\nNehmen Sie sich heute genau ${timeAnchor || '10 Minuten'} Zeit und setzen Sie einen ersten konkreten Schritt zu ${primaryConcept} um:\n\n- Notieren Sie Ihren aktuellen Ist-Zustand in drei Stichpunkten.\n- Legen Sie eine klare, überprüfbare Regel fest, die ohne zusätzliche Willenskraft funktioniert.\n- Prüfen Sie in sieben Tagen kurz das Ergebnis und justieren Sie nur bei echtem Bedarf nach.`;

  // -------------------------------------------------------------------------
  // 5. ZUSAMMENFASSUNG & KAPITEL-ABSCHLUSS
  // -------------------------------------------------------------------------
  const summaryHeadingRegex =
    /^#{1,3}\s+.*(zusammenfassung|fazit|kernerkenntnis|merke|auf einen blick|das wichtigste|abschluss|takeaway)/im;
  const summaryPhraseRegex =
    /\b(zusammenfassung|fazit|kurz gesagt|merke|entscheidend bleibt|das wichtigste|auf den punkt|mitnehmen|beginnt nicht|mehr aktivität braucht|wer seine regeln|nach vierzehn tagen|bleibt festzuhalten|zusammenfassend)\b/i;

  const lastBlock = blocks[blocks.length - 1];
  const hasSummaryHeading = summaryHeadingRegex.test(content);
  const lastBlockIsClosingProse =
    blocks.length >= 2 && Boolean(lastBlock && !lastBlock.isHeading && !lastBlock.isList && lastBlock.wordCount >= 14);
  const lastBlockHasSynthesis = lastBlockIsClosingProse && summaryPhraseRegex.test(lastBlock.trimmed);

  let summaryStatus: ChecklistStatus = 'missing';
  let summaryEvidence = 'Das Kapitel hat noch keine verdichtende Zusammenfassung oder keinen runden Abschlussgedanken.';

  if (hasSummaryHeading || lastBlockHasSynthesis) {
    summaryStatus = 'present';
    summaryEvidence = hasSummaryHeading
      ? 'Eigener Zusammenfassungs-/Fazit-Abschnitt am Kapitelende vorhanden.'
      : 'Runder Schlussabsatz mit klarer Kernerkenntnis erkannt.';
  } else if (lastBlockIsClosingProse) {
    summaryStatus = 'partial';
    summaryEvidence =
      'Das Kapitel endet mit Fließtext, jedoch ohne markante Zusammenfassung oder klare Mitnahme-Botschaft.';
  } else if (lastBlock?.isList) {
    summaryStatus = 'missing';
    summaryEvidence =
      'Das Kapitel endet abrupt mit einer Aufzählung – ein kurzer Fazit-Absatz rundet das Leseerlebnis ab.';
  }

  const summarySnippet = `## Zusammenfassung: Das Wichtigste auf einen Blick\n\nBehalten Sie aus diesem Kapitel vor allem einen Gedanken mit: ${chapter.goal || `Verlässliche Schritte rund um ${primaryConcept} schlagen kurzfristigen Aktionismus.`} Damit rückt Ihr übergeordnetes Ziel unmittelbar in Reichweite – ${corePromiseText}`;

  // Assemble 5 items, applying optional manual overrides & AI notes
  const rawItems: ChapterChecklistItem[] = [
    {
      id: 'intro',
      label: 'Einleitung & Leser-Hook',
      status: introStatus,
      corePromiseRequirement: `Holt der Einstieg die Zielgruppe emotional ab und führt klar in „${chapter.title}“ ein?`,
      evidence: introEvidence,
      insertPosition: 'prepend',
      suggestedSnippet: introSnippet,
    },
    {
      id: 'core-promise',
      label: 'Core-Promise-Verankerung',
      status: cpStatus,
      corePromiseRequirement: `Zahlt das Kapitel konkret auf „${primaryConcept}“ und das Buchversprechen ein?`,
      evidence: cpEvidence,
      insertPosition: 'append',
      suggestedSnippet: cpSnippet,
    },
    {
      id: 'core-argument',
      label: 'Kernargument & Struktur',
      status: argStatus,
      corePromiseRequirement: `Wird das zentrale Argument nachvollziehbar begründet und mit Zwischenüberschriften gegliedert?`,
      evidence: argEvidence,
      insertPosition: 'append',
      suggestedSnippet: argSnippet,
    },
    {
      id: 'practical-tip',
      label: 'Praxis-Tipp & Umsetzung',
      status: praxisStatus,
      corePromiseRequirement: `Enthält das Kapitel einen direkt anwendbaren Praxis-Tipp oder ein konkretes Beispiel (${timeAnchor || 'Alltag'})?`,
      evidence: praxisEvidence,
      insertPosition: 'append',
      suggestedSnippet: praxisSnippet,
    },
    {
      id: 'summary',
      label: 'Zusammenfassung & Abschluss',
      status: summaryStatus,
      corePromiseRequirement: 'Verdichtet ein klares Fazit die Kernerkenntnis und schlägt die Brücke zum nächsten Schritt?',
      evidence: summaryEvidence,
      insertPosition: 'append',
      suggestedSnippet: summarySnippet,
    },
  ];

  const items: ChapterChecklistItem[] = rawItems.map((item) => {
    const aiExtra = aiOverrides?.[item.id];
    const manuallyChecked = Boolean(overrides?.[item.id]);
    return {
      ...item,
      status: manuallyChecked ? 'present' : item.status,
      evidence: manuallyChecked
        ? `Manuell vom Autor abgehakt. (${item.evidence})`
        : item.evidence,
      aiNote: aiExtra?.aiNote,
      suggestedSnippet: aiExtra?.suggestedSnippet?.trim() || item.suggestedSnippet,
    };
  });

  const presentCount = items.filter((i) => i.status === 'present').length;
  const partialCount = items.filter((i) => i.status === 'partial').length;
  const missingCount = items.filter((i) => i.status === 'missing').length;
  const totalCount = items.length;
  const completionPercent = Math.round(((presentCount + partialCount * 0.5) / totalCount) * 100);

  const summaryLabel = !trimmed
    ? 'Noch kein Text vorhanden'
    : presentCount === totalCount
      ? 'Alle 5 Kapitel-Bausteine erfüllt'
      : presentCount >= 4
        ? 'Fast vollständig · 1 Baustein ergänzen'
        : presentCount >= 2
          ? 'Gute Grundlage · Bausteine ergänzen'
          : 'Wichtige Kapitel-Elemente fehlen noch';

  return {
    chapterId: chapter.id,
    corePromiseUsed: corePromiseText,
    items,
    presentCount,
    partialCount,
    missingCount,
    totalCount,
    completionPercent,
    summaryLabel,
    isEmpty: !trimmed,
  };
}

const SUMMARY_HEADING_PATTERN =
  /^#{1,3}\s+.*(zusammenfassung|fazit|kernerkenntnis|merke|auf einen blick|das wichtigste|abschluss|takeaway)/i;
const SUMMARY_PHRASE_PATTERN =
  /\b(zusammenfassung|fazit|kurz gesagt|merke|entscheidend bleibt|das wichtigste|auf den punkt|mitnehmen|beginnt nicht|mehr aktivität braucht|wer seine regeln|nach vierzehn tagen|bleibt festzuhalten|zusammenfassend)\b/i;

/**
 * Cleanly inserts a checklist element snippet into the chapter text:
 * - 'intro' (prepend) goes at the very start.
 * - 'summary' goes at the very end.
 * - Body elements ('core-promise', 'core-argument', 'practical-tip') are placed right before
 *   an existing closing summary section or synthesis paragraph if present, so inserting a
 *   Praxis-Tipp never breaks an existing chapter conclusion.
 */
export function insertChecklistSnippet(
  currentContent: string,
  item: Pick<ChapterChecklistItem, 'insertPosition' | 'suggestedSnippet'> & {
    id?: ChecklistElementId;
  }
): string {
  const snippet = item.suggestedSnippet.trim();
  if (!snippet) return currentContent;
  const trimmed = currentContent.trim();
  if (!trimmed) return snippet;

  if (item.insertPosition === 'prepend') {
    return `${snippet}\n\n${trimmed}`;
  }

  if (item.id && item.id !== 'summary') {
    const rawBlocks = trimmed
      .split(/\n\n+/)
      .map((b) => b.trim())
      .filter((b) => b.length > 0);

    if (rawBlocks.length >= 2) {
      // 1. If an explicit summary heading exists, insert right before it
      const summaryHeadingIdx = rawBlocks.findIndex((b) => SUMMARY_HEADING_PATTERN.test(b));
      if (summaryHeadingIdx > 0) {
        const before = rawBlocks.slice(0, summaryHeadingIdx).join('\n\n');
        const after = rawBlocks.slice(summaryHeadingIdx).join('\n\n');
        return `${before}\n\n${snippet}\n\n${after}`;
      }

      // 2. If the final block is a closing synthesis prose paragraph, insert right before it
      const lastBlock = rawBlocks[rawBlocks.length - 1];
      const isHeading = /^#{1,3}\s+/.test(lastBlock);
      const isList = lastBlock
        .split('\n')
        .filter((l) => l.trim().length > 0)
        .every((l) => /^\s*[-•*]\s+/.test(l));
      if (!isHeading && !isList && SUMMARY_PHRASE_PATTERN.test(lastBlock)) {
        const before = rawBlocks.slice(0, -1).join('\n\n');
        return `${before}\n\n${snippet}\n\n${lastBlock}`;
      }
    }
  }

  return `${trimmed}\n\n${snippet}`;
}

/**
 * Evaluates all chapters in a book so the UI can show chapter-by-chapter checklist progress.
 */
export function evaluateAllChaptersChecklist(
  book: BookProject,
  overridesByChapter?: Record<string, Partial<Record<ChecklistElementId, boolean>>>
): Record<string, ChapterChecklistReport> {
  const result: Record<string, ChapterChecklistReport> = {};
  for (const ch of book.chapters) {
    result[ch.id] = evaluateChapterChecklist(book, ch, overridesByChapter?.[ch.id]);
  }
  return result;
}
