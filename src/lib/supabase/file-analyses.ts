import { supabase } from './client';

export interface FileAnalysisRow {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  language: string;
  analysis: string;
  created_at: string;
}

export async function fetchFileAnalyses(): Promise<FileAnalysisRow[]> {
  const { data, error } = await supabase
    .from('file_analyses')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createFileAnalysis(input: {
  fileName: string;
  fileSize: number;
  language: string;
  analysis: string;
}): Promise<FileAnalysisRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('file_analyses')
    .insert({
      user_id: userData.user.id,
      file_name: input.fileName,
      file_size: input.fileSize,
      language: input.language,
      analysis: input.analysis,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFileAnalysis(id: string): Promise<void> {
  const { error } = await supabase.from('file_analyses').delete().eq('id', id);
  if (error) throw error;
}