import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_BOOKS } from '../data/seedBooks';
import {
  evaluateAllChaptersChecklist,
  evaluateChapterChecklist,
  insertChecklistSnippet,
} from './chapterChecklist';

test('evaluateChapterChecklist checks all 5 required elements per chapter anchored to Core Promise', () => {
  const book = SEED_BOOKS[0];
  const report = evaluateChapterChecklist(book, book.chapters[0]);

  assert.equal(report.totalCount, 5);
  assert.deepEqual(
    report.items.map((i) => i.id),
    ['intro', 'core-promise', 'core-argument', 'practical-tip', 'summary']
  );
  assert.equal(report.isEmpty, false);
  assert.ok(report.completionPercent >= 50 && report.completionPercent <= 100);

  const intro = report.items.find((i) => i.id === 'intro');
  const arg = report.items.find((i) => i.id === 'core-argument');
  const summary = report.items.find((i) => i.id === 'summary');
  assert.equal(intro?.status, 'present');
  assert.equal(arg?.status, 'present');
  assert.equal(summary?.status, 'present');
});

test('evaluateChapterChecklist flags missing elements in sparse chapter and upgrades them to present after inserting snippets', () => {
  const book = SEED_BOOKS[0];
  const sparseChapter = {
    id: 'ch-sparse',
    title: 'Kurzer Entwurf',
    goal: 'Das 4-Konten-System vorstellen',
    content: '## Erste Stichpunkte\n\n- Punkt eins\n- Punkt zwei',
    annotations: [],
  };

  const before = evaluateChapterChecklist(book, sparseChapter);
  assert.equal(before.items.find((i) => i.id === 'intro')?.status, 'missing');
  assert.equal(before.items.find((i) => i.id === 'summary')?.status, 'missing');

  // Insert suggested intro (prepends) and suggested summary + practical tip (appends)
  let updatedContent = sparseChapter.content;
  for (const id of ['intro', 'core-argument', 'practical-tip', 'summary'] as const) {
    const item = before.items.find((i) => i.id === id)!;
    updatedContent = insertChecklistSnippet(updatedContent, item);
  }

  const after = evaluateChapterChecklist(book, {
    ...sparseChapter,
    content: updatedContent,
  });

  assert.equal(after.presentCount, 5);
  assert.equal(after.completionPercent, 100);
});

test('evaluateChapterChecklist supports manual author check overrides and evaluates all chapters', () => {
  const book = SEED_BOOKS[0];
  const ch2 = book.chapters[1];
  const withoutOverride = evaluateChapterChecklist(book, ch2);
  const withOverride = evaluateChapterChecklist(book, ch2, { summary: true });

  assert.equal(withOverride.items.find((i) => i.id === 'summary')?.status, 'present');
  assert.ok(withOverride.completionPercent >= withoutOverride.completionPercent);

  const all = evaluateAllChaptersChecklist(book);
  assert.equal(Object.keys(all).length, book.chapters.length);
});

test('evaluateChapterChecklist handles empty chapter cleanly', () => {
  const book = SEED_BOOKS[0];
  const emptyChapter = {
    id: 'ch-empty',
    title: 'Leer',
    goal: 'Test',
    content: '',
    annotations: [],
  };
  const report = evaluateChapterChecklist(book, emptyChapter);
  assert.equal(report.isEmpty, true);
  assert.equal(report.presentCount, 0);
  assert.equal(report.missingCount, 5);
  assert.equal(report.completionPercent, 0);
});

test('insertChecklistSnippet places practical-tip before an existing conclusion so summary stays present', () => {
  const book = SEED_BOOKS[0];
  const ch1 = book.chapters[0];
  const before = evaluateChapterChecklist(book, ch1);
  const tipItem = before.items.find((i) => i.id === 'practical-tip')!;

  assert.equal(before.items.find((i) => i.id === 'summary')?.status, 'present');
  assert.notEqual(tipItem.status, 'present');

  const updatedContent = insertChecklistSnippet(ch1.content, tipItem);
  const after = evaluateChapterChecklist(book, {
    ...ch1,
    content: updatedContent,
  });

  assert.equal(after.items.find((i) => i.id === 'practical-tip')?.status, 'present');
  assert.equal(after.items.find((i) => i.id === 'summary')?.status, 'present');
  assert.equal(after.presentCount, 5);
  assert.equal(after.completionPercent, 100);
});

