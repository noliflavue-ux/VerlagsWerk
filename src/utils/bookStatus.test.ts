import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_BOOKS } from '../data/seedBooks';
import {
  countBooksByStatus,
  evaluateAudiobookReadiness,
  filterBooksByStatus,
  getBookFormats,
  getBookFormatSummary,
  getBookStatus,
  isBookLocked,
  normalizeBookProject,
} from './bookStatus';

test('normalizeBookProject defaults legacy books to in-arbeit with print and kindle enabled', () => {
  const legacy = { ...SEED_BOOKS[0] };
  delete legacy.status;
  delete legacy.formats;

  const normalized = normalizeBookProject(legacy);
  assert.equal(getBookStatus(normalized), 'in-arbeit');
  assert.equal(isBookLocked(normalized), false);
  const formats = getBookFormats(normalized);
  assert.equal(formats.paperback, true);
  assert.equal(formats.kindleEbook, true);
  assert.equal(formats.hardcover, false);
  assert.equal(formats.audiobook, false);
});

test('isBookLocked returns true only when status is eingereicht', () => {
  const draft = { ...SEED_BOOKS[0], status: 'in-arbeit' as const };
  const submitted = { ...SEED_BOOKS[0], status: 'eingereicht' as const, submittedAt: '2026-11-20' };

  assert.equal(isBookLocked(draft), false);
  assert.equal(isBookLocked(submitted), true);
});

test('countBooksByStatus and filterBooksByStatus accurately partition draft and submitted books', () => {
  const b1 = { ...SEED_BOOKS[0], id: 'b1', status: 'in-arbeit' as const };
  const b2 = { ...SEED_BOOKS[0], id: 'b2', status: 'eingereicht' as const };
  const b3 = { ...SEED_BOOKS[0], id: 'b3', status: 'eingereicht' as const };

  const counts = countBooksByStatus([b1, b2, b3]);
  assert.deepEqual(counts, { all: 3, inArbeit: 1, eingereicht: 2 });
  assert.equal(filterBooksByStatus([b1, b2, b3], 'all').length, 3);
  assert.equal(filterBooksByStatus([b1, b2, b3], 'in-arbeit').length, 1);
  assert.equal(filterBooksByStatus([b1, b2, b3], 'eingereicht').length, 2);
});

test('evaluateAudiobookReadiness computes duration, suitability, and planned flag', () => {
  const withAudio = {
    ...SEED_BOOKS[0],
    formats: { kindleEbook: true, paperback: true, hardcover: false, audiobook: true },
  };
  const report = evaluateAudiobookReadiness(withAudio);
  assert.equal(report.plannedOrSubmitted, true);
  assert.ok(report.totalWords > 200);
  assert.ok(report.estimatedMinutes >= 2);
  assert.equal(report.suitable, true);
  assert.ok(report.formattedDuration.includes('Min.'));

  const summary = getBookFormatSummary(withAudio);
  const audioItem = summary.find((s) => s.id === 'audiobook');
  assert.ok(audioItem);
  assert.equal(audioItem.active, true);
});
