import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_BOOKS } from '../data/seedBooks';
import {
  buildDeterministicCoverPrompts,
  buildInstantAutoCoverPair,
  generateEditorialCoverSvg,
  getKindleCoverVariant,
  getPrintCoverVariant,
  svgToDataUrl,
} from './coverDesigner';
import type { CoverMotifStyle } from '../types/book';

test('buildDeterministicCoverPrompts produces distinct Print and Kindle prompts without text artifacts', () => {
  const book = SEED_BOOKS[0];
  const bundle = buildDeterministicCoverPrompts(book, 'editorial-luxury');
  assert.ok(bundle.printPrompt.includes(book.title));
  assert.ok(bundle.kindlePrompt.includes(book.title));
  assert.notEqual(bundle.printPrompt, bundle.kindlePrompt);
  assert.ok(bundle.kindlePrompt.includes('1600x2560'));
  assert.ok(bundle.negativePrompt.includes('text'));
});

test('buildInstantAutoCoverPair creates genuinely distinct Print Book and Kindle cover designs', () => {
  const book = SEED_BOOKS[0];
  const pair = buildInstantAutoCoverPair(book, 'editorial-luxury');
  assert.notEqual(pair.printVariant.motifStyle, pair.kindleVariant.motifStyle);
  assert.notEqual(pair.printVariant.textColor, pair.kindleVariant.textColor);
  assert.notEqual(pair.printVariant.customImageDataUrl, pair.kindleVariant.customImageDataUrl);
  assert.ok(pair.printVariant.customImageDataUrl?.startsWith('data:image/svg+xml'));
  assert.ok(pair.kindleVariant.customImageDataUrl?.startsWith('data:image/svg+xml'));
});

test('generateEditorialCoverSvg renders valid SVG for all 6 motif styles', () => {
  const motifs: CoverMotifStyle[] = [
    'arch',
    'waves',
    'botanical',
    'prism',
    'horizon',
    'monolith',
  ];
  for (const motif of motifs) {
    const svg = generateEditorialCoverSvg({
      motif,
      primaryColor: '#102030',
      secondaryColor: '#204060',
      accentColor: '#D4A359',
      variant: 'kindle',
    });
    assert.ok(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'));
    assert.ok(svg.endsWith('</svg>'));
    assert.ok(svgToDataUrl(svg).startsWith('data:image/svg+xml;charset=utf-8,'));
  }
});

test('getPrintCoverVariant and getKindleCoverVariant return distinct fallback variants', () => {
  const book = SEED_BOOKS[0];
  const printV = getPrintCoverVariant(book);
  const kindleV = getKindleCoverVariant(book);
  assert.equal(printV.textColor, 'dark');
  assert.equal(kindleV.textColor, 'light');
  assert.notEqual(printV.layout, kindleV.layout);
});
