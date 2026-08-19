import { supabase } from './client';

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  model_id: string | null;
  project_id: string | null;
  last_message: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  // Cached "memory" of everything before the sliding window — history_summary
  // is the condensed text, history_summary_count is how many of the OLDEST
  // messages in this conversation are already folded into it. When
  // (total messages - window size) > history_summary_count, there are
  // newly-out-of-window messages that still need summarizing in.
  history_summary: string | null;
  history_summary_count: number;
}

export interface ConversationWithProject extends ConversationRow {
  project_name: string | null;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  model_id: string | null;
  created_at: string;
}

export async function fetchConversations(limit = 50): Promise<ConversationRow[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// Used by the "All Conversations" table — embeds the related project's
// name via Supabase's foreign-key join syntax, no manual stitching needed.
export async function fetchConversationsWithProjects(): Promise<ConversationWithProject[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*, project:projects(name)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: ConversationRow & { project: { name: string } | null }) => ({
    ...row,
    project_name: row.project?.name ?? null,
  }));
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createConversation(
  title: string,
  modelId: string,
  projectId: string | null = null
): Promise<ConversationRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userData.user.id, title, model_id: modelId, project_id: projectId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConversationProject(
  conversationId: string,
  projectId: string | null
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ project_id: projectId })
    .eq('id', conversationId);
  if (error) throw error;
}

// Saves the cached "memory" of everything older than the sliding window —
// called after /api/summarize-history folds newly-out-of-window messages
// into the running summary. summaryCount is a WATERMARK (how many of the
// oldest messages are now represented), not a delta — always pass the
// total, not an increment.
export async function updateConversationSummary(
  conversationId: string,
  summary: string,
  summaryCount: number
): Promise<void> {
  const { error } = await supabase
    .from('conversations')
    .update({ history_summary: summary, history_summary_count: summaryCount })
    .eq('id', conversationId);
  if (error) throw error;
}

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string,
  modelId: string | null
): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');
  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    user_id: userData.user.id,
    role,
    content,
    model_id: modelId,
  });
  if (error) throw error;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.from('conversations').delete().eq('id', conversationId);
  if (error) throw error;
}
