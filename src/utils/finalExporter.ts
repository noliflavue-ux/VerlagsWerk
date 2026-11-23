import type { BookProject, KdpAccountProfile } from '../types/book';
import {
  calculateKdpLayoutSpecs,
  countProjectWords,
  renderChapterMarkdownToHtml,
  TRIM_SIZES,
} from './kdpEngine';

const MM_TO_PT = 72 / 25.4;

/**
 * Encodes Unicode text into PDF WinAnsiEncoding (Windows-1252) byte string
 * with proper PDF literal string escaping so German umlauts (äöüÄÖÜß) and € render crisply.
 */
export function encodeWinAnsiPdfText(input: string): string {
  const WIN_ANSI_EXTRAS: Record<number, number> = {
    0x20ac: 0x80, // €
    0x201a: 0x82, // ‚
    0x201e: 0x84, // „
    0x2026: 0x85, // …
    0x2018: 0x91, // ‘
    0x2019: 0x92, // ’
    0x201c: 0x93, // “
    0x201d: 0x94, // ”
    0x2022: 0x95, // •
    0x2013: 0x96, // –
    0x2014: 0x97, // —
  };

  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += '\\' + input[i];
    } else if (code >= 0x20 && code <= 0x7e) {
      out += input[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += '\\' + code.toString(8).padStart(3, '0');
    } else if (WIN_ANSI_EXTRAS[code] !== undefined) {
      out += '\\' + WIN_ANSI_EXTRAS[code].toString(8).padStart(3, '0');
    } else if (code === 0x09) {
      out += '  ';
    } else {
      out += ' ';
    }
  }
  return out;
}

function wrapMonoEstimate(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i++) {
    const next = `${current} ${words[i]}`;
    if (next.length <= maxChars) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export interface TrimmedPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  mediaWidthPt: number;
  mediaHeightPt: number;
  trimWidthMm: number;
  trimHeightMm: number;
  bleedMm: number;
  filename: string;
}

export function buildFileSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'buchprojekt'
  );
}

/**
 * Generates a real, KDP-compliant trimmed Print PDF 1.4 (%PDF-1.4) with exact
 * /MediaBox and /TrimBox dimensions, alternating inside gutter margins (verso/recto),
 * optional 3.175mm bleed & crop marks, title page, imprint, TOC, running headers, and page numbers.
 */
