import type { BookProject, Chapter, PillarId } from '../types/book';

export type PerformanceCategory = 'readability' | 'density' | 'core-promise';
export type PerformanceSeverity = 'high' | 'medium' | 'low';

export interface EditorHighlightIssue {
  id: string;
  category: PerformanceCategory;
  severity: PerformanceSeverity;
  title: string;
  explanation: string;
  suggestion: string;
  excerpt: string;
  /** Inclusive start offset in chapter.content */
  start: number;
  /** Exclusive end offset in chapter.content */
  end: number;
  /** Optional direct replacement for [start, end] so the author can apply in one click */
  replacement?: string;
  replacementLabel?: string;
  source: 'live' | 'ai';
}

export interface ReadabilityMetrics {
  score: number; // 0-100 editorial KDP readiness score
  fleschDe: number; // Amstad Flesch-Reading-Ease for German (0-100)
  avgSentenceLength: number;
  avgSyllablesPerWord: number;
  sentenceCount: number;
  longSentenceCount: number;
  longParagraphCount: number;
  ratingLabel: string;
}

export interface WordDensityMetrics {
  score: number; // 0-100
  wordCount: number;
  uniqueWordCount: number;
  lexicalDiversityPercent: number; // Root-TTR normalized or TTR %
  contentWordRatioPercent: number; // % non-stopwords (information density)
  fillerWordCount: number;
  fillerRatePercent: number;
  repetitionCount: number;
  ratingLabel: string;
}

export interface CorePromiseMetrics {
  score: number; // 0-100
  matchedTerms: string[];
  missingTerms: string[];
  goalCoveragePercent: number;
  benefitSignalCount: number;
  openingAnchored: boolean;
  closingAnchored: boolean;
  ratingLabel: string;
}

export interface ChapterPerformanceReport {
  chapterId: string;
  overallScore: number; // 0-100 weighted composite
  overallLabel: string;
  isEmpty: boolean;
  readability: ReadabilityMetrics;
  density: WordDensityMetrics;
  corePromise: CorePromiseMetrics;
  issues: EditorHighlightIssue[];
}

export interface TextHighlightSegment {
  text: string;
  start: number;
  end: number;
  issue: EditorHighlightIssue | null;
}

// Common German stopwords (articles, conjunctions, prepositions, auxiliary verbs)
const GERMAN_STOPWORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'eines',
  'und', 'oder', 'aber', 'doch', 'denn', 'weil', 'dass', 'wenn', 'als', 'wie', 'wo', 'was',
  'wer', 'wen', 'wem', 'wessen', 'ist', 'sind', 'war', 'waren', 'sein', 'seine', 'seinen',
  'seiner', 'seinem', 'hat', 'haben', 'hatte', 'hatten', 'wird', 'werden', 'wurde', 'wurden',
  'kann', 'können', 'konnte', 'muss', 'müssen', 'musste', 'soll', 'sollen', 'will', 'wollen',
  'darf', 'dürfen', 'mag', 'mögen', 'nicht', 'kein', 'keine', 'keinen', 'keinem', 'keiner',
  'mit', 'von', 'vom', 'zu', 'zum', 'zur', 'in', 'im', 'ins', 'an', 'am', 'ans', 'auf', 'aufs',
  'für', 'fürs', 'aus', 'bei', 'beim', 'nach', 'vor', 'über', 'unter', 'durch', 'gegen', 'ohne',
  'um', 'bis', 'seit', 'während', 'wegen', 'trotz', 'zwischen', 'hinter', 'neben', 'ich', 'du',
  'er', 'sie', 'es', 'wir', 'ihr', 'ihnen', 'ihre', 'ihren', 'ihrem', 'ihrer', 'mich', 'dich',
  'sich', 'uns', 'euch', 'mir', 'dir', 'ihm', 'dies', 'diese', 'dieser', 'dieses', 'diesem',
  'diesen', 'jeder', 'jede', 'jedes', 'jedem', 'jeden', 'alle', 'aller', 'alles', 'allem',
  'allen', 'man', 'auch', 'noch', 'schon', 'nur', 'mehr', 'sehr', 'so', 'hier', 'dort', 'da',
  'dann', 'nun', 'jetzt', 'heute', 'immer', 'nie', 'oft', 'viel', 'viele', 'vielen', 'wenig',
  'ganz', 'erst', 'mal', 'wieder', 'bereits', 'damit', 'dabei', 'dafür', 'dazu', 'darin',
  'darauf', 'daraus', 'davon', 'jedoch', 'sondern', 'also', 'etwa', 'rund', 'pro', 'statt',
  'ihr', 'ihres', 'unser', 'unsere', 'unserer', 'unserem', 'unseren', 'euer', 'eure', 'mehrere',
  'beide', 'selbst', 'solche', 'solcher', 'solches', 'welch', 'welche', 'welcher', 'welches',
  'etwas', 'nichts', 'sowie', 'ob', 'falls', 'sobald', 'sodass', 'desto', 'je', 'umso',
]);

// Filler / softener phrases that reduce German non-fiction punch & word density
interface FillerRule {
  pattern: RegExp;
  label: string;
  explanation: string;
  suggestion: string;
  /** Function to compute clean replacement from matched text (empty string = remove) */
  getReplacement: (matchText: string) => string;
}

