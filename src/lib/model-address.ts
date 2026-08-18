import type { AIModel } from './models';

/**
 * Model Addressing — lets the user override which model answers for a
 * single message by naming it directly, e.g. "gemini, cek note pasaran
 * togel" or "Gem, ..." (if "Gem" was set as a custom nickname) —
 * regardless of what's currently selected in the dropdown.
 *
 * Deliberately requires a "," or ":" right after the name (not just the
 * word appearing anywhere) to avoid false positives like "gemini is
 * cool" being mistaken for addressing the model.
 */

// Built-in aliases, always recognized regardless of user settings. Add
// more here as new models are added — keys must be lowercase.
const BUILTIN_ALIASES: Record<string, string> = {
  gemini: 'gemini-pro',
  qwen: 'qwen-27b',
  nemotron: 'nemotron-3-ultra',
  'gpt oss': 'gpt-oss-120b-groq',
  'gpt-oss': 'gpt-oss-120b-groq',
  oss: 'gpt-oss-120b-groq',
  'search agent': 'search-agent',
  searchagent: 'search-agent',
  'model sendiri': 'simple-qa',
  'qa js': 'simple-qa-js',
  'model js': 'simple-qa-js',
  'simple qa': 'simple-qa',
  'qa bot': 'simple-qa',
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// `nicknames` is an optional model_id -> nickname map (from the user's
// per-model persona settings) — merged in alongside the built-ins so a
// custom nickname like "Gem" works exactly like "gemini" does.
export function detectAddressedModel(
  message: string,
  availableModels: AIModel[],
  nicknames?: Record<string, string>
): AIModel | null {
  const trimmed = message.trimStart();

  const aliasToModelId: Record<string, string> = { ...BUILTIN_ALIASES };
  if (nicknames) {
    for (const [modelId, nickname] of Object.entries(nicknames)) {
      aliasToModelId[nickname.toLowerCase()] = modelId;
    }
  }

  // Longest aliases first, so multi-word ones are checked before a
  // shorter overlapping fragment could match instead.
  const aliases = Object.keys(aliasToModelId).sort((a, b) => b.length - a.length);

  for (const alias of aliases) {
    const pattern = new RegExp(`^${escapeRegex(alias)}\\s*[,:]\\s*`, 'i');
    if (pattern.test(trimmed)) {
      const modelId = aliasToModelId[alias];
      const found = availableModels.find((m) => m.id === modelId);
      if (found) return found;
    }
  }

  return null;
}
