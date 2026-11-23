import type { BookFormatChannels, BookProject, BookStatus } from '../types/book';
import { countProjectWords } from './kdpEngine';

export const DEFAULT_BOOK_FORMATS: BookFormatChannels = {
  kindleEbook: true,
  paperback: true,
  hardcover: false,
  audiobook: false,
};

export function getBookStatus(book: BookProject): BookStatus {
  return book.status === 'eingereicht' ? 'eingereicht' : 'in-arbeit';
}

export function isBookLocked(book: BookProject): boolean {
  return getBookStatus(book) === 'eingereicht';
}

export function getBookFormats(book: BookProject): BookFormatChannels {
  return {
    ...DEFAULT_BOOK_FORMATS,
    ...(book.formats || {}),
  };
}

export function normalizeBookProject(book: BookProject): BookProject {
  return {
    ...book,
    status: getBookStatus(book),
    formats: getBookFormats(book),
  };
}

export function countBooksByStatus(books: BookProject[]): {
  all: number;
  inArbeit: number;
  eingereicht: number;
} {
  let inArbeit = 0;
  let eingereicht = 0;
  for (const b of books) {
    if (isBookLocked(b)) {
      eingereicht += 1;
    } else {
      inArbeit += 1;
    }
  }
  return {
    all: books.length,
    inArbeit,
    eingereicht,
  };
}

export function filterBooksByStatus(
  books: BookProject[],
  filter: 'all' | BookStatus
): BookProject[] {
  if (filter === 'all') return books;
  return books.filter((b) => getBookStatus(b) === filter);
}

export interface AudiobookReadinessReport {
  plannedOrSubmitted: boolean;
  totalWords: number;
  estimatedMinutes: number;
  formattedDuration: string;
  suitable: boolean;
  readinessLabel: string;
  bulletRatioPercent: number;
  notes: string[];
}

/**
 * Evaluates whether a book manuscript is ready and suitable for an Audiobook (Audible / ACX).
 * Standard German non-fiction narration pace is ~145-155 words/minute (~9,000 words/hour).
 */
export function evaluateAudiobookReadiness(book: BookProject): AudiobookReadinessReport {
  const formats = getBookFormats(book);
  const totalWords = countProjectWords(book);
  const wordsPerMinute = 150;
  const estimatedMinutes = Math.max(1, Math.round(totalWords / wordsPerMinute));

  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  const formattedDuration =
    hours > 0 ? `${hours} Std. ${mins} Min.` : `${mins} Min.`;

  const allLines = book.chapters
    .flatMap((ch) => ch.content.split(/\r?\n/))
    .map((l) => l.trim())
    .filter(Boolean);
  const bulletLines = allLines.filter(
    (l) => l.startsWith('- ') || l.startsWith('• ')
  ).length;
  const bulletRatioPercent =
    allLines.length > 0 ? Math.round((bulletLines / allLines.length) * 100) : 0;

  const nonEmptyChapters = book.chapters.filter((ch) => ch.content.trim().length > 0).length;
  const notes: string[] = [];

  if (nonEmptyChapters >= 3) {
    notes.push(`${nonEmptyChapters} ausgearbeitete Kapitel eignen sich sauber als Hörbuch-Tracks.`);
  } else {
    notes.push('Mindestens 3 ausgearbeitete Kapitel für klare ACX-Kapiteltrennung empfohlen.');
  }

  if (bulletRatioPercent <= 35) {
    notes.push('Fließtext-Anteil ist hoch — angenehm flüssig vorlesbar (ACX/Audible-tauglich).');
  } else {
    notes.push('Hoher Listenanteil — Aufzählungen vor der Vertonung leicht glätten.');
  }

  if (totalWords >= 1500) {
    notes.push(`Geschätzte Hörbuch-Laufzeit: ca. ${formattedDuration} (bei 150 Wörtern/Min.).`);
  } else {
    notes.push(
      `Aktueller Entwurfs-Umfang: ca. ${formattedDuration} (für ein Voll-Hörbuch ab ca. 9.000 Wörtern / 1 Std.).`
    );
  }

  const suitable = nonEmptyChapters >= 3 && bulletRatioPercent <= 45;
  const readinessLabel = !suitable
    ? 'Nachbearbeitung empfohlen'
    : totalWords >= 1500
      ? 'Hörbuch-geeignet (ACX / Audible)'
      : 'Struktur geeignet (Kurz-Umfang)';

  return {
    plannedOrSubmitted: formats.audiobook,
    totalWords,
    estimatedMinutes,
    formattedDuration,
    suitable,
    readinessLabel,
    bulletRatioPercent,
    notes,
  };
}

export interface FormatChannelSummaryItem {
  id: keyof BookFormatChannels;
  label: string;
  active: boolean;
  detail: string;
}

export function getBookFormatSummary(book: BookProject): FormatChannelSummaryItem[] {
  const formats = getBookFormats(book);
  const audio = evaluateAudiobookReadiness(book);
  return [
    {
      id: 'paperback',
      label: 'Taschenbuch',
      active: formats.paperback,
      detail: `${book.format.trimSize.toUpperCase()} · Print-PDF`,
    },
    {
      id: 'kindleEbook',
      label: 'Kindle eBook',
      active: formats.kindleEbook,
      detail: `${book.kdp.ebookPriceEur.toFixed(2)} € · PDF & EPUB`,
    },
    {
      id: 'hardcover',
      label: 'Hardcover',
      active: formats.hardcover,
      detail: 'Gebundene Ausgabe (KDP)',
    },
    {
      id: 'audiobook',
      label: 'Hörbuch (ACX)',
      active: formats.audiobook,
      detail: formats.audiobook
        ? `Aktiv · ca. ${audio.formattedDuration}`
        : `Nicht gewählt · ${audio.suitable ? 'geeignet' : 'prüfen'}`,
    },
  ];
}
