/**
 * Shift-Start Trigger — a zero-latency regex check for messages like
 * "mulai shift", "start shift", "gas kerja". No LLM classification
 * needed here since the phrase space is narrow and "shift" rarely comes
 * up in unrelated casual chat, unlike "note".
 */

const START_SHIFT_PATTERN =
  /\b(?:mulai|start|gas)\b.*\b(?:shift|kerja|jaga)\b|\b(?:shift|kerja|jaga)\b.*\b(?:mulai|start|gas)\b/i;

export function mightBeStartShiftCommand(message: string): boolean {
  return START_SHIFT_PATTERN.test(message);
}
