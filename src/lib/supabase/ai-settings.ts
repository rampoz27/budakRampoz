import { supabase } from './client';

export type Tone = 'friendly' | 'formal' | 'casual' | 'direct' | 'witty';
export type ThinkingStyle = 'step-by-step' | 'concise' | 'explain-reasoning' | 'just-answer';

export interface AiSettingsRow {
  user_id: string;
  tone: Tone;
  thinking_style: ThinkingStyle;
  custom_instructions: string;
  updated_at: string;
}

export interface AiSettingsInput {
  tone: Tone;
  thinking_style: ThinkingStyle;
  custom_instructions: string;
}

export const TONE_OPTIONS: { value: Tone; label: string; description: string }[] = [
  { value: 'friendly', label: 'Friendly', description: 'Warm and approachable, like a helpful colleague' },
  { value: 'formal', label: 'Formal', description: 'Professional and precise, minimal casual language' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational, like chatting with a friend' },
  { value: 'direct', label: 'Direct', description: 'Straight to the point, no fluff or pleasantries' },
  { value: 'witty', label: 'Witty', description: 'Adds light humor and personality where it fits' },
];

export const THINKING_STYLE_OPTIONS: { value: ThinkingStyle; label: string; description: string }[] = [
  { value: 'step-by-step', label: 'Step-by-step', description: 'Breaks reasoning into clear numbered steps' },
  { value: 'concise', label: 'Concise', description: 'Short answers, expands only when asked' },
  { value: 'explain-reasoning', label: 'Explain reasoning', description: 'Always shows the "why" behind an answer' },
  { value: 'just-answer', label: 'Just the answer', description: 'Skips explanation unless explicitly requested' },
];

const TONE_TEXT: Record<Tone, string> = {
  friendly: 'Use a warm, friendly, approachable tone.',
  formal: 'Use a formal, professional tone. Avoid casual language.',
  casual: 'Use a relaxed, casual, conversational tone.',
  direct: 'Be direct and to the point. Skip pleasantries and filler.',
  witty: 'Use a witty tone with light humor where appropriate, without undermining accuracy.',
};

const THINKING_TEXT: Record<ThinkingStyle, string> = {
  'step-by-step': 'Break down your reasoning into clear, numbered steps before giving the final answer.',
  concise: 'Keep answers concise. Only elaborate if the user asks for more detail.',
  'explain-reasoning': 'Always briefly explain the reasoning behind your answer, not just the answer itself.',
  'just-answer': 'Give the answer directly. Skip explanations unless the user explicitly asks for them.',
};

// Builds the persona instructions that get prepended to every AI request,
// regardless of which model/provider is selected — this is what keeps the
// personality consistent across model switches.
export function buildPersonaPrompt(settings: AiSettingsInput): string {
  const parts = [TONE_TEXT[settings.tone], THINKING_TEXT[settings.thinking_style]];
  if (settings.custom_instructions.trim()) {
    parts.push(settings.custom_instructions.trim());
  }
  return parts.join(' ');
}

const DEFAULT_SETTINGS: AiSettingsInput = {
  tone: 'friendly',
  thinking_style: 'concise',
  custom_instructions: '',
};

export async function fetchAiSettings(): Promise<AiSettingsRow | null> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data, error } = await supabase
    .from('ai_settings')
    .select('*')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchOrDefaultAiSettings(): Promise<AiSettingsInput> {
  const row = await fetchAiSettings();
  if (!row) return DEFAULT_SETTINGS;
  return {
    tone: row.tone,
    thinking_style: row.thinking_style,
    custom_instructions: row.custom_instructions,
  };
}

export async function saveAiSettings(input: AiSettingsInput): Promise<AiSettingsRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('ai_settings')
    .upsert({ user_id: userData.user.id, ...input })
    .select()
    .single();

  if (error) throw error;
  return data;
}
