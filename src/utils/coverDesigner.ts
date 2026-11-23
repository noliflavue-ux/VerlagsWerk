import type {
  BookProject,
  CoverLayoutStyle,
  CoverMotifStyle,
  CoverVariantDesign,
  PillarId,
} from '../types/book';

export interface CoverPromptBundle {
  styleLabel: string;
  printPrompt: string;
  kindlePrompt: string;
  negativePrompt: string;
  typographyNote: string;
}

export const COVER_STYLE_OPTIONS = [
  {
    id: 'editorial-luxury',
    label: 'Editorial Sachbuch (Zeitlos & Hochwertig)',
    englishCue: 'refined European non-fiction editorial book cover art, museum-grade composition, matte fine paper texture',
  },
  {
    id: 'swiss-modern',
    label: 'Modern Geometrisch (Schweizer Stil)',
    englishCue: 'crisp Swiss modernist graphic art, architectural geometry, balanced negative space, bold precision',
  },
  {
    id: 'organic-calm',
    label: 'Atmosphärisch & Natürlich (Ruhige Bildsprache)',
    englishCue: 'serene natural light fine-art photography aesthetic, soft organic textures, calm atmospheric depth',
  },
  {
    id: 'high-contrast-bestseller',
    label: 'KDP-Bestseller Kontrast (Starke Klickrate)',
    englishCue: 'high-contrast commercial non-fiction artwork, dramatic lighting, unmistakable focal symbol readable at thumbnail size',
  },
] as const;

export const MOTIF_LABELS: Record<CoverMotifStyle, string> = {
  arch: 'Architektur & Säulen',
  waves: 'Sanfte Höhenlinien',
  botanical: 'Botanik & Balance',
  prism: 'Klare Geometrie',
  horizon: 'Licht & Horizont',
  monolith: 'Skulpturale Ruhe',
};

const PILLAR_VISUAL_CUES: Record<
  PillarId,
  {
    printMotif: CoverMotifStyle;
    kindleMotif: CoverMotifStyle;
    printPrimary: string;
    printSecondary: string;
    printAccent: string;
    kindlePrimary: string;
    kindleSecondary: string;
    kindleAccent: string;
    printCue: string;
    kindleCue: string;
  }
> = {
  geld: {
    printMotif: 'arch',
    kindleMotif: 'prism',
    printPrimary: '#F3EFE7',
    printSecondary: '#D8CEBE',
    printAccent: '#1E3A8A',
    kindlePrimary: '#0F1C36',
    kindleSecondary: '#1E3A8A',
    kindleAccent: '#D4A359',
    printCue: 'architectural limestone colonnade, subtle brushed brass lines, calm morning shadows, refined print elegance',
    kindleCue: 'deep navy geometric gold-accented horizon, luminous minimalist vault structure, crisp focal point for small Kindle thumbnails',
  },
  beziehung: {
    printMotif: 'waves',
    kindleMotif: 'horizon',
    printPrimary: '#F6F0EC',
    printSecondary: '#DEC7BA',
    printAccent: '#7C2D3B',
    kindlePrimary: '#2A1624',
    kindleSecondary: '#5B2337',
    kindleAccent: '#E2A88B',
    printCue: 'two sculpted warm terracotta ceramic vessels in soft window light, balanced negative space, tactile linen atmosphere',
    kindleCue: 'warm amber and deep plum intersecting organic arcs, glowing emotional warmth, ultra-clean top area for bold white title',
  },
  glueck: {
    printMotif: 'horizon',
    kindleMotif: 'waves',
    printPrimary: '#EFF4F8',
    printSecondary: '#C8DAE9',
    printAccent: '#0F4C81',
    kindlePrimary: '#0D2438',
    kindleSecondary: '#1B4965',
    kindleAccent: '#E9B96E',
    printCue: 'still Nordic alpine lake at sunrise, warm golden reflection, airy upper sky for serif typography',
    kindleCue: 'radiant dawn light breaking across deep slate blue concentric ripples, striking high-contrast serenity for eBook store grid',
  },
  gesundheit: {
    printMotif: 'botanical',
    kindleMotif: 'monolith',
    printPrimary: '#F0F5F0',
    printSecondary: '#C5DBC9',
    printAccent: '#166534',
    kindlePrimary: '#0D261C',
    kindleSecondary: '#184E37',
    kindleAccent: '#86C79A',
    printCue: 'minimalist sage botanical silhouette on warm stone paper, crisp natural sunlight, calm evidence-based editorial aesthetic',
    kindleCue: 'deep forest emerald sculptural light beam with crisp botanical leaf geometry, bold vitality and high thumbnail legibility',
  },
};

