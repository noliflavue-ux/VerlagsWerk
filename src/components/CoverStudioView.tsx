import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileCode2,
  Loader2,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import type {
  BookProject,
  CoverGeneratorMode,
  CoverLayoutStyle,
  CoverMotifStyle,
  CoverVariantDesign,
} from '../types/book';
import { COVER_ARTWORKS, PILLARS } from '../data/seedBooks';
import { calculateKdpLayoutSpecs, countProjectWords } from '../utils/kdpEngine';
import { exportCoverPng, resolveVariantImageSource } from '../utils/coverCanvas';
import { downloadCoverPrintPdf } from '../utils/kdpPdfDownloads';
import {
  buildDeterministicCoverPrompts,
  buildInstantAutoCoverPair,
  COVER_STYLE_OPTIONS,
  generateEditorialCoverSvg,
  getKindleCoverVariant,
  getPrintCoverVariant,
  MOTIF_LABELS,
  normalizeLayoutStyle,
  normalizeMotifStyle,
  svgToDataUrl,
} from '../utils/coverDesigner';

interface CoverStudioViewProps {
  book: BookProject;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
}

const ACCENT_PRESETS = [
  { label: 'Preußisch Indigo', value: '#1E3A8A' },
  { label: 'Schiefer Anthrazit', value: '#1E293B' },
  { label: 'Tiefes Salbeigrün', value: '#166534' },
  { label: 'Bordeaux', value: '#7F1D1D' },
  { label: 'Warmes Goldbronze', value: '#B45309' },
];

const MOTIF_LIST: CoverMotifStyle[] = [
  'arch',
  'waves',
  'botanical',
  'prism',
  'horizon',
  'monolith',
];

