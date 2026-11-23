export type AiProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'custom';

export type AiThinkingPreset = 'auto' | 'low' | 'medium' | 'high';

export type AiFeatureGroupId = 'concept' | 'writing' | 'quality' | 'publishing';

export type AiFeatureId =
  | 'outline'
  | 'research-books'
  | 'toc-from-promise'
  | 'write-chapter'
  | 'copilot-suggestions'
  | 'revise-chapter'
  | 'chapter-performance'
  | 'chapter-checklist'
  | 'cover'
  | 'kdp-marketing';

export type AiPresetId = 'balanced' | 'speed' | 'editorial-deep';

export interface AiModelProfile {
  id: string;
  label: string;
  provider: AiProviderId;
  modelId: string;
  description: string;
  supportsThinking?: boolean;
  isBuiltIn?: boolean;
}

export interface AiFeatureBinding {
  modelProfileId: string;
  thinkingPreset: AiThinkingPreset;
}

export interface AiModelRoutingConfig {
  bindings: Record<AiFeatureId, AiFeatureBinding>;
  customModels: AiModelProfile[];
}

export interface ResolvedAiModelPayload {
  provider: AiProviderId;
  modelId: string;
  thinkingPreset: AiThinkingPreset;
  profileId: string;
  label: string;
}

export interface AiFeatureDefinition {
  id: AiFeatureId;
  group: AiFeatureGroupId;
  label: string;
  areaLabel: string;
  description: string;
  endpointLabel: string;
  recommendedProfileId: string;
  recommendedThinking: AiThinkingPreset;
}

export interface AiProviderDefinition {
  id: AiProviderId;
  label: string;
  shortLabel: string;
  envHint: string;
  description: string;
  modelPlaceholder: string;
}

export interface AiProviderAvailability {
  id: AiProviderId;
  configured: boolean;
  envVar: string;
  note: string;
}

export const AI_PROVIDER_DEFINITIONS: Record<AiProviderId, AiProviderDefinition> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini (Standard)',
    shortLabel: 'Gemini',
    envHint: 'GEMINI_API_KEY',
    description: 'Direkt über das integrierte Server-SDK angebunden.',
    modelPlaceholder: 'z. B. gemini-4-hydrogen',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI-kompatibel (API)',
    shortLabel: 'OpenAI',
    envHint: 'OPENAI_API_KEY',
    description: 'Für GPT-Modelle oder OpenAI-kompatible Cloud-Endpunkte (serverseitig).',
    modelPlaceholder: 'z. B. gpt-4.1-mini',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    shortLabel: 'Anthropic',
    envHint: 'ANTHROPIC_API_KEY',
    description: 'Für Claude-Modelle über den serverseitigen Messages-Endpunkt.',
    modelPlaceholder: 'z. B. claude-sonnet-4-5',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama / Lokales Modell',
    shortLabel: 'Ollama',
    envHint: 'OLLAMA_BASE_URL',
    description: 'Lokale Modelle (Llama, Mistral, Qwen) über lokalen OpenAI-kompatiblen Endpunkt.',
    modelPlaceholder: 'z. B. llama3.2 oder mistral',
  },
  custom: {
    id: 'custom',
    label: 'Eigener OpenAI-Endpunkt',
    shortLabel: 'Custom',
    envHint: 'CUSTOM_LLM_BASE_URL',
    description: 'Beliebiger OpenRouter-, vLLM-, Azure- oder Firmen-Gateway-Endpunkt.',
    modelPlaceholder: 'z. B. mistralai/mistral-large',
  },
};

