import { supabase } from './client';

export interface AlarmRow {
  id: string;
  user_id: string;
  label: string;
  alarm_time: string;
  fired_at: string | null;
  note_id: string | null;
  created_at: string;
}

export interface AlarmInput {
  label: string;
  alarm_time: string; // ISO 8601
  note_id?: string | null;
}

export async function fetchAlarms(): Promise<AlarmRow[]> {
  const { data, error } = await supabase
    .from('alarms')
    .select('*')
    .order('alarm_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Only alarms that haven't fired yet — used by the periodic checker.
export async function fetchPendingAlarms(): Promise<AlarmRow[]> {
  const { data, error } = await supabase
    .from('alarms')
    .select('*')
    .is('fired_at', null)
    .order('alarm_time', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createAlarm(input: AlarmInput): Promise<AlarmRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('alarms')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function markAlarmFired(id: string): Promise<void> {
  const { error } = await supabase
    .from('alarms')
    .update({ fired_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteAlarm(id: string): Promise<void> {
  const { error } = await supabase.from('alarms').delete().eq('id', id);
  if (error) throw error;
}
