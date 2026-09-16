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

export const DEFAULT_STUDY_DESTINATIONS: DestinationItem[] = [
  {
    id: '11111111-0000-4000-a000-000000000001',
    name: 'Poland',
    code: 'PL',
    flag: '🇵🇱',
    currency: 'EUR',
    authority: 'Polish Ministry of Higher Education & Legalization',
    acronym: 'Legalization Desk',
    processing: '14-21 Days',
    fee: '€250',
    desk: 'Poland Admissions Desk',
    badge: 'Schengen Area',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000002',
    name: 'Germany',
    code: 'DE',
    flag: '🇩🇪',
    currency: 'EUR',
    authority: 'Akademische Prüfstelle (APS) & Uni-Assist',
    acronym: 'APS',
    processing: '30-45 Days',
    fee: '€150',
    desk: 'Germany Admissions Desk',
    badge: 'Excellence Hub',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000003',
    name: 'United Kingdom',
    code: 'GB',
    flag: '🇬🇧',
    currency: 'GBP',
    authority: 'UK Visas and Immigration (UKVI) & British Council',
    acronym: 'UKVI',
    processing: '15-20 Days',
    fee: '£350',
    desk: 'UK Admissions Desk',
    badge: 'Global Ivy',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000004',
    name: 'France',
    code: 'FR',
    flag: '🇫🇷',
    currency: 'EUR',
    authority: 'Campus France & Ministry of Higher Education',
    acronym: 'EEF',
    processing: '14-21 Days',
    fee: '€200',
    desk: 'France Admissions Desk',
    badge: 'European Leader',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000005',
    name: 'Canada',
    code: 'CA',
    flag: '🇨🇦',
    currency: 'CAD',
    authority: 'Immigration, Refugees and Citizenship Canada',
    acronym: 'IRCC',
    processing: '30-45 Days',
    fee: 'CAD $150',
    desk: 'Canada Admissions Desk',
    badge: 'PGWP Eligible',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000006',
    name: 'Switzerland',
    code: 'CH',
    flag: '🇨🇭',
    currency: 'CHF',
    authority: 'State Secretariat for Education, Research and Innovation',
    acronym: 'SERI',
    processing: '20-30 Days',
    fee: 'CHF 250',
    desk: 'Swiss Admissions Desk',
    badge: 'World Top Tier',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000007',
    name: 'Czech Republic',
    code: 'CZ',
    flag: '🇨🇿',
    currency: 'EUR',
    authority: 'Czech Republic Ministry of Education, Youth and Sports',
    acronym: 'MŠMT',
    processing: '15-30 Days',
    fee: '€100',
    desk: 'Czech Admissions Desk',
    badge: 'Central EU Hub',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000008',
    name: 'Italy',
    code: 'IT',
    flag: '🇮🇹',
    currency: 'EUR',
    authority: 'Italian Ministry of Foreign Affairs (CIMEA)',
    acronym: 'CIMEA',
    processing: '20-35 Days',
    fee: '€150',
    desk: 'Italy Admissions Desk',
    badge: 'Historic Excellence',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000009',
    name: 'Spain',
    code: 'ES',
    flag: '🇪🇸',
    currency: 'EUR',
    authority: 'Spanish Ministry of Universities (UNEDasiss)',
    acronym: 'UNED',
    processing: '15-30 Days',
    fee: '€120',
    desk: 'Spain Admissions Desk',
    badge: 'Mediterranean Gateway',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000010',
    name: 'Hungary',
    code: 'HU',
    flag: '🇭🇺',
    currency: 'EUR',
    authority: 'Hungarian Higher Education Accreditation',
    acronym: 'MAB',
    processing: '14-21 Days',
    fee: '€100',
    desk: 'Hungary Admissions Desk',
    badge: 'Schengen Area',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000011',
    name: 'Austria',
    code: 'AT',
    flag: '🇦🇹',
    currency: 'EUR',
    authority: 'Federal Ministry of Education, Science and Research',
    acronym: 'BMBWF',
    processing: '15-30 Days',
    fee: '€150',
    desk: 'Austria Admissions Desk',
    badge: 'Alpine Quality',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000012',
    name: 'Ireland',
    code: 'IE',
    flag: '🇮🇪',
    currency: 'EUR',
    authority: 'Quality and Qualifications Ireland (QQI)',
    acronym: 'QQI',
    processing: '15-20 Days',
    fee: '€200',
    desk: 'Ireland Admissions Desk',
    badge: 'Silicon Isle',
    is_active: true,
  }
];

