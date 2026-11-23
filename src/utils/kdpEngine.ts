import type {
  BookProject,
  FormatConfig,
  KdpAccountProfile,
  KdpMetadata,
  PillarId,
  TrimSizeId,
} from '../types/book';

export interface TrimSizeSpec {
  id: TrimSizeId;
  label: string;
  widthInches: number;
  heightInches: number;
  widthMm: number;
  heightMm: number;
  wordsPerPageBase: number;
}

export const TRIM_SIZES: Record<TrimSizeId, TrimSizeSpec> = {
  '5x8': {
    id: '5x8',
    label: '5 × 8 Zoll (12,7 × 20,32 cm)',
    widthInches: 5.0,
    heightInches: 8.0,
    widthMm: 127.0,
    heightMm: 203.2,
    wordsPerPageBase: 245,
  },
  '5.5x8.5': {
    id: '5.5x8.5',
    label: '5,5 × 8,5 Zoll (13,97 × 21,59 cm)',
    widthInches: 5.5,
    heightInches: 8.5,
    widthMm: 139.7,
    heightMm: 215.9,
    wordsPerPageBase: 280,
  },
  '6x9': {
    id: '6x9',
    label: '6 × 9 Zoll (15,24 × 22,86 cm · KDP Standard)',
    widthInches: 6.0,
    heightInches: 9.0,
    widthMm: 152.4,
    heightMm: 228.6,
    wordsPerPageBase: 320,
  },
  a5: {
    id: 'a5',
    label: 'DIN A5 (14,8 × 21,0 cm)',
    widthInches: 5.83,
    heightInches: 8.27,
    widthMm: 148.0,
    heightMm: 210.0,
    wordsPerPageBase: 295,
  },
};

export interface KdpLayoutSpecs {
  totalWords: number;
  estimatedPages: number;
  spineWidthMm: number;
  spineWidthInches: number;
  insideMarginMm: number;
  outsideMarginMm: number;
  topBottomMarginMm: number;
  fullWrapWidthMm: number;
  fullWrapHeightMm: number;
  fullWrapWidthPx300Dpi: number;
  fullWrapHeightPx300Dpi: number;
  spineTextAllowed: boolean;
}

