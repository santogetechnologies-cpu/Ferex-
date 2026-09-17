import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { generateUUID } from '../../utils/uuid';

export interface DestinationItem {
  id: string;
  name: string;
  code: string;
  flag: string;
  currency: string;
  authority: string;
  acronym: string;
  processing: string;
  fee: string;
  desk?: string;
  badge?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// ─── NO DEFAULT/MOCK DESTINATIONS ────────────────────────────────────────────
// All destinations/countries are managed exclusively via Supabase.
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'ferex_destinations_registry';

export async function getDestinations(): Promise<DestinationItem[]> {
  // ── Primary: Supabase DB ─────────────────────────────────────────────────
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true });

    if (!error && Array.isArray(data)) {
      try { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data)); } catch {}
      return data as DestinationItem[];
    }
  } catch (err) {
    console.warn('[getDestinations] DB unreachable, trying local cache:', err);
  }

  // ── Fallback: local cache when offline ───────────────────────────────────
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as DestinationItem[];
    }
  } catch {}

  return [];
}

export async function createDestination(payload: Omit<DestinationItem, 'id' | 'created_at' | 'updated_at'>): Promise<DestinationItem> {
  const newId = generateUUID();
  const cleanName = payload.name.trim();
  if (!cleanName) throw new Error('Destination name is required.');

  const newObj: DestinationItem = {
    id: newId,
    name: cleanName,
    code: (payload.code || cleanName.substring(0, 2)).trim().toUpperCase(),
    flag: payload.flag || '🌍',
    currency: payload.currency || 'EUR',
    authority: payload.authority || `${cleanName} Ministry of Education`,
    acronym: (payload.acronym || cleanName.substring(0, 4)).trim().toUpperCase(),
    processing: payload.processing || '15-30 Days',
    fee: payload.fee || '—',
    desk: payload.desk || `${cleanName} Desk`,
    badge: payload.badge || 'Accredited',
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let lastError: any = null;

  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('destinations').insert([newObj]);
    if (!error) { lastError = null; } else { lastError = error; console.warn('[createDestination] Admin insert failed:', error.message); }
  } catch (e) { lastError = e; console.warn('[createDestination] Admin client threw:', e); }

  if (lastError) {
    try {
      const { error: anonErr } = await supabase.from('destinations').insert([newObj]);
      if (!anonErr) { lastError = null; } else { lastError = anonErr; console.error('[createDestination] Anon insert also failed:', anonErr.message); }
    } catch (e) { lastError = e; console.error('[createDestination] Anon client threw:', e); }
  }

  if (lastError) {
    throw new Error(`Failed to save destination to database: ${lastError.message || lastError}`);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const existing: DestinationItem[] = raw ? JSON.parse(raw) : [];
    const updated = [newObj, ...existing.filter(d => d.id !== newId && d.name.toLowerCase().trim() !== cleanName.toLowerCase())];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
  return newObj;
}

export async function updateDestination(id: string, payload: Partial<DestinationItem>): Promise<DestinationItem | null> {
  const updatedPayload = { ...payload, updated_at: new Date().toISOString() };
  let resultObj: DestinationItem | null = null;
  let lastError: any = null;

  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('destinations').update(updatedPayload).eq('id', id);
    if (!error) { lastError = null; } else { lastError = error; console.warn('[updateDestination] Admin update failed:', error.message); }
  } catch (e) { lastError = e; console.warn('[updateDestination] Admin client threw:', e); }

  if (lastError) {
    try {
      const { error: anonErr } = await supabase.from('destinations').update(updatedPayload).eq('id', id);
      if (!anonErr) { lastError = null; } else { lastError = anonErr; console.error('[updateDestination] Anon update failed:', anonErr.message); }
    } catch (e) { lastError = e; console.error('[updateDestination] Anon client threw:', e); }
  }

  if (lastError) {
    throw new Error(`Failed to update destination: ${lastError.message || lastError}`);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const existing: DestinationItem[] = JSON.parse(raw);
      const updated = existing.map(d => {
        if (d.id === id) { resultObj = { ...d, ...updatedPayload }; return resultObj; }
        return d;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
  return resultObj;
}

export async function deleteDestination(id: string, name?: string): Promise<void> {
  let lastError: any = null;

  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('destinations').delete().eq('id', id);
    if (!error) { lastError = null; } else { lastError = error; console.warn('[deleteDestination] Admin delete failed:', error.message); }
  } catch (e) { lastError = e; console.warn('[deleteDestination] Admin client threw:', e); }

  if (lastError) {
    try {
      const { error: anonErr } = await supabase.from('destinations').delete().eq('id', id);
      if (!anonErr) { lastError = null; } else { lastError = anonErr; console.error('[deleteDestination] Anon delete failed:', anonErr.message); }
    } catch (e) { lastError = e; console.error('[deleteDestination] Anon client threw:', e); }
  }

  if (lastError) {
    throw new Error(`Failed to delete destination from database: ${lastError.message || lastError}`);
  }

  // Remove from local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const current: DestinationItem[] = JSON.parse(raw);
      const filtered = current.filter(d =>
        d.id !== id && (!name || d.name.toLowerCase().trim() !== name.toLowerCase().trim())
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function clearAllDestinations(): Promise<void> {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch {
    try {
      await supabase.from('destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {}
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem('ferex_registered_countries');
  } catch {}
  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
}
