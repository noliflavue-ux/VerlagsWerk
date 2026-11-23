import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_FEATURE_DEFINITIONS,
  addCustomModelProfile,
  applyAiModelPreset,
  applySingleModelToAllFeatures,
  createDefaultAiModelConfig,
  isDeprecatedGeminiModel,
  normalizeAiModelConfig,
  removeCustomModelProfile,
  resolveFeatureModel,
  validateCustomModelInput,
} from './aiModelConfig';

test('createDefaultAiModelConfig initializes all 10 studio functions on active Gemini models', () => {
  const cfg = createDefaultAiModelConfig();
  assert.equal(Object.keys(cfg.bindings).length, AI_FEATURE_DEFINITIONS.length);
  assert.equal(AI_FEATURE_DEFINITIONS.length, 10);

  const outline = resolveFeatureModel(cfg, 'outline');
  assert.equal(outline.provider, 'gemini');
  assert.equal(outline.modelId, 'gemini-4-hydrogen');
  assert.equal(isDeprecatedGeminiModel(outline.modelId), false);
});

test('applyAiModelPreset switches functions cleanly between speed, editorial-deep, and balanced profiles', () => {
  const base = createDefaultAiModelConfig();
  const speed = applyAiModelPreset(base, 'speed');
  assert.equal(resolveFeatureModel(speed, 'copilot-suggestions').modelId, 'gemini-3.1-flash-lite');
  assert.equal(resolveFeatureModel(speed, 'chapter-checklist').modelId, 'gemini-3.1-flash-lite');
  assert.equal(resolveFeatureModel(speed, 'revise-chapter').modelId, 'gemini-4-hydrogen');

  const deep = applyAiModelPreset(speed, 'editorial-deep');
  assert.equal(resolveFeatureModel(deep, 'revise-chapter').thinkingPreset, 'high');
  assert.equal(resolveFeatureModel(deep, 'outline').thinkingPreset, 'high');

  const allLite = applySingleModelToAllFeatures(deep, 'gemini-3.1-flash-lite');
  for (const def of AI_FEATURE_DEFINITIONS) {
    assert.equal(resolveFeatureModel(allLite, def.id).modelId, 'gemini-3.1-flash-lite');
  }
});

test('validateCustomModelInput rejects empty inputs, whitespace IDs, and deprecated Gemini 1.5/2.0 models', () => {
  assert.ok(validateCustomModelInput({ label: '', provider: 'gemini', modelId: 'gemini-4-hydrogen' }));
  assert.ok(validateCustomModelInput({ label: 'Test', provider: 'openai', modelId: 'gpt 4' }));
  assert.ok(validateCustomModelInput({ label: 'Alt', provider: 'gemini', modelId: 'gemini-1.5-pro' }));
  assert.ok(validateCustomModelInput({ label: 'Alt 2', provider: 'gemini', modelId: 'gemini-2.0-flash' }));
  assert.equal(
    validateCustomModelInput({ label: 'Lokales Llama', provider: 'ollama', modelId: 'llama3.2' }),
    null
  );
  assert.equal(
    validateCustomModelInput({ label: 'Flash Lite', provider: 'gemini', modelId: 'gemini-3.1-flash-lite' }),
    null
  );
});

test('addCustomModelProfile, assign, normalize, and removeCustomModelProfile fall back safely', () => {
  const base = createDefaultAiModelConfig();
  const { config: withCustom, added } = addCustomModelProfile(base, {
    label: 'Ollama Lektorat',
    provider: 'ollama',
    modelId: 'llama3.2',
    description: 'Lokal auf Studio-Rechner',
  });

  const assigned = {
    ...withCustom,
    bindings: {
      ...withCustom.bindings,
      'write-chapter': { modelProfileId: added.id, thinkingPreset: 'auto' as const },
    },
  };

  assert.equal(resolveFeatureModel(assigned, 'write-chapter').provider, 'ollama');
  assert.equal(resolveFeatureModel(assigned, 'write-chapter').modelId, 'llama3.2');

  // Round-trip normalize (as from localStorage) preserves valid custom model & drops deprecated ones
  const normalized = normalizeAiModelConfig({
    ...assigned,
    customModels: [
      ...assigned.customModels,
      {
        id: 'bad-old',
        label: 'Veraltet',
        provider: 'gemini',
        modelId: 'gemini-1.5-flash',
        description: '',
      },
    ],
  });
  assert.equal(normalized.customModels.length, 1);
  assert.equal(resolveFeatureModel(normalized, 'write-chapter').modelId, 'llama3.2');

  // Removing custom model automatically resets any function assigned to it back to default
  const afterRemove = removeCustomModelProfile(normalized, added.id);
  assert.equal(afterRemove.customModels.length, 0);
  assert.equal(resolveFeatureModel(afterRemove, 'write-chapter').modelId, 'gemini-4-hydrogen');
});
