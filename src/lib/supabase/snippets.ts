import { supabase } from './client';

export interface SnippetRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  language: string;
  code: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface SnippetInput {
  title: string;
  description: string;
  language: string;
  code: string;
  tags: string[];
}

export async function fetchSnippets(): Promise<SnippetRow[]> {
  const { data, error } = await supabase
    .from('snippets')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createSnippet(input: SnippetInput): Promise<SnippetRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('snippets')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSnippet(id: string, input: SnippetInput): Promise<SnippetRow> {
  const { data, error } = await supabase
    .from('snippets')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSnippet(id: string): Promise<void> {
  const { error } = await supabase.from('snippets').delete().eq('id', id);
  if (error) throw error;
}