export function buildTrimmedManuscriptPdf(
  project: BookProject,
  account: KdpAccountProfile
): TrimmedPdfResult {
  const trim = TRIM_SIZES[project.format.trimSize];
  const specs = calculateKdpLayoutSpecs(
    countProjectWords(project),
    project.format,
    project.chapters.length
  );

  const bleedMm = project.format.bleed ? 3.175 : 0;
  const trimW = Number((trim.widthMm * MM_TO_PT).toFixed(2));
  const trimH = Number((trim.heightMm * MM_TO_PT).toFixed(2));
  const bleedPt = Number((bleedMm * MM_TO_PT).toFixed(2));

  // KDP bleed adds 3.175mm to top, bottom, and outside edge (for symmetric PDF TrimBox we pad outer 3 sides or all 4)
  const mediaW = Number((trimW + bleedPt * 2).toFixed(2));
  const mediaH = Number((trimH + bleedPt * 2).toFixed(2));

  const insidePt = Number((specs.insideMarginMm * MM_TO_PT).toFixed(2));
  const outsidePt = Number((Math.max(12.7, specs.outsideMarginMm) * MM_TO_PT).toFixed(2));
  const topPt = Number((16 * MM_TO_PT).toFixed(2));
  const bottomPt = Number((16 * MM_TO_PT).toFixed(2));

  const contentW = trimW - insidePt - outsidePt;
  const bodySize = Math.max(9.5, Math.min(13, project.format.fontSizePt));
  const leading = Number((bodySize * project.format.lineHeight).toFixed(2));
  const avgCharWidth = bodySize * 0.48;
  const maxCharsPerLine = Math.max(36, Math.floor(contentW / avgCharWidth));

  const pageStreams: string[] = [];

  const drawCropMarks = (): string => {
    if (bleedPt <= 0) return '';
    const mark = 6;
    const x1 = bleedPt;
    const y1 = bleedPt;
    const x2 = bleedPt + trimW;
    const y2 = bleedPt + trimH;
    return [
      'q 0.35 w 0.45 G',
      // Bottom-left
      `${(x1 - mark).toFixed(2)} ${y1.toFixed(2)} m ${(x1 - 1.5).toFixed(2)} ${y1.toFixed(2)} l S`,
      `${x1.toFixed(2)} ${(y1 - mark).toFixed(2)} m ${x1.toFixed(2)} ${(y1 - 1.5).toFixed(2)} l S`,
      // Bottom-right
      `${(x2 + 1.5).toFixed(2)} ${y1.toFixed(2)} m ${(x2 + mark).toFixed(2)} ${y1.toFixed(2)} l S`,
      `${x2.toFixed(2)} ${(y1 - mark).toFixed(2)} m ${x2.toFixed(2)} ${(y1 - 1.5).toFixed(2)} l S`,
      // Top-left
      `${(x1 - mark).toFixed(2)} ${y2.toFixed(2)} m ${(x1 - 1.5).toFixed(2)} ${y2.toFixed(2)} l S`,
      `${x1.toFixed(2)} ${(y2 + 1.5).toFixed(2)} m ${x1.toFixed(2)} ${(y2 + mark).toFixed(2)} l S`,
      // Top-right
      `${(x2 + 1.5).toFixed(2)} ${y2.toFixed(2)} m ${(x2 + mark).toFixed(2)} ${y2.toFixed(2)} l S`,
      `${x2.toFixed(2)} ${(y2 + 1.5).toFixed(2)} m ${x2.toFixed(2)} ${(y2 + mark).toFixed(2)} l S`,
      'Q',
    ].join('\n');
  };

  const getLeftMarginX = (pageNum1Based: number): number => {
    // Odd pages (Recto / right page) have inside gutter on the left; Even pages (Verso / left page) have inside gutter on the right
    const isRecto = pageNum1Based % 2 === 1;
    return bleedPt + (isRecto ? insidePt : outsidePt);
  };

  const drawTextLine = (
    font: 'F1' | 'F2' | 'F3' | 'F4',
    size: number,
    x: number,
    y: number,
    text: string,
    gray = 0.08
  ): string => {
    return `${gray.toFixed(2)} g BT /${font} ${size.toFixed(1)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${encodeWinAnsiPdfText(text)}) Tj ET`;
  };

  // 1. Title Page (Recto)
  if (project.format.includeTitlePage) {
    const pageNum = pageStreams.length + 1;
    const x = getLeftMarginX(pageNum);
    const cmds: string[] = [drawCropMarks()];
    let cursorY = bleedPt + trimH - topPt - 84;

    if (project.cover.eyebrow) {
      cmds.push(drawTextLine('F4', 9, x, cursorY, project.cover.eyebrow.toUpperCase(), 0.35));
      cursorY -= 24;
    }

    const titleLines = wrapMonoEstimate(project.title, Math.max(18, Math.floor(contentW / 12.5)));
    for (const line of titleLines) {
      cmds.push(drawTextLine('F2', 22, x, cursorY, line, 0.06));
      cursorY -= 28;
    }

    if (project.subtitle) {
      cursorY -= 8;
      const subLines = wrapMonoEstimate(project.subtitle, Math.max(28, Math.floor(contentW / 6.5)));
      for (const line of subLines) {
        cmds.push(drawTextLine('F3', 12, x, cursorY, line, 0.25));
        cursorY -= 17;
      }
    }

    cmds.push(
      drawTextLine(
        'F4',
        11,
        x,
        bleedPt + bottomPt + 42,
        project.author.toUpperCase(),
        0.12
      )
    );
    if (account.imprintName) {
      cmds.push(
        drawTextLine('F1', 9, x, bleedPt + bottomPt + 24, account.imprintName, 0.4)
      );
    }
    pageStreams.push(cmds.join('\n'));
  }

  // 2. Imprint / Copyright Page (Verso)
  if (project.format.includeImprint) {
    const pageNum = pageStreams.length + 1;
    const x = getLeftMarginX(pageNum);
    const year = new Date().getFullYear();
    const cmds: string[] = [drawCropMarks()];
    let cursorY = bleedPt + bottomPt + 150;
    const imprintLines = [
      project.title,
      project.subtitle,
      '',
      `© ${year} ${project.author}${account.imprintName ? ` · ${account.imprintName}` : ''}`,
      account.publisherAddress || '',
      `Auflage: ${project.kdp.editionNumber || '1. Auflage'}`,
      `ISBN: ${
        project.kdp.isbnMode === 'own-isbn' && project.kdp.ownIsbn
          ? project.kdp.ownIsbn
          : 'Wird über Amazon KDP zugewiesen'
      }`,
      `Format: ${trim.widthMm} × ${trim.heightMm} mm · Bundsteg ${specs.insideMarginMm} mm`,
      '',
      'Alle Rechte vorbehalten. Nachdruck oder Vervielfältigung,',
      'auch auszugsweise, nur mit schriftlicher Genehmigung.',
    ].filter((l, idx, arr) => l !== '' || (idx > 0 && arr[idx - 1] !== ''));

    for (const line of imprintLines) {
      const wrapped = line ? wrapMonoEstimate(line, maxCharsPerLine + 8) : [''];
      for (const wl of wrapped) {
        if (wl) {
          cmds.push(drawTextLine('F1', 8.5, x, cursorY, wl, 0.25));
        }
        cursorY -= 12.5;
      }
    }
    pageStreams.push(cmds.join('\n'));
  }

  // 3. Table of Contents
  if (project.format.includeToc) {
    const pageNum = pageStreams.length + 1;
    const x = getLeftMarginX(pageNum);
    const cmds: string[] = [drawCropMarks()];
    let cursorY = bleedPt + trimH - topPt - 18;
    cmds.push(drawTextLine('F2', 16, x, cursorY, 'Inhaltsverzeichnis', 0.08));
    cursorY -= 28;

    project.chapters.forEach((ch, idx) => {
      const label = `${String(idx + 1).padStart(2, '0')}.  ${ch.title}`;
      const wrapped = wrapMonoEstimate(label, maxCharsPerLine);
      for (const line of wrapped) {
        if (cursorY < bleedPt + bottomPt + 24) break;
        cmds.push(drawTextLine('F1', 10.5, x, cursorY, line, 0.15));
        cursorY -= 16;
      }
      cursorY -= 4;
    });
    pageStreams.push(cmds.join('\n'));
  }

  // 4. Chapters with mirrored gutter margins, headers, footers & pagination
  project.chapters.forEach((chapter, chapterIdx) => {
    // Optionally ensure chapter starts on odd (right) page
    if (project.format.startChaptersOnRight && (pageStreams.length + 1) % 2 === 0) {
      pageStreams.push(drawCropMarks());
    }

    let currentCmds: string[] = [];
    let currentPageNum = pageStreams.length + 1;
    let cursorY = bleedPt + trimH - topPt;

    const startPage = (isChapterOpening: boolean) => {
      currentPageNum = pageStreams.length + 1;
      currentCmds = [drawCropMarks()];
      const x = getLeftMarginX(currentPageNum);

      if (project.format.runningHeaders && !isChapterOpening) {
        const headerText =
          currentPageNum % 2 === 0 ? project.title : chapter.title;
        currentCmds.push(
          drawTextLine(
            'F4',
            7.5,
            x,
            bleedPt + trimH - topPt + 14,
            headerText.slice(0, 56).toUpperCase(),
            0.45
          )
        );
      }

      if (project.format.pageNumbers) {
        const numX =
          currentPageNum % 2 === 1
            ? x + contentW - 18
            : x;
        currentCmds.push(
          drawTextLine('F4', 8.5, numX, bleedPt + bottomPt - 18, String(currentPageNum), 0.4)
        );
      }

      cursorY = isChapterOpening
        ? bleedPt + trimH - topPt - 34
        : bleedPt + trimH - topPt - 6;
    };

    const flushPage = () => {
      pageStreams.push(currentCmds.join('\n'));
    };

    const ensureSpace = (neededPt: number) => {
      if (cursorY - neededPt < bleedPt + bottomPt + 8) {
        flushPage();
        startPage(false);
      }
    };

    startPage(true);

    // Chapter Opener Header
    const openX = getLeftMarginX(currentPageNum);
    currentCmds.push(
      drawTextLine('F4', 8.5, openX, cursorY, `KAPITEL ${chapterIdx + 1}`, 0.42)
    );
    cursorY -= 20;

    const chTitleLines = wrapMonoEstimate(
      chapter.title,
      Math.max(22, Math.floor(contentW / 8.8))
    );
    for (const tl of chTitleLines) {
      currentCmds.push(drawTextLine('F2', 16, openX, cursorY, tl, 0.06));
      cursorY -= 21;
    }
    cursorY -= 14;

    // Chapter Body Blocks
    const rawLines = chapter.content.split(/\r?\n/);
    let isFirstParaAfterHeading = true;

    for (const rawLine of rawLines) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        cursorY -= Math.round(leading * 0.32);
        continue;
      }

      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        const headingText = trimmed.replace(/^#{2,3}\s+/, '').replace(/\*\*/g, '');
        ensureSpace(leading * 2.5);
        cursorY -= 6;
        const x = getLeftMarginX(currentPageNum);
        const hLines = wrapMonoEstimate(headingText, Math.max(26, Math.floor(contentW / 6.8)));
        for (const hl of hLines) {
          ensureSpace(16);
          currentCmds.push(drawTextLine('F2', 12, x, cursorY, hl, 0.08));
          cursorY -= 16;
        }
        cursorY -= 4;
        isFirstParaAfterHeading = true;
        continue;
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bulletText = trimmed.slice(2).replace(/\*\*/g, '');
        const bLines = wrapMonoEstimate(bulletText, Math.max(30, maxCharsPerLine - 4));
        bLines.forEach((bl, bIdx) => {
          ensureSpace(leading);
          const x = getLeftMarginX(currentPageNum) + (bIdx === 0 ? 8 : 16);
          const prefix = bIdx === 0 ? '• ' : '';
          currentCmds.push(drawTextLine('F1', bodySize, x, cursorY, `${prefix}${bl}`, 0.1));
          cursorY -= leading;
        });
        isFirstParaAfterHeading = false;
        continue;
      }

      const cleanPara = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
      const pLines = wrapMonoEstimate(cleanPara, maxCharsPerLine);
      pLines.forEach((pl, pIdx) => {
        ensureSpace(leading);
        const indent =
          project.format.firstLineIndent && !isFirstParaAfterHeading && pIdx === 0
            ? 14
            : 0;
        const x = getLeftMarginX(currentPageNum) + indent;
        currentCmds.push(drawTextLine('F1', bodySize, x, cursorY, pl, 0.1));
        cursorY -= leading;
      });
      cursorY -= 3;
      isFirstParaAfterHeading = false;
    }

    flushPage();
  });

  if (pageStreams.length === 0) {
    pageStreams.push(drawCropMarks());
  }

  // Assemble valid PDF 1.4 object table
  const objects: string[] = [];
  const addObj = (body: string): number => {
    objects.push(body);
    return objects.length;
  };

  // Reserve 1=Catalog, 2=Pages, 3..6=Fonts
  const catalogId = addObj('');
  const pagesId = addObj('');
  const fontRoman = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'
  );
  const fontBold = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>'
  );
  const fontItalic = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>'
  );
  const fontSans = addObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );

  const pageIds: number[] = [];
  const trimBox = `[${bleedPt.toFixed(2)} ${bleedPt.toFixed(2)} ${(bleedPt + trimW).toFixed(2)} ${(bleedPt + trimH).toFixed(2)}]`;
  const mediaBox = `[0 0 ${mediaW.toFixed(2)} ${mediaH.toFixed(2)}]`;

  for (const stream of pageStreams) {
    const streamBytesLen = new TextEncoder().encode(stream).length;
    const contentId = addObj(
      `<< /Length ${streamBytesLen} >>\nstream\n${stream}\nendstream`
    );
    const pageId = addObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox ${mediaBox} /TrimBox ${trimBox} /BleedBox ${mediaBox} /Resources << /Font << /F1 ${fontRoman} 0 R /F2 ${fontBold} 0 R /F3 ${fontItalic} 0 R /F4 ${fontSans} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteOffset = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  };

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteOffset);
    pushStr(`${i + 1} 0 obj\n${objects[i]}\nendobj\n`);
  }

  const xrefOffset = byteOffset;
  pushStr(`xref\n0 ${objects.length + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i <= objects.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of chunks) {
    result.set(c, pos);
    pos += c.length;
  }

  return {
    bytes: result,
    pageCount: pageIds.length,
    mediaWidthPt: mediaW,
    mediaHeightPt: mediaH,
    trimWidthMm: trim.widthMm,
    trimHeightMm: trim.heightMm,
    bleedMm,
    filename: `${buildFileSlug(project.title)}-01-manuskript-geschnitten-${project.format.trimSize}.pdf`,
  };
}

// ---------------------------------------------------------------------------
// Binary-Safe PDF 1.4 Assembler (supports raw /Filter /DCTDecode JPEG XObjects)
// ---------------------------------------------------------------------------

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

function assembleBinaryPdf(objects: Uint8Array[], catalogId: number): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteOffset = 0;

  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    byteOffset += b.length;
  };
  const pushStr = (s: string) => pushBytes(encoder.encode(s));

  // PDF 1.4 binary header comment
  pushBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  for (let i = 0; i < objects.length; i++) {
    offsets.push(byteOffset);
    pushStr(`${i + 1} 0 obj\n`);
    pushBytes(objects[i]);
    pushStr('\nendobj\n');
  }

  const xrefOffset = byteOffset;
  pushStr(`xref\n0 ${objects.length + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i <= objects.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return concatUint8Arrays(chunks);
}

export interface EmbeddedJpegInput {
  bytes: Uint8Array;
  width: number;
  height: number;
}

export interface CoverPrintPdfResult {
  bytes: Uint8Array;
  widthMm: number;
  heightMm: number;
  spineWidthMm: number;
  hasEmbeddedImage: boolean;
  filename: string;
}

/**
 * Generates an Amazon KDP-ready Paperback Full-Wrap Cover PDF (.pdf) in exact
 * millimeter dimensions (Back + Spine + Front + 3.175mm bleed).
 * Embeds the rendered full-wrap cover JPEG via /Filter /DCTDecode when provided,
 * or produces a clean vector typographic wrap fallback.
 */
export function buildCoverPrintPdf(
  project: BookProject,
  coverJpeg?: EmbeddedJpegInput | null
): CoverPrintPdfResult {
  const enc = new TextEncoder();
  const specs = calculateKdpLayoutSpecs(
    countProjectWords(project),
    project.format,
    project.chapters.length
  );

  const widthPt = Number((specs.fullWrapWidthMm * MM_TO_PT).toFixed(2));
  const heightPt = Number((specs.fullWrapHeightMm * MM_TO_PT).toFixed(2));
  const bleedPt = Number((3.175 * MM_TO_PT).toFixed(2));

  const objects: Uint8Array[] = [];
  const addTextObj = (body: string): number => {
    objects.push(enc.encode(body));
    return objects.length;
  };
  const addBinObj = (parts: Uint8Array[]): number => {
    objects.push(concatUint8Arrays(parts));
    return objects.length;
  };

  const catalogId = addTextObj('');
  const pagesId = addTextObj('');
  const fontRoman = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'
  );
  const fontBold = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>'
  );
  const fontSans = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );

  const hasImage = Boolean(coverJpeg && coverJpeg.bytes.length > 0 && coverJpeg.width > 0 && coverJpeg.height > 0);
  let imageObjId = 0;

  if (hasImage && coverJpeg) {
    imageObjId = addBinObj([
      enc.encode(
        `<< /Type /XObject /Subtype /Image /Width ${coverJpeg.width} /Height ${coverJpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${coverJpeg.bytes.length} >>\nstream\n`
      ),
      coverJpeg.bytes,
      enc.encode('\nendstream'),
    ]);
  }

  let pageStream: string;
  if (hasImage) {
    pageStream = `q ${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm /Im1 Do Q`;
  } else {
    // Vector full-wrap fallback (Back + Spine + Front)
    const spinePt = Number((specs.spineWidthMm * MM_TO_PT).toFixed(2));
    const sidePt = Number(((widthPt - spinePt) / 2).toFixed(2));
    const frontX = sidePt + spinePt + 36;
    pageStream = [
      // Back cover dark slate panel
      `0.09 0.13 0.22 rg 0 0 ${sidePt.toFixed(2)} ${heightPt.toFixed(2)} re f`,
      // Spine panel
      `0.06 0.09 0.16 rg ${sidePt.toFixed(2)} 0 ${spinePt.toFixed(2)} ${heightPt.toFixed(2)} re f`,
      // Front cover light ivory panel
      `0.96 0.95 0.92 rg ${(sidePt + spinePt).toFixed(2)} 0 ${sidePt.toFixed(2)} ${heightPt.toFixed(2)} re f`,
      // Front Title & Author
      `0.08 g BT /F2 26 Tf ${frontX.toFixed(2)} ${(heightPt - 130).toFixed(2)} Td (${encodeWinAnsiPdfText(project.title)}) Tj ET`,
      `0.25 g BT /F1 12 Tf ${frontX.toFixed(2)} ${(heightPt - 160).toFixed(2)} Td (${encodeWinAnsiPdfText(project.subtitle.slice(0, 72))}) Tj ET`,
      `0.12 g BT /F3 12 Tf ${frontX.toFixed(2)} 58 Td (${encodeWinAnsiPdfText(project.author.toUpperCase())}) Tj ET`,
      // Back cover title & blurb
      `0.96 g BT /F2 16 Tf 36 ${(heightPt - 100).toFixed(2)} Td (${encodeWinAnsiPdfText(project.title)}) Tj ET`,
      `0.85 g BT /F1 10 Tf 36 ${(heightPt - 126).toFixed(2)} Td (${encodeWinAnsiPdfText(project.cover.backCoverBlurb.slice(0, 90))}) Tj ET`,
    ].join('\n');
  }

  const streamLen = enc.encode(pageStream).length;
  const contentId = addTextObj(`<< /Length ${streamLen} >>\nstream\n${pageStream}\nendstream`);

  const mediaBox = `[0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}]`;
  const trimBox = `[${bleedPt.toFixed(2)} ${bleedPt.toFixed(2)} ${(widthPt - bleedPt).toFixed(2)} ${(heightPt - bleedPt).toFixed(2)}]`;
  const xObjDict = hasImage ? ` /XObject << /Im1 ${imageObjId} 0 R >>` : '';

  const pageId = addTextObj(
    `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox ${mediaBox} /TrimBox ${trimBox} /BleedBox ${mediaBox} /Resources << /Font << /F1 ${fontRoman} 0 R /F2 ${fontBold} 0 R /F3 ${fontSans} 0 R >>${xObjDict} >> /Contents ${contentId} 0 R >>`
  );

  objects[pagesId - 1] = enc.encode(`<< /Type /Pages /Kids [${pageId} 0 R] /Count 1 >>`);
  objects[catalogId - 1] = enc.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  return {
    bytes: assembleBinaryPdf(objects, catalogId),
    widthMm: specs.fullWrapWidthMm,
    heightMm: specs.fullWrapHeightMm,
    spineWidthMm: specs.spineWidthMm,
    hasEmbeddedImage: hasImage,
    filename: `${buildFileSlug(project.title)}-02-kdp-cover-taschenbuch-druck.pdf`,
  };
}

