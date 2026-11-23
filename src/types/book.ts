export type PillarId = 'geld' | 'beziehung' | 'glueck' | 'gesundheit';

export type BookStatus = 'in-arbeit' | 'eingereicht';

export interface BookFormatChannels {
  kindleEbook: boolean;
  paperback: boolean;
  hardcover: boolean;
  audiobook: boolean;
}

export type WorkspaceStep =
  | 'overview'
  | 'concept'
  | 'manuscript'
  | 'cover'
  | 'format'
  | 'marketing'
  | 'publish'
  | 'models';

export type AnnotationCategory =
  | 'Inhaltlich'
  | 'Stil & Ton'
  | 'Beispiel / Fakten'
  | 'Kürzen / Erweitern';

export interface AuthorAnnotation {
  id: string;
  category: AnnotationCategory;
  quote: string;
  note: string;
  status: 'open' | 'applied';
  createdAt: string;
  resolutionNote?: string;
  resolvedAt?: string;
}

export interface Chapter {
  id: string;
  title: string;
  goal: string;
  content: string;
  previousContent?: string;
  lastRevisionSummary?: string;
  annotations: AuthorAnnotation[];
}

export type CoverLayoutStyle = 'editorial' | 'minimal' | 'frame' | 'band';

export type CoverMotifStyle =
  | 'arch'
  | 'waves'
  | 'botanical'
  | 'prism'
  | 'horizon'
  | 'monolith';

export type CoverGeneratorMode = 'prompt-only' | 'auto-cover';

export interface CoverVariantDesign {
  artworkId: string;
  customImageDataUrl?: string;
  useGeneratedArtwork?: boolean;
  motifStyle?: CoverMotifStyle;
  palettePrimary?: string;
  paletteSecondary?: string;
  layout: CoverLayoutStyle;
  eyebrow: string;
  titleFont: 'serif' | 'sans';
  textColor: 'light' | 'dark';
  accentColor: string;
  scrimOpacity: number;
  imagePrompt?: string;
  artDirectionNote?: string;
}

export interface CoverConfig extends CoverVariantDesign {
  backCoverBlurb: string;
  spineText: string;
  finish: 'matt' | 'glaenzend';
  generatorMode?: CoverGeneratorMode;
  promptStyle?: string;
  negativePrompt?: string;
  kindleVariant?: CoverVariantDesign;
}

export type TrimSizeId = '5x8' | '5.5x8.5' | '6x9' | 'a5';
export type PaperType = 'white' | 'cream';
export type BookFontFamily = 'Garamond' | 'Georgia' | 'Baskerville';

export interface FormatConfig {
  trimSize: TrimSizeId;
  paperType: PaperType;
  fontFamily: BookFontFamily;
  fontSizePt: number;
  lineHeight: number;
  includeTitlePage: boolean;
  includeImprint: boolean;
  includeToc: boolean;
  startChaptersOnRight: boolean;
  runningHeaders: boolean;
  pageNumbers: boolean;
  firstLineIndent: boolean;
  bleed: boolean;
}

export interface KdpMetadata {
  language: string;
  seriesName: string;
  seriesNumber: string;
  editionNumber: string;
  descriptionHtml: string;
  keywords: [string, string, string, string, string, string, string];
  categories: [string, string, string];
  readingAgeMin: string;
  readingAgeMax: string;
  adultContent: boolean;
  aiGeneratedDisclosure: 'ai-assisted' | 'ai-generated' | 'none';
  ebookPriceEur: number;
  paperbackPriceEur: number;
  royaltyPlanEbook: '70' | '35';
  kdpSelectEnrolled: boolean;
  isbnMode: 'kdp-free' | 'own-isbn';
  ownIsbn: string;
  subtitleSuggestions?: string[];
}

export interface KdpAccountProfile {
  connected: boolean;
  accountLabel: string;
  primaryMarketplace: 'Amazon.de' | 'Amazon.com' | 'Amazon.co.uk';
  authorLegalName: string;
  penName: string;
  imprintName: string;
  publisherAddress: string;
  taxProfileStatus: 'Hinterlegt (DE / USt-ID)' | 'Steuerfragebogen offen';
  defaultRoyaltyBank: string;
  lastSyncedAt?: string;
}

export interface BookProject {
  id: string;
  pillar: PillarId;
  title: string;
  subtitle: string;
  author: string;
  targetAudience: string;
  corePromise: string;
  tone: string;
  updatedAt: string;
  status?: BookStatus;
  submittedAt?: string;
  submittedNote?: string;
  formats?: BookFormatChannels;
  chapters: Chapter[];
  cover: CoverConfig;
  format: FormatConfig;
  kdp: KdpMetadata;
}

export interface PillarDefinition {
  id: PillarId;
  label: string;
  tagline: string;
  coreDesire: string;
  readerPainPoints: string[];
  recommendedCategories: [string, string, string];
  defaultArtworkUrl: string;
  defaultAccentColor: string;
}
