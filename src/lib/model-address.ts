import type { AIModel } from './models';

/**
 * Model Addressing — lets the user override which model answers for a
 * single message by naming it directly, e.g. "gemini, cek note pasaran
 * togel" — regardless of what's currently selected in the dropdown.
 *
 * Deliberately requires a "," or ":" right after the name (not just the
 * word appearing anywhere) to avoid false positives like "gemini is
 * cool" being mistaken for addressing the model.
 */

// Maps casual/spoken names to AI_MODELS ids. Add more aliases here as
// new models are added — keys must be lowercase.
const MODEL_ALIASES: Record<string, string> = {
  gemini: 'gemini-pro',
  llama: 'llama-3.3-70b',
  'gpt oss': 'gpt-oss-120b-groq',
  'gpt-oss': 'gpt-oss-120b-groq',
  oss: 'gpt-oss-120b-groq',
  'search agent': 'search-agent',
  searchagent: 'search-agent',
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectAddressedModel(message: string, availableModels: AIModel[]): AIModel | null {
  const trimmed = message.trimStart();

  // Longest aliases first, so "gpt oss" is checked before a shorter
  // overlapping fragment could match instead.
  const aliases = Object.keys(MODEL_ALIASES).sort((a, b) => b.length - a.length);

  for (const alias of aliases) {
    const pattern = new RegExp(`^${escapeRegex(alias)}\\s*[,:]\\s*`, 'i');
    if (pattern.test(trimmed)) {
      const modelId = MODEL_ALIASES[alias];
      const found = availableModels.find((m) => m.id === modelId);
      if (found) return found;
    }
  }

  return null;
}
