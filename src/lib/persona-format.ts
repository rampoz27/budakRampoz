export type Tone = 'friendly' | 'formal' | 'casual' | 'direct' | 'witty';
export type ThinkingStyle = 'step-by-step' | 'concise' | 'explain-reasoning' | 'just-answer';

export interface PersonaInput {
  nickname: string;
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
  nickname: '',
  tone: 'friendly',
  thinking_style: 'concise',
  custom_instructions: '',
};

// Builds the persona instructions prepended to a request.
//
// includeNickname defaults to true, but MUST be set to false when the
// model that's actually going to answer isn't the one the persona was
// configured for (e.g. a rate-limit fallback substituted a different
// model) — otherwise the fallback model ends up claiming an identity
// that belongs to a different model entirely.
export function buildPersonaPrompt(settings: PersonaInput, includeNickname = true): string {
  const parts = [TONE_TEXT[settings.tone], THINKING_TEXT[settings.thinking_style]];
  if (includeNickname && settings.nickname.trim()) {
    parts.unshift(
      `You go by the name "${settings.nickname.trim()}" in this conversation — introduce yourself with that name if it comes up, instead of your official model name.`
    );
  }
  if (settings.custom_instructions.trim()) {
    parts.push(settings.custom_instructions.trim());
  }
  return parts.join(' ');
}
