import type { BookProject, CoverVariantDesign } from '../types/book';
import { COVER_ARTWORKS } from '../data/seedBooks';
import { calculateKdpLayoutSpecs, countProjectWords } from './kdpEngine';
import {
  generateEditorialCoverSvg,
  getKindleCoverVariant,
  getPrintCoverVariant,
  svgToDataUrl,
} from './coverDesigner';

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = words[0];

  for (let i = 1; i < words.length; i++) {
    const testLine = `${current} ${words[i]}`;
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export function resolveVariantImageSource(
  variant: CoverVariantDesign,
  kind: 'print' | 'kindle'
): string {
  if (variant.customImageDataUrl) {
    return variant.customImageDataUrl;
  }
  if (variant.useGeneratedArtwork && variant.motifStyle) {
    return svgToDataUrl(
      generateEditorialCoverSvg({
        motif: variant.motifStyle,
        primaryColor: variant.palettePrimary || (kind === 'kindle' ? '#0F1C36' : '#F3EFE7'),
        secondaryColor: variant.paletteSecondary || (kind === 'kindle' ? '#1E3A8A' : '#D8CEBE'),
        accentColor: variant.accentColor,
        variant: kind,
      })
    );
  }
  const artworkObj = COVER_ARTWORKS.find((a) => a.id === variant.artworkId);
  return artworkObj?.url || '';
}

function drawCoverFront(
  ctx: CanvasRenderingContext2D,
  project: BookProject,
  variant: CoverVariantDesign,
  img: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  // Base background
  ctx.fillStyle = variant.textColor === 'light' ? '#0F172A' : '#F8FAFC';
  ctx.fillRect(x, y, w, h);

  if (img) {
    const imgRatio = img.width / img.height;
    const boxRatio = w / h;
    let drawW = w;
    let drawH = h;
    let drawX = x;
    let drawY = y;
    if (imgRatio > boxRatio) {
      drawW = h * imgRatio;
      drawX = x - (drawW - w) / 2;
    } else {
      drawH = w / imgRatio;
      drawY = y - (drawH - h) / 2;
    }
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, variant.palettePrimary || variant.accentColor);
    grad.addColorStop(1, variant.paletteSecondary || '#0F172A');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }

  // Subtle legibility scrim
  const opacity = Math.max(0, Math.min(85, variant.scrimOpacity)) / 100;
  if (opacity > 0) {
    const scrimGrad = ctx.createLinearGradient(x, y, x, y + h);
    if (variant.textColor === 'light') {
      scrimGrad.addColorStop(0, `rgba(15, 23, 42, ${Math.min(0.9, opacity + 0.25)})`);
      scrimGrad.addColorStop(0.55, `rgba(15, 23, 42, ${opacity * 0.4})`);
      scrimGrad.addColorStop(1, `rgba(15, 23, 42, ${Math.min(0.92, opacity + 0.3)})`);
    } else {
      scrimGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(0.92, opacity + 0.25)})`);
      scrimGrad.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.3})`);
      scrimGrad.addColorStop(1, `rgba(255, 255, 255, ${Math.min(0.85, opacity + 0.15)})`);
    }
    ctx.fillStyle = scrimGrad;
    ctx.fillRect(x, y, w, h);
  }

  // Optional editorial frame or contrast band
  if (variant.layout === 'frame') {
    const pad = w * 0.055;
    ctx.strokeStyle =
      variant.textColor === 'light' ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.35)';
    ctx.lineWidth = Math.max(2, w * 0.0025);
    ctx.strokeRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  } else if (variant.layout === 'band') {
    ctx.fillStyle = variant.accentColor;
    ctx.fillRect(x, y + h * 0.075, w, h * 0.35);
  }

  const isLightText = variant.textColor === 'light' || variant.layout === 'band';
  const primaryText = isLightText ? '#FFFFFF' : '#0F172A';
  const secondaryText = isLightText ? 'rgba(255,255,255,0.88)' : '#334155';

  const titleFamily =
    variant.titleFont === 'serif'
      ? 'Fraunces, Georgia, serif'
      : '"Plus Jakarta Sans", sans-serif';
  const sansFamily = '"Plus Jakarta Sans", sans-serif';

  const padX = w * 0.1;
  const maxTextW = w - padX * 2;
  const alignCenter = variant.layout === 'editorial' || variant.layout === 'frame';
  ctx.textAlign = alignCenter ? 'center' : 'left';
  const textAnchorX = alignCenter ? x + w / 2 : x + padX;

  // Eyebrow
  if (variant.eyebrow.trim()) {
    ctx.font = `600 ${Math.round(w * 0.025)}px ${sansFamily}`;
    ctx.fillStyle =
      variant.layout === 'band' || variant.textColor === 'light'
        ? 'rgba(255,255,255,0.84)'
        : variant.accentColor;
    ctx.fillText(variant.eyebrow.trim(), textAnchorX, y + h * 0.135);
  }

  // Title
  const titleSize = Math.round(w * 0.082);
  ctx.font = `600 ${titleSize}px ${titleFamily}`;
  ctx.fillStyle = primaryText;
  const titleLines = wrapCanvasText(ctx, project.title, maxTextW);
  let cursorY = y + h * 0.21;
  titleLines.forEach((line) => {
    ctx.fillText(line, textAnchorX, cursorY);
    cursorY += titleSize * 1.12;
  });

  // Subtitle
  if (project.subtitle.trim()) {
    const subSize = Math.round(w * 0.031);
    ctx.font = `400 ${subSize}px ${sansFamily}`;
    ctx.fillStyle = secondaryText;
    const subLines = wrapCanvasText(ctx, project.subtitle, maxTextW).slice(0, 3);
    cursorY += subSize * 0.6;
    subLines.forEach((line) => {
      ctx.fillText(line, textAnchorX, cursorY);
      cursorY += subSize * 1.38;
    });
  }

  // Author bottom lockup
  const authorSize = Math.round(w * 0.034);
  ctx.font = `600 ${authorSize}px ${sansFamily}`;
  ctx.fillStyle = variant.textColor === 'light' ? '#FFFFFF' : '#0F172A';
  ctx.fillText(project.author, textAnchorX, y + h * 0.92);

  ctx.restore();
}

