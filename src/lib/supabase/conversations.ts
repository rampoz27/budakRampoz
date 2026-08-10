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