const LOCAL_STORAGE_KEY = 'ferex_destinations_registry';
const DELETED_DESTS_KEY = 'ferex_deleted_destinations';
const PURGED_DESTS_KEY = 'ferex_destinations_purged';

function getDeletedDestKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_DESTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map((k: string) => String(k).toLowerCase().trim()) : []);
  } catch {
    return new Set();
  }
}

function addDeletedDestKey(id: string, name?: string) {
  try {
    const keys = getDeletedDestKeys();
    if (id) keys.add(id.toLowerCase().trim());
    if (name) keys.add(name.toLowerCase().trim());
    localStorage.setItem(DELETED_DESTS_KEY, JSON.stringify(Array.from(keys)));
  } catch {}
}

function removeDeletedDestKey(id: string, name?: string) {
  try {
    const keys = getDeletedDestKeys();
    if (id) keys.delete(id.toLowerCase().trim());
    if (name) keys.delete(name.toLowerCase().trim());
    localStorage.setItem(DELETED_DESTS_KEY, JSON.stringify(Array.from(keys)));
  } catch {}
}

function isJunkDestination(name: string): boolean {
  if (!name) return true;
  const lower = name.toLowerCase().trim();
  if (lower === 'india' || lower === 'nada' || lower.startsWith('ssss')) return true;
  return false;
}

export async function getDestinations(): Promise<DestinationItem[]> {
  const deletedKeys = getDeletedDestKeys();
  const isPurged = localStorage.getItem(PURGED_DESTS_KEY) === 'true';
  const destMap = new Map<string, DestinationItem>();

  // 1. SUPABASE DATABASE: Fetch live shared cloud rows
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && Array.isArray(data)) {
      data.forEach((d: any) => {
        if (d && d.name && !isJunkDestination(d.name)) {
          const key = d.name.toLowerCase().trim();
          destMap.set(key, d as DestinationItem);
        }
      });
    }
  } catch (err) {
    console.warn('[getDestinations DB Notice]:', err);
  }

  // 2. Check system_config catalog backup
  if (!isPurged) {
    try {
      const { data: cfg } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'ferex_destinations_catalog')
        .maybeSingle();

      if (cfg?.value && Array.isArray(cfg.value)) {
        cfg.value.forEach((d: any) => {
          if (d && d.name && !isJunkDestination(d.name)) {
            const key = d.name.toLowerCase().trim();
            if (!destMap.has(key)) {
              destMap.set(key, d as DestinationItem);
            }
          }
        });
      }
    } catch {}
  }

  // 3. Check local storage cache (merge in any locally added/edited destinations)
  if (!isPurged) {
    try {
      const local = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: any) => {
            if (d && d.name && !isJunkDestination(d.name)) {
              const key = d.name.toLowerCase().trim();
              if (!destMap.has(key)) {
                destMap.set(key, d as DestinationItem);
              }
            }
          });
        }
      }
    } catch {}
  }

  // 4. Fallback to default verified destinations ONLY on clean fresh setup
  if (destMap.size === 0 && !isPurged && deletedKeys.size === 0) {
    DEFAULT_STUDY_DESTINATIONS.forEach(d => {
      destMap.set(d.name.toLowerCase().trim(), d);
    });
  }

  // Filter out any explicitly deleted destinations
  const cleanList = Array.from(destMap.values()).filter(d => {
    if (!d || isJunkDestination(d.name)) return false;
    const idKey = (d.id || '').toLowerCase().trim();
    const nameKey = (d.name || '').toLowerCase().trim();
    if (deletedKeys.has(idKey) || deletedKeys.has(nameKey)) return false;
    return true;
  });

  // Sort alphabetically
  cleanList.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Mirror to local cache for instant renders
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cleanList));
  } catch {}

  return cleanList;
}

