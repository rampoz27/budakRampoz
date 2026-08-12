import { supabase } from './client';
import {
  DEFAULT_PERSONA,
  type PersonaInput,
  type Tone,
  type ThinkingStyle,
} from '@/lib/persona-format';

// Re-exported so existing imports from '@/lib/supabase/ai-settings' keep
// working unchanged — the actual formatting logic now lives in
// '@/lib/persona-format' (shared with the server-side route).
export {
  buildPersonaPrompt,
  DEFAULT_PERSONA,
  TONE_OPTIONS,
  THINKING_STYLE_OPTIONS,
  type PersonaInput,
  type Tone,
  type ThinkingStyle,
} from '@/lib/persona-format';

export interface ModelPersonaRow {
  id: string;
  user_id: string;
  model_id: string;
  nickname: string;
  tone: Tone;
  thinking_style: ThinkingStyle;
  custom_instructions: string;
  updated_at: string;
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
    nickname: data.nickname ?? '',
    tone: data.tone,
    thinking_style: data.thinking_style,
    custom_instructions: data.custom_instructions,
  };
}

// Lightweight: just model_id -> nickname, for the ones that have a
// nickname set. Used by the chat's "call a model by name" addressing —
// fetched once per session rather than per message.
export async function fetchAllNicknames(): Promise<Record<string, string>> {
  const rows = await fetchAllPersonas();
  const map: Record<string, string> = {};
  for (const row of rows) {
    if (row.nickname && row.nickname.trim()) {
      map[row.model_id] = row.nickname.trim();
    }
  }
  return map;
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
