import { supabase } from './client';

export type AccountStatus = 'active' | 'inactive';

export interface BankAccountRow {
  id: string;
  user_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  screenshot_url: string | null;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface BankAccountInput {
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  screenshot_url: string;
  status: AccountStatus;
}

export async function fetchBankAccounts(): Promise<BankAccountRow[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Only "active" accounts — used to feed context to the AI, and to check
// quickly whether there's anything worth including at all.
export async function fetchActiveBankAccounts(limit = 50): Promise<BankAccountRow[]> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function hasAnyActiveAccounts(): Promise<boolean> {
  const { count, error } = await supabase
    .from('bank_accounts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createBankAccount(input: BankAccountInput): Promise<BankAccountRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('bank_accounts')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBankAccount(
  id: string,
  input: BankAccountInput
): Promise<BankAccountRow> {
  const { data, error } = await supabase
    .from('bank_accounts')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateAccountStatus(id: string, status: AccountStatus): Promise<void> {
  const { error } = await supabase.from('bank_accounts').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deleteBankAccount(id: string): Promise<void> {
  const { error } = await supabase.from('bank_accounts').delete().eq('id', id);
  if (error) throw error;
}

// ── Tokenization: keeps real account numbers out of any AI provider's
//    view entirely. The LLM only ever sees an opaque reference like
//    "{{ACC-a1b2c3d4}}" — never the real digits. Detokenization happens
//    purely client-side, at render time, using the account's own id.
const TOKEN_PATTERN = /\{\{ACC-([a-f0-9]{8})\}\}/gi;

export function tokenizeAccountsForContext(accounts: BankAccountRow[]): string {
  return accounts
    .map((a) => `${a.bank_name} — ${a.account_holder_name} — {{ACC-${a.id.slice(0, 8)}}}`)
    .join('\n');
}

// Swaps any {{ACC-xxxxxxxx}} tokens in `text` back to the real account
// number, matched against the given account list. Tokens with no
// matching account (e.g. it was deleted since) are left as-is.
export function detokenizeAccountRefs(text: string, accounts: BankAccountRow[]): string {
  return text.replace(TOKEN_PATTERN, (match, refCode: string) => {
    const account = accounts.find((a) => a.id.startsWith(refCode));
    return account ? account.account_number : match;
  });
}

// Safety net beyond just the system prompt: a model can still hallucinate
// a pseudo-token that LOOKS like "{{ACC-xxxxxxxx}}" but isn't actually one
// of ours — e.g. wrapping a real number the user themselves typed in that
// format. Any "{{ACC-...}}"-shaped text that ISN'T exactly 8 hex
// characters is stripped before it's ever shown or saved, regardless of
// what digits/characters got stuffed inside it.
const MALFORMED_TOKEN_PATTERN = /\{\{ACC-[^}]*\}\}/gi;
const VALID_TOKEN_PATTERN = /^\{\{ACC-[a-f0-9]{8}\}\}$/i;

export function sanitizeMalformedAccountTokens(text: string): string {
  return text.replace(MALFORMED_TOKEN_PATTERN, (match) =>
    VALID_TOKEN_PATTERN.test(match) ? match : '[rujukan tidak valid]'
  );
}