export interface KindleFormattedPdfResult {
  bytes: Uint8Array;
  pageCount: number;
  hasEmbeddedCover: boolean;
  filename: string;
}

/**
 * Generates a formatted Kindle eBook PDF (.pdf) for Amazon KDP upload / review:
 * Page 1 features the distinct Kindle cover (1:1.6 e-reader aspect ratio) embedded via DCTDecode,
 * followed by Title page, TOC, and all formatted chapters.
 */
export function buildKindleFormattedPdf(
  project: BookProject,
  account: KdpAccountProfile,
  kindleCoverJpeg?: EmbeddedJpegInput | null
): KindleFormattedPdfResult {
  const enc = new TextEncoder();
  // E-Reader 1:1.6 portrait proportion (5.5 x 8.8 in -> 396 x 633.6 pt)
  const pageW = 396;
  const pageH = 633.6;
  const marginX = 36;
  const marginTop = 44;
  const marginBottom = 42;
  const contentW = pageW - marginX * 2;
  const bodySize = Math.max(10, Math.min(13, project.format.fontSizePt));
  const leading = Number((bodySize * project.format.lineHeight).toFixed(2));
  const maxChars = Math.max(36, Math.floor(contentW / (bodySize * 0.48)));

  const drawText = (
    font: 'F1' | 'F2' | 'F3' | 'F4',
    size: number,
    x: number,
    y: number,
    text: string,
    gray = 0.08
  ): string =>
    `${gray.toFixed(2)} g BT /${font} ${size.toFixed(1)} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${encodeWinAnsiPdfText(text)}) Tj ET`;

  const hasCover = Boolean(
    kindleCoverJpeg &&
      kindleCoverJpeg.bytes.length > 0 &&
      kindleCoverJpeg.width > 0 &&
      kindleCoverJpeg.height > 0
  );

  const pageStreams: { stream: string; usesCoverImage?: boolean }[] = [];

  // Page 1: Kindle Cover
  if (hasCover) {
    pageStreams.push({
      stream: `q ${pageW.toFixed(2)} 0 0 ${pageH.toFixed(2)} 0 0 cm /Im1 Do Q`,
      usesCoverImage: true,
    });
  } else {
    pageStreams.push({
      stream: [
        `0.08 0.14 0.28 rg 0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)} re f`,
        `0.95 g BT /F4 10 Tf ${marginX} ${(pageH - 96).toFixed(2)} Td (${encodeWinAnsiPdfText((project.cover.eyebrow || 'KINDLE EDITION').toUpperCase())}) Tj ET`,
        `1.0 g BT /F2 24 Tf ${marginX} ${(pageH - 140).toFixed(2)} Td (${encodeWinAnsiPdfText(project.title)}) Tj ET`,
        `0.85 g BT /F3 12 Tf ${marginX} ${(pageH - 172).toFixed(2)} Td (${encodeWinAnsiPdfText(project.subtitle.slice(0, 60))}) Tj ET`,
        `0.92 g BT /F4 12 Tf ${marginX} 56 Td (${encodeWinAnsiPdfText(project.author.toUpperCase())}) Tj ET`,
      ].join('\n'),
    });
  }

  // Page 2: Title & TOC
  {
    const cmds: string[] = [];
    let y = pageH - marginTop - 24;
    cmds.push(drawText('F2', 20, marginX, y, project.title, 0.06));
    y -= 24;
    if (project.subtitle) {
      for (const line of wrapMonoEstimate(project.subtitle, 46)) {
        cmds.push(drawText('F3', 11, marginX, y, line, 0.28));
        y -= 15;
      }
    }
    y -= 8;
    cmds.push(
      drawText(
        'F4',
        9.5,
        marginX,
        y,
        `${project.author}${account.imprintName ? ` · ${account.imprintName}` : ''} · Kindle Edition`,
        0.38
      )
    );
    y -= 32;
    cmds.push(drawText('F2', 13, marginX, y, 'Inhaltsverzeichnis', 0.08));
    y -= 22;
    project.chapters.forEach((ch, idx) => {
      const label = `${String(idx + 1).padStart(2, '0')}.  ${ch.title}`;
      for (const line of wrapMonoEstimate(label, maxChars)) {
        if (y < marginBottom + 16) break;
        cmds.push(drawText('F1', 10.5, marginX, y, line, 0.14));
        y -= 15;
      }
      y -= 3;
    });
    pageStreams.push({ stream: cmds.join('\n') });
  }

  // Chapters
  project.chapters.forEach((chapter, idx) => {
    let cmds: string[] = [];
    let y = pageH - marginTop - 16;

    const flush = () => {
      const pageNum = pageStreams.length + 1;
      cmds.push(drawText('F4', 8, pageW - marginX - 16, 22, String(pageNum), 0.45));
      pageStreams.push({ stream: cmds.join('\n') });
    };
    const nextPage = () => {
      flush();
      cmds = [
        drawText('F4', 7.5, marginX, pageH - 26, project.title.toUpperCase(), 0.48),
      ];
      y = pageH - marginTop - 6;
    };
    const ensure = (need: number) => {
      if (y - need < marginBottom) nextPage();
    };

    cmds.push(drawText('F4', 8.5, marginX, y, `KAPITEL ${idx + 1}`, 0.42));
    y -= 18;
    for (const tl of wrapMonoEstimate(chapter.title, Math.max(22, Math.floor(contentW / 8.5)))) {
      cmds.push(drawText('F2', 15, marginX, y, tl, 0.06));
      y -= 20;
    }
    y -= 12;

    for (const rawLine of chapter.content.split(/\r?\n/)) {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        y -= Math.round(leading * 0.35);
        continue;
      }
      if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
        const heading = trimmed.replace(/^#{2,3}\s+/, '').replace(/\*\*/g, '');
        ensure(leading * 2.4);
        y -= 5;
        for (const hl of wrapMonoEstimate(heading, Math.max(24, Math.floor(contentW / 6.8)))) {
          ensure(16);
          cmds.push(drawText('F2', 12, marginX, y, hl, 0.08));
          y -= 16;
        }
        y -= 3;
        continue;
      }
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        const bullet = trimmed.slice(2).replace(/\*\*/g, '');
        wrapMonoEstimate(bullet, Math.max(28, maxChars - 4)).forEach((bl, bIdx) => {
          ensure(leading);
          cmds.push(
            drawText('F1', bodySize, marginX + (bIdx === 0 ? 8 : 16), y, `${bIdx === 0 ? '• ' : ''}${bl}`, 0.1)
          );
          y -= leading;
        });
        continue;
      }
      const clean = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
      for (const pl of wrapMonoEstimate(clean, maxChars)) {
        ensure(leading);
        cmds.push(drawText('F1', bodySize, marginX, y, pl, 0.1));
        y -= leading;
      }
      y -= 3;
    }
    flush();
  });

  const objects: Uint8Array[] = [];
  const addTextObj = (body: string): number => {
    objects.push(enc.encode(body));
    return objects.length;
  };
  const addBinObj = (parts: Uint8Array[]): number => {
    objects.push(concatUint8Arrays(parts));
    return objects.length;
  };

  const catalogId = addTextObj('');
  const pagesId = addTextObj('');
  const fontRoman = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>'
  );
  const fontBold = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold /Encoding /WinAnsiEncoding >>'
  );
  const fontItalic = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Times-Italic /Encoding /WinAnsiEncoding >>'
  );
  const fontSans = addTextObj(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );

  let coverImgId = 0;
  if (hasCover && kindleCoverJpeg) {
    coverImgId = addBinObj([
      enc.encode(
        `<< /Type /XObject /Subtype /Image /Width ${kindleCoverJpeg.width} /Height ${kindleCoverJpeg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${kindleCoverJpeg.bytes.length} >>\nstream\n`
      ),
      kindleCoverJpeg.bytes,
      enc.encode('\nendstream'),
    ]);
  }

  const pageIds: number[] = [];
  const mediaBox = `[0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)}]`;

  for (const p of pageStreams) {
    const len = enc.encode(p.stream).length;
    const contentId = addTextObj(`<< /Length ${len} >>\nstream\n${p.stream}\nendstream`);
    const xObj = p.usesCoverImage && coverImgId ? ` /XObject << /Im1 ${coverImgId} 0 R >>` : '';
    const pageId = addTextObj(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox ${mediaBox} /TrimBox ${mediaBox} /Resources << /Font << /F1 ${fontRoman} 0 R /F2 ${fontBold} 0 R /F3 ${fontItalic} 0 R /F4 ${fontSans} 0 R >>${xObj} >> /Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
  }

  objects[pagesId - 1] = enc.encode(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  );
  objects[catalogId - 1] = enc.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  return {
    bytes: assembleBinaryPdf(objects, catalogId),
    pageCount: pageIds.length,
    hasEmbeddedCover: hasCover,
    filename: `${buildFileSlug(project.title)}-03-kdp-kindle-ausgabe.pdf`,
  };
}

