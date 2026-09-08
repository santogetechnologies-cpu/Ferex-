import { supabase } from '../supabase';
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

const LOCAL_STORAGE_KEY = 'ferex_destinations_registry';

export async function getDestinations(): Promise<DestinationItem[]> {
  let dbDestinations: DestinationItem[] = [];
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && Array.isArray(data)) {
      dbDestinations = data as DestinationItem[];
    }
  } catch (err) {
    console.warn('[getDestinations DB Notice]:', err);
  }

  if (dbDestinations.length > 0) {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbDestinations));
    } catch {}
    return dbDestinations;
  }

  // Check local storage if offline or during transition
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  return [];
}

export async function createDestination(payload: Omit<DestinationItem, 'id' | 'created_at' | 'updated_at'>): Promise<DestinationItem> {
  const newId = generateUUID();
  const newObj: DestinationItem = {
    id: newId,
    name: payload.name.trim(),
    code: (payload.code || payload.name.substring(0, 2)).trim().toUpperCase(),
    flag: payload.flag || '🌍',
    currency: payload.currency || 'EUR',
    authority: payload.authority || `${payload.name} Ministry of Education`,
    acronym: payload.acronym || payload.name.substring(0, 4).toUpperCase(),
    processing: payload.processing || '15-30 Days',
    fee: payload.fee || '€50',
    desk: payload.desk || `${payload.name} Desk`,
    badge: payload.badge || 'Accredited',
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Supabase Insert
  try {
    await supabase.from('destinations').insert(newObj);
  } catch (err) {
    console.warn('[createDestination DB Warning]:', err);
  }

  // 2. Local Storage Sync
  try {
    const existing = await getDestinations();
    const updated = [newObj, ...existing.filter(d => d.id !== newId && d.name.toLowerCase() !== newObj.name.toLowerCase())];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
  return newObj;
}

export async function updateDestination(id: string, payload: Partial<DestinationItem>): Promise<DestinationItem | null> {
  const updatedPayload = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  // 1. Supabase Update
  try {
    await supabase.from('destinations').update(updatedPayload).eq('id', id);
  } catch (err) {
    console.warn('[updateDestination DB Warning]:', err);
  }

  // 2. Local Storage Update
  let resultObj: DestinationItem | null = null;
  try {
    const existing = await getDestinations();
    const updated = existing.map(d => {
      if (d.id === id) {
        resultObj = { ...d, ...updatedPayload };
        return resultObj;
      }
      return d;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
  return resultObj;
}

export async function deleteDestination(id: string, name?: string): Promise<void> {
  // 1. Supabase Delete
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabase.from('destinations').delete().eq('id', id);
    }
    if (name) {
      await supabase.from('destinations').delete().ilike('name', name.trim());
    }
  } catch (err) {
    console.warn('[deleteDestination DB Warning]:', err);
  }

  // 2. Local Storage Remove
  try {
    const existing = await getDestinations();
    const filtered = existing.filter(d => d.id !== id && (!name || d.name.toLowerCase() !== name.toLowerCase()));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function clearAllDestinations(): Promise<void> {
  try {
    await supabase.from('destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch {}
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem('ferex_registered_countries');
  } catch {}
  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
}