export const BUILTIN_AI_MODELS: AiModelProfile[] = [
  {
    id: 'gemini-4-hydrogen',
    label: 'Gemini 4 Hydrogen (Verlags-Standard)',
    provider: 'gemini',
    modelId: 'gemini-4-hydrogen',
    description: 'Ausgewogen für Buchkonzepte, Lektorat, strukturierte JSON-Analysen und flüssige Sachbuchprosa.',
    supportsThinking: true,
    isBuiltIn: true,
  },
  {
    id: 'gemini-3.1-flash-lite',
    label: 'Gemini 3.1 Flash Lite (Schnell & Sparsam)',
    provider: 'gemini',
    modelId: 'gemini-3.1-flash-lite',
    description: 'Sehr schnelle Antwortzeiten für Ideen-Recherche, Checklisten-Bausteine und Cover-Prompts.',
    supportsThinking: true,
    isBuiltIn: true,
  },
  {
    id: 'openai-gpt-4.1-mini',
    label: 'OpenAI GPT-4.1 mini (Server-Anbindung)',
    provider: 'openai',
    modelId: 'gpt-4.1-mini',
    description: 'Aktiv sobald OPENAI_API_KEY in den Server-Secrets hinterlegt ist.',
    supportsThinking: false,
    isBuiltIn: true,
  },
  {
    id: 'anthropic-claude-sonnet',
    label: 'Anthropic Claude Sonnet (Server-Anbindung)',
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-5',
    description: 'Aktiv sobald ANTHROPIC_API_KEY in den Server-Secrets hinterlegt ist.',
    supportsThinking: false,
    isBuiltIn: true,
  },
  {
    id: 'ollama-llama3.2',
    label: 'Ollama · Llama 3.2 (Lokal)',
    provider: 'ollama',
    modelId: 'llama3.2',
    description: 'Aktiv sobald OLLAMA_BASE_URL serverseitig konfiguriert ist.',
    supportsThinking: false,
    isBuiltIn: true,
  },
];

export const AI_FEATURE_GROUPS: {
  id: AiFeatureGroupId;
  label: string;
  description: string;
}[] = [
  {
    id: 'concept',
    label: 'Konzept, Recherche & Struktur',
    description: 'Ideenfindung, Core-Promise-Positionierung und Kapitel-Inhaltsverzeichnisse',
  },
  {
    id: 'writing',
    label: 'Schreiben & Co-Pilot',
    description: 'Kapitelentwürfe und abschnittsweise Schreibvorschläge im Editor',
  },
  {
    id: 'quality',
    label: 'Lektorat & Qualitätsprüfung',
    description: 'Gegenlese-Korrekturen, Performance-Analyse und Kapitel-Checklisten',
  },
  {
    id: 'publishing',
    label: 'Cover & KDP-Vermarktung',
    description: 'Cover-Prompts, Auto-Cover-Art-Direction sowie KDP-Beschreibung & Keywords',
  },
];

