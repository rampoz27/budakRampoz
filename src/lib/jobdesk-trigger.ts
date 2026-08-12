/**
 * Jobdesk Trigger Detector — same two-stage philosophy as note-trigger.ts:
 * a cheap regex prefilter first, an LLM classification call only when the
 * prefilter matches (see /api/classify-jobdesk-intent).
 */

const JOBDESK_KEYWORD = /\b(jobdesk|tugas|checklist|task)\b/i;
const COMPLETE_VERB =
  /\bselesai\b|\bkelar\b|\bberes\b|\bdone\b|\budah\b|\bsudah\b|\bcomplete[d]?\b|\bfinish(?:ed)?\b|\bcentang(?:in)?\b|\bcheck(?:list)?\b/i;

export function mightBeJobdeskCommand(message: string): boolean {
  return JOBDESK_KEYWORD.test(message) && COMPLETE_VERB.test(message);
}