export async function renderCoverCanvas(
  project: BookProject,
  mode: 'kindle' | 'paperback-wrap'
): Promise<HTMLCanvasElement | null> {
  const variant =
    mode === 'kindle' ? getKindleCoverVariant(project) : getPrintCoverVariant(project);
  const src = resolveVariantImageSource(variant, mode === 'kindle' ? 'kindle' : 'print');
  const img = await loadImage(src);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (mode === 'kindle') {
    // Official KDP eBook ideal resolution: 1600 x 2560 px (1 : 1.6 ratio)
    canvas.width = 1600;
    canvas.height = 2560;
    drawCoverFront(ctx, project, variant, img, 0, 0, 1600, 2560);
  } else {
    // Paperback full wrap scaled to crisp exportable resolution proportional to KDP mm specs
    const specs = calculateKdpLayoutSpecs(
      countProjectWords(project),
      project.format,
      project.chapters.length
    );
    const scale = 2400 / specs.fullWrapHeightMm;
    const totalW = Math.round(specs.fullWrapWidthMm * scale);
    const totalH = 2400;
    const spineW = Math.max(44, Math.round(specs.spineWidthMm * scale));
    const sideW = Math.floor((totalW - spineW) / 2);

    canvas.width = totalW;
    canvas.height = totalH;

    // Back Cover
    ctx.fillStyle = variant.accentColor;
    ctx.fillRect(0, 0, sideW, totalH);
    ctx.fillStyle = 'rgba(15,23,42,0.78)';
    ctx.fillRect(0, 0, sideW, totalH);

    // Back Cover Blurb
    const pad = Math.round(sideW * 0.12);
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.font = `600 ${Math.round(sideW * 0.044)}px Fraunces, Georgia, serif`;
    const backTitleLines = wrapCanvasText(ctx, project.title, sideW - pad * 2);
    let backY = Math.round(totalH * 0.16);
    backTitleLines.forEach((line) => {
      ctx.fillText(line, pad, backY);
      backY += Math.round(sideW * 0.055);
    });

    ctx.font = `400 ${Math.round(sideW * 0.028)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    const blurbLines = wrapCanvasText(ctx, project.cover.backCoverBlurb, sideW - pad * 2);
    backY += 36;
    blurbLines.forEach((line) => {
      ctx.fillText(line, pad, backY);
      backY += Math.round(sideW * 0.042);
    });

    // Barcode placeholder safe-zone indicator (bottom right of back cover)
    const barW = Math.round(sideW * 0.34);
    const barH = Math.round(totalH * 0.12);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(sideW - pad - barW, totalH - pad - barH, barW, barH);
    ctx.fillStyle = '#64748B';
    ctx.font = `500 ${Math.round(sideW * 0.018)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(
      'KDP ISBN BARCODE-ZONE',
      sideW - pad - barW / 2,
      totalH - pad - barH / 2 + 8
    );

    // Spine
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(sideW, 0, spineW, totalH);
    if (specs.spineTextAllowed && project.cover.spineText.trim()) {
      ctx.save();
      ctx.translate(sideW + spineW / 2, totalH / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.min(34, Math.round(spineW * 0.45))}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillText(project.cover.spineText.trim(), 0, 0);
      ctx.restore();
    }

    // Front Cover (Print Book variant)
    drawCoverFront(
      ctx,
      project,
      variant,
      img,
      sideW + spineW,
      0,
      totalW - (sideW + spineW),
      totalH
    );
  }

  return canvas;
}

export async function renderCoverPngBytes(
  project: BookProject,
  mode: 'kindle' | 'paperback-wrap'
): Promise<Uint8Array | null> {
  const canvas = await renderCoverCanvas(project, mode);
  if (!canvas) return null;
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export interface RenderedCoverJpeg {
  bytes: Uint8Array;
  width: number;
  height: number;
}

/**
 * Renders the cover canvas as opaque JPEG bytes ready to be embedded via /Filter /DCTDecode
 * directly into a KDP-compliant PDF 1.4 document.
 */
export async function renderCoverJpegData(
  project: BookProject,
  mode: 'kindle' | 'paperback-wrap',
  quality = 0.92
): Promise<RenderedCoverJpeg | null> {
  const canvas = await renderCoverCanvas(project, mode);
  if (!canvas) return null;
  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const base64 = dataUrl.split(',')[1];
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return {
    bytes,
    width: canvas.width,
    height: canvas.height,
  };
}

export async function exportCoverPng(
  project: BookProject,
  mode: 'kindle' | 'paperback-wrap',
  customFilename?: string
): Promise<string | null> {
  const canvas = await renderCoverCanvas(project, mode);
  if (!canvas) return null;

  const link = document.createElement('a');
  const slug = project.title
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename =
    customFilename ||
    (mode === 'kindle'
      ? `${slug || 'buch'}-kindle-cover-1600x2560.png`
      : `${slug || 'buch'}-02-cover-taschenbuch.png`);
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
  return filename;
}
