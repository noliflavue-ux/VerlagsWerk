import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendSegmentToChapter,
  CURATED_BOOK_IDEAS,
  drawLuckyBookIdeas,
} from './ideaGenerator';

test('drawLuckyBookIdeas returns distinct evergreen pillars when pillarFilter is all', () => {
  const picks = drawLuckyBookIdeas('all', 3, [], () => 0.42);
  assert.equal(picks.length, 3);
  const pillars = new Set(picks.map((p) => p.pillar));
  assert.equal(pillars.size, 3);
});

test('drawLuckyBookIdeas respects a specific pillar filter and excludes previously seen ids', () => {
  const firstBatch = drawLuckyBookIdeas('gesundheit', 2, [], () => 0.25);
  assert.equal(firstBatch.length, 2);
  assert.ok(firstBatch.every((i) => i.pillar === 'gesundheit'));

  const secondBatch = drawLuckyBookIdeas(
    'gesundheit',
    2,
    firstBatch.map((i) => i.id),
    () => 0.25
  );
  assert.equal(secondBatch.length, 2);
  assert.ok(secondBatch.every((i) => i.pillar === 'gesundheit'));
  const overlap = secondBatch.filter((i) => firstBatch.some((f) => f.id === i.id));
  assert.equal(overlap.length, 0);
});

test('all curated book ideas have required KDP fields across all 4 evergreen pillars', () => {
  const byPillar = new Map<string, number>();
  for (const idea of CURATED_BOOK_IDEAS) {
    assert.ok(idea.title.trim().length > 3);
    assert.ok(idea.subtitle.trim().length > 5);
    assert.ok(idea.corePromise.trim().length > 10);
    assert.ok(idea.targetAudience.trim().length > 5);
    assert.ok(idea.sampleChapters.length >= 4);
    byPillar.set(idea.pillar, (byPillar.get(idea.pillar) || 0) + 1);
  }
  assert.equal(byPillar.get('geld'), 4);
  assert.equal(byPillar.get('beziehung'), 4);
  assert.equal(byPillar.get('glueck'), 4);
  assert.equal(byPillar.get('gesundheit'), 4);
});

test('appendSegmentToChapter cleanly inserts heading and body without breaking markdown', () => {
  const merged = appendSegmentToChapter(
    'Bestehender Absatz.',
    'Praxisbeispiel',
    'Ein konkretes Rechenbeispiel macht das Prinzip sofort greifbar.'
  );
  assert.equal(
    merged,
    'Bestehender Absatz.\n\n## Praxisbeispiel\n\nEin konkretes Rechenbeispiel macht das Prinzip sofort greifbar.'
  );

  const emptyStart = appendSegmentToChapter('', '## Einstieg', 'Erster Satz.');
  assert.equal(emptyStart, '## Einstieg\n\nErster Satz.');
});
