import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFormattedKdpHtml,
  buildKdpCopySheetText,
  buildKdpPrompts,
  calculateKdpLayoutSpecs,
  calculateKdpRoyalties,
  countWords,
  getKdpGutterMarginMm,
  utf8ByteLength,
  validateKdpMetadata,
} from './kdpEngine';
import { DEFAULT_KDP_ACCOUNT, SEED_BOOKS } from '../data/seedBooks';

test('countWords handles markdown syntax and empty strings accurately', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('## Kapitel Eins\n\nHallo **Welt** im Buch.'), 6);
});

test('getKdpGutterMarginMm follows official KDP page count tiers', () => {
  assert.equal(getKdpGutterMarginMm(100), 9.6);
  assert.equal(getKdpGutterMarginMm(220), 12.7);
  assert.equal(getKdpGutterMarginMm(420), 15.9);
  assert.equal(getKdpGutterMarginMm(600), 19.1);
  assert.equal(getKdpGutterMarginMm(750), 22.3);
});

test('calculateKdpLayoutSpecs differentiates white vs cream spine thickness', () => {
  const baseFormat = SEED_BOOKS[0].format;
  const creamSpecs = calculateKdpLayoutSpecs(32000, { ...baseFormat, paperType: 'cream' }, 8);
  const whiteSpecs = calculateKdpLayoutSpecs(32000, { ...baseFormat, paperType: 'white' }, 8);

  assert.equal(creamSpecs.estimatedPages, whiteSpecs.estimatedPages);
  assert.ok(creamSpecs.estimatedPages >= 100);
  assert.ok(
    creamSpecs.spineWidthMm > whiteSpecs.spineWidthMm,
    'Cream paper must produce a thicker spine than white paper'
  );
  assert.equal(creamSpecs.spineTextAllowed, true);
  assert.ok(creamSpecs.fullWrapWidthPx300Dpi > 3000);
});

test('calculateKdpRoyalties computes Amazon.de EUR print cost, 60% paperback & 70%/35% ebook royalties', () => {
  const estimate = calculateKdpRoyalties(180, {
    ebookPriceEur: 7.99,
    paperbackPriceEur: 14.9,
    royaltyPlanEbook: '70',
  });

  assert.equal(estimate.paperbackPrintCostEur, Number((0.75 + 180 * 0.012).toFixed(2)));
  assert.equal(estimate.paperbackPriceValid, true);
  assert.ok(estimate.paperbackRoyaltyEur > 5);
  assert.equal(estimate.ebookPriceEligibleFor70, true);
  assert.equal(estimate.ebookRoyaltyRate, 0.7);
  assert.ok(estimate.ebookRoyaltyEur > 4.5);

  // Price outside 2.99 - 9.99 falls back to 35%
  const lowRate = calculateKdpRoyalties(180, {
    ebookPriceEur: 14.99,
    paperbackPriceEur: 2.0,
    royaltyPlanEbook: '70',
  });
  assert.equal(lowRate.ebookPriceEligibleFor70, false);
  assert.equal(lowRate.ebookRoyaltyRate, 0.35);
  assert.equal(lowRate.paperbackPriceValid, false);
});

test('validateKdpMetadata enforces 50 UTF-8 byte keyword limit and catches title duplicates', () => {
  const seed = SEED_BOOKS[0];
  const validResult = validateKdpMetadata(seed);
  assert.equal(validResult.titleTooLong, false);
  assert.equal(validResult.descriptionTooLong, false);
  assert.equal(validResult.keywordsOverLimit.length, 0);
  assert.equal(validResult.isReadyForKdp, true);

  // Keyword with umlauts exceeding 50 UTF-8 bytes
  const brokenProject = {
    ...seed,
    kdp: {
      ...seed.kdp,
      keywords: [
        'übermäßige vermögensberatung für österreichische familienhaushalte',
        'stille souveränität finanzen',
        'etf sparplan',
        'geld anlegen',
        'altersvorsorge',
        'haushaltsbuch',
        'passives einkommen',
      ] as [string, string, string, string, string, string, string],
    },
  };

  assert.ok(utf8ByteLength(brokenProject.kdp.keywords[0]) > 50);
  const brokenResult = validateKdpMetadata(brokenProject);
  assert.deepEqual(brokenResult.keywordsOverLimit, [0]);
  assert.ok(brokenResult.duplicateWordsInKeywords.includes('stille'));
  assert.equal(brokenResult.isReadyForKdp, false);
});

test('buildKdpPrompts, buildFormattedKdpHtml and buildKdpCopySheetText include core project data', () => {
  const seed = SEED_BOOKS[0];
  const prompts = buildKdpPrompts(seed);
  assert.equal(prompts.length, 5);
  assert.ok(prompts[0].prompt.includes(seed.title));
  assert.ok(prompts[0].prompt.includes('Geld'));

  const html = buildFormattedKdpHtml(seed, DEFAULT_KDP_ACCOUNT, 'paperback');
  assert.ok(html.includes('<section class="title-page">'));
  assert.ok(html.includes('Inhaltsverzeichnis'));
  assert.ok(html.includes('152.4mm 228.6mm'));

  const copySheet = buildKdpCopySheetText(seed, DEFAULT_KDP_ACCOUNT);
  assert.ok(copySheet.includes('TAB 1: BUCHDETAILS (KDP)'));
  assert.ok(copySheet.includes('TAB 2: BUCHINHALT (KDP)'));
  assert.ok(copySheet.includes('TAB 3: BUCHPREISE & TANTIEMEN (KDP)'));
  assert.ok(copySheet.includes(seed.title));
});