export function CoverStudioView({
  book,
  readOnly = false,
  onUpdateBook,
}: CoverStudioViewProps) {
  const [generatorMode, setGeneratorMode] = useState<CoverGeneratorMode>(
    book.cover.generatorMode || 'auto-cover'
  );
  const [activeEdition, setActiveEdition] = useState<'print' | 'kindle'>('print');
  const [previewMode, setPreviewMode] = useState<'compare' | '3d' | 'kindle' | 'amazon'>('compare');
  const [selectedStyleId, setSelectedStyleId] = useState<string>(
    book.cover.promptStyle || COVER_STYLE_OPTIONS[0].id
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [exporting, setExporting] = useState<'kindle' | 'paperback-wrap' | 'cover-pdf' | null>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<{ print?: boolean; kindle?: boolean }>({});

  const specs = calculateKdpLayoutSpecs(
    countProjectWords(book),
    book.format,
    book.chapters.length
  );

  const printVariant = getPrintCoverVariant(book);
  const kindleVariant = getKindleCoverVariant(book);
  const currentVariant = activeEdition === 'print' ? printVariant : kindleVariant;

  const fallbackPrompts = buildDeterministicCoverPrompts(book, selectedStyleId);
  const printPrompt = printVariant.imagePrompt || fallbackPrompts.printPrompt;
  const kindlePrompt = kindleVariant.imagePrompt || fallbackPrompts.kindlePrompt;
  const negativePrompt = book.cover.negativePrompt || fallbackPrompts.negativePrompt;

  const selectedStyleObj =
    COVER_STYLE_OPTIONS.find((s) => s.id === selectedStyleId) || COVER_STYLE_OPTIONS[0];

  const updateActiveVariant = (patch: Partial<CoverVariantDesign>) => {
    onUpdateBook((prev) => {
      if (activeEdition === 'print') {
        return {
          ...prev,
          cover: {
            ...prev.cover,
            ...patch,
          },
        };
      }
      const existingKindle = getKindleCoverVariant(prev);
      return {
        ...prev,
        cover: {
          ...prev.cover,
          kindleVariant: {
            ...existingKindle,
            ...patch,
          },
        },
      };
    });
  };

  const updateCoverRoot = (patch: Partial<BookProject['cover']>) => {
    onUpdateBook((prev) => ({
      ...prev,
      cover: { ...prev.cover, ...patch },
    }));
  };

  const handleModeSwitch = (mode: CoverGeneratorMode) => {
    setGeneratorMode(mode);
    updateCoverRoot({ generatorMode: mode });
    setError('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setFailedImages((prev) => ({ ...prev, [activeEdition]: false }));
        updateActiveVariant({
          customImageDataUrl: reader.result,
          useGeneratedArtwork: false,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  // Mode A: Generate Prompts Only via AI
  const handleGeneratePromptsAi = async () => {
    setAiLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const res = await fetch('/api/ai/cover-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar: book.pillar,
          title: book.title,
          subtitle: book.subtitle,
          targetAudience: book.targetAudience,
          corePromise: book.corePromise,
          styleLabel: selectedStyleObj.label,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Cover-Prompts konnten nicht generiert werden.');
      }
      const existingKindle = getKindleCoverVariant(book);
      updateCoverRoot({
        promptStyle: selectedStyleId,
        imagePrompt: data.printPrompt || printPrompt,
        negativePrompt: data.negativePrompt || negativePrompt,
        artDirectionNote: data.typographyNote || book.cover.artDirectionNote,
        kindleVariant: {
          ...existingKindle,
          imagePrompt: data.kindlePrompt || kindlePrompt,
        },
      });
      setStatusMessage(
        'KI-Cover-Prompts getrennt für Taschenbuch (Print) und Kindle-Version erstellt.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der Prompt-Generierung.');
    } finally {
      setAiLoading(false);
    }
  };

  // Mode A: Refresh deterministic prompt template instantly
  const handleApplyDeterministicPrompts = () => {
    const bundle = buildDeterministicCoverPrompts(book, selectedStyleId);
    const existingKindle = getKindleCoverVariant(book);
    updateCoverRoot({
      promptStyle: selectedStyleId,
      imagePrompt: bundle.printPrompt,
      negativePrompt: bundle.negativePrompt,
      artDirectionNote: bundle.typographyNote,
      kindleVariant: {
        ...existingKindle,
        imagePrompt: bundle.kindlePrompt,
      },
    });
    setStatusMessage(`Prompt-Vorlagen für Stil „${bundle.styleLabel}“ aktualisiert.`);
  };

  // Mode B: Instant Auto-Modus (creates distinct Print & Kindle covers immediately)
  const handleInstantAutoCovers = () => {
    setError('');
    const pair = buildInstantAutoCoverPair(book, selectedStyleId);
    setFailedImages({});
    updateCoverRoot({
      ...pair.printVariant,
      generatorMode: 'auto-cover',
      promptStyle: selectedStyleId,
      backCoverBlurb: pair.backCoverBlurb,
      spineText: pair.spineText,
      finish: pair.finish,
      kindleVariant: pair.kindleVariant,
    });
    setPreviewMode('compare');
    setStatusMessage(
      'Auto-Modus angewendet: Eigenständiges Taschenbuch-Cover und kontrastreiches Kindle-Cover wurden erstellt.'
    );
  };

  // Mode B: AI Auto-Modus (calls Gemini 4 Hydrogen for art-directed Print + Kindle covers)
  const handleGenerateAutoCoversAi = async () => {
    setAiLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const res = await fetch('/api/ai/cover-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar: book.pillar,
          title: book.title,
          subtitle: book.subtitle,
          author: book.author,
          targetAudience: book.targetAudience,
          corePromise: book.corePromise,
          styleLabel: selectedStyleObj.label,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Auto-Cover-Erstellung fehlgeschlagen.');
      }

      const fallbackPair = buildInstantAutoCoverPair(book, selectedStyleId);
      const p = data.printCover || {};
      const k = data.kindleCover || {};

      const printMotif = normalizeMotifStyle(p.motifStyle, fallbackPair.printVariant.motifStyle || 'arch');
      const kindleMotif = normalizeMotifStyle(k.motifStyle, fallbackPair.kindleVariant.motifStyle || 'prism');

      const printSvg = generateEditorialCoverSvg({
        motif: printMotif,
        primaryColor: p.primaryColor || fallbackPair.printVariant.palettePrimary || '#F3EFE7',
        secondaryColor: p.secondaryColor || fallbackPair.printVariant.paletteSecondary || '#D8CEBE',
        accentColor: p.accentColor || fallbackPair.printVariant.accentColor,
        variant: 'print',
      });

      const kindleSvg = generateEditorialCoverSvg({
        motif: kindleMotif,
        primaryColor: k.primaryColor || fallbackPair.kindleVariant.palettePrimary || '#0F1C36',
        secondaryColor: k.secondaryColor || fallbackPair.kindleVariant.paletteSecondary || '#1E3A8A',
        accentColor: k.accentColor || fallbackPair.kindleVariant.accentColor,
        variant: 'kindle',
      });

      const nextPrint: CoverVariantDesign = {
        artworkId: 'art-none',
        customImageDataUrl: svgToDataUrl(printSvg),
        useGeneratedArtwork: true,
        motifStyle: printMotif,
        palettePrimary: p.primaryColor || fallbackPair.printVariant.palettePrimary,
        paletteSecondary: p.secondaryColor || fallbackPair.printVariant.paletteSecondary,
        layout: normalizeLayoutStyle(p.layout, 'editorial'),
        eyebrow: p.eyebrow || fallbackPair.printVariant.eyebrow,
        titleFont: p.titleFont === 'sans' ? 'sans' : 'serif',
        textColor: p.textColor === 'light' ? 'light' : 'dark',
        accentColor: p.accentColor || fallbackPair.printVariant.accentColor,
        scrimOpacity: Number.isFinite(p.scrimOpacity) ? Math.min(60, Math.max(4, p.scrimOpacity)) : 10,
        artDirectionNote: p.artDirectionNote || fallbackPair.printVariant.artDirectionNote,
        imagePrompt: p.imagePrompt || fallbackPair.printVariant.imagePrompt,
      };

      const nextKindle: CoverVariantDesign = {
        artworkId: 'art-none',
        customImageDataUrl: svgToDataUrl(kindleSvg),
        useGeneratedArtwork: true,
        motifStyle: kindleMotif,
        palettePrimary: k.primaryColor || fallbackPair.kindleVariant.palettePrimary,
        paletteSecondary: k.secondaryColor || fallbackPair.kindleVariant.paletteSecondary,
        layout: normalizeLayoutStyle(k.layout, 'band'),
        eyebrow: k.eyebrow || fallbackPair.kindleVariant.eyebrow,
        titleFont: k.titleFont === 'serif' ? 'serif' : 'sans',
        textColor: k.textColor === 'dark' ? 'dark' : 'light',
        accentColor: k.accentColor || fallbackPair.kindleVariant.accentColor,
        scrimOpacity: Number.isFinite(k.scrimOpacity) ? Math.min(60, Math.max(8, k.scrimOpacity)) : 22,
        artDirectionNote: k.artDirectionNote || fallbackPair.kindleVariant.artDirectionNote,
        imagePrompt: k.imagePrompt || fallbackPair.kindleVariant.imagePrompt,
      };

      setFailedImages({});
      updateCoverRoot({
        ...nextPrint,
        generatorMode: 'auto-cover',
        promptStyle: selectedStyleId,
        backCoverBlurb: data.backCoverBlurb || book.cover.backCoverBlurb,
        spineText: data.spineText || book.cover.spineText,
        finish: data.finish === 'glaenzend' ? 'glaenzend' : 'matt',
        kindleVariant: nextKindle,
      });
      setPreviewMode('compare');
      setStatusMessage(
        'KI-Auto-Modus abgeschlossen: Zwei eigenständige Cover (Taschenbuch + Kindle) wurden generiert.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei der KI-Auto-Cover-Erstellung.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectMotif = (motif: CoverMotifStyle) => {
    const fallbackPair = buildInstantAutoCoverPair(book, selectedStyleId);
    const defaultPalette =
      activeEdition === 'print' ? fallbackPair.printVariant : fallbackPair.kindleVariant;
    const primaryColor = currentVariant.palettePrimary || defaultPalette.palettePrimary || '#F3EFE7';
    const secondaryColor =
      currentVariant.paletteSecondary || defaultPalette.paletteSecondary || '#D8CEBE';
    const svg = generateEditorialCoverSvg({
      motif,
      primaryColor,
      secondaryColor,
      accentColor: currentVariant.accentColor,
      variant: activeEdition,
    });
    setFailedImages((prev) => ({ ...prev, [activeEdition]: false }));
    updateActiveVariant({
      artworkId: 'art-none',
      useGeneratedArtwork: true,
      motifStyle: motif,
      palettePrimary: primaryColor,
      paletteSecondary: secondaryColor,
      customImageDataUrl: svgToDataUrl(svg),
    });
  };

  const handleAccentChange = (hex: string) => {
    if (currentVariant.useGeneratedArtwork && currentVariant.motifStyle) {
      const svg = generateEditorialCoverSvg({
        motif: currentVariant.motifStyle,
        primaryColor:
          currentVariant.palettePrimary || (activeEdition === 'kindle' ? '#0F1C36' : '#F3EFE7'),
        secondaryColor:
          currentVariant.paletteSecondary || (activeEdition === 'kindle' ? '#1E3A8A' : '#D8CEBE'),
        accentColor: hex,
        variant: activeEdition,
      });
      updateActiveVariant({
        accentColor: hex,
        customImageDataUrl: svgToDataUrl(svg),
      });
    } else {
      updateActiveVariant({ accentColor: hex });
    }
  };

  const handleDownload = async (mode: 'kindle' | 'paperback-wrap' | 'cover-pdf') => {
    setExporting(mode);
    try {
      if (mode === 'cover-pdf') {
        await downloadCoverPrintPdf(book);
      } else {
        await exportCoverPng(book, mode);
      }
    } finally {
      setExporting(null);
    }
  };

  const copyText = (key: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const renderCoverCanvas = (
    variant: CoverVariantDesign,
    kind: 'print' | 'kindle',
    size: 'normal' | 'side-by-side' | 'compact' = 'normal'
  ) => {
    const imgSrc = resolveVariantImageSource(variant, kind);
    const hasImgFailed = Boolean(failedImages[kind]);
    const isLightText = variant.textColor === 'light' || variant.layout === 'band';
    const scrimAlpha = Math.max(0, Math.min(85, variant.scrimOpacity)) / 100;
    const alignCenter = variant.layout === 'editorial' || variant.layout === 'frame';

    const sizeClass =
      size === 'compact'
        ? 'w-28 aspect-[5/8] rounded-sm'
        : size === 'side-by-side'
          ? 'w-[192px] sm:w-[210px] aspect-[5/8] rounded-sm'
          : 'w-[280px] sm:w-[300px] aspect-[5/8] rounded-sm';

    return (
      <div
        data-testid={`cover-preview-${kind}`}
        className={`relative overflow-hidden select-none shadow-md border border-slate-200 ${sizeClass}`}
        style={{
          background:
            imgSrc && !hasImgFailed
              ? '#0F172A'
              : `linear-gradient(150deg, ${variant.palettePrimary || variant.accentColor}, ${variant.paletteSecondary || '#0F172A'})`,
        }}
      >
        {imgSrc && !hasImgFailed && (
          <img
            src={imgSrc}
            alt={`${kind === 'kindle' ? 'Kindle-Cover' : 'Taschenbuch-Cover'} für ${book.title}`}
            referrerPolicy="no-referrer"
            onError={() => setFailedImages((prev) => ({ ...prev, [kind]: true }))}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Legibility Scrim */}
        <div
          className="absolute inset-0"
          style={{
            background:
              variant.textColor === 'light'
                ? `linear-gradient(to bottom, rgba(15,23,42,${Math.min(0.9, scrimAlpha + 0.18)}), rgba(15,23,42,${scrimAlpha * 0.3}) 55%, rgba(15,23,42,${Math.min(0.9, scrimAlpha + 0.22)}))`
                : `linear-gradient(to bottom, rgba(255,255,255,${Math.min(0.9, scrimAlpha + 0.18)}), rgba(255,255,255,${scrimAlpha * 0.2}) 50%, rgba(255,255,255,${Math.min(0.84, scrimAlpha + 0.12)}))`,
          }}
        />

        {/* Editorial Frame */}
        {variant.layout === 'frame' && (
          <div
            className="absolute inset-3 border pointer-events-none"
            style={{
              borderColor:
                variant.textColor === 'light'
                  ? 'rgba(255,255,255,0.45)'
                  : 'rgba(15,23,42,0.3)',
            }}
          />
        )}

        {/* Contrast Band */}
        {variant.layout === 'band' && (
          <div
            className="absolute inset-x-0 top-[7%] h-[36%]"
            style={{ backgroundColor: variant.accentColor }}
          />
        )}

        {/* Typography Layer */}
        <div
          className={`relative z-10 h-full flex flex-col justify-between ${
            size === 'compact'
              ? 'p-2.5'
              : size === 'side-by-side'
                ? 'px-5 py-6'
                : 'px-7 py-8'
          } ${alignCenter ? 'text-center items-center' : 'text-left items-start'}`}
        >
          <div
            className={
              size === 'compact' ? 'space-y-1' : size === 'side-by-side' ? 'space-y-1.5 pt-1 w-full' : 'space-y-2.5 pt-2 w-full'
            }
          >
            {variant.eyebrow && size !== 'compact' && (
              <div
                className={`${size === 'side-by-side' ? 'text-[8.5px]' : 'text-[10px]'} font-semibold tracking-wider uppercase`}
                style={{
                  color:
                    variant.layout === 'band' || variant.textColor === 'light'
                      ? 'rgba(255,255,255,0.86)'
                      : variant.accentColor,
                }}
              >
                {variant.eyebrow}
              </div>
            )}

            <div
              className={`${
                variant.titleFont === 'serif' ? 'font-serif' : 'font-sans'
              } font-semibold leading-[1.12] tracking-tight ${
                size === 'compact'
                  ? 'text-[11px]'
                  : size === 'side-by-side'
                    ? 'text-[19px]'
                    : 'text-[26px]'
              }`}
              style={{ color: isLightText ? '#FFFFFF' : '#0F172A' }}
            >
              {book.title || 'Buchtitel'}
            </div>

            {book.subtitle && size !== 'compact' && (
              <div
                className={`${size === 'side-by-side' ? 'text-[9.5px]' : 'text-[11px]'} leading-relaxed line-clamp-3`}
                style={{
                  color: isLightText ? 'rgba(255,255,255,0.88)' : '#334155',
                }}
              >
                {book.subtitle}
              </div>
            )}
          </div>

          <div
            className={`font-semibold tracking-wide ${
              size === 'compact' ? 'text-[8px]' : size === 'side-by-side' ? 'text-[10px]' : 'text-xs'
            }`}
            style={{
              color: variant.textColor === 'light' ? '#FFFFFF' : '#0F172A',
            }}
          >
            {book.author}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            Schritt 03 · Schwerpunkt {PILLARS[book.pillar].label} · Cover-Generator (Buch & Kindle getrennt)
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            Cover-Studio & Auto-Generator
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleDownload('cover-pdf')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === 'cover-pdf'
              ? 'Exportiert PDF...'
              : 'Buch-Cover KDP-Druck-PDF (.pdf)'}
          </button>
          <button
            type="button"
            onClick={() => handleDownload('paperback-wrap')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === 'paperback-wrap' ? 'Exportiert...' : 'Buch-Cover PNG'}
          </button>
          <button
            type="button"
            onClick={() => handleDownload('kindle')}
            disabled={exporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === 'kindle' ? 'Exportiert...' : 'Kindle-Cover PNG'}
          </button>
        </div>
      </div>

      {/* Generator Mode Bar: Mode A (Prompt Only) vs Mode B (Auto Complete Cover) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100">
          <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg self-start">
            <button
              type="button"
              onClick={() => handleModeSwitch('prompt-only')}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                generatorMode === 'prompt-only'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Modus A: Nur Cover-Prompt
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('auto-cover')}
              className={`inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                generatorMode === 'auto-cover'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              Modus B: Auto-Modus (Komplettes Cover)
            </button>
          </div>
          <span className="text-xs text-slate-500">
            {generatorMode === 'prompt-only'
              ? 'Erstellt getrennte Bild-Prompts für Taschenbuch & Kindle.'
              : 'Gestaltet zwei eigenständige Cover (Buch + Kindle) vollautomatisch.'}
          </span>
        </div>

        <fieldset
          disabled={readOnly}
          className={`flex flex-wrap items-center justify-between gap-3 ${readOnly ? 'opacity-65' : ''}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="cover-style-select" className="text-xs font-semibold text-slate-700">
              Stilrichtung:
            </label>
            <select
              id="cover-style-select"
              value={selectedStyleId}
              onChange={(e) => setSelectedStyleId(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
            >
              {COVER_STYLE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">

            {generatorMode === 'prompt-only' ? (
              <>
                <button
                  type="button"
                  onClick={handleApplyDeterministicPrompts}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  Sofort-Prompts laden
                </button>
                <button
                  type="button"
                  onClick={handleGeneratePromptsAi}
                  disabled={aiLoading || readOnly}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      KI schreibt Prompts...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      KI-Prompts für Buch & Kindle erstellen
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleInstantAutoCovers}
                  className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
                >
                  Sofort-Auto-Set (Buch & Kindle)
                </button>
                <button
                  type="button"
                  onClick={handleGenerateAutoCoversAi}
                  disabled={aiLoading || readOnly}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Auto-Modus gestaltet...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Komplettes Buch- & Kindle-Cover mit KI erstellen
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </fieldset>

        {error && (
          <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {statusMessage && (
          <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
            {statusMessage}
          </div>
        )}
      </div>

      {/* MODE A: Prompt-Only Workspace */}
      {generatorMode === 'prompt-only' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono text-slate-500 uppercase">
                  Prompt 1 · Print / Taschenbuch
                </div>
                <h2 className="text-sm font-semibold text-slate-900 mt-0.5">
                  Cover-Prompt für das gedruckte Buch
                </h2>
              </div>
              <button
                type="button"
                onClick={() => copyText('print-prompt', printPrompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap shrink-0"
              >
                {copiedKey === 'print-prompt' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Buch-Prompt kopieren
                  </>
                )}
              </button>
            </div>
            <textarea
              aria-label="Cover-Prompt für Taschenbuch"
              rows={6}
              readOnly={readOnly}
              value={printPrompt}
              onChange={(e) => updateCoverRoot({ imagePrompt: e.target.value })}
              className="w-full font-mono text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 focus:outline-none focus:border-blue-700"
            />
            <p className="text-xs text-slate-500">
              Optimiert für 2:3 Print-Umschläge mit ruhiger oberer Typografie-Zone und 300-DPI-Haptik.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono text-slate-500 uppercase">
                  Prompt 2 · Kindle E-Book (1600×2560)
                </div>
                <h2 className="text-sm font-semibold text-slate-900 mt-0.5">
                  Eigenständiger Cover-Prompt für die Kindle-Version
                </h2>
              </div>
              <button
                type="button"
                onClick={() => copyText('kindle-prompt', kindlePrompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md whitespace-nowrap shrink-0"
              >
                {copiedKey === 'kindle-prompt' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Kopiert
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Kindle-Prompt kopieren
                  </>
                )}
              </button>
            </div>
            <textarea
              aria-label="Cover-Prompt für Kindle"
              rows={6}
              readOnly={readOnly}
              value={kindlePrompt}
              onChange={(e) =>
                updateCoverRoot({
                  kindleVariant: { ...kindleVariant, imagePrompt: e.target.value },
                })
              }
              className="w-full font-mono text-xs leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3 focus:outline-none focus:border-blue-700"
            />
            <p className="text-xs text-slate-500">
              Optimiert für starke Kontraste und sofortige Erkennbarkeit in kleinen Amazon.de-Such-Thumbnails.
            </p>
          </div>

          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">Negative Prompt (für Bild-KIs)</span>
                <button
                  type="button"
                  onClick={() => copyText('neg-prompt', negativePrompt)}
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  {copiedKey === 'neg-prompt' ? 'Kopiert' : 'Kopieren'}
                </button>
              </div>
              <p className="font-mono text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5">
                {negativePrompt}
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-900">
                Typografie- & Kontrast-Empfehlung (Buch vs. Kindle)
              </span>
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-2.5 leading-relaxed">
                {book.cover.artDirectionNote || fallbackPrompts.typographyNote}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MAIN STUDIO GRID: Live Dual Preview + Edition Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Live Cover Preview Stage */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-900">Live-Cover-Vorschau</h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg flex-wrap">
              {(
                [
                  { id: 'compare', label: 'Buch & Kindle' },
                  { id: '3d', label: '3D-Taschenbuch' },
                  { id: 'kindle', label: 'Kindle-Front' },
                  { id: 'amazon', label: 'Amazon-Suche' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewMode(tab.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    previewMode === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stage Canvas */}
          <div className="min-h-[420px] flex items-center justify-center bg-[#F1F4F8] border border-slate-200/80 rounded-md p-5">
            {previewMode === 'compare' && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                    Taschenbuch (Print-Buch)
                  </div>
                  {renderCoverCanvas(printVariant, 'print', 'side-by-side')}
                </div>
                <div className="flex flex-col items-center gap-2.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-blue-800">
                    Kindle-Version (E-Book)
                  </div>
                  {renderCoverCanvas(kindleVariant, 'kindle', 'side-by-side')}
                </div>
              </div>
            )}

            {previewMode === 'kindle' && renderCoverCanvas(kindleVariant, 'kindle', 'normal')}

            {previewMode === '3d' && (
              <div className="book-3d-wrap py-4">
                <div className="book-3d-stage flex items-stretch shadow-2xl">
                  {/* Calculated Spine */}
                  <div
                    className="bg-slate-900 text-white flex items-center justify-center border-r border-white/15 shrink-0"
                    style={{ width: `${Math.max(22, Math.min(44, specs.spineWidthMm * 2.2))}px` }}
                  >
                    <span
                      className="text-[10px] font-medium tracking-wider whitespace-nowrap text-slate-200"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      {specs.spineTextAllowed ? book.cover.spineText : 'Rücken < 79 S.'}
                    </span>
                  </div>
                  {renderCoverCanvas(printVariant, 'print', 'normal')}
                </div>
              </div>
            )}

            {previewMode === 'amazon' && (
              <div className="w-full max-w-md bg-white border border-slate-200 rounded-md p-4 space-y-3">
                <div className="text-[11px] text-slate-500">
                  Thumbnail-Lesbarkeitstest des eigenständigen Kindle-Covers auf Amazon.de
                </div>
                <div className="flex items-start gap-4">
                  <div className="shrink-0">
                    {renderCoverCanvas(kindleVariant, 'kindle', 'compact')}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <div className="text-sm font-semibold text-slate-900 leading-snug">
                      {book.title}: {book.subtitle}
                    </div>
                    <div className="text-xs text-slate-600">von {book.author}</div>
                    <div className="text-xs text-slate-500 font-mono tabular-nums pt-1">
                      Kindle {book.kdp.ebookPriceEur.toFixed(2)} € · Taschenbuch{' '}
                      {book.kdp.paperbackPriceEur.toFixed(2)} €
                    </div>
                    <div className="text-[11px] text-slate-500 pt-1">
                      Das Kindle-Cover wird automatisch in Ihre finale EPUB-Datei eingebettet.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Calculated Paperback Wrap Specs */}
          <div className="grid grid-cols-3 gap-4 pt-2 border-t border-slate-200 text-xs">
            <div>
              <div className="text-slate-500">Buchrücken</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {specs.spineWidthMm} mm
              </div>
            </div>
            <div>
              <div className="text-slate-500">Komplett-Umschlag</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                {specs.fullWrapWidthMm} × {specs.fullWrapHeightMm} mm
              </div>
            </div>
            <div>
              <div className="text-slate-500">Kindle-Standard</div>
              <div className="font-mono font-semibold text-slate-900 tabular-nums mt-0.5">
                1600 × 2560 px
              </div>
            </div>
          </div>
        </div>

        {/* Right: Separate Print Book & Kindle Design Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
            {/* Edition Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Feinschliff pro Ausgabe
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Buch-Cover und Kindle-Cover lassen sich völlig unabhängig gestalten.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveEdition('print')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeEdition === 'print'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Buch (Print)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveEdition('kindle')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeEdition === 'kindle'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Kindle-Version
                </button>
              </div>
            </div>

            {/* Auto-Modus Vector Motifs */}
            <fieldset disabled={readOnly} className={`space-y-5 ${readOnly ? 'opacity-70' : ''}`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  Auto-Cover-Motive ({activeEdition === 'print' ? 'Taschenbuch' : 'Kindle'})
                </span>
                <label className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Eigenes Bild hochladen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="sr-only"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MOTIF_LIST.map((motif) => {
                  const selected =
                    Boolean(currentVariant.useGeneratedArtwork) &&
                    currentVariant.motifStyle === motif;
                  return (
                    <button
                      key={motif}
                      type="button"
                      onClick={() => handleSelectMotif(motif)}
                      className={`px-2.5 py-2 rounded-md border text-left text-xs font-medium transition-colors ${
                        selected
                          ? 'border-blue-700 bg-blue-50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {MOTIF_LABELS[motif]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curated Publisher Artworks */}
            <div>
              <span className="block text-xs font-semibold text-slate-700 mb-2">
                Oder klassisches Verlags-Fotomotiv wählen
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COVER_ARTWORKS.map((art) => {
                  const selected =
                    !currentVariant.useGeneratedArtwork &&
                    !currentVariant.customImageDataUrl &&
                    currentVariant.artworkId === art.id;
                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => {
                        setFailedImages((prev) => ({ ...prev, [activeEdition]: false }));
                        updateActiveVariant({
                          artworkId: art.id,
                          customImageDataUrl: undefined,
                          useGeneratedArtwork: false,
                          textColor: art.defaultTextColor,
                        });
                      }}
                      className={`px-2.5 py-1.5 rounded-md border text-left text-xs font-medium transition-colors ${
                        selected
                          ? 'border-blue-700 bg-blue-50/50 text-blue-900'
                          : 'border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {art.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout Template */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'editorial', label: 'Editorial' },
                  { id: 'minimal', label: 'Linksbündig' },
                  { id: 'frame', label: 'Rahmen' },
                  { id: 'band', label: 'Kontrast-Band' },
                ] as const
              ).map((layout) => (
                <button
                  key={layout.id}
                  type="button"
                  onClick={() => updateActiveVariant({ layout: layout.id as CoverLayoutStyle })}
                  className={`px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
                    currentVariant.layout === layout.id
                      ? 'border-blue-700 bg-blue-50 text-blue-900'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {layout.label}
                </button>
              ))}
            </div>

            {/* Typography & Contrast */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="cover-eyebrow" className="block text-xs font-semibold text-slate-700 mb-1">
                  Oberzeile ({activeEdition === 'print' ? 'Taschenbuch' : 'Kindle'})
                </label>
                <input
                  id="cover-eyebrow"
                  type="text"
                  value={currentVariant.eyebrow}
                  onChange={(e) => updateActiveVariant({ eyebrow: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <label htmlFor="cover-spine" className="block text-xs font-semibold text-slate-700 mb-1">
                  Buchrücken-Text (Taschenbuch)
                </label>
                <input
                  id="cover-spine"
                  type="text"
                  value={book.cover.spineText}
                  onChange={(e) => updateCoverRoot({ spineText: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
              </div>

              <div>
                <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Schriftstil & Kontrast
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateActiveVariant({ titleFont: 'serif' })}
                    className={`flex-1 py-1.5 text-xs border rounded-md ${
                      currentVariant.titleFont === 'serif'
                        ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    Serif
                  </button>
                  <button
                    type="button"
                    onClick={() => updateActiveVariant({ titleFont: 'sans' })}
                    className={`flex-1 py-1.5 text-xs border rounded-md ${
                      currentVariant.titleFont === 'sans'
                        ? 'border-blue-700 bg-blue-50 font-semibold text-blue-900'
                        : 'border-slate-200 text-slate-700'
                    }`}
                  >
                    Sans
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateActiveVariant({
                        textColor: currentVariant.textColor === 'dark' ? 'light' : 'dark',
                      })
                    }
                    className="flex-1 py-1.5 text-xs border border-slate-200 rounded-md text-slate-700 hover:bg-slate-50"
                  >
                    {currentVariant.textColor === 'dark' ? 'Dunkel' : 'Hell'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="cover-scrim"
                  className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5"
                >
                  <span>Kontrast-Schleier</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {currentVariant.scrimOpacity}%
                  </span>
                </label>
                <input
                  id="cover-scrim"
                  type="range"
                  min={0}
                  max={70}
                  value={currentVariant.scrimOpacity}
                  onChange={(e) =>
                    updateActiveVariant({ scrimOpacity: Number(e.target.value) })
                  }
                  className="w-full accent-blue-700"
                />
              </div>
            </div>

            {/* Accent Color & Paperback Finish */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Akzent:</span>
                {ACCENT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    aria-label={preset.label}
                    onClick={() => handleAccentChange(preset.value)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      currentVariant.accentColor === preset.value
                        ? 'border-slate-900 scale-110'
                        : 'border-white ring-1 ring-slate-300'
                    }`}
                    style={{ backgroundColor: preset.value }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Druck-Finish:</span>
                <button
                  type="button"
                  onClick={() => updateCoverRoot({ finish: 'matt' })}
                  className={`px-2.5 py-1 rounded border ${
                    book.cover.finish === 'matt'
                      ? 'border-blue-700 bg-blue-50 text-blue-900 font-medium'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Matt
                </button>
                <button
                  type="button"
                  onClick={() => updateCoverRoot({ finish: 'glaenzend' })}
                  className={`px-2.5 py-1 rounded border ${
                    book.cover.finish === 'glaenzend'
                      ? 'border-blue-700 bg-blue-50 text-blue-900 font-medium'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Glänzend
                </button>
              </div>
            </div>
            </fieldset>
          </div>

          {/* Back Cover Blurb & Art Direction Note */}
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div>
              <label htmlFor="back-cover-blurb" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Klappentext für Taschenbuch-Rückseite
              </label>
              <textarea
                id="back-cover-blurb"
                rows={4}
                disabled={readOnly}
                value={book.cover.backCoverBlurb}
                onChange={(e) => updateCoverRoot({ backCoverBlurb: e.target.value })}
                className="w-full px-3 py-2 text-xs leading-relaxed border border-slate-300 rounded-md focus:outline-none focus:border-blue-700 disabled:bg-slate-50 disabled:cursor-not-allowed"
              />
            </div>

            {currentVariant.artDirectionNote && (
              <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
                <span className="font-semibold text-slate-900">
                  Art-Direction ({activeEdition === 'print' ? 'Taschenbuch' : 'Kindle'}):{' '}
                </span>
                {currentVariant.artDirectionNote}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
