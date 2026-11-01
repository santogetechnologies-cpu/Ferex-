import { supabase } from '../supabase';

export function digitalChanged(table: string) {
  window.dispatchEvent(new Event(`ferex_${table}_change`));
}
export async function digitalList(table: string): Promise<any[]> {
  const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`${table}: ${error.message}`);
  return data || [];
}
export async function digitalInsert(table: string, payload: any): Promise<any> {
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw new Error(`${table}: ${error.message}`);
  digitalChanged(table);
  return data;
}
export async function digitalUpdate(table: string, id: string, updates: any): Promise<any> {
  const { id: _id, created_at: _created, client: _client, project: _project, ...fields } = updates;
  const { data, error } = await supabase.from(table).update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) throw new Error(`${table}: ${error.message}`);
  digitalChanged(table);
  return data;
}
export async function digitalDelete(table: string, id: string) {
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'Record not found or access denied');
  digitalChanged(table);
  return true;
}
export function requireText(value: unknown, name: string) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
}
export function requireAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error('Enter a valid non-negative amount');
}
