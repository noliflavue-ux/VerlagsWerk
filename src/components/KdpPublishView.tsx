import React, { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  ShieldCheck,
} from 'lucide-react';
import type { BookProject, KdpAccountProfile } from '../types/book';
import {
  buildKdpCopySheetText,
  calculateKdpLayoutSpecs,
  calculateKdpRoyalties,
  countProjectWords,
  TRIM_SIZES,
  utf8ByteLength,
  validateKdpMetadata,
} from '../utils/kdpEngine';
import { PILLARS } from '../data/seedBooks';
import { FinalExportBundleCard } from './FinalExportBundleCard';

interface KdpPublishViewProps {
  book: BookProject;
  account: KdpAccountProfile;
  readOnly?: boolean;
  onUpdateBook: (updater: (prev: BookProject) => BookProject) => void;
  onUpdateAccount: (updater: (prev: KdpAccountProfile) => KdpAccountProfile) => void;
}

export function KdpPublishView({
  book,
  account,
  readOnly = false,
  onUpdateBook,
  onUpdateAccount,
}: KdpPublishViewProps) {
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab3'>('tab1');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const words = countProjectWords(book);
  const specs = calculateKdpLayoutSpecs(words, book.format, book.chapters.length);
  const royalties = calculateKdpRoyalties(specs.estimatedPages, book.kdp);
  const validation = validateKdpMetadata(book);
  const trim = TRIM_SIZES[book.format.trimSize];

  const copyText = (key: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleCopyAllKdp = () => {
    const fullSheet = buildKdpCopySheetText(book, account);
    copyText('all-kdp-sheet', fullSheet);
  };

  const handleDownloadPackage = (format: 'txt' | 'json') => {
    const slug =
      book.title
        .toLowerCase()
        .replace(/[^a-z0-9äöüß]+/g, '-')
        .replace(/^-|-$/g, '') || 'kdp-buch';
    const content =
      format === 'txt'
        ? buildKdpCopySheetText(book, account)
        : JSON.stringify({ account, book, specs, royalties }, null, 2);
    const mime =
      format === 'txt' ? 'text/plain;charset=utf-8' : 'application/json;charset=utf-8';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-kdp-kopiervorlage.${format}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleSyncProfileToBook = () => {
    const today = new Date().toISOString().slice(0, 10);
    onUpdateAccount((prev) => ({
      ...prev,
      connected: true,
      lastSyncedAt: today,
    }));
    if (!readOnly && account.penName.trim()) {
      onUpdateBook((prev) => ({ ...prev, author: account.penName.trim() }));
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2200);
  };

  const CopyFieldRow = ({
    fieldKey,
    label,
    value,
    helper,
    multiline = false,
  }: {
    fieldKey: string;
    label: string;
    value: string;
    helper?: string;
    multiline?: boolean;
  }) => (
    <div className="py-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-900">{label}</span>
          {helper && <span className="text-slate-500 font-mono text-[11px]">{helper}</span>}
        </div>
        {multiline ? (
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-2.5 max-h-44 overflow-y-auto">
            {value || '(noch nicht ausgefüllt)'}
          </pre>
        ) : (
          <div className="text-sm text-slate-800 break-words">
            {value || <span className="text-slate-400">(noch nicht ausgefüllt)</span>}
          </div>
        )}
      </div>
      <button
        type="button"
        disabled={!value}
        onClick={() => copyText(fieldKey, value)}
        aria-label={`${label} kopieren`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap shrink-0 self-start"
      >
        {copiedKey === fieldKey ? (
          <>
            <Check className="w-3.5 h-3.5 text-emerald-700" />
            Kopiert
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            Kopieren
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">
            Schritt 06 · Amazon KDP Übergabe & Verlagsprofil
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900">
            KDP-Konto-Schnittstelle & Kopiervorlage
          </h1>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyAllKdp}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 whitespace-nowrap"
          >
            {copiedKey === 'all-kdp-sheet' ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Komplette Kopiervorlage kopiert
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                Alle KDP-Daten kopieren
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPackage('txt')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Als .txt laden
          </button>
          <button
            type="button"
            onClick={() => handleDownloadPackage('json')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Übergabepaket (.json)
          </button>
        </div>
      </div>

      {/* Finale Ausgabe: 3 fertige KDP-Dateien */}
      <FinalExportBundleCard book={book} account={account} />

      {/* Section 1: Amazon KDP Account Bridge / Profile */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-blue-700" />
              <h2 className="text-base font-semibold text-slate-900">
                Amazon KDP-Verlagsprofil & Konto-Brücke
              </h2>
            </div>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Amazon KDP stellt aus Sicherheitsgründen keine öffentliche Direktschnittstelle für automatische Buch-Uploads bereit.
              Ihr verknüpftes Verlagsprofil synchronisiert hier alle Autoren-, Impressums-, Steuer- und Marktplatzdaten direkt in die 3-Tab-Kopiervorlage und öffnet Ihr KDP-Bücherregal für die 5-Minuten-Anlage.
            </p>
          </div>
          <a
            href="https://kdp.amazon.com/de_DE/bookshelf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
          >
            Amazon KDP Bookshelf öffnen
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="kdp-marketplace" className="block text-xs font-semibold text-slate-700 mb-1">
              Hauptmarktplatz
            </label>
            <select
              id="kdp-marketplace"
              value={account.primaryMarketplace}
              onChange={(e) =>
                onUpdateAccount((prev) => ({
                  ...prev,
                  primaryMarketplace: e.target.value as KdpAccountProfile['primaryMarketplace'],
                }))
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
            >
              <option value="Amazon.de">Amazon.de (DACH · EUR)</option>
              <option value="Amazon.com">Amazon.com (Global · USD)</option>
              <option value="Amazon.co.uk">Amazon.co.uk (UK · GBP)</option>
            </select>
          </div>

          <div>
            <label htmlFor="kdp-imprint" className="block text-xs font-semibold text-slate-700 mb-1">
              Verlagsname / Imprint
            </label>
            <input
              id="kdp-imprint"
              type="text"
              value={account.imprintName}
              onChange={(e) =>
                onUpdateAccount((prev) => ({ ...prev, imprintName: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
            />
          </div>

          <div>
            <label htmlFor="kdp-penname" className="block text-xs font-semibold text-slate-700 mb-1">
              Standard-Autorenname / Pseudonym
            </label>
            <input
              id="kdp-penname"
              type="text"
              value={account.penName}
              onChange={(e) =>
                onUpdateAccount((prev) => ({ ...prev, penName: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="kdp-address" className="block text-xs font-semibold text-slate-700 mb-1">
              Ladungsfähige Impressumsanschrift (für Drucksatz)
            </label>
            <input
              id="kdp-address"
              type="text"
              value={account.publisherAddress}
              onChange={(e) =>
                onUpdateAccount((prev) => ({ ...prev, publisherAddress: e.target.value }))
              }
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleSyncProfileToBook}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors"
            >
              {profileSaved ? 'Profil mit Manuskript synchronisiert' : 'Profil speichern & auf Buch anwenden'}
            </button>
          </div>
        </div>

        {/* Readiness Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck
              className={`w-4 h-4 ${
                validation.isReadyForKdp ? 'text-emerald-700' : 'text-amber-700'
              }`}
            />
            <span className="font-medium text-slate-900">
              {validation.isReadyForKdp
                ? 'Alle Pflichtfelder für die KDP-Anlage sind vollständig und regelkonform.'
                : `Noch zu prüfen: ${validation.missingRequiredFields.join(', ') || 'Zeichen- oder Byte-Limits prüfen'}`}
            </span>
          </div>
          <span className="font-mono text-slate-500 tabular-nums">
            Steuerstatus: {account.taxProfileStatus} · Sync: {account.lastSyncedAt || '–'}
          </span>
        </div>
      </section>

      {/* Section 2: 3-Tab Amazon KDP Copy Sheet */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Amazon KDP Anlage-Kopiervorlage (1:1 Reihenfolge wie im KDP-Portal)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Jedes Feld per Klick kopieren und direkt in die entsprechende Amazon-KDP-Maske einfügen.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
            {(
              [
                { id: 'tab1', label: '1. Buchdetails' },
                { id: 'tab2', label: '2. Buchinhalt' },
                { id: 'tab3', label: '3. Preise & Tantiemen' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* TAB 1: Buchdetails */}
        {activeTab === 'tab1' && (
          <div className="divide-y divide-slate-100">
            <CopyFieldRow
              fieldKey="lang"
              label="Sprache"
              value={book.kdp.language}
            />
            <CopyFieldRow
              fieldKey="title"
              label="Buchtitel"
              value={book.title}
              helper={`Gesamt mit Untertitel: ${validation.titleCombinedLength}/200 Zeichen`}
            />
            <CopyFieldRow
              fieldKey="subtitle"
              label="Untertitel"
              value={book.subtitle}
            />
            <CopyFieldRow
              fieldKey="series"
              label="Reihe & Bandnummer"
              value={
                book.kdp.seriesName
                  ? `${book.kdp.seriesName}${book.kdp.seriesNumber ? ` (Band ${book.kdp.seriesNumber})` : ''}`
                  : 'Keine Reihe'
              }
            />
            <CopyFieldRow
              fieldKey="author"
              label="Autor"
              value={book.author}
              helper={`Grundbedürfnis: ${PILLARS[book.pillar].label}`}
            />
            <CopyFieldRow
              fieldKey="desc-html"
              label="Buchbeschreibung (KDP-HTML)"
              value={book.kdp.descriptionHtml}
              helper={`${validation.descriptionLength}/4000 Zeichen`}
              multiline
            />
            <CopyFieldRow
              fieldKey="categories"
              label="KDP-Kategorien (bis zu 3)"
              value={book.kdp.categories.filter(Boolean).join('\n')}
              multiline
            />

            {/* 7 Individual Backend Keyword Copy Buttons */}
            <div className="py-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900">
                  7 Backend-Keywords (einzeln in die 7 KDP-Felder kopieren)
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyText('all-keywords', book.kdp.keywords.filter(Boolean).join('\n'))
                  }
                  className="text-xs font-medium text-blue-700 hover:text-blue-900"
                >
                  {copiedKey === 'all-keywords' ? 'Alle 7 kopiert' : 'Alle 7 kopieren'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {book.kdp.keywords.map((kw, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-2 border border-slate-200 rounded-md bg-slate-50/60"
                  >
                    <div className="min-w-0">
                      <span className="font-mono text-[11px] text-slate-400 mr-2 tabular-nums">
                        {idx + 1}.
                      </span>
                      <span className="text-xs text-slate-800 break-all">
                        {kw || '(leer)'}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-slate-500 tabular-nums">
                        {utf8ByteLength(kw.trim())}/50 B
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!kw.trim()}
                      onClick={() => copyText(`kw-${idx}`, kw.trim())}
                      aria-label={`Keyword ${idx + 1} kopieren`}
                      className="text-xs font-medium text-blue-700 hover:text-blue-900 disabled:opacity-40 whitespace-nowrap shrink-0"
                    >
                      {copiedKey === `kw-${idx}` ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Buchinhalt */}
        {activeTab === 'tab2' && (
          <div className="space-y-5">
            {/* Editable KDP Content Disclosures */}
            <fieldset
              disabled={readOnly}
              className={`grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-200 ${
                readOnly ? 'opacity-75' : ''
              }`}
            >
              <div>
                <label htmlFor="kdp-ai-disclosure" className="block text-xs font-semibold text-slate-700 mb-1">
                  Amazon KDP KI-Offenlegung
                </label>
                <select
                  id="kdp-ai-disclosure"
                  value={book.kdp.aiGeneratedDisclosure}
                  onChange={(e) =>
                    onUpdateBook((prev) => ({
                      ...prev,
                      kdp: {
                        ...prev.kdp,
                        aiGeneratedDisclosure: e.target
                          .value as BookProject['kdp']['aiGeneratedDisclosure'],
                      },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
                >
                  <option value="ai-assisted">KI-unterstützt (redaktionell überarbeitet)</option>
                  <option value="ai-generated">KI-generiert (in KDP angeben)</option>
                  <option value="none">Keine KI-Inhalte</option>
                </select>
              </div>

              <div>
                <label htmlFor="kdp-isbn-mode" className="block text-xs font-semibold text-slate-700 mb-1">
                  ISBN-Verwaltung (Taschenbuch)
                </label>
                <select
                  id="kdp-isbn-mode"
                  value={book.kdp.isbnMode}
                  onChange={(e) =>
                    onUpdateBook((prev) => ({
                      ...prev,
                      kdp: {
                        ...prev.kdp,
                        isbnMode: e.target.value as 'kdp-free' | 'own-isbn',
                      },
                    }))
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-700"
                >
                  <option value="kdp-free">Kostenlose Amazon KDP-ISBN</option>
                  <option value="own-isbn">Eigene ISBN verwenden</option>
                </select>
              </div>

              {book.kdp.isbnMode === 'own-isbn' && (
                <div>
                  <label htmlFor="kdp-own-isbn" className="block text-xs font-semibold text-slate-700 mb-1">
                    Eigene ISBN-13
                  </label>
                  <input
                    id="kdp-own-isbn"
                    type="text"
                    value={book.kdp.ownIsbn}
                    onChange={(e) =>
                      onUpdateBook((prev) => ({
                        ...prev,
                        kdp: { ...prev.kdp, ownIsbn: e.target.value },
                      }))
                    }
                    placeholder="978-3-..."
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                  />
                </div>
              )}
            </fieldset>

            <div className="divide-y divide-slate-100">
              <CopyFieldRow
                fieldKey="trim"
                label="Druckformat (Trim-Größe)"
                value={trim.label}
              />
              <CopyFieldRow
                fieldKey="paper"
                label="Tinte & Papiertyp"
                value={
                  book.format.paperType === 'cream'
                    ? 'Schwarze Tinte auf cremefarbenem Papier'
                    : 'Schwarze Tinte auf weißem Papier'
                }
              />
              <CopyFieldRow
                fieldKey="bleed"
                label="Beschnitteinstellung & Cover-Finish"
                value={`${book.format.bleed ? 'Mit Anschnitt (Bleed)' : 'Ohne Anschnitt (No Bleed)'} · Cover-Finish: ${book.cover.finish === 'matt' ? 'Matt' : 'Glänzend'}`}
              />
              <CopyFieldRow
                fieldKey="spine-specs"
                label="Exakte Cover- & Satzmaße"
                value={`${specs.estimatedPages} Seiten · Buchrücken ${specs.spineWidthMm} mm · Bundsteg ${specs.insideMarginMm} mm · Komplett-Cover ${specs.fullWrapWidthMm} × ${specs.fullWrapHeightMm} mm`}
              />
              <CopyFieldRow
                fieldKey="back-blurb"
                label="Klappentext (Buchrückseite)"
                value={book.cover.backCoverBlurb}
                multiline
              />
            </div>
          </div>
        )}

        {/* TAB 3: Buchpreise & Tantiemen */}
        {activeTab === 'tab3' && (
          <div className="space-y-6">
            <fieldset
              disabled={readOnly}
              className={`grid grid-cols-1 md:grid-cols-3 gap-4 pb-5 border-b border-slate-200 ${
                readOnly ? 'opacity-75' : ''
              }`}
            >
              <div>
                <label htmlFor="price-ebook" className="block text-xs font-semibold text-slate-700 mb-1">
                  Kindle eBook Listenpreis (EUR)
                </label>
                <input
                  id="price-ebook"
                  type="number"
                  step="0.10"
                  min="0.99"
                  max="199"
                  value={book.kdp.ebookPriceEur}
                  onChange={(e) =>
                    onUpdateBook((prev) => ({
                      ...prev,
                      kdp: { ...prev.kdp, ebookPriceEur: Number(e.target.value) || 0 },
                    }))
                  }
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-blue-700"
                />
                <div className="text-[11px] text-slate-500 mt-1">
                  {royalties.ebookPriceEligibleFor70
                    ? 'Für 70 % Tantieme qualifiziert (2,99 € – 9,99 €)'
                    : 'Außerhalb 2,99–9,99 €: automatisch 35 % Tantieme'}
                </div>
              </div>

              <div>
                <label htmlFor="price-paperback" className="block text-xs font-semibold text-slate-700 mb-1">
                  Taschenbuch Listenpreis (EUR)
                </label>
                <input
                  id="price-paperback"
                  type="number"
                  step="0.10"
                  min="3.00"
                  max="250"
                  value={book.kdp.paperbackPriceEur}
                  onChange={(e) =>
                    onUpdateBook((prev) => ({
                      ...prev,
                      kdp: { ...prev.kdp, paperbackPriceEur: Number(e.target.value) || 0 },
                    }))
                  }
                  className={`w-full px-3 py-2 text-sm font-mono tabular-nums border rounded-md focus:outline-none ${
                    royalties.paperbackPriceValid
                      ? 'border-slate-300 focus:border-blue-700'
                      : 'border-red-400 bg-red-50/40'
                  }`}
                />
                <div
                  className={`text-[11px] mt-1 font-mono tabular-nums ${
                    royalties.paperbackPriceValid ? 'text-slate-500' : 'text-red-700 font-semibold'
                  }`}
                >
                  Mindestpreis: {royalties.paperbackMinPriceEur.toFixed(2)} € (Druckkosten ca.{' '}
                  {royalties.paperbackPrintCostEur.toFixed(2)} €)
                </div>
              </div>

              <div className="flex flex-col justify-center">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={book.kdp.kdpSelectEnrolled}
                    onChange={(e) =>
                      onUpdateBook((prev) => ({
                        ...prev,
                        kdp: { ...prev.kdp, kdpSelectEnrolled: e.target.checked },
                      }))
                    }
                    className="rounded border-slate-300 text-blue-700"
                  />
                  KDP Select (Kindle Unlimited · 90 Tage Exklusivität)
                </label>
              </div>
            </fieldset>

            {/* Royalty Calculation Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-slate-200 rounded-md bg-slate-50/60">
                <div className="text-xs text-slate-500">Kindle eBook Tantieme</div>
                <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {royalties.ebookRoyaltyEur.toFixed(2)} €
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                  {(royalties.ebookRoyaltyRate * 100).toFixed(0)} % Satz pro Verkauf
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-md bg-slate-50/60">
                <div className="text-xs text-slate-500">Taschenbuch Tantieme</div>
                <div className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
                  {royalties.paperbackRoyaltyEur.toFixed(2)} €
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                  60 % abzgl. {royalties.paperbackPrintCostEur.toFixed(2)} € Druck
                </div>
              </div>

              <div className="p-4 border border-slate-200 rounded-md bg-slate-50/60">
                <div className="text-xs text-slate-500">Prognose bei 100 Verkäufen</div>
                <div className="font-mono text-2xl font-semibold text-blue-800 tabular-nums mt-1">
                  {(
                    royalties.ebookRoyaltyEur * 60 +
                    royalties.paperbackRoyaltyEur * 40
                  ).toFixed(0)}{' '}
                  €
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Mix: 60 % eBook · 40 % Taschenbuch
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              <CopyFieldRow
                fieldKey="pricing-summary"
                label="Preis- & Marktplatz-Kurzfassung"
                value={`Marktplatz: ${account.primaryMarketplace} | Kindle eBook: ${book.kdp.ebookPriceEur.toFixed(2)} EUR (${(royalties.ebookRoyaltyRate * 100).toFixed(0)} %) | Taschenbuch: ${book.kdp.paperbackPriceEur.toFixed(2)} EUR (60 %) | KDP Select: ${book.kdp.kdpSelectEnrolled ? 'Ja' : 'Nein'}`}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
