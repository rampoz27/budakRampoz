import { supabase } from './client';

// Status checklist per baris katalog — dibalikin sebagai map { item_id:
// checked } biar gampang di-lookup di komponen (bukan array kayak
// tabel-tabel lain), soalnya cara makenya emang "cek 1 baris spesifik
// udah dicentang apa belum", bukan "tampilin daftar".
export async function fetchCatalogProgress(): Promise<Record<string, boolean>> {
  const { data, error } = await supabase.from('catalog_progress').select('item_id, checked');
  if (error) throw error;
  const map: Record<string, boolean> = {};
  (data ?? []).forEach((row) => {
    map[row.item_id] = row.checked;
  });
  return map;
}

export async function setCatalogItemChecked(itemId: string, checked: boolean): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('Not signed in');
  // upsert — baris belum tentu ada dulu (checklist kosong di awal), jadi
  // "insert kalau belum ada, update kalau udah ada" dalam 1 panggilan.
  const { error } = await supabase
    .from('catalog_progress')
    .upsert(
      { user_id: userData.user.id, item_id: itemId, checked, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,item_id' }
    );
  if (error) throw error;
}
