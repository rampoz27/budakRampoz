import { supabase } from './client';
//test
export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  title: string;
  content: string;
  tags: string[];
}

export interface MatchedNote {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

// Calls the standalone /api/embed route — keeps the Gemini API key
// server-side while letting client components request embeddings.
async function embedText(text: string, taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY') {
  const res = await fetch('/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, taskType }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to generate embedding.');
  return data.embedding as number[];
}

export async function fetchNotes(): Promise<NoteRow[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('id, user_id, title, content, tags, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createNote(input: NoteInput): Promise<NoteRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  // Embed title + content together so search matches on both.
  const embedding = await embedText(`${input.title}\n\n${input.content}`, 'RETRIEVAL_DOCUMENT');

  const { data, error } = await supabase
    .from('notes')
    .insert({ ...input, user_id: userData.user.id, embedding })
    .select('id, user_id, title, content, tags, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateNote(id: string, input: NoteInput): Promise<NoteRow> {
  const embedding = await embedText(`${input.title}\n\n${input.content}`, 'RETRIEVAL_DOCUMENT');

  const { data, error } = await supabase
    .from('notes')
    .update({ ...input, embedding })
    .eq('id', id)
    .select('id, user_id, title, content, tags, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// The core of the "second brain" behavior: given a piece of text (usually
// the user's latest chat message), find notes that are semantically
// related — even if they don't share any exact keywords.
export async function findRelevantNotes(
  queryText: string,
  matchCount = 3
): Promise<MatchedNote[]> {
  const embedding = await embedText(queryText, 'RETRIEVAL_QUERY');

  const { data, error } = await supabase.rpc('match_notes', {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: matchCount,
  });

  if (error) throw error;
  return data ?? [];
}