// ---------------------------------------------------------------------------
// Pure TypeScript Store ZIP + Valid KDP EPUB 3 Builder (Kindle File)
// ---------------------------------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

/**
 * Builds a standards-compliant uncompressed (Store, method 0) ZIP archive.
 * Ideal for EPUB 3 where `mimetype` must be the first uncompressed entry.
 */
export function buildStoreZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    // Local file header (30 bytes + name)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // Compression method 0 (Store)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0x5421, true); // Mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // Extra field length
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    // Central directory header (46 bytes + name)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central directory signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // Store
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true); // Relative offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory signature
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + eocd.length;
  const archive = new Uint8Array(totalSize);
  let cursor = 0;
  for (const p of localParts) {
    archive.set(p, cursor);
    cursor += p.length;
  }
  for (const p of centralParts) {
    archive.set(p, cursor);
    cursor += p.length;
  }
  archive.set(eocd, cursor);
  return archive;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface KindleEpubResult {
  bytes: Uint8Array;
  filename: string;
  chapterCount: number;
  hasEmbeddedCover: boolean;
}

/**
 * Builds a valid Amazon-KDP-ready EPUB 3 file (.epub) with optional embedded Kindle cover PNG,
 * semantic XHTML chapters, linked navigation TOC, and German metadata.
 */