const FILLER_RULES: FillerRule[] = [
  {
    pattern: /\b(eigentlich|irgendwie|sozusagen|gewissermaßen|quasi)\b/gi,
    label: 'Weichmacher entfernen',
    explanation: 'Relativierendes Füllwort schwächt die Klarheit und Autorität Ihrer Aussage im Sachbuch.',
    suggestion: 'Streichen Sie das Füllwort für eine präzisere, verbindlichere Formulierung.',
    getReplacement: () => '',
  },
  {
    pattern: /\b(im Grunde genommen|im Grunde|letztendlich|grundsätzlich)\b/gi,
    label: 'Füllphrase straffen',
    explanation: 'Aufblähende Einleitungs- oder Füllphrase senkt die Informationsdichte pro Satz.',
    suggestion: 'Formulieren Sie den Kerngedanken direkt ohne abschwächenden Zusatz.',
    getReplacement: () => '',
  },
  {
    pattern: /\b(vielleicht|relativ|ziemlich|halt|eben|praktisch|bekanntlich)\b/gi,
    label: 'Vagen Verstärker prüfen',
    explanation: 'Umgangssprachlicher oder unpräziser Modifikator verwässert die Wortdichte.',
    suggestion: 'Entweder ersatzlos streichen oder durch eine konkrete Zahl bzw. Beobachtung ersetzen.',
    getReplacement: () => '',
  },
  {
    pattern: /\b(sehr|wirklich|tatsächlich|dramatisch|vermeintliche[nrsm]?|lediglich|meist)\b/gi,
    label: 'Abschwächer / Verstärker schärfen',
    explanation: 'Generischer Verstärker oder Abschwächer bremst den Satzrhythmus ohne neuen Informationswert.',
    suggestion: 'Lassen Sie das Wort weg oder ersetzen Sie es durch ein konkretes Bild bzw. eine Zahl.',
    getReplacement: () => '',
  },
];

const PILLAR_LEXICON: Record<PillarId, string[]> = {
  geld: ['geld', 'finanz', 'vermögen', 'konto', 'konten', 'etf', 'spar', 'depot', 'rendite', 'system', 'kosten', 'budget', 'ruhe', 'sicherheit', 'invest', 'zins'],
  beziehung: ['beziehung', 'partner', 'nähe', 'grenz', 'kommunik', 'gespräch', 'vertrau', 'konflikt', 'zuhör', 'empathie', 'alltag', 'verbunden'],
  glueck: ['glück', 'sinn', 'ruhe', 'klarheit', 'zufrieden', 'fokus', 'resilienz', 'gewohnheit', 'alltag', 'gelassen', 'freude', 'entscheid'],
  gesundheit: ['gesund', 'schlaf', 'energie', 'körper', 'stress', 'regeneration', 'routine', 'licht', 'bewegung', 'ernährung', 'biorhythmus', 'abend', 'morgen'],
};

const READER_BENEFIT_MARKERS = [
  /\b(sie|ihr|ihre|ihren|ihrem|ihrer|du|dein|deine|deinen|deinem)\b/gi,
  /\b(schritt|praxis|beispiel|übung|check|protokoll|system|plan|regel|konkret|heute|monat|woche|minuten|prozent|euro|€)\b/gi,
];

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Normalizes a German word into a lightweight stem for reliable Core Promise matching
 * (e.g. "Finanzsysteme" -> "finanzsystem", "Kontenstruktur" -> "kontenstruktur", "monatlich" -> "monat").
 */
export function normalizeGermanToken(raw: string): string {
  let token = raw
    .toLowerCase()
    .replace(/[^a-zäöüß0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
  if (token.length <= 3) return token;

  // Strip common German inflection/derivation suffixes conservatively
  const suffixes = ['ungen', 'keiten', 'heiten', 'lichen', 'licher', 'liches', 'ische', 'ischen', 'ung', 'keit', 'heit', 'lich', 'ern', 'end', 'est', 'en', 'er', 'es', 'em', 'e', 'n', 's'];
  for (const suffix of suffixes) {
    if (token.length > suffix.length + 3 && token.endsWith(suffix)) {
      token = token.slice(0, -suffix.length);
      break;
    }
  }
  return token;
}

/**
 * Counts syllables in a German word using German vowel-group & diphthong rules.
 */
export function countGermanSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-zäöüß]/g, '');
  if (!cleaned) return 0;
  if (cleaned.length <= 3) return 1;

  // Match German diphthongs or single vowels
  const matches = cleaned.match(/(?:ei|ie|au|äu|eu|ai|oi|ui|[aeiouäöüy]+)/g);
  return Math.max(1, matches ? matches.length : 1);
}

const LOW_SIGNAL_PROMISE_WORDS = new Set([
  'klar', 'klare', 'klarer', 'klares', 'klaren', 'klarem',
  'eigen', 'eigene', 'eigener', 'eigenes', 'eigenen', 'eigenem',
  'starr', 'starre', 'starrer', 'starres', 'starren',
  'läuft', 'laufen', 'schafft', 'schaffen', 'macht', 'machen',
  'bringt', 'bringen', 'zeigt', 'zeigen', 'bleibt', 'bleiben',
  'hilft', 'helfen', 'gibt', 'geben', 'sorgt', 'sorgen',
  'spürbar', 'spürbare', 'nachhaltig', 'nachhaltige', 'einfach', 'einfache',
  'wirklich', 'direkt', 'sofort', 'dauerhaft', 'dauerhafte', 'besser', 'bessere',
]);