export const AI_FEATURE_DEFINITIONS: AiFeatureDefinition[] = [
  {
    id: 'outline',
    group: 'concept',
    label: 'Buchkonzept & Gliederung',
    areaLabel: '01. Thema & Konzept',
    description: 'Entwickelt Titel, Untertitel, Kernversprechen und Kapitelstruktur aus Ihrer Buchidee.',
    endpointLabel: '/api/ai/outline',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'medium',
  },
  {
    id: 'research-books',
    group: 'concept',
    label: 'Buchideen-Recherche & Lucky Try',
    areaLabel: 'Neues Buch · Co-Pilot',
    description: 'Recherchiert kaufstarke KDP-Nischenvorschläge für Geld, Beziehung, Glück & Gesundheit.',
    endpointLabel: '/api/ai/research-books',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'low',
  },
  {
    id: 'toc-from-promise',
    group: 'concept',
    label: 'Inhaltsverzeichnis aus Core Promise',
    areaLabel: '02. Manuskript',
    description: 'Erzeugt strukturierte Kapitelpläne mit Teilen, Unterkapiteln und Core-Promise-Bezug.',
    endpointLabel: '/api/ai/toc-from-promise',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'medium',
  },
  {
    id: 'write-chapter',
    group: 'writing',
    label: 'Kapitel-Entwurf generieren',
    areaLabel: '02. Manuskript',
    description: 'Schreibt vollständige, druckreife Buchkapitel mit Kontinuität zum vorherigen Kapitel.',
    endpointLabel: '/api/ai/write-chapter',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'medium',
  },
  {
    id: 'copilot-suggestions',
    group: 'writing',
    label: 'Schreib-Co-Pilot (Textabschnitte)',
    areaLabel: '02. Manuskript · Co-Pilot',
    description: 'Liefert 3 gezielte Absatz-Alternativen pro Kapitel auf Basis des Core Promise.',
    endpointLabel: '/api/ai/copilot-suggestions',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'low',
  },
  {
    id: 'revise-chapter',
    group: 'quality',
    label: 'Autoren-Gegenlesen & Überarbeitung',
    areaLabel: '02. Manuskript · Gegenlesen',
    description: 'Arbeitet Ihre Anmerkungen und Korrekturwünsche präzise in den Kapiteltext ein.',
    endpointLabel: '/api/ai/revise-chapter',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'high',
  },
  {
    id: 'chapter-performance',
    group: 'quality',
    label: 'Performance-Analyse (Tiefenprüfung)',
    areaLabel: '02. Manuskript · Analyse',
    description: 'Prüft Lesbarkeit, Wortdichte und Core-Promise-Treue mit Textstellen-Markierung.',
    endpointLabel: '/api/ai/chapter-performance',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'medium',
  },
  {
    id: 'chapter-checklist',
    group: 'quality',
    label: 'Inhalts-Checkliste (Bausteine)',
    areaLabel: '02. Manuskript · Checkliste',
    description: 'Erstellt kapitelgenaue Hinweise und Ergänzungsbausteine für Einleitung, Praxis & Fazit.',
    endpointLabel: '/api/ai/chapter-checklist',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'low',
  },
  {
    id: 'cover',
    group: 'publishing',
    label: 'Cover-Studio (Prompts & Auto-Cover)',
    areaLabel: '03. Cover-Studio',
    description: 'Erzeugt getrennte Bild-Prompts sowie Art-Direction-Konzepte für Taschenbuch & Kindle.',
    endpointLabel: '/api/ai/cover-*',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'low',
  },
  {
    id: 'kdp-marketing',
    group: 'publishing',
    label: 'KDP-Marketing, Beschreibung & Keywords',
    areaLabel: '05. KDP-Marketing',
    description: 'Erstellt KDP-konforme HTML-Buchbeschreibungen, 7 Backend-Keywords und Kategorien.',
    endpointLabel: '/api/ai/kdp-marketing',
    recommendedProfileId: 'gemini-4-hydrogen',
    recommendedThinking: 'medium',
  },
];

export const THINKING_PRESET_LABELS: Record<AiThinkingPreset, string> = {
  auto: 'Auto',
  low: 'Niedrig (Schnell)',
  medium: 'Mittel (Ausgewogen)',
  high: 'Hoch (Präzise)',
};

const DEPRECATED_GEMINI_MODEL_IDS = new Set([
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-pro',
  'gemini-2.0-flash-thinking',
]);

export function isDeprecatedGeminiModel(modelId: string): boolean {
  const normalized = modelId.trim().toLowerCase();
  if (DEPRECATED_GEMINI_MODEL_IDS.has(normalized)) return true;
  if (normalized.startsWith('gemini-1.5-') || normalized.startsWith('gemini-2.0-')) return true;
  return false;
}

export function createDefaultAiModelConfig(): AiModelRoutingConfig {
  const bindings = {} as Record<AiFeatureId, AiFeatureBinding>;
  for (const def of AI_FEATURE_DEFINITIONS) {
    bindings[def.id] = {
      modelProfileId: def.recommendedProfileId,
      thinkingPreset: def.recommendedThinking,
    };
  }
  return {
    bindings,
    customModels: [],
  };
}

