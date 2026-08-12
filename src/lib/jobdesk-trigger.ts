/**
 * Jobdesk Trigger Detector — same two-stage philosophy as note-trigger.ts:
 * a cheap regex prefilter first, an LLM classification call only when the
 * prefilter matches (see /api/classify-jobdesk-intent).
 *
 * Deliberately loose: only checks for a completion-related verb, NOT the
 * literal word "jobdesk"/"tugas" — real usage rarely says "jobdesk X is
 * done", people just say "X udah beres". Safety against false positives
 * comes from the classification step, which only fires when there's an
 * active shift with actual tasks to match against, and can return "none".
 */

const COMPLETE_VERB =
  /\bselesai\b|\bkelar\b|\bberes\b|\bdone\b|\budah\b|\bsudah\b|\bcomplete[d]?\b|\bfinish(?:ed)?\b|\bcentang(?:in)?\b|\bcheck(?:list)?\b/i;

export function mightBeJobdeskCommand(message: string): boolean {
  return COMPLETE_VERB.test(message);
}
