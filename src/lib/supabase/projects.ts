import { supabase } from './client';

export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tech_stack: string[];
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  name: string;
  description: string;
  tech_stack: string[];
  status: ProjectStatus;
}

export interface ProjectWithStats extends ProjectRow {
  conversationCount: number;
  lastActive: string | null;
}

export async function fetchProjects(): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Fetches every project alongside how many conversations point to it and
// when the most recent one was updated — computed from real data, not
// stored counters, so it's always accurate.
export async function fetchProjectsWithStats(): Promise<ProjectWithStats[]> {
  const projects = await fetchProjects();

  const { data: convRows, error } = await supabase
    .from('conversations')
    .select('project_id, updated_at');

  if (error) throw error;

  return projects.map((project) => {
    const related = (convRows ?? []).filter((c) => c.project_id === project.id);
    const lastActive = related.reduce<string | null>((latest, c) => {
      if (!latest || new Date(c.updated_at) > new Date(latest)) return c.updated_at;
      return latest;
    }, null);

    return {
      ...project,
      conversationCount: related.length,
      lastActive,
    };
  });
}

export async function createProject(input: ProjectInput): Promise<ProjectRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateProject(id: string, input: ProjectInput): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}