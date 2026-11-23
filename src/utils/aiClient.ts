import {
  type AiFeatureId,
  type AiModelRoutingConfig,
  type ResolvedAiModelPayload,
  createDefaultAiModelConfig,
  normalizeAiModelConfig,
  resolveFeatureModel,
} from './aiModelConfig';

export const AI_MODELS_STORAGE_KEY = 'verlagswerk_kdp_ai_models_v1';

export function loadAiModelConfig(): AiModelRoutingConfig {
  if (typeof window === 'undefined') return createDefaultAiModelConfig();
  try {
    const raw = window.localStorage.getItem(AI_MODELS_STORAGE_KEY);
    if (raw) {
      return normalizeAiModelConfig(JSON.parse(raw));
    }
  } catch {
    // Fallback to defaults on corrupted storage
  }
  return createDefaultAiModelConfig();
}

export function saveAiModelConfig(config: AiModelRoutingConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(AI_MODELS_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage quota errors
  }
}

export function getActiveFeatureModel(
  featureId: AiFeatureId,
  configOverride?: AiModelRoutingConfig
): ResolvedAiModelPayload {
  const cfg = configOverride || loadAiModelConfig();
  return resolveFeatureModel(cfg, featureId);
}

/**
 * Helper used across all studio components to invoke a server-side /api/ai/* route
 * while automatically attaching the user's configured AI model binding for that feature.
 */
export async function fetchAiFeature(
  endpoint: string,
  featureId: AiFeatureId,
  payload: Record<string, unknown>,
  configOverride?: AiModelRoutingConfig
): Promise<Response> {
  const modelConfig = getActiveFeatureModel(featureId, configOverride);
  return fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      modelConfig: {
        provider: modelConfig.provider,
        modelId: modelConfig.modelId,
        thinkingPreset: modelConfig.thinkingPreset,
      },
    }),
  });
}