/**
 * Extracts key terms from a German phrase (like Core Promise or Chapter Goal) for alignment checks.
 * Prioritizes German nouns (capitalized) and hyphenated compounds over generic verbs/adjectives.
 */
export function extractKeyTerms(text: string): Array<{ display: string; stem: string }> {
  const rawMatches = text.match(/[A-Za-zÄÖÜäöüß0-9]+(?:-[A-Za-zÄÖÜäöüß0-9]+)*/g) || [];
  const seen = new Set<string>();
  const prioritized: Array<{ display: string; stem: string; priority: number }> = [];

  for (let i = 0; i < rawMatches.length; i++) {
    const raw = rawMatches[i];
    const lower = raw.toLowerCase();
    if (GERMAN_STOPWORDS.has(lower) || LOW_SIGNAL_PROMISE_WORDS.has(lower)) continue;
    if (/^\d+$/.test(lower)) continue;
    if (lower.length < 4 && !lower.includes('-')) continue;
    const stem = normalizeGermanToken(raw);
    if (!stem || stem.length < 3 || seen.has(stem)) continue;
    seen.add(stem);

    const isCompound = raw.includes('-');
    const isMidSentenceCapitalizedNoun = i > 0 && /^[A-ZÄÖÜ]/.test(raw);
    const priority = isCompound ? 3 : isMidSentenceCapitalizedNoun ? 2 : 1;
    prioritized.push({ display: raw, stem, priority });
  }

  return prioritized
    .sort((a, b) => b.priority - a.priority)
    .map(({ display, stem }) => ({ display, stem }));
}

function textMatchesTerm(normalizedText: string, stem: string): boolean {
  if (normalizedText.includes(stem)) return true;
  // Also allow matching hyphenated sub-parts (e.g. "4-konten" -> "konten", "etf-system" -> "etf" or "system")
  if (stem.includes('-')) {
    const parts = stem.split('-').filter((p) => p.length >= 3 && !GERMAN_STOPWORDS.has(p));
    if (parts.length > 0 && parts.some((p) => normalizedText.includes(normalizeGermanToken(p)))) {
      return true;
    }
  }
  return false;
}

interface IndexedSentence {
  text: string;
  start: number;
  end: number;
  words: string[];
}

interface IndexedParagraph {
  text: string;
  start: number;
  end: number;
  words: string[];
  isHeading: boolean;
  isList: boolean;
}

function extractParagraphsWithOffsets(content: string): IndexedParagraph[] {
  const paragraphs: IndexedParagraph[] = [];
  const regex = /[^\n]+(?:\n(?!\n)[^\n]+)*/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const leadingWs = raw.indexOf(trimmed);
    const start = match.index + leadingWs;
    const end = start + trimmed.length;
    const isHeading = trimmed.startsWith('#');
    const isList = trimmed.split('\n').every((line) => /^\s*[-•*]\s+/.test(line));
    const plain = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '');
    const words = plain.match(/[A-Za-zÄÖÜäöüß0-9]+(?:-[A-Za-zÄÖÜäöüß0-9]+)*/g) || [];
    paragraphs.push({ text: trimmed, start, end, words, isHeading, isList });
  }

  return paragraphs;
}

function extractSentencesWithOffsets(content: string): IndexedSentence[] {
  const sentences: IndexedSentence[] = [];
  const paragraphs = extractParagraphsWithOffsets(content);

  for (const para of paragraphs) {
    if (para.isHeading) continue;
    // Split sentences on ., !, ? followed by whitespace or end-of-block
    const sentRegex = /[^.!?\n]+(?:[.!?]+|$)/g;
    let m: RegExpExecArray | null;
    while ((m = sentRegex.exec(para.text)) !== null) {
      const raw = m[0];
      const trimmed = raw.trim();
      if (!trimmed) continue;
      // Ignore pure markdown bullet prefix lines that are too short
      const cleaned = trimmed.replace(/^[-•*]\s+/, '').replace(/\*\*/g, '');
      const words = cleaned.match(/[A-Za-zÄÖÜäöüß0-9]+(?:-[A-Za-zÄÖÜäöüß0-9]+)*/g) || [];
      if (words.length < 3) continue;
      const leading = raw.indexOf(trimmed);
      const start = para.start + m.index + leading;
      const end = start + trimmed.length;
      sentences.push({ text: trimmed, start, end, words });
    }
  }

  return sentences;
}