export function getAllModelProfiles(config: AiModelRoutingConfig): AiModelProfile[] {
  return [...BUILTIN_AI_MODELS, ...config.customModels];
}

export function normalizeAiModelConfig(raw: unknown): AiModelRoutingConfig {
  const defaults = createDefaultAiModelConfig();
  if (!raw || typeof raw !== 'object') return defaults;

  const candidate = raw as Partial<AiModelRoutingConfig>;
  const validProviders: AiProviderId[] = ['gemini', 'openai', 'anthropic', 'ollama', 'custom'];
  const validThinking: AiThinkingPreset[] = ['auto', 'low', 'medium', 'high'];

  const customModels: AiModelProfile[] = Array.isArray(candidate.customModels)
    ? candidate.customModels
        .filter((m): m is AiModelProfile => {
          if (!m || typeof m !== 'object') return false;
          if (!m.id || !m.label || !m.modelId) return false;
          if (!validProviders.includes(m.provider)) return false;
          if (m.provider === 'gemini' && isDeprecatedGeminiModel(m.modelId)) return false;
          return true;
        })
        .map((m) => ({
          id: String(m.id).trim(),
          label: String(m.label).trim(),
          provider: m.provider,
          modelId: String(m.modelId).trim(),
          description: String(m.description || '').trim(),
          supportsThinking: m.provider === 'gemini',
          isBuiltIn: false,
        }))
    : [];

  const allProfiles = [...BUILTIN_AI_MODELS, ...customModels];
  const validProfileIds = new Set(allProfiles.map((p) => p.id));

  const bindings = { ...defaults.bindings };
  if (candidate.bindings && typeof candidate.bindings === 'object') {
    for (const def of AI_FEATURE_DEFINITIONS) {
      const saved = candidate.bindings[def.id];
      if (saved && typeof saved === 'object') {
        const profileId =
          typeof saved.modelProfileId === 'string' && validProfileIds.has(saved.modelProfileId)
            ? saved.modelProfileId
            : def.recommendedProfileId;
        const thinkingPreset = validThinking.includes(saved.thinkingPreset)
          ? saved.thinkingPreset
          : def.recommendedThinking;
        bindings[def.id] = {
          modelProfileId: profileId,
          thinkingPreset,
        };
      }
    }
  }

  return {
    bindings,
    customModels,
  };
}

export function applyAiModelPreset(
  config: AiModelRoutingConfig,
  presetId: AiPresetId
): AiModelRoutingConfig {
  const nextBindings = { ...config.bindings };

  if (presetId === 'balanced') {
    for (const def of AI_FEATURE_DEFINITIONS) {
      nextBindings[def.id] = {
        modelProfileId: def.recommendedProfileId,
        thinkingPreset: def.recommendedThinking,
      };
    }
  } else if (presetId === 'speed') {
    const fastFeatures = new Set<AiFeatureId>([
      'research-books',
      'copilot-suggestions',
      'chapter-checklist',
      'cover',
      'toc-from-promise',
    ]);
    for (const def of AI_FEATURE_DEFINITIONS) {
      if (fastFeatures.has(def.id)) {
        nextBindings[def.id] = {
          modelProfileId: 'gemini-3.1-flash-lite',
          thinkingPreset: 'low',
        };
      } else {
        nextBindings[def.id] = {
          modelProfileId: 'gemini-4-hydrogen',
          thinkingPreset: 'low',
        };
      }
    }
  } else if (presetId === 'editorial-deep') {
    const deepFeatures = new Set<AiFeatureId>([
      'outline',
      'write-chapter',
      'revise-chapter',
      'chapter-performance',
      'kdp-marketing',
    ]);
    for (const def of AI_FEATURE_DEFINITIONS) {
      nextBindings[def.id] = {
        modelProfileId: 'gemini-4-hydrogen',
        thinkingPreset: deepFeatures.has(def.id) ? 'high' : 'medium',
      };
    }
  }

  return {
    ...config,
    bindings: nextBindings,
  };
}