export function buildKindleEpub(
  project: BookProject,
  account: KdpAccountProfile,
  kindleCoverPngBytes?: Uint8Array | null
): KindleEpubResult {
  const enc = new TextEncoder();
  const entries: ZipEntry[] = [];
  const hasCover = Boolean(kindleCoverPngBytes && kindleCoverPngBytes.length > 0);
  const modifiedIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const bookUid = `urn:uuid:verlagswerk-${buildFileSlug(project.title)}-${project.id}`;
  const year = new Date().getFullYear();

  // 1. mimetype MUST be the very first entry, uncompressed
  entries.push({
    name: 'mimetype',
    data: enc.encode('application/epub+zip'),
  });

  // 2. META-INF/container.xml
  entries.push({
    name: 'META-INF/container.xml',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`),
  });

  // 3. OEBPS/style.css
  entries.push({
    name: 'OEBPS/style.css',
    data: enc.encode(`body { font-family: ${project.format.fontFamily}, Georgia, serif; line-height: ${project.format.lineHeight}; margin: 0 5%; color: #111; }
h1 { font-size: 1.7em; line-height: 1.2; margin: 1.4em 0 0.8em 0; page-break-after: avoid; }
h2 { font-size: 1.25em; margin: 1.3em 0 0.5em 0; page-break-after: avoid; }
h3 { font-size: 1.1em; margin: 1.1em 0 0.4em 0; }
p { margin: 0 0 0.6em 0; text-align: justify; }
p.indent { text-indent: 1.25em; margin-top: 0; }
.eyebrow { font-size: 0.8em; letter-spacing: 0.08em; text-transform: uppercase; color: #555; }
.title-block { text-align: center; margin-top: 24%; }
.cover-wrap { text-align: center; margin: 0; padding: 0; }
.cover-wrap img { max-width: 100%; height: auto; }
ul { margin: 0.7em 0 0.9em 1.4em; }
`),
  });

  const manifestItems: string[] = [
    `<item id="css" href="style.css" media-type="text/css"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
  ];
  const spineItems: string[] = [];

  // Optional embedded Kindle cover
  if (hasCover && kindleCoverPngBytes) {
    entries.push({
      name: 'OEBPS/images/kindle-cover.png',
      data: kindleCoverPngBytes,
    });
    entries.push({
      name: 'OEBPS/cover.xhtml',
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head><title>Cover</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body class="cover-wrap"><img src="images/kindle-cover.png" alt="${escapeXml(project.title)}"/></body>
</html>`),
    });
    manifestItems.push(
      `<item id="cover-image" href="images/kindle-cover.png" media-type="image/png" properties="cover-image"/>`,
      `<item id="cover-page" href="cover.xhtml" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="cover-page"/>`);
  }

  // Title & Imprint XHTML
  entries.push({
    name: 'OEBPS/title.xhtml',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head><title>${escapeXml(project.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <div class="title-block">
    <p class="eyebrow">${escapeXml(project.cover.eyebrow || '')}</p>
    <h1>${escapeXml(project.title)}</h1>
    <p>${escapeXml(project.subtitle)}</p>
    <p><strong>${escapeXml(project.author)}</strong></p>
    <p class="eyebrow">© ${year} ${escapeXml(project.author)}${account.imprintName ? ` · ${escapeXml(account.imprintName)}` : ''}</p>
  </div>
</body>
</html>`),
  });
  manifestItems.push(
    `<item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>`
  );
  spineItems.push(`<itemref idref="title-page"/>`);

  // Chapters XHTML
  const navLinks: string[] = [];
  project.chapters.forEach((ch, idx) => {
    const num = idx + 1;
    const filename = `chapter-${num}.xhtml`;
    const bodyHtml = renderChapterMarkdownToHtml(ch.content, project.format.firstLineIndent);
    entries.push({
      name: `OEBPS/${filename}`,
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="de">
<head><title>${escapeXml(ch.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <section>
    <p class="eyebrow">Kapitel ${num}</p>
    <h1>${escapeXml(ch.title)}</h1>
    ${bodyHtml}
  </section>
</body>
</html>`),
    });
    manifestItems.push(
      `<item id="ch-${num}" href="${filename}" media-type="application/xhtml+xml"/>`
    );
    spineItems.push(`<itemref idref="ch-${num}"/>`);
    navLinks.push(
      `<li><a href="${filename}">Kapitel ${num}: ${escapeXml(ch.title)}</a></li>`
    );
  });

  // Navigation Document (EPUB 3 TOC)
  entries.push({
    name: 'OEBPS/nav.xhtml',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="de">
<head><title>Inhaltsverzeichnis</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>Inhaltsverzeichnis</h1>
    <ol>
      ${navLinks.join('\n      ')}
    </ol>
  </nav>
</body>
</html>`),
  });

  // Package Document (content.opf)
  entries.push({
    name: 'OEBPS/content.opf',
    data: enc.encode(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id" xml:lang="de">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="pub-id">${escapeXml(bookUid)}</dc:identifier>
    <dc:title>${escapeXml(project.title)}${project.subtitle ? `: ${escapeXml(project.subtitle)}` : ''}</dc:title>
    <dc:creator>${escapeXml(project.author)}</dc:creator>
    <dc:language>de</dc:language>
    <dc:publisher>${escapeXml(account.imprintName || project.author)}</dc:publisher>
    <meta property="dcterms:modified">${modifiedIso}</meta>
    ${hasCover ? '<meta name="cover" content="cover-image"/>' : ''}
  </metadata>
  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine>
    ${spineItems.join('\n    ')}
  </spine>
</package>`),
  });

  return {
    bytes: buildStoreZip(entries),
    filename: `${buildFileSlug(project.title)}-03-kindle-ebook.epub`,
    chapterCount: project.chapters.length,
    hasEmbeddedCover: hasCover,
  };
}
