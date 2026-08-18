export interface AIModel {
  id: string;
  name: string;
  provider: string;
  color: string;
  badge: string | null;
}

export const AI_MODELS: AIModel[] = [
  { id: 'gpt-4o', name: 'GPT-5.4 Mini', provider: 'OpenAI', color: '#10A37F', badge: 'Fast' },
  { id: 'gpt-4-turbo', name: 'GPT-5.4', provider: 'OpenAI', color: '#10A37F', badge: 'Smart' },
  // Commented out until ANTHROPIC_API_KEY is set in .env — uncomment to re-enable.
  // { id: 'claude-3-5-sonnet', name: 'Claude Sonnet 5', provider: 'Anthropic', color: '#D97706', badge: 'Best' },
  // { id: 'claude-3-haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic', color: '#D97706', badge: null },
  { id: 'gemini-pro', name: 'Gemini 3.6 Flash', provider: 'Google', color: '#4285F4', badge: 'Long ctx' },
  { id: 'qwen-27b', name: 'Qwen3.6 27B', provider: 'Groq', color: '#F55036', badge: 'Blazing fast' },
  { id: 'nemotron-3-ultra', name: 'Nemotron 3 Ultra', provider: 'NVIDIA (OpenRouter)', color: '#76B900', badge: 'Free tier' },
  { id: 'gpt-oss-120b-groq', name: 'GPT-OSS 120B', provider: 'Groq', color: '#F55036', badge: 'Reasoning' },
  { id: 'search-agent', name: 'AI Search Agent', provider: 'CodeMind', color: '#22C55E', badge: '2-step' },
  { id: 'simple-qa', name: 'Simple Q&A (Buatan Sendiri)', provider: 'Kamu', color: '#EAB308', badge: 'Eksperimental' },
  { id: 'simple-qa-js', name: 'Simple Q&A JS (Ensemble)', provider: 'Kamu', color: '#F59E0B', badge: 'Eksperimental' },
];
