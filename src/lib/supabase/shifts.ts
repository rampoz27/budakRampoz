import { supabase } from './client';

export interface ShiftTemplateRow {
  id: string;
  user_id: string;
  name: string;
  start_time: string | null;
  end_time: string | null;
  jobdesks: string[];
  created_at: string;
  updated_at: string;
}

export interface ShiftTemplateInput {
  name: string;
  start_time: string;
  end_time: string;
  jobdesks: string[];
}

export interface ShiftTask {
  id: string;
  text: string;
  done: boolean;
  done_by: 'user' | 'ai' | null;
  done_at: string | null;
}

export interface ShiftSessionRow {
  id: string;
  user_id: string;
  shift_template_id: string | null;
  shift_name: string;
  tasks: ShiftTask[];
  started_at: string;
  ended_at: string | null;
}

export async function fetchShiftTemplates(): Promise<ShiftTemplateRow[]> {
  const { data, error } = await supabase
    .from('shift_templates')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createShiftTemplate(input: ShiftTemplateInput): Promise<ShiftTemplateRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('shift_templates')
    .insert({ ...input, user_id: userData.user.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateShiftTemplate(
  id: string,
  input: ShiftTemplateInput
): Promise<ShiftTemplateRow> {
  const { data, error } = await supabase
    .from('shift_templates')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteShiftTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('shift_templates').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchActiveShiftSession(): Promise<ShiftSessionRow | null> {
  const { data, error } = await supabase
    .from('shift_sessions')
    .select('*')
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchShiftHistory(limit = 20): Promise<ShiftSessionRow[]> {
  const { data, error } = await supabase
    .from('shift_sessions')
    .select('*')
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function startShiftSession(template: ShiftTemplateRow): Promise<ShiftSessionRow> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');

  const tasks: ShiftTask[] = template.jobdesks.map((text, i) => ({
    id: `task-${i}-${Date.now()}`,
    text,
    done: false,
    done_by: null,
    done_at: null,
  }));

  const { data, error } = await supabase
    .from('shift_sessions')
    .insert({
      user_id: userData.user.id,
      shift_template_id: template.id,
      shift_name: template.name,
      tasks,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSessionTasks(sessionId: string, tasks: ShiftTask[]): Promise<void> {
  const { error } = await supabase.from('shift_sessions').update({ tasks }).eq('id', sessionId);
  if (error) throw error;
}

export async function endShiftSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('shift_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) throw error;
}

// ── Time-based template matching (for "mulai shift" auto-detection) ──

function parseTimeToMinutes(time: string): number | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function isTimeInRange(nowMinutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes <= endMinutes) {
    // Normal same-day range, e.g. 08:00–20:00
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  // Overnight range, e.g. 20:00–08:00 (wraps past midnight)
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

// Returns every template whose start_time/end_time range covers the
// given moment (defaults to now). Templates missing valid times are
// skipped — they simply can't be auto-matched this way.
export function findTemplatesForCurrentTime(
  templates: ShiftTemplateRow[],
  at: Date = new Date()
): ShiftTemplateRow[] {
  const nowMinutes = at.getHours() * 60 + at.getMinutes();

  return templates.filter((t) => {
    if (!t.start_time || !t.end_time) return false;
    const start = parseTimeToMinutes(t.start_time);
    const end = parseTimeToMinutes(t.end_time);
    if (start === null || end === null) return false;
    return isTimeInRange(nowMinutes, start, end);
  });
}