function suggestSentenceSplit(sentence: string): string | undefined {
  // Look for natural German clause boundaries near the middle of the sentence
  const mid = Math.floor(sentence.length / 2);
  const patterns: Array<{ regex: RegExp; makeReplacement: (before: string, after: string) => string }> = [
    {
      regex: /:\s+([A-ZÄÖÜ])/g,
      makeReplacement: (before, after) => `${before}. ${after}`,
    },
    {
      regex: /\s+[–—]\s+/g,
      makeReplacement: (before, after) => {
        const cap = after.charAt(0).toUpperCase() + after.slice(1);
        return `${before}. ${cap}`;
      },
    },
    {
      regex: /,\s+(weil|während|sodass|wodurch|obwohl|damit|denn)\s+/gi,
      makeReplacement: (before, after) => {
        const cap = after.charAt(0).toUpperCase() + after.slice(1);
        return `${before}. ${cap}`;
      },
    },
    {
      regex: /,\s+und\s+/gi,
      makeReplacement: (before, after) => {
        const cap = after.charAt(0).toUpperCase() + after.slice(1);
        return `${before}. ${cap}`;
      },
    },
  ];

  let bestReplacement: string | undefined;
  let bestDist = Infinity;

  for (const rule of patterns) {
    let m: RegExpExecArray | null;
    rule.regex.lastIndex = 0;
    while ((m = rule.regex.exec(sentence)) !== null) {
      const idx = m.index;
      if (idx < 25 || idx > sentence.length - 25) continue;
      const dist = Math.abs(idx - mid);
      if (dist < bestDist) {
        bestDist = dist;
        const before = sentence.slice(0, idx).trim();
        const after =
          m[0].startsWith(':')
            ? sentence.slice(idx + 1).trim()
            : m[1]
              ? `${m[1]} ${sentence.slice(idx + m[0].length).trim()}`
              : sentence.slice(idx + m[0].length).trim();
        bestReplacement = rule.makeReplacement(before, after);
      }
    }
  }

  return bestReplacement;
}

function suggestParagraphSplit(paragraph: string): string | undefined {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(?:\s+|$)/g);
  if (!sentences || sentences.length < 3) return undefined;
  const splitIdx = Math.ceil(sentences.length / 2);
  const firstHalf = sentences.slice(0, splitIdx).join('').trim();
  const secondHalf = sentences.slice(splitIdx).join('').trim();
  if (!firstHalf || !secondHalf) return undefined;
  return `${firstHalf}\n\n${secondHalf}`;
}

/**
 * Resolves overlapping highlight spans by prioritizing higher-severity & shorter, more specific spans.
 * Guarantees sorted, non-overlapping spans within [0, content.length].
 */
export function resolveNonOverlappingHighlights(
  issues: EditorHighlightIssue[],
  contentLength: number
): EditorHighlightIssue[] {
  const severityWeight: Record<PerformanceSeverity, number> = { high: 3, medium: 2, low: 1 };

  const valid = issues
    .filter((i) => i.start >= 0 && i.end > i.start && i.end <= contentLength)
    .sort((a, b) => {
      // Prefer higher severity, then more specific (shorter) span so word-level highlights aren't hidden by paragraph highlights
      if (severityWeight[b.severity] !== severityWeight[a.severity]) {
        return severityWeight[b.severity] - severityWeight[a.severity];
      }
      const lenA = a.end - a.start;
      const lenB = b.end - b.start;
      if (lenA !== lenB) return lenA - lenB;
      return a.start - b.start;
    });

  const accepted: EditorHighlightIssue[] = [];
  for (const candidate of valid) {
    const overlaps = accepted.some(
      (existing) => candidate.start < existing.end && candidate.end > existing.start
    );
    if (!overlaps) {
      accepted.push(candidate);
    }
  }

  return accepted.sort((a, b) => a.start - b.start);
}

/**
 * Splits chapter text into alternating plain and highlighted segments for rendering in the editor backdrop.
 */
export function buildHighlightSegments(
  content: string,
  issues: EditorHighlightIssue[]
): TextHighlightSegment[] {
  if (!content) return [];
  const resolved = resolveNonOverlappingHighlights(issues, content.length);
  if (resolved.length === 0) {
    return [{ text: content, start: 0, end: content.length, issue: null }];
  }

  const segments: TextHighlightSegment[] = [];
  let cursor = 0;

  for (const issue of resolved) {
    if (issue.start > cursor) {
      segments.push({
        text: content.slice(cursor, issue.start),
        start: cursor,
        end: issue.start,
        issue: null,
      });
    }
    segments.push({
      text: content.slice(issue.start, issue.end),
      start: issue.start,
      end: issue.end,
      issue,
    });
    cursor = issue.end;
  }

  if (cursor < content.length) {
    segments.push({
      text: content.slice(cursor),
      start: cursor,
      end: content.length,
      issue: null,
    });
  }

  return segments;
}

/**
 * Safely applies a single highlight issue's replacement into chapter content,
 * cleaning up stray double spaces or punctuation spacing when removing filler words.
 */
export function applyHighlightFix(content: string, issue: EditorHighlightIssue): string {
  if (issue.replacement === undefined) return content;
  if (issue.start < 0 || issue.end > content.length || issue.start >= issue.end) {
    return content;
  }

  const before = content.slice(0, issue.start);
  const after = content.slice(issue.end);

  if (issue.replacement === '') {
    // Removing a filler word cleanly: collapse surrounding double spaces and preserve capitalization if at sentence start
    let left = before;
    let right = after;
    if (left.endsWith(' ') && right.startsWith(' ')) {
      right = right.slice(1);
    } else if (left.endsWith(' ') && /^[,.;:!?]/.test(right)) {
      left = left.slice(0, -1);
    } else if (
      (left.length === 0 || /[.!?\n]\s*$/.test(left)) &&
      /^\s*[a-zäöü]/.test(right)
    ) {
      right = right.replace(/^(\s*)([a-zäöü])/, (_, ws, ch) => `${ws}${ch.toUpperCase()}`);
    }
    return `${left}${right}`;
  }

  return `${before}${issue.replacement}${after}`;
}