export async function createDestination(payload: Omit<DestinationItem, 'id' | 'created_at' | 'updated_at'>): Promise<DestinationItem> {
  const newId = generateUUID();
  const cleanName = payload.name.trim();

  // Remove from deleted list if re-added
  removeDeletedDestKey(newId, cleanName);
  try { localStorage.removeItem(PURGED_DESTS_KEY); } catch {}

  const newObj: DestinationItem = {
    id: newId,
    name: cleanName,
    code: (payload.code || cleanName.substring(0, 2)).trim().toUpperCase(),
    flag: payload.flag || '🌍',
    currency: payload.currency || 'EUR',
    authority: payload.authority || `${cleanName} Ministry of Education`,
    acronym: (payload.acronym || cleanName.substring(0, 4)).trim().toUpperCase(),
    processing: payload.processing || '15-30 Days',
    fee: payload.fee || '€50',
    desk: payload.desk || `${cleanName} Desk`,
    badge: payload.badge || 'Accredited',
    is_active: payload.is_active !== undefined ? payload.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 1. Immediately sync to local storage
  let existing: DestinationItem[] = [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) existing = JSON.parse(raw);
  } catch {}
  const updated = [newObj, ...existing.filter(d => d.id !== newId && d.name.toLowerCase().trim() !== cleanName.toLowerCase())];
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Supabase Insert & system_config backup
  (async () => {
    try {
      const { error } = await supabase.from('destinations').insert([newObj]);
      if (error) {
        console.warn('[createDestination supabase Warning]:', error.message);
        try {
          const admin = await getAdminSupabaseClient();
          await admin.from('destinations').insert([newObj]);
        } catch {}
      }

      try {
        await supabase.from('system_config').upsert({
          key: 'ferex_destinations_catalog',
          value: updated,
          updated_at: new Date().toISOString()
        });
      } catch {
        try {
          const admin = await getAdminSupabaseClient();
          await admin.from('system_config').upsert({
            key: 'ferex_destinations_catalog',
            value: updated,
            updated_at: new Date().toISOString()
          });
        } catch {}
      }
    } catch (err) {
      console.warn('[createDestination async sync Notice]:', err);
    }
  })();

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
  return newObj;
}

export async function updateDestination(id: string, payload: Partial<DestinationItem>): Promise<DestinationItem | null> {
  const updatedPayload = {
    ...payload,
    updated_at: new Date().toISOString()
  };

  // 1. Local Storage Update
  let resultObj: DestinationItem | null = null;
  let updated: DestinationItem[] = [];
  try {
    let existing: DestinationItem[] = [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) existing = JSON.parse(raw);
    updated = existing.map(d => {
      if (d.id === id) {
        resultObj = { ...d, ...updatedPayload };
        return resultObj;
      }
      return d;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Supabase Update
  try {
    const { error } = await supabase.from('destinations').update(updatedPayload).eq('id', id);
    if (error) {
      const admin = await getAdminSupabaseClient();
      await admin.from('destinations').update(updatedPayload).eq('id', id);
    }

    if (updated.length > 0) {
      try {
        await supabase.from('system_config').upsert({
          key: 'ferex_destinations_catalog',
          value: updated,
          updated_at: new Date().toISOString()
        });
      } catch {
        try {
          const admin = await getAdminSupabaseClient();
          await admin.from('system_config').upsert({
            key: 'ferex_destinations_catalog',
            value: updated,
            updated_at: new Date().toISOString()
          });
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[updateDestination DB Warning]:', err);
  }

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
  return resultObj;
}

export async function deleteDestination(id: string, name?: string): Promise<void> {
  addDeletedDestKey(id, name);

  // 1. Local Storage Remove
  let filtered: DestinationItem[] = [];
  try {
    let current: DestinationItem[] = [];
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) current = JSON.parse(raw);
    filtered = current.filter(d => d.id !== id && (!name || d.name.toLowerCase().trim() !== name.toLowerCase().trim()));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  // 2. Supabase Delete
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await supabase.from('destinations').delete().eq('id', id);
    }
    if (name) {
      await supabase.from('destinations').delete().ilike('name', name.trim());
    }

    try {
      await supabase.from('system_config').upsert({
        key: 'ferex_destinations_catalog',
        value: filtered,
        updated_at: new Date().toISOString()
      });
    } catch {
      try {
        const admin = await getAdminSupabaseClient();
        await admin.from('system_config').upsert({
          key: 'ferex_destinations_catalog',
          value: filtered,
          updated_at: new Date().toISOString()
        });
      } catch {}
    }
  } catch (err) {
    console.warn('[deleteDestination DB Warning]:', err);
  }

  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function clearAllDestinations(): Promise<void> {
  try {
    localStorage.setItem(PURGED_DESTS_KEY, 'true');
    try {
      await supabase.from('destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {
      try {
        const admin = await getAdminSupabaseClient();
        await admin.from('destinations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      } catch {}
    }
    try {
      await supabase.from('system_config').upsert({
        key: 'ferex_destinations_catalog',
        value: [],
        updated_at: new Date().toISOString()
      });
    } catch {}
  } catch {}
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem('ferex_registered_countries');
  } catch {}
  window.dispatchEvent(new Event('ferex_destinations_change'));
  window.dispatchEvent(new Event('storage'));
}
