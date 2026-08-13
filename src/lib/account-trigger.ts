/**
 * Account Trigger Detector — same two-stage philosophy as note-trigger.ts:
 * cheap regex prefilter first, LLM classification only when it matches
 * (see /api/classify-account-intent, which extracts bank/name/number from
 * natural phrasing).
 */

const ACCOUNT_KEYWORD = /\b(rekening|akun bank)\b/i;
const ADD_VERB =
  /\b(?:ke)?tambah(?:kan|in)?\b|\b(?:ke)?masuk(?:kan|in)?\b|\bsimpe?n(?:in)?\b|\bcatat(?:kan|in)?\b|\badd\b|\bsave\b/i;

export function mightBeAccountCommand(message: string): boolean {
  return ACCOUNT_KEYWORD.test(message) && ADD_VERB.test(message);
}
