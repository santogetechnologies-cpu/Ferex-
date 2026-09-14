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
    fee: 'CHF 200',
    desk: 'Swiss Admissions Desk',
    badge: 'Research Pioneer',
    is_active: true,
  },
  {
    id: '11111111-0000-4000-a000-000000000007',
    name: 'Czech Republic',
    code: 'CZ',
    flag: '🇨🇿',
    currency: 'EUR',
    authority: 'Czech Ministry of Education, Youth and Sports',
    acronym: 'MŠMT',
    processing: '15-30 Days',
    fee: '€100',
    desk: 'Czech Admissions Desk',
    badge: 'Central Europe',
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
    processing: '15-30 Days',
    fee: '€150',
    desk: 'Italy Admissions Desk',
    badge: 'Heritage & Tech',
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
    badge: 'EU Member',
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

export async function getDestinations(): Promise<DestinationItem[]> {
  // 1. Check local storage
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // 2. Query Supabase destinations table
  let dbDestinations: DestinationItem[] = [];
  try {
    const { data, error } = await supabase
      .from('destinations')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      dbDestinations = data as DestinationItem[];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dbDestinations));
      } catch {}
      return dbDestinations;
    }
  } catch (err) {
    console.warn('[getDestinations DB Notice]:', err);
  }

  // 3. Fallback to default verified destinations
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_STUDY_DESTINATIONS));
  } catch {}

  return DEFAULT_STUDY_DESTINATIONS;
}

export async function createDestination(payload: Omit<DestinationItem, 'id' | 'created_at' | 'updated_at'>): Promise<DestinationItem> {
  const newId = generateUUID();
  const newObj: DestinationItem = {
    id: newId,
    name: payload.name.trim(),
    code: (payload.code || payload.name.substring(0, 2)).trim().toUpperCase(),
    flag: payload.flag || '',
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
