import type { BookProject, KdpAccountProfile } from '../types/book';
import {
  buildCoverPrintPdf,
  buildKindleEpub,
  buildKindleFormattedPdf,
  buildTrimmedManuscriptPdf,
} from './finalExporter';
import { renderCoverJpegData, renderCoverPngBytes } from './coverCanvas';

export interface DownloadedFileInfo {
  filename: string;
  sizeKb: string;
}

export function triggerBinaryDownload(
  bytes: Uint8Array,
  filename: string,
  mimeType: string
) {
  const safeBuffer = new Uint8Array(bytes.byteLength);
  safeBuffer.set(bytes);
  const blob = new Blob([safeBuffer.buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1400);
}

export async function downloadManuscriptPdf(
  book: BookProject,
  account: KdpAccountProfile
): Promise<DownloadedFileInfo> {
  const pdf = buildTrimmedManuscriptPdf(book, account);
  triggerBinaryDownload(pdf.bytes, pdf.filename, 'application/pdf');
  return {
    filename: pdf.filename,
    sizeKb: `${Math.max(1, Math.round(pdf.bytes.length / 1024))} KB`,
  };
}

export async function downloadCoverPrintPdf(
  book: BookProject
): Promise<DownloadedFileInfo> {
  const jpeg = await renderCoverJpegData(book, 'paperback-wrap', 0.92);
  const pdf = buildCoverPrintPdf(book, jpeg);
  triggerBinaryDownload(pdf.bytes, pdf.filename, 'application/pdf');
  return {
    filename: pdf.filename,
    sizeKb: `${Math.max(1, Math.round(pdf.bytes.length / 1024))} KB`,
  };
}

export async function downloadKindlePdf(
  book: BookProject,
  account: KdpAccountProfile
): Promise<DownloadedFileInfo> {
  const jpeg = await renderCoverJpegData(book, 'kindle', 0.92);
  const pdf = buildKindleFormattedPdf(book, account, jpeg);
  triggerBinaryDownload(pdf.bytes, pdf.filename, 'application/pdf');
  return {
    filename: pdf.filename,
    sizeKb: `${Math.max(1, Math.round(pdf.bytes.length / 1024))} KB`,
  };
}

export async function downloadKindleEpub(
  book: BookProject,
  account: KdpAccountProfile
): Promise<DownloadedFileInfo> {
  const kindleCoverBytes = await renderCoverPngBytes(book, 'kindle');
  const epub = buildKindleEpub(book, account, kindleCoverBytes);
  triggerBinaryDownload(epub.bytes, epub.filename, 'application/epub+zip');
  return {
    filename: epub.filename,
    sizeKb: `${Math.max(1, Math.round(epub.bytes.length / 1024))} KB`,
  };
}

export async function downloadAllKdpPdfs(
  book: BookProject,
  account: KdpAccountProfile
): Promise<{
  manuscript: DownloadedFileInfo;
  cover: DownloadedFileInfo;
  kindle: DownloadedFileInfo;
}> {
  const manuscript = await downloadManuscriptPdf(book, account);
  await new Promise((r) => setTimeout(r, 180));
  const cover = await downloadCoverPrintPdf(book);
  await new Promise((r) => setTimeout(r, 180));
  const kindle = await downloadKindlePdf(book, account);
  return { manuscript, cover, kindle };
}
