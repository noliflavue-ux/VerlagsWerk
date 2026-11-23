import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Layers,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import {
  AI_FEATURE_DEFINITIONS,
  AI_FEATURE_GROUPS,
  AI_PROVIDER_DEFINITIONS,
  BUILTIN_AI_MODELS,
  THINKING_PRESET_LABELS,
  type AiFeatureId,
  type AiModelRoutingConfig,
  type AiPresetId,
  type AiProviderAvailability,
  type AiProviderId,
  type AiThinkingPreset,
  addCustomModelProfile,
  applyAiModelPreset,
  applySingleModelToAllFeatures,
  createDefaultAiModelConfig,
  getAllModelProfiles,
  removeCustomModelProfile,
  resolveFeatureModel,
  validateCustomModelInput,
} from '../utils/aiModelConfig';

interface AiModelsViewProps {
  config: AiModelRoutingConfig;
  onChangeConfig: (next: AiModelRoutingConfig) => void;
}

interface ModelTestResult {
  status: 'testing' | 'ok' | 'error';
  message: string;
  latencyMs?: number;
}

const PRESET_CARDS: {
  id: AiPresetId;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'balanced',
    title: 'Ausgewogenes Verlags-Setup',
    subtitle: 'Gemini 4 Hydrogen als Basis mit abgestimmter Denktiefe je Aufgabe.',
    badge: 'Empfohlen',
    icon: Sparkles,
  },
  {
    id: 'speed',
    title: 'Maximal schnell & sparsam',
    subtitle: 'Flash Lite für Recherche, Co-Pilot, Checkliste & Cover; Hydrogen fürs Lektorat.',
    badge: 'Schnell',
    icon: Zap,
  },
  {
    id: 'editorial-deep',
    title: 'Präzisions-Lektorat',
    subtitle: 'Hohe Denktiefe für Buchkonzept, Gegenlesen, Analyse und KDP-Metadaten.',
    badge: 'Gründlich',
    icon: Layers,
  },
];

const DEFAULT_PROVIDER_STATUS: AiProviderAvailability[] = [
  { id: 'gemini', configured: true, envVar: 'GEMINI_API_KEY', note: 'Standard-Server-SDK' },
  { id: 'openai', configured: false, envVar: 'OPENAI_API_KEY', note: 'Server-Umgebungsvariable' },
  { id: 'anthropic', configured: false, envVar: 'ANTHROPIC_API_KEY', note: 'Server-Umgebungsvariable' },
  { id: 'ollama', configured: false, envVar: 'OLLAMA_BASE_URL', note: 'Lokaler Endpunkt' },
  { id: 'custom', configured: false, envVar: 'CUSTOM_LLM_BASE_URL', note: 'OpenAI-kompatibler Proxy' },
];