export function applySingleModelToAllFeatures(
  config: AiModelRoutingConfig,
  modelProfileId: string
): AiModelRoutingConfig {
  const all = getAllModelProfiles(config);
  const target = all.find((p) => p.id === modelProfileId);
  if (!target) return config;

  const nextBindings = { ...config.bindings };
  for (const def of AI_FEATURE_DEFINITIONS) {
    nextBindings[def.id] = {
      modelProfileId: target.id,
      thinkingPreset: target.supportsThinking ? config.bindings[def.id].thinkingPreset : 'auto',
    };
  }
  return {
    ...config,
    bindings: nextBindings,
  };
}

export function resolveFeatureModel(
  config: AiModelRoutingConfig,
  featureId: AiFeatureId
): ResolvedAiModelPayload {
  const binding = config.bindings[featureId];
  const all = getAllModelProfiles(config);
  const profile =
    all.find((p) => p.id === binding?.modelProfileId) || BUILTIN_AI_MODELS[0];

  return {
    provider: profile.provider,
    modelId: profile.modelId,
    thinkingPreset: profile.supportsThinking ? binding?.thinkingPreset || 'auto' : 'auto',
    profileId: profile.id,
    label: profile.label,
  };
}

export function validateCustomModelInput(input: {
  label: string;
  provider: AiProviderId;
  modelId: string;
}): string | null {
  const label = input.label.trim();
  const modelId = input.modelId.trim();

  if (label.length < 2) {
    return 'Bitte geben Sie einen aussagekräftigen Anzeigenamen (mind. 2 Zeichen) an.';
  }
  if (modelId.length < 2) {
    return 'Bitte geben Sie eine gültige Modell-ID (z. B. gemini-4-hydrogen, gpt-4.1-mini oder llama3.2) an.';
  }
  if (/\s/.test(modelId)) {
    return 'Die Modell-ID darf keine Leerzeichen enthalten.';
  }
  if (input.provider === 'gemini' && isDeprecatedGeminiModel(modelId)) {
    return `Das Modell „${modelId}“ ist veraltet und wird nicht mehr unterstützt. Bitte verwenden Sie ein aktuelles Modell wie gemini-4-hydrogen oder gemini-3.1-flash-lite.`;
  }
  return null;
}

export function addCustomModelProfile(
  config: AiModelRoutingConfig,
  input: {
    label: string;
    provider: AiProviderId;
    modelId: string;
    description?: string;
  }
): { config: AiModelRoutingConfig; added: AiModelProfile } {
  const slug = input.modelId
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-');
  const added: AiModelProfile = {
    id: `custom-${input.provider}-${slug}-${Date.now().toString(36)}`,
    label: input.label.trim(),
    provider: input.provider,
    modelId: input.modelId.trim(),
    description:
      input.description?.trim() ||
      `Benutzerdefinierte Modell-Anbindung (${AI_PROVIDER_DEFINITIONS[input.provider].shortLabel}).`,
    supportsThinking: input.provider === 'gemini',
    isBuiltIn: false,
  };
  return {
    added,
    config: {
      ...config,
      customModels: [...config.customModels, added],
    },
  };
}

export function removeCustomModelProfile(
  config: AiModelRoutingConfig,
  profileId: string
): AiModelRoutingConfig {
  const nextCustom = config.customModels.filter((m) => m.id !== profileId);
  const nextBindings = { ...config.bindings };
  for (const def of AI_FEATURE_DEFINITIONS) {
    if (nextBindings[def.id]?.modelProfileId === profileId) {
      nextBindings[def.id] = {
        modelProfileId: def.recommendedProfileId,
        thinkingPreset: def.recommendedThinking,
      };
    }
  }
  return {
    bindings: nextBindings,
    customModels: nextCustom,
  };
}