export function countWords(text: string): number {
  const cleaned = text
    .replace(/[#*_>`~-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return 0;
  return cleaned.split(' ').length;
}

export function countProjectWords(project: BookProject): number {
  return project.chapters.reduce((sum, ch) => sum + countWords(ch.content), 0);
}

/**
 * Computes Amazon KDP inside (gutter) margin in mm based on official KDP page count tiers.
 */
export function getKdpGutterMarginMm(pages: number): number {
  if (pages <= 150) return 9.6; // 0.375 in
  if (pages <= 300) return 12.7; // 0.5 in
  if (pages <= 500) return 15.9; // 0.625 in
  if (pages <= 700) return 19.1; // 0.75 in
  return 22.3; // 0.875 in (701-828)
}

/**
 * Calculates realistic KDP paperback layout specs, spine thickness, and 300-DPI full wrap dimensions.
 * Official KDP thickness: White paper = 0.0572 mm/page (0.002252 in), Cream paper = 0.0635 mm/page (0.0025 in).
 */
export function calculateKdpLayoutSpecs(
  totalWords: number,
  format: FormatConfig,
  chapterCount: number
): KdpLayoutSpecs {
  const trim = TRIM_SIZES[format.trimSize];
  const fontScale = (11 / format.fontSizePt) * (1.45 / format.lineHeight);
  const wordsPerPage = Math.max(140, Math.round(trim.wordsPerPageBase * fontScale));

  const frontMatterPages =
    (format.includeTitlePage ? 2 : 0) +
    (format.includeImprint ? 2 : 0) +
    (format.includeToc ? 2 : 0);

  const chapterStartPadding = format.startChaptersOnRight ? Math.ceil(chapterCount * 0.6) : 0;
  const contentPages = Math.max(18, Math.ceil(totalWords / wordsPerPage) + chapterStartPadding);

  // KDP paperback minimum is 24 pages; book signatures round to even page counts
  const rawPages = Math.max(24, frontMatterPages + contentPages);
  const estimatedPages = rawPages % 2 === 0 ? rawPages : rawPages + 1;

  const thicknessPerPageMm = format.paperType === 'cream' ? 0.0635 : 0.0572;
  const spineWidthMm = Number((estimatedPages * thicknessPerPageMm).toFixed(2));
  const spineWidthInches = Number((spineWidthMm / 25.4).toFixed(3));

  const insideMarginMm = getKdpGutterMarginMm(estimatedPages);
  const outsideMarginMm = format.bleed ? 9.6 : 6.4;
  const topBottomMarginMm = 12.7;

  // Full paperback wrap includes 3.175mm (0.125") bleed on top, bottom, left, right
  const bleedMm = 3.175;
  const fullWrapWidthMm = Number((trim.widthMm * 2 + spineWidthMm + bleedMm * 2).toFixed(2));
  const fullWrapHeightMm = Number((trim.heightMm + bleedMm * 2).toFixed(2));

  const fullWrapWidthPx300Dpi = Math.round((fullWrapWidthMm / 25.4) * 300);
  const fullWrapHeightPx300Dpi = Math.round((fullWrapHeightMm / 25.4) * 300);

  return {
    totalWords,
    estimatedPages,
    spineWidthMm,
    spineWidthInches,
    insideMarginMm,
    outsideMarginMm,
    topBottomMarginMm,
    fullWrapWidthMm,
    fullWrapHeightMm,
    fullWrapWidthPx300Dpi,
    fullWrapHeightPx300Dpi,
    spineTextAllowed: estimatedPages >= 79,
  };
}

export interface KdpRoyaltyEstimate {
  paperbackPrintCostEur: number;
  paperbackMinPriceEur: number;
  paperbackRoyaltyEur: number;
  paperbackPriceValid: boolean;
  ebookRoyaltyEur: number;
  ebookRoyaltyRate: number;
  ebookPriceEligibleFor70: boolean;
}

/**
 * Estimates Amazon.de EUR print cost & royalties for standard B&W paperback and Kindle eBook.
 * Amazon.de B&W print formula: 24-108 pages = €2.05 fixed; 110+ pages = €0.75 fixed + €0.012/page.
 */
export function calculateKdpRoyalties(
  estimatedPages: number,
  kdp: Pick<KdpMetadata, 'ebookPriceEur' | 'paperbackPriceEur' | 'royaltyPlanEbook'>
): KdpRoyaltyEstimate {
  const paperbackPrintCostEur =
    estimatedPages <= 108
      ? 2.05
      : Number((0.75 + estimatedPages * 0.012).toFixed(2));

  // Minimum list price must cover print cost at 60% royalty
  const paperbackMinPriceEur = Number((paperbackPrintCostEur / 0.6).toFixed(2));
  // German books have 7% VAT included in gross retail price; KDP calculates 60% of net price
  const paperbackNetPrice = kdp.paperbackPriceEur / 1.07;
  const paperbackRoyaltyEur = Number(
    Math.max(0, paperbackNetPrice * 0.6 - paperbackPrintCostEur).toFixed(2)
  );
  const paperbackPriceValid = kdp.paperbackPriceEur >= paperbackMinPriceEur;

  // Amazon.de Kindle 70% royalty applies between €2.99 and €9.99 (minus small delivery fee ~€0.08)
  const ebookPriceEligibleFor70 = kdp.ebookPriceEur >= 2.99 && kdp.ebookPriceEur <= 9.99;
  const effectiveRate = kdp.royaltyPlanEbook === '70' && ebookPriceEligibleFor70 ? 0.7 : 0.35;
  const ebookNetPrice = kdp.ebookPriceEur / 1.07;
  const deliveryFee = effectiveRate === 0.7 ? 0.08 : 0;
  const ebookRoyaltyEur = Number(
    Math.max(0, ebookNetPrice * effectiveRate - deliveryFee).toFixed(2)
  );

  return {
    paperbackPrintCostEur,
    paperbackMinPriceEur,
    paperbackRoyaltyEur,
    paperbackPriceValid,
    ebookRoyaltyEur,
    ebookRoyaltyRate: effectiveRate,
    ebookPriceEligibleFor70,
  };
}

export function utf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export interface KdpValidationResult {
  titleCombinedLength: number;
  titleTooLong: boolean;
  descriptionLength: number;
  descriptionTooLong: boolean;
  keywordByteLengths: number[];
  keywordsOverLimit: number[];
  duplicateWordsInKeywords: string[];
  missingRequiredFields: string[];
  isReadyForKdp: boolean;
}

export function validateKdpMetadata(project: BookProject): KdpValidationResult {
  const combinedTitle = `${project.title}${project.subtitle ? ': ' + project.subtitle : ''}`;
  const titleCombinedLength = combinedTitle.length;
  const titleTooLong = titleCombinedLength > 200;

  const descriptionLength = project.kdp.descriptionHtml.length;
  const descriptionTooLong = descriptionLength > 4000;

  const keywordByteLengths = project.kdp.keywords.map((kw) => utf8ByteLength(kw.trim()));
  const keywordsOverLimit: number[] = [];
  keywordByteLengths.forEach((bytes, idx) => {
    if (bytes > 50) keywordsOverLimit.push(idx);
  });

  // Detect repeated significant words between title/subtitle and backend keywords
  const titleWords = new Set(
    combinedTitle
      .toLowerCase()
      .replace(/[^a-zäöüß0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
  );

  const duplicateWords = new Set<string>();
  project.kdp.keywords.forEach((kw) => {
    kw.toLowerCase()
      .replace(/[^a-zäöüß0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .forEach((word) => {
        if (titleWords.has(word)) {
          duplicateWords.add(word);
        }
      });
  });

  const missingRequiredFields: string[] = [];
  if (!project.title.trim()) missingRequiredFields.push('Buchtitel');
  if (!project.author.trim()) missingRequiredFields.push('Autorenname');
  if (!project.kdp.descriptionHtml.trim()) missingRequiredFields.push('KDP-Buchbeschreibung');
  if (project.kdp.keywords.filter((k) => k.trim().length > 0).length < 5) {
    missingRequiredFields.push('Mindestens 5 von 7 Backend-Keywords');
  }
  if (project.kdp.categories.filter((c) => c.trim().length > 0).length < 2) {
    missingRequiredFields.push('Mindestens 2 KDP-Kategorien');
  }

  return {
    titleCombinedLength,
    titleTooLong,
    descriptionLength,
    descriptionTooLong,
    keywordByteLengths,
    keywordsOverLimit,
    duplicateWordsInKeywords: Array.from(duplicateWords),
    missingRequiredFields,
    isReadyForKdp:
      !titleTooLong &&
      !descriptionTooLong &&
      keywordsOverLimit.length === 0 &&
      missingRequiredFields.length === 0,
  };
}

export interface KdpPromptTemplate {
  id: string;
  title: string;
  purpose: string;
  mode: 'full-metadata' | 'freeform';
  prompt: string;
}

const PILLAR_LABEL_MAP: Record<PillarId, string> = {
  geld: 'Geld & finanzielle Souveränität',
  beziehung: 'Beziehung & Verbundenheit',
  glueck: 'Glück & Lebenssinn',
  gesundheit: 'Gesundheit & Vitalität',
};

export function buildKdpPrompts(project: BookProject): KdpPromptTemplate[] {
  const pillarName = PILLAR_LABEL_MAP[project.pillar];
  const chapterTitles = project.chapters.map((c, i) => `${i + 1}. ${c.title}`).join('; ');

  return [
    {
      id: 'kdp-komplett',
      title: 'Komplettpaket: HTML-Beschreibung, 7 Keywords & 3 Kategorien',
      purpose: 'Erzeugt alle Pflicht-Metadaten für Tab 1 bei Amazon KDP in einem Durchlauf und übernimmt sie direkt.',
      mode: 'full-metadata',
      prompt: `Erstelle für mein deutschsprachiges Amazon-KDP-Sachbuch "${project.title}" (Untertitel: "${project.subtitle}") mit dem zeitlosen Grundbedürfnis-Schwerpunkt "${pillarName}" ein vollständiges KDP-Metadaten-Paket:
1. Eine verkaufsstarke, seriöse Amazon-Buchbeschreibung im KDP-HTML-Format (nur <h4>, <p>, <b>, <i>, <ul>, <li>, <br>, maximal 3.200 Zeichen): Starte mit einem präzisen Leser-Hook, zeige 4–5 konkrete Ergebnisse als Aufzählung, nenne die Zielgruppe (${project.targetAudience}) und schließe mit einem ruhigen Call-to-Action.
2. Exakt 7 Amazon-Backend-Keywords (je maximal 48 Bytes, reine Suchphrasen wie Leser auf Amazon.de tippen, keine Wörter aus Titel/Untertitel wiederholen).
3. Exakt 3 präzise Amazon.de-KDP-Kategorien mit Nischenpotenzial.
4. 3 alternative konversionsstarke Untertitel-Varianten.
Kapitelübersicht: ${chapterTitles}`,
    },
    {
      id: 'kdp-description-html',
      title: 'Amazon-HTML-Buchbeschreibung (AIDA-Struktur)',
      purpose: 'Optimiert die Produktseite für hohe Kaufkonversion ohne plumpe Werbefloskeln.',
      mode: 'freeform',
      prompt: `Schreibe eine überzeugende Amazon-KDP-Buchbeschreibung in sauberem KDP-HTML (<b>, <p>, <ul>, <li>, <br>) für "${project.title}: ${project.subtitle}".
Grundbedürfnis: ${pillarName}
Zielgruppe: ${project.targetAudience}
Kernversprechen: ${project.corePromise}
Kapitel: ${chapterTitles}

Struktur:
- Starke Einstiegsfrage aus dem Alltag des Lesers
- Warum gängige Ratschläge scheitern
- Was der Leser konkret lernt (5 präzise Bulletpoints)
- Für wen das Buch geschrieben ist
- Einladung zum Kauf. Maximal 3.000 Zeichen.`,
    },
    {
      id: 'kdp-backend-keywords',
      title: '7 Amazon Backend-Keywords (Suchvolumen & Long-Tail)',
      purpose: 'Nutzt alle 7 × 50 Byte KDP-Felder maximal effizient ohne Wortdoppelungen.',
      mode: 'freeform',
      prompt: `Erstelle exakt 7 Amazon-KDP-Backend-Keyword-Zeilen für Amazon.de zum Buch "${project.title}: ${project.subtitle}" (Grundbedürfnis: ${pillarName}).
Regeln:
- Jede Zeile maximal 48 Bytes (inkl. Leerzeichen, keine Kommas nötig)
- Keine Wörter wiederholen, die schon im Titel oder Untertitel stehen
- Fokus auf echte Käufer-Suchbegriffe, Synonyme, Problemstellungen und Zielgruppen (${project.targetAudience})
- Keine geschützten Markennamen, keine Wörter wie "Bestseller" oder "neu".`,
    },
    {
      id: 'kdp-aplus-content',
      title: 'A+ Content Module für die Amazon-Produktseite',
      purpose: 'Textbausteine für 3 visuelle A+ Content-Sektionen in KDP Marketing.',
      mode: 'freeform',
      prompt: `Entwirf 3 strukturierte Amazon A+ Content Module für das Buch "${project.title}" (Schwerpunkt: ${pillarName}, Zielgruppe: ${project.targetAudience}):
Modul 1: Marken-Banner mit Kernaussage (max. 180 Zeichen)
Modul 2: 3-Spalten-Nutzenvergleich (Vorher -> Mit diesem Buch -> Ergebnis)
Modul 3: "Ein Blick ins Buch" – prägnante Zusammenfassung der wichtigsten Kapitel (${chapterTitles}).`,
    },
    {
      id: 'kdp-ads-cluster',
      title: 'Amazon Ads Keyword- & ASIN-Strategie',
      purpose: 'Start-Set für Sponsored Products Kampagnen direkt nach Veröffentlichung.',
      mode: 'freeform',
      prompt: `Erstelle ein strukturiertes Amazon-Ads-Starterpaket (Sponsored Products auf Amazon.de) für "${project.title}" (Grundbedürfnis: ${pillarName}):
- 10 Exact-Match-Keywords mit hoher Kaufabsicht
- 10 Phrase-Match-Keywords aus angrenzenden Problembereichen
- 5 Negative Keywords zur Vermeidung von Streuverlusten
- Empfehlung für Tagesbudget und Gebotsstrategie in den ersten 14 Launch-Tagen.`,
    },
  ];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderChapterMarkdownToHtml(markdown: string, firstLineIndent: boolean): string {
  const lines = markdown.split(/\r?\n/);
  const blocks: string[] = [];
  let inList = false;
  let isFirstParagraphAfterHeading = true;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (inList) {
        blocks.push('</ul>');
        inList = false;
      }
      continue;
    }

    if (line.startsWith('### ')) {
      if (inList) {
        blocks.push('</ul>');
        inList = false;
      }
      blocks.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      isFirstParagraphAfterHeading = true;
      continue;
    }

    if (line.startsWith('## ')) {
      if (inList) {
        blocks.push('</ul>');
        inList = false;
      }
      blocks.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      isFirstParagraphAfterHeading = true;
      continue;
    }

    if (line.startsWith('- ') || line.startsWith('• ')) {
      if (!inList) {
        blocks.push('<ul>');
        inList = true;
      }
      blocks.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      isFirstParagraphAfterHeading = false;
      continue;
    }

    if (inList) {
      blocks.push('</ul>');
      inList = false;
    }

    const formatted = escapeHtml(line)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    const cls = firstLineIndent && !isFirstParagraphAfterHeading ? ' class="indent"' : '';
    blocks.push(`<p${cls}>${formatted}</p>`);
    isFirstParagraphAfterHeading = false;
  }

  if (inList) {
    blocks.push('</ul>');
  }

  return blocks.join('\n');
}

/**
 * Exports a clean, KDP-compliant HTML manuscript suitable for Kindle Create / EPUB conversion
 * or browser print-to-PDF using exact @page KDP trim dimensions.
 */
export function buildFormattedKdpHtml(
  project: BookProject,
  account: KdpAccountProfile,
  target: 'kindle' | 'paperback'
): string {
  const specs = calculateKdpLayoutSpecs(
    countProjectWords(project),
    project.format,
    project.chapters.length
  );
  const trim = TRIM_SIZES[project.format.trimSize];
  const year = new Date().getFullYear();

  const tocItems = project.chapters
    .map(
      (ch, idx) =>
        `<li><a href="#kapitel-${idx + 1}">Kapitel ${idx + 1}: ${escapeHtml(ch.title)}</a></li>`
    )
    .join('\n');

  const chaptersHtml = project.chapters
    .map(
      (ch, idx) => `
    <section id="kapitel-${idx + 1}" class="chapter">
      <p class="chapter-number">Kapitel ${idx + 1}</p>
      <h1>${escapeHtml(ch.title)}</h1>
      ${renderChapterMarkdownToHtml(ch.content, project.format.firstLineIndent)}
    </section>`
    )
    .join('\n');

  const pageCss =
    target === 'paperback'
      ? `@page {
      size: ${trim.widthMm}mm ${trim.heightMm}mm;
      margin-top: ${project.format.bleed ? 15.9 : 15}mm;
      margin-bottom: 16mm;
      margin-inside: ${specs.insideMarginMm}mm;
      margin-outside: ${Math.max(12.7, specs.outsideMarginMm)}mm;
    }`
      : `@page { margin: 18mm; }`;

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(project.title)}</title>
  <style>
    ${pageCss}
    body {
      font-family: ${project.format.fontFamily}, Georgia, serif;
      font-size: ${project.format.fontSizePt}pt;
      line-height: ${project.format.lineHeight};
      color: #111111;
      max-width: ${target === 'kindle' ? '38em' : `${trim.widthMm - 24}mm`};
      margin: 0 auto;
      padding: 24px;
      text-align: justify;
      hyphens: auto;
    }
    .title-page, .imprint-page, .toc-page, .chapter {
      page-break-before: always;
      break-before: page;
    }
    .title-page {
      page-break-before: auto;
      text-align: center;
      padding-top: 28%;
    }
    .title-page h1 {
      font-size: 26pt;
      margin: 0 0 10pt 0;
      line-height: 1.15;
    }
    .title-page .subtitle {
      font-size: 13pt;
      color: #444;
      margin-bottom: 36pt;
    }
    .title-page .author {
      font-size: 12pt;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .imprint-page {
      font-size: 9pt;
      line-height: 1.5;
      color: #333;
      padding-top: 55%;
      text-align: left;
    }
    .toc-page h2 {
      font-size: 16pt;
      margin-bottom: 14pt;
    }
    .toc-page ol {
      list-style: none;
      padding: 0;
    }
    .toc-page li {
      margin-bottom: 6pt;
    }
    .toc-page a {
      color: #111;
      text-decoration: none;
    }
    .chapter-number {
      font-size: 9.5pt;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #555;
      margin: 0 0 6pt 0;
      text-align: left;
    }
    .chapter h1 {
      font-size: 19pt;
      line-height: 1.2;
      margin: 0 0 18pt 0;
      text-align: left;
      break-after: avoid;
    }
    .chapter h2 {
      font-size: 13pt;
      margin: 18pt 0 8pt 0;
      text-align: left;
      break-after: avoid;
    }
    .chapter p {
      margin: 0 0 6pt 0;
      orphans: 2;
      widows: 2;
    }
    .chapter p.indent {
      text-indent: 1.3em;
      margin-top: 0;
    }
    .chapter ul {
      margin: 8pt 0 10pt 18pt;
      text-align: left;
    }
  </style>
</head>
<body>
  ${
    project.format.includeTitlePage
      ? `<section class="title-page">
    <h1>${escapeHtml(project.title)}</h1>
    <p class="subtitle">${escapeHtml(project.subtitle)}</p>
    <p class="author">${escapeHtml(project.author)}</p>
  </section>`
      : ''
  }
  ${
    project.format.includeImprint
      ? `<section class="imprint-page">
    <p><strong>${escapeHtml(project.title)}</strong><br/>${escapeHtml(project.subtitle)}</p>
    <p>© ${year} ${escapeHtml(project.author)}${account.imprintName ? ` · ${escapeHtml(account.imprintName)}` : ''}</p>
    ${account.publisherAddress ? `<p>${escapeHtml(account.publisherAddress)}</p>` : ''}
    <p>Auflage: ${escapeHtml(project.kdp.editionNumber || '1. Auflage')}<br/>
    ISBN: ${project.kdp.isbnMode === 'own-isbn' && project.kdp.ownIsbn ? escapeHtml(project.kdp.ownIsbn) : 'Wird über Amazon KDP zugewiesen'}</p>
    <p>Alle Rechte vorbehalten. Vervielfältigung, auch auszugsweise, nur mit schriftlicher Genehmigung des Autors.</p>
  </section>`
      : ''
  }
  ${
    project.format.includeToc
      ? `<nav class="toc-page" id="toc">
    <h2>Inhaltsverzeichnis</h2>
    <ol>
      ${tocItems}
    </ol>
  </nav>`
      : ''
  }
  ${chaptersHtml}
</body>
</html>`;
}

/**
 * Generates the complete, copy-paste-ready Amazon KDP setup sheet covering all 3 KDP tabs.
 */
export function buildKdpCopySheetText(
  project: BookProject,
  account: KdpAccountProfile
): string {
  const words = countProjectWords(project);
  const specs = calculateKdpLayoutSpecs(words, project.format, project.chapters.length);
  const royalties = calculateKdpRoyalties(specs.estimatedPages, project.kdp);
  const trim = TRIM_SIZES[project.format.trimSize];

  const aiDisclosureLabel =
    project.kdp.aiGeneratedDisclosure === 'ai-assisted'
      ? 'KI-unterstützt (Nein bei "KI-generiert" in KDP-Abfrage, menschlich bearbeitet & lektoriert)'
      : project.kdp.aiGeneratedDisclosure === 'ai-generated'
        ? 'KI-generiert (Ja in der Amazon KDP KI-Offenlegung angeben)'
        : 'Keine KI-Inhalte';

  return `====================================================================
AMAZON KDP ANLAGE-KOPIERVORLAGE — ${project.title.toUpperCase()}
====================================================================

GRUNDBEDÜRFNIS-SCHWERPUNKT: ${PILLAR_LABEL_MAP[project.pillar]}
VERLAGSPROFIL: ${account.imprintName || 'Unabhängig veröffentlicht'} (${account.primaryMarketplace})

--------------------------------------------------------------------
TAB 1: BUCHDETAILS (KDP)
--------------------------------------------------------------------
Sprache:              ${project.kdp.language}
Buchtitel:            ${project.title}
Untertitel:           ${project.subtitle}
Reihe:                ${project.kdp.seriesName || '(keine Reihe)'}${project.kdp.seriesNumber ? ` · Band ${project.kdp.seriesNumber}` : ''}
Auflage:              ${project.kdp.editionNumber || '1'}
Autor:                ${project.author}
Verlagsrechte:        Ich besitze das Urheberrecht und alle erforderlichen Veröffentlichungsrechte
Zielgruppe / Alter:   ${project.kdp.readingAgeMin || '18'} bis ${project.kdp.readingAgeMax || '18+'} Jahre · Nicht jugendfrei: ${project.kdp.adultContent ? 'Ja' : 'Nein'}

KDP-Kategorien (bis zu 3):
  1. ${project.kdp.categories[0] || '-'}
  2. ${project.kdp.categories[1] || '-'}
  3. ${project.kdp.categories[2] || '-'}

7 Backend-Keywords (je max. 50 Bytes):
${project.kdp.keywords.map((kw, i) => `  ${i + 1}. ${kw || '(leer)'} [${utf8ByteLength(kw)} Bytes]`).join('\n')}

Buchbeschreibung (KDP-HTML):
${project.kdp.descriptionHtml}

--------------------------------------------------------------------
TAB 2: BUCHINHALT (KDP)
--------------------------------------------------------------------
KI-Offenlegung:       ${aiDisclosureLabel}
ISBN:                 ${project.kdp.isbnMode === 'own-isbn' && project.kdp.ownIsbn ? project.kdp.ownIsbn : 'Kostenlose KDP-ISBN verwenden'}
Trim-Größe:           ${trim.label}
Papierfarbe:          ${project.format.paperType === 'cream' ? 'Cremefarbenes Papier (Standard für Sachbücher)' : 'Weißes Papier'}
Anschnitt (Bleed):    ${project.format.bleed ? 'Mit Anschnitt (Bleed)' : 'Ohne Anschnitt (No Bleed)'}
Cover-Finish:         ${project.cover.finish === 'matt' ? 'Matt' : 'Glänzend'}
Kalkulierter Umfang:  ${specs.estimatedPages} Seiten (${words} Wörter)
Buchrückenbreite:     ${specs.spineWidthMm} mm (${specs.spineWidthInches} Zoll)
Bundsteg (Innenrand): ${specs.insideMarginMm} mm
Komplett-Cover-Maß:   ${specs.fullWrapWidthMm} × ${specs.fullWrapHeightMm} mm (${specs.fullWrapWidthPx300Dpi} × ${specs.fullWrapHeightPx300Dpi} px @ 300 DPI)

--------------------------------------------------------------------
TAB 3: BUCHPREISE & TANTIEMEN (KDP)
--------------------------------------------------------------------
Hauptmarktplatz:      ${account.primaryMarketplace}
KDP Select (eBook):   ${project.kdp.kdpSelectEnrolled ? 'Aktiviert (Kindle Unlimited)' : 'Nicht aktiviert'}
Kindle eBook Preis:   ${project.kdp.ebookPriceEur.toFixed(2)} € (Tantieme ${(royalties.ebookRoyaltyRate * 100).toFixed(0)}%: ca. ${royalties.ebookRoyaltyEur.toFixed(2)} € / Verkauf)
Taschenbuch Preis:    ${project.kdp.paperbackPriceEur.toFixed(2)} € (Druckkosten ca. ${royalties.paperbackPrintCostEur.toFixed(2)} € · Tantieme 60%: ca. ${royalties.paperbackRoyaltyEur.toFixed(2)} € / Verkauf)
`;
}
