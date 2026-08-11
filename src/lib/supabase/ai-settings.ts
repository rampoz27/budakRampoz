import { supabase } from './client';

export type Tone = 'friendly' | 'formal' | 'casual' | 'direct' | 'witty';
export type ThinkingStyle = 'step-by-step' | 'concise' | 'explain-reasoning' | 'just-answer';

export interface ModelPersonaRow {
  id: string;
  user_id: string;
  model_id: string;
  tone: Tone;
  thinking_style: ThinkingStyle;
  custom_instructions: string;
  updated_at: string;
}

export interface PersonaInput {
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

export const DEFAULT_PERSONA: PersonaInput = {
  tone: 'friendly',
  thinking_style: 'concise',
  custom_instructions: '',
};

// Builds the persona instructions prepended to a request for a specific
// model — this is what makes each model's personality distinct.
export function buildPersonaPrompt(settings: PersonaInput): string {
  const parts = [TONE_TEXT[settings.tone], THINKING_TEXT[settings.thinking_style]];
  if (settings.custom_instructions.trim()) {
    parts.push(settings.custom_instructions.trim());
  }
  return parts.join(' ');
}

// Fetches every model persona the user has configured — used by the
// Settings page to show which models already have a custom persona.
export async function fetchAllPersonas(): Promise<ModelPersonaRow[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return [];

  const { data, error } = await supabase
    .from('ai_model_personas')
    .select('*')
    .eq('user_id', userData.user.id);

  if (error) throw error;
  return data ?? [];
}

// Fetches the persona for one specific model, falling back to sensible
// defaults if the user hasn't customized that model yet.
export async function fetchPersonaForModel(modelId: string): Promise<PersonaInput> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return DEFAULT_PERSONA;

  const { data, error } = await supabase
    .from('ai_model_personas')
    .select('*')
    .eq('user_id', userData.user.id)
    .eq('model_id', modelId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return DEFAULT_PERSONA;

  return {
    tone: data.tone,
    thinking_style: data.thinking_style,
    custom_instructions: data.custom_instructions,
  };
}

export async function savePersonaForModel(
  modelId: string,
  input: PersonaInput
): Promise<ModelPersonaRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('ai_model_personas')
    .upsert(
      { user_id: userData.user.id, model_id: modelId, ...input },
      { onConflict: 'user_id,model_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