/**
 * Runs complete real-time German performance analysis on a single chapter:
 * Readability (Flesch-DE), Word Density (lexical diversity, content ratio, fillers, repetitions),
 * Core Promise Alignment, and exact inline text-editor highlights.
 */
export function analyzeChapterPerformance(
  book: BookProject,
  chapter: Chapter,
  extraAiIssues: EditorHighlightIssue[] = []
): ChapterPerformanceReport {
  const content = chapter.content || '';
  const trimmed = content.trim();

  if (!trimmed) {
    return {
      chapterId: chapter.id,
      overallScore: 0,
      overallLabel: 'Noch kein Text vorhanden',
      isEmpty: true,
      readability: {
        score: 0,
        fleschDe: 0,
        avgSentenceLength: 0,
        avgSyllablesPerWord: 0,
        sentenceCount: 0,
        longSentenceCount: 0,
        longParagraphCount: 0,
        ratingLabel: 'Kein Text',
      },
      density: {
        score: 0,
        wordCount: 0,
        uniqueWordCount: 0,
        lexicalDiversityPercent: 0,
        contentWordRatioPercent: 0,
        fillerWordCount: 0,
        fillerRatePercent: 0,
        repetitionCount: 0,
        ratingLabel: 'Kein Text',
      },
      corePromise: {
        score: 0,
        matchedTerms: [],
        missingTerms: extractKeyTerms(book.corePromise).map((t) => t.display),
        goalCoveragePercent: 0,
        benefitSignalCount: 0,
        openingAnchored: false,
        closingAnchored: false,
        ratingLabel: 'Noch nicht bewertbar',
      },
      issues: [],
    };
  }

  const paragraphs = extractParagraphsWithOffsets(content);
  const sentences = extractSentencesWithOffsets(content);

  const plainForWords = content.replace(/^#+\s*/gm, '').replace(/\*\*/g, '');
  const allWords = plainForWords.match(/[A-Za-zÄÖÜäöüß0-9]+(?:-[A-Za-zÄÖÜäöüß0-9]+)*/g) || [];
  const wordCount = allWords.length;

  const issues: EditorHighlightIssue[] = [];
  let issueCounter = 1;

  // ---------------------------------------------------------------------------
  // 1. LESBARKEIT (Amstad Flesch-DE + Satzlänge + Absatzblöcke)
  // ---------------------------------------------------------------------------
  const sentenceCount = Math.max(1, sentences.length);
  const totalSyllables = allWords.reduce((sum, w) => sum + countGermanSyllables(w), 0);
  const avgSentenceLength = Number((wordCount / sentenceCount).toFixed(1));
  const avgSyllablesPerWord = wordCount > 0 ? Number((totalSyllables / wordCount).toFixed(2)) : 0;

  // Amstad Flesch Reading Ease formula for German
  const rawFleschDe = 180 - avgSentenceLength - 58.5 * avgSyllablesPerWord;
  const fleschDe = Math.round(clamp(rawFleschDe, 0, 100));

  let longSentenceCount = 0;
  for (const s of sentences) {
    const commaCount = (s.text.match(/[,;:–—]/g) || []).length;
    const isVeryLong = s.words.length >= 25 || (s.words.length >= 21 && commaCount >= 2);
    if (isVeryLong) {
      longSentenceCount += 1;
      const splitSuggestion = suggestSentenceSplit(s.text);
      issues.push({
        id: `live-read-sent-${issueCounter++}`,
        category: 'readability',
        severity: s.words.length >= 30 ? 'high' : 'medium',
        title: `Langer Satz (${s.words.length} Wörter)`,
        explanation:
          'Sätze über 22–25 Wörter erschweren das flüssige Lesen auf Kindle-Displays und bremsen das Lesetempo im Sachbuch.',
        suggestion: splitSuggestion
          ? 'Teilen Sie diesen Schachtelsatz in zwei prägnante Sätze auf.'
          : 'Zerlegen Sie den Gedanken in zwei kürzere Sätze (Ziel: 12–18 Wörter pro Satz).',
        excerpt: s.text,
        start: s.start,
        end: s.end,
        replacement: splitSuggestion,
        replacementLabel: splitSuggestion ? 'Satz in zwei Sätze teilen' : undefined,
        source: 'live',
      });
    }
  }

  let longParagraphCount = 0;
  for (const p of paragraphs) {
    if (p.isHeading || p.isList) continue;
    if (p.words.length >= 95) {
      longParagraphCount += 1;
      const splitPara = suggestParagraphSplit(p.text);
      issues.push({
        id: `live-read-para-${issueCounter++}`,
        category: 'readability',
        severity: 'medium',
        title: `Dichter Textblock (${p.words.length} Wörter)`,
        explanation:
          'Sehr lange Absätze wirken auf E-Readern ermüdend. Kurze Absätze (45–80 Wörter) erhöhen die Lesefreude.',
        suggestion: 'Fügen Sie nach der Hälfte des Absatzes einen sauberen Absatzumbruch ein.',
        excerpt: p.text.slice(0, 140) + (p.text.length > 140 ? '…' : ''),
        start: p.start,
        end: p.end,
        replacement: splitPara,
        replacementLabel: splitPara ? 'Absatz sauber teilen' : undefined,
        source: 'live',
      });
    }
  }

  // Score readability for German non-fiction (ideal Flesch-DE: 45-70, ideal ASL: 13-19)
  let readabilityScore = 88;
  if (fleschDe < 35) readabilityScore -= 28;
  else if (fleschDe < 48) readabilityScore -= 14;
  else if (fleschDe > 82) readabilityScore -= 6;
  else if (fleschDe >= 52 && fleschDe <= 72) readabilityScore += 6;

  if (avgSentenceLength > 23) readabilityScore -= 16;
  else if (avgSentenceLength > 19) readabilityScore -= 8;
  else if (avgSentenceLength < 8) readabilityScore -= 8;

  readabilityScore -= Math.min(20, longSentenceCount * 5 + longParagraphCount * 4);
  readabilityScore = Math.round(clamp(readabilityScore, 15, 100));

  const readabilityLabel =
    readabilityScore >= 80
      ? 'Sehr gut lesbar (KDP-optimal)'
      : readabilityScore >= 62
        ? 'Gut lesbar · leichte Straffung möglich'
        : 'Anspruchsvoll · Sätze kürzen empfohlen';

  // ---------------------------------------------------------------------------
  // 2. WORTDICHTE (Inhaltswort-Anteil, Lexikalische Vielfalt, Füllwörter, Wiederholungen)
  // ---------------------------------------------------------------------------
  const normalizedWords = allWords
    .map((w) => w.toLowerCase())
    .filter((w) => /[a-zäöüß]/.test(w));
  const uniqueSet = new Set(normalizedWords);
  const uniqueWordCount = uniqueSet.size;
  const lexicalDiversityPercent =
    normalizedWords.length > 0
      ? Math.round((uniqueWordCount / normalizedWords.length) * 100)
      : 0;

  const contentWords = normalizedWords.filter(
    (w) => !GERMAN_STOPWORDS.has(w) && w.length >= 4
  );
  const contentWordRatioPercent =
    normalizedWords.length > 0
      ? Math.round((contentWords.length / normalizedWords.length) * 100)
      : 0;

  // Detect filler / softener words with exact offsets
  let fillerWordCount = 0;
  for (const rule of FILLER_RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(content)) !== null) {
      // Skip if inside a markdown heading line
      const lineStart = content.lastIndexOf('\n', m.index) + 1;
      if (content.slice(lineStart, m.index).trimStart().startsWith('#')) continue;

      fillerWordCount += 1;
      const matchedText = m[0];
      issues.push({
        id: `live-dens-fill-${issueCounter++}`,
        category: 'density',
        severity: 'low',
        title: `Füllwort „${matchedText}“`,
        explanation: rule.explanation,
        suggestion: rule.suggestion,
        excerpt: matchedText,
        start: m.index,
        end: m.index + matchedText.length,
        replacement: rule.getReplacement(matchedText),
        replacementLabel: `„${matchedText}“ streichen`,
        source: 'live',
      });
    }
  }

  // Detect close-range lexical repetitions of meaningful words (within 18 words)
  let repetitionCount = 0;
  const wordTokenRegex = /\b[A-Za-zÄÖÜäöüß]{5,}\b/g;
  const recentTokens: Array<{ stem: string; raw: string; index: number; wordPos: number }> = [];
  let wm: RegExpExecArray | null;
  let wPos = 0;

  while ((wm = wordTokenRegex.exec(content)) !== null) {
    const raw = wm[0];
    const lower = raw.toLowerCase();
    wPos += 1;
    if (GERMAN_STOPWORDS.has(lower)) continue;
    // Skip markdown headings
    const lineStart = content.lastIndexOf('\n', wm.index) + 1;
    if (content.slice(lineStart, wm.index).trimStart().startsWith('#')) continue;

    const stem = normalizeGermanToken(raw);
    const prev = recentTokens.find(
      (t) => t.stem === stem && wPos - t.wordPos <= 14 && t.raw.toLowerCase() === lower
    );
    if (prev && repetitionCount < 5) {
      // Don't flag core book terms like "Konto" or "Schlaf" if used deliberately in bullet lists
      const coreTerms = extractKeyTerms(`${book.title} ${book.corePromise}`).map((t) => t.stem);
      if (!coreTerms.includes(stem)) {
        repetitionCount += 1;
        issues.push({
          id: `live-dens-rep-${issueCounter++}`,
          category: 'density',
          severity: 'low',
          title: `Wortwiederholung „${raw}“`,
          explanation: `Das Wort „${raw}“ tritt kurz hintereinander erneut auf und senkt die stilistische Vielfalt.`,
          suggestion: 'Verwenden Sie ein präzises Synonym oder verknüpfen Sie den Gedanken eleganter.',
          excerpt: raw,
          start: wm.index,
          end: wm.index + raw.length,
          source: 'live',
        });
      }
    }
    recentTokens.push({ stem, raw, index: wm.index, wordPos: wPos });
    if (recentTokens.length > 22) recentTokens.shift();
  }

  const fillerRatePercent =
    wordCount > 0 ? Number(((fillerWordCount / wordCount) * 100).toFixed(1)) : 0;

  // Score word density: German non-fiction sweet spot is 46–62% content words, low filler rate (<1.5%), solid vocabulary variety
  let densityScore = 84;
  if (contentWordRatioPercent >= 44 && contentWordRatioPercent <= 64) {
    densityScore += 8;
  } else if (contentWordRatioPercent < 38) {
    densityScore -= 18;
  } else if (contentWordRatioPercent > 70) {
    densityScore -= 10; // overly dense jargon
  }

  if (lexicalDiversityPercent < 42 && wordCount > 120) {
    densityScore -= 12;
  } else if (lexicalDiversityPercent >= 52) {
    densityScore += 5;
  }

  densityScore -= Math.min(24, fillerWordCount * 5 + repetitionCount * 4);
  densityScore = Math.round(clamp(densityScore, 15, 100));

  const densityLabel =
    densityScore >= 80
      ? 'Prägnant & substanzreich'
      : densityScore >= 62
        ? 'Ausgewogen · Füllwörter straffen'
        : 'Geringe Dichte · spürbar straffen';

  // ---------------------------------------------------------------------------
  // 3. CORE-PROMISE-EINHALTUNG (Buchversprechen + Kapitelziel + Leser-Nutzen)
  // ---------------------------------------------------------------------------
  const normalizedChapter = `${chapter.title} ${content}`.toLowerCase();
  const promiseTerms = extractKeyTerms(book.corePromise);
  const goalTerms = extractKeyTerms(chapter.goal);
  const pillarLex = PILLAR_LEXICON[book.pillar] || [];

  const matchedTerms: string[] = [];
  const missingTerms: string[] = [];

  for (const term of promiseTerms) {
    if (textMatchesTerm(normalizedChapter, term.stem)) {
      matchedTerms.push(term.display);
    } else {
      missingTerms.push(term.display);
    }
  }

  const matchedGoalCount = goalTerms.filter((t) =>
    textMatchesTerm(normalizedChapter, t.stem)
  ).length;
  const goalCoveragePercent =
    goalTerms.length > 0 ? Math.round((matchedGoalCount / goalTerms.length) * 100) : 70;

  const pillarMatches = pillarLex.filter((kw) => normalizedChapter.includes(kw)).length;

  let benefitSignalCount = 0;
  for (const rx of READER_BENEFIT_MARKERS) {
    rx.lastIndex = 0;
    const m = content.match(rx);
    if (m) benefitSignalCount += m.length;
  }

  const proseParagraphs = paragraphs.filter((p) => !p.isHeading);
  const firstProse = proseParagraphs[0];
  const lastProse = proseParagraphs[proseParagraphs.length - 1];

  const allAnchorStems = [
    ...promiseTerms.map((t) => t.stem),
    ...goalTerms.map((t) => t.stem),
  ];

  const openingAnchored = firstProse
    ? allAnchorStems.some((stem) => textMatchesTerm(firstProse.text.toLowerCase(), stem)) ||
      pillarLex.some((kw) => firstProse.text.toLowerCase().includes(kw))
    : false;

  const closingAnchored = lastProse
    ? allAnchorStems.some((stem) => textMatchesTerm(lastProse.text.toLowerCase(), stem)) ||
      pillarLex.some((kw) => lastProse.text.toLowerCase().includes(kw))
    : false;

  const promiseCoverageRatio =
    promiseTerms.length > 0 ? matchedTerms.length / promiseTerms.length : 0.7;

  let corePromiseScore = Math.round(
    promiseCoverageRatio * 48 +
      (goalCoveragePercent / 100) * 26 +
      Math.min(14, pillarMatches * 3.5) +
      Math.min(12, benefitSignalCount * 1.5)
  );
  if (openingAnchored) corePromiseScore += 4;
  if (closingAnchored) corePromiseScore += 4;
  corePromiseScore = Math.round(clamp(corePromiseScore, 10, 100));

  // Flag inline Core Promise improvements directly on concrete paragraphs in the editor
  if (missingTerms.length > 0 && lastProse) {
    const focusTerms = missingTerms.slice(0, 3).join(', ');
    const bridgeSentence = ` So zahlt auch dieses Kapitel unmittelbar auf Ihr Ziel ein: ${book.corePromise}`;
    const alreadyHasSentence = lastProse.text.includes(book.corePromise.slice(0, 28));
    issues.push({
      id: `live-cp-closing-${issueCounter++}`,
      category: 'core-promise',
      severity: corePromiseScore < 65 ? 'high' : 'medium',
      title: 'Core-Promise-Brücke am Kapitelende stärken',
      explanation: `Folgende Kernbegriffe Ihres Buchversprechens fehlen in diesem Kapitel bisher noch: ${focusTerms}.`,
      suggestion:
        'Verknüpfen Sie den Abschlussabsatz explizit mit dem zentralen Buchversprechen, damit der Leser den roten Faden spürt.',
      excerpt: lastProse.text.slice(0, 150) + (lastProse.text.length > 150 ? '…' : ''),
      start: lastProse.start,
      end: lastProse.end,
      replacement: alreadyHasSentence ? undefined : `${lastProse.text}${bridgeSentence}`,
      replacementLabel: alreadyHasSentence ? undefined : 'Core-Promise-Brückensatz ergänzen',
      source: 'live',
    });
  }

  // Flag any body prose paragraph (>= 35 words) that drifts away from both Core Promise and chapter goal
  for (let i = 0; i < proseParagraphs.length; i++) {
    const p = proseParagraphs[i];
    if (p.isList || p.words.length < 35) continue;
    // Skip lastProse if we already flagged it above
    if (p === lastProse && missingTerms.length > 0) continue;

    const pLower = p.text.toLowerCase();
    const hitsAnchor = allAnchorStems.some((stem) => textMatchesTerm(pLower, stem));
    const hitsPillar = pillarLex.some((kw) => pLower.includes(kw));
    if (!hitsAnchor && !hitsPillar) {
      issues.push({
        id: `live-cp-drift-${issueCounter++}`,
        category: 'core-promise',
        severity: 'medium',
        title: 'Absatz ohne direkten Core-Promise-Bezug',
        explanation:
          'Dieser Absatz enthält weder Schlüsselbegriffe Ihres Core Promise noch des Kapitelziels – der Leser könnte den praktischen Nutzen aus den Augen verlieren.',
        suggestion: `Stellen Sie einen klaren Bezug zum Kapitelziel („${chapter.goal}“) oder zum Buchversprechen her.`,
        excerpt: p.text.slice(0, 140) + (p.text.length > 140 ? '…' : ''),
        start: p.start,
        end: p.end,
        source: 'live',
      });
      break; // Keep inline highlights focused (max 1 drift flag at a time)
    }
  }

  const corePromiseLabel =
    corePromiseScore >= 78
      ? 'Stark auf Core Promise ausgerichtet'
      : corePromiseScore >= 58
        ? 'Gute Basis · Kernbegriffe schärfen'
        : 'Schwacher Bezug · Core Promise verankern';

  // Merge optional AI-returned issues (matching verbatim excerpts into content)
  const mergedIssues = [...issues, ...extraAiIssues].sort((a, b) => a.start - b.start);

  const overallScore = Math.round(
    readabilityScore * 0.35 + densityScore * 0.3 + corePromiseScore * 0.35
  );

  const overallLabel =
    overallScore >= 82
      ? 'Druckreif & stark fokussiert'
      : overallScore >= 66
        ? 'Solide · gezielter Feinschliff lohnt sich'
        : 'Überarbeitung empfohlen';

  return {
    chapterId: chapter.id,
    overallScore,
    overallLabel,
    isEmpty: false,
    readability: {
      score: readabilityScore,
      fleschDe,
      avgSentenceLength,
      avgSyllablesPerWord,
      sentenceCount,
      longSentenceCount,
      longParagraphCount,
      ratingLabel: readabilityLabel,
    },
    density: {
      score: densityScore,
      wordCount,
      uniqueWordCount,
      lexicalDiversityPercent,
      contentWordRatioPercent,
      fillerWordCount,
      fillerRatePercent,
      repetitionCount,
      ratingLabel: densityLabel,
    },
    corePromise: {
      score: corePromiseScore,
      matchedTerms,
      missingTerms,
      goalCoveragePercent,
      benefitSignalCount,
      openingAnchored,
      closingAnchored,
      ratingLabel: corePromiseLabel,
    },
    issues: mergedIssues,
  };
}

