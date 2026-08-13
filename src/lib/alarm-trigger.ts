/**
 * Alarm Trigger Detector — same two-stage philosophy as note-trigger.ts:
 * cheap regex prefilter first, LLM classification only when it matches
 * (see /api/classify-alarm-intent, which also resolves natural time
 * expressions like "30 menit lagi" or "jam 3 sore" into an exact datetime).
 */

const ALARM_KEYWORD = /\b(ingatkan|ingetin|reminder|alarm|peringatan)\b/i;

export function mightBeAlarmCommand(message: string): boolean {
  return ALARM_KEYWORD.test(message);
}