function sanitizeColor(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function normalizeMotifStyle(
  value: string | undefined,
  fallback: CoverMotifStyle
): CoverMotifStyle {
  const valid: CoverMotifStyle[] = [
    'arch',
    'waves',
    'botanical',
    'prism',
    'horizon',
    'monolith',
  ];
  return valid.includes(value as CoverMotifStyle) ? (value as CoverMotifStyle) : fallback;
}

export function normalizeLayoutStyle(
  value: string | undefined,
  fallback: CoverLayoutStyle
): CoverLayoutStyle {
  const valid: CoverLayoutStyle[] = ['editorial', 'minimal', 'frame', 'band'];
  return valid.includes(value as CoverLayoutStyle) ? (value as CoverLayoutStyle) : fallback;
}

/**
 * Returns the Print Book (Taschenbuch) cover variant from the project.
 */
export function getPrintCoverVariant(project: BookProject): CoverVariantDesign {
  const defaults = PILLAR_VISUAL_CUES[project.pillar];
  return {
    artworkId: project.cover.artworkId,
    customImageDataUrl: project.cover.customImageDataUrl,
    useGeneratedArtwork: project.cover.useGeneratedArtwork,
    motifStyle: project.cover.motifStyle || defaults.printMotif,
    palettePrimary: project.cover.palettePrimary || defaults.printPrimary,
    paletteSecondary: project.cover.paletteSecondary || defaults.printSecondary,
    layout: project.cover.layout,
    eyebrow: project.cover.eyebrow,
    titleFont: project.cover.titleFont,
    textColor: project.cover.textColor,
    accentColor: project.cover.accentColor,
    scrimOpacity: project.cover.scrimOpacity,
    imagePrompt: project.cover.imagePrompt,
    artDirectionNote: project.cover.artDirectionNote,
  };
}

/**
 * Returns the distinct Kindle E-Book cover variant, generating a crisp
 * Kindle-optimized fallback if none has been saved yet.
 */
export function getKindleCoverVariant(project: BookProject): CoverVariantDesign {
  if (project.cover.kindleVariant) {
    return project.cover.kindleVariant;
  }
  const defaults = PILLAR_VISUAL_CUES[project.pillar];
  return {
    artworkId: 'art-none',
    useGeneratedArtwork: true,
    motifStyle: defaults.kindleMotif,
    palettePrimary: defaults.kindlePrimary,
    paletteSecondary: defaults.kindleSecondary,
    layout: 'band',
    eyebrow: project.cover.eyebrow || `Kindle Edition · ${project.pillar.toUpperCase()}`,
    titleFont: 'sans',
    textColor: 'light',
    accentColor: defaults.kindleAccent,
    scrimOpacity: 24,
    artDirectionNote:
      'Für kleine Amazon-Kindle-Thumbnails optimiert: kontrastreicher dunkler Grund, klare Sans-Serif-Hierarchie und markantes geometrisches Akzentmotiv.',
    imagePrompt: buildDeterministicCoverPrompts(project, 'high-contrast-bestseller').kindlePrompt,
  };
}

/**
 * Builds deterministic, ready-to-use Cover Prompts (Mode A: Prompt-Only) separately for
 * Print Paperback and Kindle eBook.
 */
export function buildDeterministicCoverPrompts(
  project: BookProject,
  styleId: string = 'editorial-luxury'
): CoverPromptBundle {
  const style =
    COVER_STYLE_OPTIONS.find((s) => s.id === styleId) || COVER_STYLE_OPTIONS[0];
  const cues = PILLAR_VISUAL_CUES[project.pillar];
  const topicLine = `${project.title}${project.subtitle ? ` — ${project.subtitle}` : ''}`;

  const printPrompt = [
    `Full-bleed non-fiction paperback book cover illustration (vertical 2:3 ratio) for "${topicLine}".`,
    `Core theme: ${project.corePromise}.`,
    `Visual motif: ${cues.printCue}.`,
    `Style: ${style.englishCue}.`,
    `Composition: generous uncluttered negative space in the upper 38% for editorial serif title typography, calm balanced tactile print mood, 300 DPI print clarity.`,
    `Strictly no text, no letters, no watermark, no 3D book mockup.`,
  ].join(' ');

  const kindlePrompt = [
    `High-impact Kindle eBook cover artwork (vertical 1:1.6 aspect ratio, 1600x2560px) for "${topicLine}".`,
    `Core promise: ${project.corePromise}.`,
    `Visual motif: ${cues.kindleCue}.`,
    `Style: ${style.englishCue}, optimized for immediate mobile and Amazon search thumbnail readability.`,
    `Composition: strong foreground/background contrast, clear central visual anchor in the lower half, clean dark or solid upper zone for bold high-contrast typography.`,
    `Strictly no text, no letters, no logos, no borders.`,
  ].join(' ');

  const negativePrompt =
    'text, letters, typography, title, watermark, signature, blurry, low contrast, cluttered background, 3D book mockup, stock photo cliché, neon glow, oversaturated colors';

  const typographyNote =
    'Taschenbuch: ruhige Serifen-Typografie mit viel Weißraum und matter Haptik. Kindle-Version: höherer Hell-Dunkel-Kontrast und kompaktere Zeilenführung für optimale Lesbarkeit bei 120 px Thumbnail-Breite.';

  return {
    styleLabel: style.label,
    printPrompt,
    kindlePrompt,
    negativePrompt,
    typographyNote,
  };
}

/**
 * Generates an editorial, publication-grade SVG artwork data URL for Auto-Modus covers.
 * Produces crisp, resolution-independent vector art (1000×1600) with zero external dependencies.
 */
export function generateEditorialCoverSvg(params: {
  motif: CoverMotifStyle;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  variant: 'print' | 'kindle';
}): string {
  const primary = sanitizeColor(params.primaryColor, '#F3EFE7');
  const secondary = sanitizeColor(params.secondaryColor, '#D8CEBE');
  const accent = sanitizeColor(params.accentColor, '#1E3A8A');
  const isKindle = params.variant === 'kindle';

  let motifSvg = '';

  switch (params.motif) {
    case 'arch':
      motifSvg = `
        <rect x="110" y="760" width="780" height="840" rx="390" fill="${secondary}" opacity="0.52"/>
        <rect x="185" y="835" width="630" height="765" rx="315" fill="none" stroke="${accent}" stroke-width="4" opacity="0.55"/>
        <line x1="500" y1="835" x2="500" y2="1600" stroke="${accent}" stroke-width="2" opacity="0.35"/>
        <circle cx="500" cy="1090" r="145" fill="${accent}" opacity="${isKindle ? '0.28' : '0.16'}"/>
        <circle cx="500" cy="1090" r="72" fill="${accent}" opacity="${isKindle ? '0.62' : '0.32'}"/>
      `;
      break;
    case 'waves':
      motifSvg = `
        <path d="M0 980 C240 870, 460 1120, 740 990 C870 930, 950 940, 1000 960 L1000 1600 L0 1600 Z" fill="${secondary}" opacity="0.65"/>
        <path d="M0 1110 C280 990, 520 1240, 810 1090 C910 1040, 960 1055, 1000 1070 L1000 1600 L0 1600 Z" fill="${accent}" opacity="${isKindle ? '0.45' : '0.22'}"/>
        <path d="M0 1245 C290 1140, 540 1350, 840 1215 C925 1175, 970 1190, 1000 1205 L1000 1600 L0 1600 Z" fill="${accent}" opacity="${isKindle ? '0.72' : '0.38'}"/>
        <path d="M0 920 C260 820, 500 1060, 790 920 C900 865, 960 885, 1000 905" fill="none" stroke="${accent}" stroke-width="3" opacity="0.45"/>
      `;
      break;
    case 'botanical':
      motifSvg = `
        <circle cx="500" cy="1120" r="290" fill="${secondary}" opacity="0.48"/>
        <path d="M500 1460 C500 1210, 500 1000, 500 845" stroke="${accent}" stroke-width="5" opacity="0.65" fill="none"/>
        <path d="M500 1240 C360 1210, 290 1090, 330 980 C430 1015, 495 1120, 500 1240 Z" fill="${accent}" opacity="${isKindle ? '0.52' : '0.28'}"/>
        <path d="M500 1170 C645 1135, 715 1015, 675 905 C575 940, 508 1045, 500 1170 Z" fill="${accent}" opacity="${isKindle ? '0.72' : '0.42'}"/>
        <path d="M500 1010 C425 970, 395 885, 435 815 C490 855, 506 930, 500 1010 Z" fill="${secondary}" opacity="0.85"/>
        <circle cx="500" cy="1120" r="340" fill="none" stroke="${accent}" stroke-width="2" stroke-dasharray="10 12" opacity="0.35"/>
      `;
      break;
    case 'prism':
      motifSvg = `
        <polygon points="500,760 840,1180 500,1470 160,1180" fill="${secondary}" opacity="0.45"/>
        <polygon points="500,760 840,1180 500,1180" fill="${accent}" opacity="${isKindle ? '0.68' : '0.34'}"/>
        <polygon points="500,1180 160,1180 500,1470" fill="${accent}" opacity="${isKindle ? '0.42' : '0.2'}"/>
        <line x1="120" y1="1180" x2="880" y2="1180" stroke="${accent}" stroke-width="2.5" opacity="0.5"/>
        <line x1="500" y1="710" x2="500" y2="1520" stroke="${accent}" stroke-width="2.5" opacity="0.4"/>
      `;
      break;
    case 'horizon':
      motifSvg = `
        <circle cx="500" cy="1080" r="245" fill="${accent}" opacity="${isKindle ? '0.58' : '0.26'}"/>
        <circle cx="500" cy="1080" r="155" fill="${accent}" opacity="${isKindle ? '0.82' : '0.44'}"/>
        <rect x="0" y="1085" width="1000" height="515" fill="${secondary}" opacity="0.72"/>
        <line x1="140" y1="1145" x2="860" y2="1145" stroke="${accent}" stroke-width="4" opacity="0.5"/>
        <line x1="220" y1="1205" x2="780" y2="1205" stroke="${accent}" stroke-width="3" opacity="0.38"/>
        <line x1="310" y1="1265" x2="690" y2="1265" stroke="${accent}" stroke-width="2.5" opacity="0.28"/>
      `;
      break;
    case 'monolith':
    default:
      motifSvg = `
        <rect x="240" y="790" width="210" height="680" fill="${secondary}" opacity="0.58"/>
        <rect x="410" y="880" width="240" height="590" fill="${accent}" opacity="${isKindle ? '0.68' : '0.32'}"/>
        <rect x="560" y="990" width="210" height="480" fill="${accent}" opacity="${isKindle ? '0.44' : '0.18'}"/>
        <line x1="160" y1="1470" x2="840" y2="1470" stroke="${accent}" stroke-width="4" opacity="0.55"/>
        <circle cx="710" cy="835" r="56" fill="${accent}" opacity="${isKindle ? '0.85' : '0.48'}"/>
      `;
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1600" width="1000" height="1600">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}" />
      <stop offset="100%" stop-color="${secondary}" />
    </linearGradient>
    <radialGradient id="topGlow" cx="50%" cy="22%" r="60%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="${isKindle ? '0.24' : '0.09'}" />
      <stop offset="100%" stop-color="${primary}" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1000" height="1600" fill="url(#bgGrad)" />
  <rect width="1000" height="1600" fill="url(#topGlow)" />
  ${motifSvg}
  <rect x="52" y="52" width="896" height="1496" fill="none" stroke="${accent}" stroke-opacity="${isKindle ? '0.22' : '0.14'}" stroke-width="2" />
</svg>`;
}

export function svgToDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
    .replace(/'/g, '%27')
    .replace(/"/g, '%22');
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

/**
 * Generates two cohesive yet distinct Auto-Modus cover variants (Print Book vs. Kindle eBook)
 * deterministically from book metadata (used as instant local preview or baseline for AI refinement).
 */
export function buildInstantAutoCoverPair(
  project: BookProject,
  styleId: string = 'editorial-luxury'
): {
  printVariant: CoverVariantDesign;
  kindleVariant: CoverVariantDesign;
  backCoverBlurb: string;
  spineText: string;
  finish: 'matt' | 'glaenzend';
} {
  const cues = PILLAR_VISUAL_CUES[project.pillar];
  const prompts = buildDeterministicCoverPrompts(project, styleId);

  const printSvg = generateEditorialCoverSvg({
    motif: cues.printMotif,
    primaryColor: cues.printPrimary,
    secondaryColor: cues.printSecondary,
    accentColor: cues.printAccent,
    variant: 'print',
  });

  const kindleSvg = generateEditorialCoverSvg({
    motif: cues.kindleMotif,
    primaryColor: cues.kindlePrimary,
    secondaryColor: cues.kindleSecondary,
    accentColor: cues.kindleAccent,
    variant: 'kindle',
  });

  const printLayout: CoverLayoutStyle =
    styleId === 'swiss-modern' ? 'minimal' : styleId === 'high-contrast-bestseller' ? 'frame' : 'editorial';
  const kindleLayout: CoverLayoutStyle =
    styleId === 'swiss-modern' ? 'minimal' : 'band';

  return {
    printVariant: {
      artworkId: 'art-none',
      customImageDataUrl: svgToDataUrl(printSvg),
      useGeneratedArtwork: true,
      motifStyle: cues.printMotif,
      palettePrimary: cues.printPrimary,
      paletteSecondary: cues.printSecondary,
      layout: printLayout,
      eyebrow: project.cover.eyebrow || `Praxisbuch · ${project.pillar.toUpperCase()}`,
      titleFont: 'serif',
      textColor: 'dark',
      accentColor: cues.printAccent,
      scrimOpacity: 8,
      imagePrompt: prompts.printPrompt,
      artDirectionNote:
        'Taschenbuch-Edition: Ruhiges helles Verlags-Design mit großzügigem Weißraum, klarer Serifen-Typografie und mattem Finish für haptische Wertigkeit.',
    },
    kindleVariant: {
      artworkId: 'art-none',
      customImageDataUrl: svgToDataUrl(kindleSvg),
      useGeneratedArtwork: true,
      motifStyle: cues.kindleMotif,
      palettePrimary: cues.kindlePrimary,
      paletteSecondary: cues.kindleSecondary,
      layout: kindleLayout,
      eyebrow: project.cover.eyebrow || `Kindle E-Book · ${project.pillar.toUpperCase()}`,
      titleFont: 'sans',
      textColor: 'light',
      accentColor: cues.kindleAccent,
      scrimOpacity: 20,
      imagePrompt: prompts.kindlePrompt,
      artDirectionNote:
        'Kindle-Edition: Eigenständige dunkle Kontrast-Komposition (1600×2560 px) mit starker Signalwirkung im Amazon-Suchergebnis und klarer mobiler Lesbarkeit.',
    },
    backCoverBlurb:
      project.cover.backCoverBlurb ||
      `${project.title}: ${project.corePromise}`,
    spineText: project.cover.spineText || `${project.title} · ${project.author}`,
    finish: 'matt',
  };
}