/**
 * Matches verbatim excerpts from AI deep-analysis suggestions back to character offsets in chapter.content.
 */
export function anchorAiSuggestionsToContent(
  content: string,
  aiSuggestions: Array<{
    id?: string;
    category: PerformanceCategory;
    severity?: PerformanceSeverity;
    title: string;
    explanation: string;
    suggestion: string;
    excerpt: string;
    replacement?: string;
  }>
): EditorHighlightIssue[] {
  const anchored: EditorHighlightIssue[] = [];
  const lowerContent = content.toLowerCase();

  aiSuggestions.forEach((item, idx) => {
    const cleanExcerpt = (item.excerpt || '').trim();
    if (!cleanExcerpt) return;

    let start = content.indexOf(cleanExcerpt);
    if (start === -1) {
      start = lowerContent.indexOf(cleanExcerpt.toLowerCase());
    }
    if (start === -1 && cleanExcerpt.length > 32) {
      // Fallback: try matching first 32 characters
      start = lowerContent.indexOf(cleanExcerpt.slice(0, 32).toLowerCase());
    }
    if (start === -1) return;

    const end = Math.min(content.length, start + cleanExcerpt.length);
    anchored.push({
      id: item.id || `ai-perf-${idx + 1}`,
      category: item.category,
      severity: item.severity || 'medium',
      title: item.title,
      explanation: item.explanation,
      suggestion: item.suggestion,
      excerpt: content.slice(start, end),
      start,
      end,
      replacement: item.replacement?.trim() || undefined,
      replacementLabel: item.replacement?.trim() ? 'KI-Formulierung übernehmen' : undefined,
      source: 'ai',
    });
  });

  return anchored;
}

/**
 * Computes lightweight performance summaries for all chapters in a book for comparison & sidebar badges.
 */
export function analyzeAllChaptersPerformance(book: BookProject): Record<string, ChapterPerformanceReport> {
  const map: Record<string, ChapterPerformanceReport> = {};
  for (const ch of book.chapters) {
    map[ch.id] = analyzeChapterPerformance(book, ch);
  }
  return map;
}
