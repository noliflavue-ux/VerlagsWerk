import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_BOOKS } from '../data/seedBooks';
import {
  analyzeAllChaptersPerformance,
  analyzeChapterPerformance,
  anchorAiSuggestionsToContent,
  applyHighlightFix,
  buildHighlightSegments,
  countGermanSyllables,
  extractKeyTerms,
  resolveNonOverlappingHighlights,
} from './chapterPerformance';

test('countGermanSyllables estimates German syllables including umlauts and diphthongs', () => {
  assert.equal(countGermanSyllables('Geld'), 1);
  assert.equal(countGermanSyllables('Ruhe'), 2);
  assert.equal(countGermanSyllables('Finanzsystem'), 4);
  assert.equal(countGermanSyllables('Souveränität'), 5);
});

test('analyzeChapterPerformance computes readability, word density, and Core Promise scores on seed chapter', () => {
  const book = SEED_BOOKS[0];
  const chapter = book.chapters[0];
  const report = analyzeChapterPerformance(book, chapter);

  assert.equal(report.isEmpty, false);
  assert.ok(report.overallScore >= 40 && report.overallScore <= 100);
  assert.ok(report.readability.fleschDe >= 0 && report.readability.fleschDe <= 100);
  assert.ok(report.readability.avgSentenceLength > 5);
  assert.ok(report.density.wordCount > 150);
  assert.ok(report.density.contentWordRatioPercent > 30);
  assert.ok(report.corePromise.matchedTerms.length >= 1);
  assert.ok(report.issues.length >= 1);
});

test('analyzeChapterPerformance flags filler words, long sentences, and missing Core Promise anchors with exact offsets', () => {
  const book = {
    ...SEED_BOOKS[0],
    corePromise: 'Ein klares 4-Konten-System für langfristige finanzielle Ruhe.',
  };
  const testChapter = {
    id: 'ch-test',
    title: 'Testkapitel',
    goal: 'Praxisbeispiel zeigen',
    content:
      'Das ist eigentlich irgendwie ein extrem langer und verschachtelter Satz, weil wir absichtlich sozusagen viele unnötige Wörter aneinanderreihen, während der Leser mühsam versucht, den eigentlichen roten Faden bis zum Ende durchzuhalten und dabei leider die Übersicht verliert.\n\nEin kurzer zweiter Absatz ohne Themenbezug beschreibt lediglich das Wetter im Herbst.',
    annotations: [],
  };

  const report = analyzeChapterPerformance(book, testChapter);
  const categories = new Set(report.issues.map((i) => i.category));
  assert.ok(categories.has('readability'), 'Should detect long sentence');
  assert.ok(categories.has('density'), 'Should detect filler words');
  assert.ok(categories.has('core-promise'), 'Should detect missing Core Promise anchor');

  // Every issue offset must match chapter content bounds
  for (const issue of report.issues) {
    assert.ok(issue.start >= 0 && issue.end > issue.start && issue.end <= testChapter.content.length);
  }

  // Applying a filler removal fix removes the filler word cleanly without double spaces
  const fillerIssue = report.issues.find((i) => i.category === 'density' && i.replacement === '');
  assert.ok(fillerIssue, 'Filler issue should offer one-click removal');
  const fixed = applyHighlightFix(testChapter.content, fillerIssue);
  assert.ok(!fixed.includes('  '), 'Should not leave double spaces after removal');
  assert.ok(fixed.length < testChapter.content.length);
});

test('resolveNonOverlappingHighlights and buildHighlightSegments reconstruct exact original string', () => {
  const book = SEED_BOOKS[0];
  const chapter = book.chapters[0];
  const report = analyzeChapterPerformance(book, chapter);

  const resolved = resolveNonOverlappingHighlights(report.issues, chapter.content.length);
  for (let i = 1; i < resolved.length; i++) {
    assert.ok(resolved[i].start >= resolved[i - 1].end, 'Highlights must never overlap');
  }

  const segments = buildHighlightSegments(chapter.content, report.issues);
  const reconstructed = segments.map((s) => s.text).join('');
  assert.equal(reconstructed, chapter.content, 'Segments must reconstruct chapter text verbatim');
});

test('analyzeChapterPerformance handles empty chapter cleanly without NaN', () => {
  const book = SEED_BOOKS[0];
  const emptyChapter = {
    id: 'ch-empty',
    title: 'Leeres Kapitel',
    goal: 'Test',
    content: '   ',
    annotations: [],
  };

  const report = analyzeChapterPerformance(book, emptyChapter);
  assert.equal(report.isEmpty, true);
  assert.equal(report.overallScore, 0);
  assert.equal(Number.isNaN(report.readability.fleschDe), false);
  assert.ok(extractKeyTerms(book.corePromise).length > 0);
});

test('anchorAiSuggestionsToContent maps verbatim AI excerpts to exact character offsets and analyzes all chapters', () => {
  const book = SEED_BOOKS[0];
  const content = book.chapters[0].content;
  const target = 'In der Finanzbranche gilt Aufmerksamkeit als Währung.';

  const anchored = anchorAiSuggestionsToContent(content, [
    {
      category: 'core-promise',
      severity: 'medium',
      title: 'Direkte Brücke zum 4-Konten-System',
      explanation: 'Verbindet das Problem direkt mit der Lösung.',
      suggestion: 'Ergänzen Sie einen Hinweis auf das 4-Konten-System.',
      excerpt: target,
      replacement: `${target} Ihr 4-Konten-System entzieht sich diesem Lärm bewusst.`,
    },
  ]);

  assert.equal(anchored.length, 1);
  assert.equal(content.slice(anchored[0].start, anchored[0].end), target);

  const allReports = analyzeAllChaptersPerformance(book);
  assert.equal(Object.keys(allReports).length, book.chapters.length);
});