export function AiModelsView({ config, onChangeConfig }: AiModelsViewProps) {
  const [providers, setProviders] = useState<AiProviderAvailability[]>(DEFAULT_PROVIDER_STATUS);
  const [bulkModelId, setBulkModelId] = useState<string>('gemini-4-hydrogen');
  const [statusBanner, setStatusBanner] = useState<string>('');
  const [testResults, setTestResults] = useState<Partial<Record<AiFeatureId, ModelTestResult>>>({});

  // Custom model form state
  const [customLabel, setCustomLabel] = useState('');
  const [customProvider, setCustomProvider] = useState<AiProviderId>('ollama');
  const [customModelId, setCustomModelId] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/ai/providers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && Array.isArray(data.providers)) {
          setProviders(data.providers as AiProviderAvailability[]);
        }
      })
      .catch(() => {
        // Keep static fallback indicator if health request is unavailable
      });
    return () => {
      active = false;
    };
  }, []);

  const allProfiles = useMemo(() => getAllModelProfiles(config), [config]);

  const providerStatusMap = useMemo(() => {
    const map = new Map<AiProviderId, AiProviderAvailability>();
    for (const p of providers) {
      map.set(p.id, p);
    }
    return map;
  }, [providers]);

  const distinctModelCount = useMemo(() => {
    const ids = new Set(
      AI_FEATURE_DEFINITIONS.map((def) => resolveFeatureModel(config, def.id).modelId)
    );
    return ids.size;
  }, [config]);

  const handleFeatureModelChange = (featureId: AiFeatureId, modelProfileId: string) => {
    const profile = allProfiles.find((p) => p.id === modelProfileId);
    const current = config.bindings[featureId];
    onChangeConfig({
      ...config,
      bindings: {
        ...config.bindings,
        [featureId]: {
          modelProfileId,
          thinkingPreset: profile?.supportsThinking ? current.thinkingPreset : 'auto',
        },
      },
    });
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[featureId];
      return next;
    });
  };

  const handleFeatureThinkingChange = (
    featureId: AiFeatureId,
    thinkingPreset: AiThinkingPreset
  ) => {
    const current = config.bindings[featureId];
    onChangeConfig({
      ...config,
      bindings: {
        ...config.bindings,
        [featureId]: {
          ...current,
          thinkingPreset,
        },
      },
    });
  };

  const handleApplyPreset = (presetId: AiPresetId, label: string) => {
    onChangeConfig(applyAiModelPreset(config, presetId));
    setTestResults({});
    setStatusBanner(`Verlagsprofil „${label}“ auf alle 10 Funktionen angewendet.`);
  };

  const handleResetDefaults = () => {
    const defaults = createDefaultAiModelConfig();
    onChangeConfig({
      ...defaults,
      customModels: config.customModels,
    });
    setTestResults({});
    setStatusBanner('Standard-Modellzuordnung für alle Funktionen wiederhergestellt.');
  };

  const handleApplyBulkModel = () => {
    const target = allProfiles.find((p) => p.id === bulkModelId);
    if (!target) return;
    onChangeConfig(applySingleModelToAllFeatures(config, bulkModelId));
    setTestResults({});
    setStatusBanner(`Modell „${target.label}“ für alle 10 Studio-Funktionen hinterlegt.`);
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateCustomModelInput({
      label: customLabel,
      provider: customProvider,
      modelId: customModelId,
    });
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const { config: nextConfig, added } = addCustomModelProfile(config, {
      label: customLabel,
      provider: customProvider,
      modelId: customModelId,
      description: customDesc,
    });
    onChangeConfig(nextConfig);
    setBulkModelId(added.id);
    setCustomLabel('');
    setCustomModelId('');
    setCustomDesc('');
    setFormError('');
    setStatusBanner(
      `Eigenes Modell „${added.label}“ (${added.modelId}) wurde angelegt und steht jetzt in allen Funktions-Menüs bereit.`
    );
  };

  const handleRemoveCustomModel = (profileId: string, label: string) => {
    onChangeConfig(removeCustomModelProfile(config, profileId));
    if (bulkModelId === profileId) {
      setBulkModelId('gemini-4-hydrogen');
    }
    setStatusBanner(`Eigenes Modell „${label}“ entfernt. Zugewiesene Funktionen nutzen wieder den Standard.`);
  };

  const handleTestFeatureModel = async (featureId: AiFeatureId) => {
    const resolved = resolveFeatureModel(config, featureId);
    setTestResults((prev) => ({
      ...prev,
      [featureId]: { status: 'testing', message: 'Prüfe Verbindung...' },
    }));

    try {
      const res = await fetch('/api/ai/test-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelConfig: {
            provider: resolved.provider,
            modelId: resolved.modelId,
            thinkingPreset: resolved.thinkingPreset,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Modell-Test fehlgeschlagen.');
      }
      setTestResults((prev) => ({
        ...prev,
        [featureId]: {
          status: 'ok',
          latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
          message: `Verbunden (${data.modelId || resolved.modelId})`,
        },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [featureId]: {
          status: 'error',
          message: err instanceof Error ? err.message : 'Verbindungstest fehlgeschlagen.',
        },
      }));
    }
  };

  const geminiModels = BUILTIN_AI_MODELS.filter((m) => m.provider === 'gemini');
  const externalBuiltInModels = BUILTIN_AI_MODELS.filter((m) => m.provider !== 'gemini');

  return (
    <div className="max-w-6xl mx-auto space-y-8" data-testid="ai-models-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1.5">
          <div className="text-xs font-medium text-blue-700">
            Schritt 07 · Studio-Steuerung · Multi-Modell-Routing
          </div>
          <h1 className="font-serif text-3xl font-semibold text-slate-900 tracking-tight">
            KI-Modelle pro Funktion anbinden
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Legen Sie für jede Aufgabe im Verlags-Workflow das passende KI-Modell und die gewünschte
            Denktiefe fest – von schnellen Co-Pilot-Entwürfen bis zum präzisen Autoren-Lektorat.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-600 font-mono tabular-nums">
            <Cpu className="w-3.5 h-3.5 text-blue-700" />
            <span>10 Funktionen</span>
            <span aria-hidden="true">·</span>
            <span>{distinctModelCount} {distinctModelCount === 1 ? 'Modell' : 'Modelle'} aktiv</span>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Standard wiederherstellen
          </button>
        </div>
      </div>

      {statusBanner && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900"
        >
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
            {statusBanner}
          </span>
          <button
            type="button"
            onClick={() => setStatusBanner('')}
            className="text-blue-700 hover:text-blue-900 font-medium shrink-0"
          >
            Schließen
          </button>
        </div>
      )}

      {/* 1. Server-side Provider Status */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-700" />
              Angebundene Server-Provider
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Zugangsdaten werden ausschließlich serverseitig über Umgebungsvariablen (Settings &gt; Secrets bzw. .env) verwaltet – niemals im Browser.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Server-Proxy aktiv
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" data-testid="provider-status-grid">
          {providers.map((prov) => {
            const def = AI_PROVIDER_DEFINITIONS[prov.id];
            return (
              <div
                key={prov.id}
                className={`p-3 rounded-md border ${
                  prov.configured
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900">{def.shortLabel}</span>
                  <span
                    className={`text-[10.5px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${
                      prov.configured
                        ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        : 'text-slate-600 bg-white border-slate-200'
                    }`}
                  >
                    {prov.configured ? 'Bereit' : 'Env offen'}
                  </span>
                </div>
                <div className="mt-1.5 font-mono text-[10.5px] text-slate-600 truncate">
                  {prov.envVar}
                </div>
                <div className="mt-1 text-[11px] text-slate-500 leading-snug">
                  {prov.note}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 2. Quick Presets & Bulk Assignment */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            Schnellprofile & Sammelzuweisung
          </h2>
          <div className="flex items-center gap-2">
            <label htmlFor="bulk-model-select" className="text-xs text-slate-500 whitespace-nowrap">
              Alle Funktionen setzen auf:
            </label>
            <select
              id="bulk-model-select"
              value={bulkModelId}
              onChange={(e) => setBulkModelId(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 max-w-[240px]"
            >
              {allProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleApplyBulkModel}
              className="px-3 py-1.5 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
            >
              Übernehmen
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRESET_CARDS.map((preset) => {
            const Icon = preset.icon;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id, preset.title)}
                className="text-left p-4 bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-lg transition-colors space-y-1.5 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 group-hover:text-blue-900">
                    <Icon className="w-4 h-4 text-blue-700" />
                    {preset.title}
                  </span>
                  <span className="text-[10.5px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {preset.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{preset.subtitle}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Per-Function Model Assignment (10 Studio Functions across 4 Editorial Groups) */}
      <section className="space-y-5" data-testid="feature-bindings-section">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Modell-Anbindung nach Funktion
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Jede Änderung wird sofort gespeichert und bei der nächsten KI-Aktion automatisch an den Server übergeben.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {AI_FEATURE_GROUPS.map((group) => {
            const groupFeatures = AI_FEATURE_DEFINITIONS.filter((f) => f.group === group.id);
            return (
              <div
                key={group.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
                    <p className="text-xs text-slate-500">{group.description}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    {groupFeatures.length} Funktionen
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {groupFeatures.map((def) => {
                    const binding = config.bindings[def.id];
                    const resolved = resolveFeatureModel(config, def.id);
                    const profile = allProfiles.find((p) => p.id === binding.modelProfileId);
                    const supportsThinking = Boolean(profile?.supportsThinking);
                    const provStatus = providerStatusMap.get(resolved.provider);
                    const testState = testResults[def.id];

                    return (
                      <div
                        key={def.id}
                        data-testid={`feature-binding-${def.id}`}
                        className="px-5 py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4"
                      >
                        {/* Left Info */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-slate-900">
                              {def.label}
                            </span>
                            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {def.areaLabel}
                            </span>
                            {provStatus && !provStatus.configured && (
                              <span className="text-[10.5px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                {provStatus.envVar} auf Server erforderlich
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed">
                            {def.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                            <span>{def.endpointLabel}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-slate-600">
                              Aktiv: {AI_PROVIDER_DEFINITIONS[resolved.provider].shortLabel} / {resolved.modelId}
                            </span>
                          </div>
                        </div>

                        {/* Right Controls */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                          <div className="min-w-[240px]">
                            <label
                              htmlFor={`model-select-${def.id}`}
                              className="sr-only"
                            >
                              KI-Modell für {def.label}
                            </label>
                            <select
                              id={`model-select-${def.id}`}
                              aria-label={`KI-Modell für ${def.label}`}
                              value={binding.modelProfileId}
                              onChange={(e) => handleFeatureModelChange(def.id, e.target.value)}
                              className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                            >
                              <optgroup label="Google Gemini (Sofort einsatzbereit)">
                                {geminiModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                              </optgroup>
                              <optgroup label="Externe Server-Provider (.env / Secrets)">
                                {externalBuiltInModels.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.label}
                                  </option>
                                ))}
                              </optgroup>
                              {config.customModels.length > 0 && (
                                <optgroup label="Eigene angebundene Modelle">
                                  {config.customModels.map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.label} ({m.modelId})
                                    </option>
                                  ))}
                                </optgroup>
                              )}
                            </select>
                          </div>

                          <div className="w-full sm:w-[152px]">
                            <label
                              htmlFor={`thinking-select-${def.id}`}
                              className="sr-only"
                            >
                              Denktiefe für {def.label}
                            </label>
                            <select
                              id={`thinking-select-${def.id}`}
                              aria-label={`Denktiefe für ${def.label}`}
                              value={supportsThinking ? binding.thinkingPreset : 'auto'}
                              disabled={!supportsThinking}
                              onChange={(e) =>
                                handleFeatureThinkingChange(
                                  def.id,
                                  e.target.value as AiThinkingPreset
                                )
                              }
                              className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-2 text-slate-800 disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                            >
                              {supportsThinking ? (
                                (Object.keys(THINKING_PRESET_LABELS) as AiThinkingPreset[]).map(
                                  (level) => (
                                    <option key={level} value={level}>
                                      Denktiefe: {THINKING_PRESET_LABELS[level]}
                                    </option>
                                  )
                                )
                              ) : (
                                <option value="auto">Denktiefe: Standard</option>
                              )}
                            </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleTestFeatureModel(def.id)}
                            disabled={testState?.status === 'testing'}
                            aria-label={`Verbindung für ${def.label} testen`}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
                          >
                            {testState?.status === 'testing' ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                            Testen
                          </button>
                        </div>

                        {testState && testState.status !== 'testing' && (
                          <div className="xl:hidden w-full">
                            <div
                              className={`text-[11px] px-2.5 py-1.5 rounded border ${
                                testState.status === 'ok'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : 'bg-rose-50 border-rose-200 text-rose-900'
                              }`}
                            >
                              {testState.message}
                              {testState.latencyMs !== undefined ? ` · ${testState.latencyMs} ms` : ''}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Inline test result summary bar on desktop if any feature was tested */}
        {Object.entries(testResults).some(([, r]) => r && r.status !== 'testing') && (
          <div className="hidden xl:block bg-white border border-slate-200 rounded-lg p-4 space-y-2">
            <div className="text-xs font-semibold text-slate-900">Letzte Verbindungstests</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AI_FEATURE_DEFINITIONS.filter(
                (def) => testResults[def.id] && testResults[def.id]?.status !== 'testing'
              ).map((def) => {
                const res = testResults[def.id]!;
                return (
                  <div
                    key={def.id}
                    className={`text-xs px-3 py-2 rounded border flex items-center justify-between gap-2 ${
                      res.status === 'ok'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span className="font-medium truncate">{def.label}</span>
                    <span className="font-mono text-[11px] shrink-0">
                      {res.message}
                      {res.latencyMs !== undefined ? ` · ${res.latencyMs} ms` : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 4. Register Custom AI Model */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleAddCustomModel}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-700" />
              Eigenes KI-Modell anbinden
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Registrieren Sie zusätzliche Modell-IDs für Ihren Server-Provider (z. B. ein lokales Ollama-Modell,
              ein OpenAI-kompatibles Gateway-Modell oder eine spezialisierte Gemini-Variante).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label
                htmlFor="custom-model-label"
                className="block text-xs font-medium text-slate-700"
              >
                Anzeigename
              </label>
              <input
                id="custom-model-label"
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="z. B. Lokales Lektorat (Llama 3.2)"
                className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="custom-model-provider"
                className="block text-xs font-medium text-slate-700"
              >
                Server-Provider
              </label>
              <select
                id="custom-model-provider"
                value={customProvider}
                onChange={(e) => setCustomProvider(e.target.value as AiProviderId)}
                className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              >
                {(Object.keys(AI_PROVIDER_DEFINITIONS) as AiProviderId[]).map((pid) => (
                  <option key={pid} value={pid}>
                    {AI_PROVIDER_DEFINITIONS[pid].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="custom-model-id"
                className="block text-xs font-medium text-slate-700"
              >
                Modell-ID (API-Kennung)
              </label>
              <input
                id="custom-model-id"
                type="text"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder={AI_PROVIDER_DEFINITIONS[customProvider].modelPlaceholder}
                className="w-full font-mono text-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="custom-model-desc"
                className="block text-xs font-medium text-slate-700"
              >
                Einsatznotiz (optional)
              </label>
              <input
                id="custom-model-desc"
                type="text"
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="z. B. Für erste Rohfassungen ohne Cloud-Kosten"
                className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2">
            <span className="font-semibold text-slate-700">Server-Anbindung: </span>
            {AI_PROVIDER_DEFINITIONS[customProvider].description}{' '}
            <span className="font-mono text-slate-700">
              ({AI_PROVIDER_DEFINITIONS[customProvider].envHint})
            </span>
          </div>

          {formError && (
            <div
              role="alert"
              className="text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-md px-3 py-2"
            >
              {formError}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Modell anbinden
            </button>
          </div>
        </form>

        {/* Registered Custom Models List */}
        <div
          data-testid="custom-models-list"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Eigene angebundene Modelle ({config.customModels.length})
            </h2>
          </div>

          {config.customModels.length === 0 ? (
            <div className="p-4 rounded-md bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 leading-relaxed">
              Noch keine eigenen Modelle hinterlegt. Fügen Sie links z. B. ein lokales Ollama-Modell
              oder ein externes OpenAI-/Anthropic-Modell hinzu, um es gezielt einzelnen Funktionen zuzuweisen.
            </div>
          ) : (
            <div className="space-y-2.5">
              {config.customModels.map((model) => (
                <div
                  key={model.id}
                  className="p-3 rounded-md border border-slate-200 bg-slate-50/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {model.label}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 truncate">
                        {AI_PROVIDER_DEFINITIONS[model.provider].shortLabel} · {model.modelId}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomModel(model.id, model.label)}
                      aria-label={`Eigenes Modell '${model.label}' entfernen`}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {model.description && (
                    <p className="text-[11px] text-slate-500 leading-snug">{model.description}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onChangeConfig(applySingleModelToAllFeatures(config, model.id));
                      setStatusBanner(
                        `Eigenes Modell „${model.label}“ auf alle 10 Funktionen angewendet.`
                      );
                    }}
                    className="text-[11px] font-medium text-blue-700 hover:text-blue-900"
                  >
                    Für alle Funktionen übernehmen
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
