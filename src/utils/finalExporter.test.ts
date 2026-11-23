import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_KDP_ACCOUNT, SEED_BOOKS } from '../data/seedBooks';
import {
  buildCoverPrintPdf,
  buildKindleEpub,
  buildKindleFormattedPdf,
  buildStoreZip,
  buildTrimmedManuscriptPdf,
  encodeWinAnsiPdfText,
} from './finalExporter';

test('encodeWinAnsiPdfText encodes German umlauts, ß and euro sign safely', () => {
  const encoded = encodeWinAnsiPdfText('Vermögensaufbau für € 14,90 (Übung)');
  assert.ok(encoded.includes('\\366')); // ö
  assert.ok(encoded.includes('\\374')); // ü
  assert.ok(encoded.includes('\\200')); // €
  assert.ok(encoded.includes('\\(')); // escaped parenthesis
  assert.ok(encoded.includes('\\)'));
});

test('buildTrimmedManuscriptPdf produces a valid multi-page PDF 1.4 with exact KDP TrimBox', () => {
  const book = {
    ...SEED_BOOKS[0],
    format: { ...SEED_BOOKS[0].format, trimSize: '6x9' as const, bleed: true },
  };
  const pdf = buildTrimmedManuscriptPdf(book, DEFAULT_KDP_ACCOUNT);
  const text = new TextDecoder('latin1').decode(pdf.bytes);

  assert.ok(text.startsWith('%PDF-1.4\n'), 'PDF header must start with %PDF-1.4');
  assert.ok(text.trimEnd().endsWith('%%EOF'), 'PDF must terminate with %%EOF');
  assert.ok(text.includes('/TrimBox'), 'PDF must contain /TrimBox for KDP trim cutting');
  assert.ok(text.includes('/MediaBox'), 'PDF must contain /MediaBox');
  assert.ok(text.includes('/WinAnsiEncoding'), 'PDF fonts must specify WinAnsiEncoding for German umlauts');
  assert.ok(pdf.pageCount >= 6, `Expected at least 6 pages, got ${pdf.pageCount}`);
  assert.equal(pdf.trimWidthMm, 152.4);
  assert.equal(pdf.trimHeightMm, 228.6);
  assert.equal(pdf.bleedMm, 3.175);
  assert.ok(pdf.filename.endsWith('-01-manuskript-geschnitten-6x9.pdf'));
});

test('buildKindleEpub generates a valid EPUB 3 ZIP with uncompressed mimetype first and embedded cover', () => {
  const book = SEED_BOOKS[0];
  const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const epub = buildKindleEpub(book, DEFAULT_KDP_ACCOUNT, fakePng);

  // Check ZIP local file header signature PK\x03\x04
  assert.equal(epub.bytes[0], 0x50);
  assert.equal(epub.bytes[1], 0x4b);
  assert.equal(epub.bytes[2], 0x03);
  assert.equal(epub.bytes[3], 0x04);

  // EPUB spec requires `mimetype` stored uncompressed right at byte 30
  const firstFileName = new TextDecoder().decode(epub.bytes.slice(30, 38));
  assert.equal(firstFileName, 'mimetype');
  const mimetypePayload = new TextDecoder().decode(epub.bytes.slice(38, 58));
  assert.equal(mimetypePayload, 'application/epub+zip');

  const rawStr = new TextDecoder('latin1').decode(epub.bytes);
  assert.ok(rawStr.includes('META-INF/container.xml'));
  assert.ok(rawStr.includes('OEBPS/content.opf'));
  assert.ok(rawStr.includes('OEBPS/nav.xhtml'));
  assert.ok(rawStr.includes('OEBPS/images/kindle-cover.png'));
  assert.ok(rawStr.includes('OEBPS/chapter-1.xhtml'));
  assert.equal(epub.hasEmbeddedCover, true);
  assert.equal(epub.chapterCount, book.chapters.length);
  assert.ok(epub.filename.endsWith('-03-kindle-ebook.epub'));
});

test('buildStoreZip handles multiple entries and writes valid EOCD marker', () => {
  const enc = new TextEncoder();
  const zip = buildStoreZip([
    { name: 'a.txt', data: enc.encode('Hallo Welt') },
    { name: 'dir/b.txt', data: enc.encode('KDP') },
  ]);
  // EOCD starts 22 bytes before end
  const eocdOffset = zip.length - 22;
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  assert.equal(view.getUint16(eocdOffset + 8, true), 2);
});

test('buildCoverPrintPdf builds a valid KDP Full-Wrap Cover PDF with embedded JPEG DCTDecode image', () => {
  const book = SEED_BOOKS[0];
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
  const pdf = buildCoverPrintPdf(book, { bytes: fakeJpeg, width: 3200, height: 2400 });
  const text = new TextDecoder('latin1').decode(pdf.bytes);

  assert.ok(text.startsWith('%PDF-1.4\n'), 'Cover PDF must start with %PDF-1.4');
  assert.ok(text.trimEnd().endsWith('%%EOF'), 'Cover PDF must end with %%EOF');
  assert.ok(text.includes('/Filter /DCTDecode'), 'Cover PDF must embed JPEG via DCTDecode');
  assert.ok(text.includes('/Width 3200 /Height 2400'), 'Cover PDF must preserve image dimensions');
  assert.ok(text.includes('/TrimBox'), 'Cover PDF must specify TrimBox');
  assert.equal(pdf.hasEmbeddedImage, true);
  assert.ok(pdf.widthMm > 300, 'Full wrap width must exceed 300mm');
  assert.ok(pdf.filename.endsWith('-02-kdp-cover-taschenbuch-druck.pdf'));
});

test('buildKindleFormattedPdf builds a multi-page Kindle PDF with cover page and chapters', () => {
  const book = SEED_BOOKS[1] || SEED_BOOKS[0];
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
  const pdf = buildKindleFormattedPdf(book, DEFAULT_KDP_ACCOUNT, {
    bytes: fakeJpeg,
    width: 1600,
    height: 2560,
  });
  const text = new TextDecoder('latin1').decode(pdf.bytes);

  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.ok(text.includes('/Filter /DCTDecode'));
  assert.equal(pdf.hasEmbeddedCover, true);
  assert.ok(pdf.pageCount >= 6, `Expected at least 6 Kindle PDF pages, got ${pdf.pageCount}`);
  assert.ok(pdf.filename.endsWith('-03-kdp-kindle-ausgabe.pdf'));
});

