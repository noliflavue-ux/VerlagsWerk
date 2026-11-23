import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_BOOKS } from '../data/seedBooks';
import {
  convertTocProposalsToChapters,
  extractCorePromiseConcepts,
  formatTocAsPlainText,
  generateTocFromCorePromise,
} from './tocGenerator';

test('extractCorePromiseConcepts extracts substantive German concepts and time anchors from Core Promise', () => {
  const book = SEED_BOOKS[0]; // "Ein klares 4-Konten- und ETF-System, das monatlich in 15 Minuten läuft und finanzielle Ruhe schafft."
  const extracted = extractCorePromiseConcepts(book);

  assert.equal(extracted.timeAnchor, '15 Minuten');
  assert.ok(extracted.concepts.includes('4-Konten'));
  assert.ok(extracted.concepts.includes('ETF-System'));
});

test('generateTocFromCorePromise creates requested chapter counts across structure styles anchored to Core Promise', () => {
  const book = SEED_BOOKS[0];

  const toc6 = generateTocFromCorePromise(book, {
    chapterCount: 6,
    structureStyle: 'praxis-leitfaden',
  });
  assert.equal(toc6.chapters.length, 6);
  assert.equal(toc6.source, 'auto');
  assert.ok(toc6.totalEstimatedWords > 8000);
  // Core Promise terms and time anchor must flow directly into generated chapters
  const combinedText = toc6.chapters
    .map((c) => `${c.title} ${c.goal} ${c.promiseLink} ${c.sections.join(' ')}`)
    .join(' ');
  assert.ok(combinedText.includes('4-Konten'));
  assert.ok(combinedText.includes('15 Minuten'));

  const toc8 = generateTocFromCorePromise(book, {
    chapterCount: 8,
    structureStyle: 'protokoll',
  });
  assert.equal(toc8.chapters.length, 8);
  assert.ok(toc8.chapters.every((ch) => ch.sections.length >= 3 && ch.partLabel.length > 0));

  const toc5 = generateTocFromCorePromise(book, {
    chapterCount: 5,
    structureStyle: 'problem-system',
  });
  assert.equal(toc5.chapters.length, 5);
});

test('generateTocFromCorePromise handles empty corePromise gracefully using pillar fallback', () => {
  const minimalBook = {
    ...SEED_BOOKS[1],
    corePromise: '   ',
  };
  const toc = generateTocFromCorePromise(minimalBook, { chapterCount: 6 });
  assert.equal(toc.chapters.length, 6);
  assert.ok(toc.corePromiseUsed.length > 10);
});

test('convertTocProposalsToChapters filters excluded chapters and seeds ## headings when requested', () => {
  const toc = generateTocFromCorePromise(SEED_BOOKS[0], { chapterCount: 5 });
  const toggled = toc.chapters.map((ch, idx) => (idx === 1 ? { ...ch, included: false } : ch));

  const withSections = convertTocProposalsToChapters(toggled, { includeSectionsInContent: true });
  assert.equal(withSections.length, 4);
  assert.ok(withSections[0].content.includes('## '));
  assert.equal(withSections[0].annotations.length, 0);

  const emptyDrafts = convertTocProposalsToChapters(toggled, { includeSectionsInContent: false });
  assert.equal(emptyDrafts.length, 4);
  assert.equal(emptyDrafts[0].content, '');
});

test('formatTocAsPlainText renders structured parts, numbered chapters, and subsections', () => {
  const toc = generateTocFromCorePromise(SEED_BOOKS[0], { chapterCount: 6 });
  const text = formatTocAsPlainText(toc, SEED_BOOKS[0].title);

  assert.ok(text.includes('Stille Souveränität'));
  assert.ok(text.includes('TEIL I'));
  assert.ok(text.includes('Kapitel 1:'));
  assert.ok(text.includes('1.1 '));
});
