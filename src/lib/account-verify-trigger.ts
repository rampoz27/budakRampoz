/**
 * Account Verify Trigger — deliberately NOT LLM-based. Matching account
 * numbers is an exact-comparison task, not a language-understanding one,
 * and the AI structurally cannot do it anyway (it only ever sees tokenized
 * reference codes, never real numbers — see route.ts's accountsContext
 * instructions). This does the extraction + comparison directly against
 * the real stored numbers instead.
 */

const VERIFY_KEYWORD = /\b(cocok(?:kan|in)?|verifikasi|match(?:ing)?|validasi)\b/i;
const ACCOUNT_KEYWORD = /\b(rekening|akun bank)\b/i;

export function mightBeAccountVerifyCommand(message: string): boolean {
  return VERIFY_KEYWORD.test(message) && ACCOUNT_KEYWORD.test(message);
}

// Extracts candidate account numbers — sequences of 6+ digits — from free
// text (a pasted list, a table, a sentence, whatever).
export function extractCandidateNumbers(message: string): string[] {
  const matches = message.match(/\d{6,}/g);
  return matches ? Array.from(new Set(matches)) : [];
}
