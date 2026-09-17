import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

// ─── NO BASELINE/MOCK DATA ────────────────────────────────────────────────────
// All universities are managed exclusively via Supabase.
// The app shows an empty state when the DB is empty or unreachable.
// ─────────────────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_KEY = 'ferex_universities_cache';
const MASTER_STORAGE_KEY = 'ferex_custom_universities';

export async function getUniversities(): Promise<University[]> {
  // ── Primary: Supabase DB (always authoritative) ──────────────────────────
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .eq('is_active', true)
      .order('ranking', { ascending: true });

    if (!error && Array.isArray(data)) {
      // DB is reachable — cache it and return
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(data));
      } catch {}
      return data as University[];
    }
  } catch (err) {
    console.warn('[getUniversities] DB unreachable, trying local cache:', err);
  }

  // ── Fallback: local cache when DB is unreachable (offline) ───────────────
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as University[];
    }
  } catch {}

  return [];
}

export async function createUniversity(payload: {
  name: string;
  country: string;
  city?: string;
  logo_url?: string;
  image_url?: string;
  badge?: string;
  category?: string;
  description?: string;
  ranking?: number;
  rating?: number;
  programs?: string[];
  tuition_range?: string;
  intakes?: string[];
  university_fee?: string;
  tuition_fee_enabled?: boolean;
  vfs_fee?: string;
  agency_fee?: string;
  agency_fee_description?: string;
  installments_enabled?: boolean;
  living_cost_monthly?: string;
  nawa_required?: boolean;
  course_programs?: CourseProgram[];
  installments?: PaymentInstallment[];
  semesters?: CourseSemester[];
}): Promise<University> {
  const newId = generateUUID();
  const trimmedName = payload.name.trim();
  const targetCountry = payload.country.trim();

  if (!trimmedName) throw new Error('University name is required.');
  if (!targetCountry) throw new Error('Country is required.');

  const fullObject: University = {
    id: newId,
    name: trimmedName,
    country: targetCountry,
    city: payload.city?.trim() || '',
    logo_url: payload.logo_url || '',
    image_url: payload.image_url || '',
    badge: payload.badge || 'Accredited Partner',
    category: payload.category || 'Higher Education',
    description: payload.description || '',
    ranking: payload.ranking || 100,
    rating: payload.rating || 4.8,
    programs: payload.programs && payload.programs.length > 0 ? payload.programs : [],
    tuition_range: payload.tuition_range || payload.university_fee || '',
    is_active: true,
    intakes: payload.intakes && payload.intakes.length > 0 ? payload.intakes : [],
    university_fee: payload.university_fee || payload.tuition_range || '',
    tuition_fee_enabled: payload.tuition_fee_enabled !== undefined ? payload.tuition_fee_enabled : true,
    vfs_fee: payload.vfs_fee || '',
    agency_fee: payload.agency_fee || '',
    agency_fee_description: payload.agency_fee_description,
    installments_enabled: payload.installments_enabled ?? false,
    living_cost_monthly: payload.living_cost_monthly || '',
    nawa_required: payload.nawa_required !== undefined ? payload.nawa_required : false,
    course_programs: payload.course_programs || [],
    installments: payload.installments || [],
    semesters: payload.semesters || [],
  };

  const dbPayload: any = {
    id: fullObject.id,
    name: fullObject.name,
    country: fullObject.country,
    city: fullObject.city,
    logo_url: fullObject.logo_url,
    image_url: fullObject.image_url,
    badge: fullObject.badge,
    category: fullObject.category,
    description: fullObject.description,
    ranking: fullObject.ranking,
    rating: fullObject.rating,
    programs: fullObject.programs,
    tuition_range: fullObject.tuition_range,
    intakes: fullObject.intakes,
    university_fee: fullObject.university_fee,
    tuition_fee_enabled: fullObject.tuition_fee_enabled,
    vfs_fee: fullObject.vfs_fee,
    agency_fee: fullObject.agency_fee,
    agency_fee_description: fullObject.agency_fee_description,
    living_cost_monthly: fullObject.living_cost_monthly,
    nawa_required: fullObject.nawa_required,
    installments_enabled: fullObject.installments_enabled,
    course_programs: fullObject.course_programs,
    installments: fullObject.installments,
    semesters: fullObject.semesters,
    is_active: true,
  };

  // ── Write to Supabase (throw on failure so the UI shows real errors) ──────
  let lastError: any = null;

  // Try admin-authed client first
  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('universities').insert([dbPayload]);
    if (!error) {
      lastError = null;
    } else {
      lastError = error;
      console.warn('[createUniversity] Admin insert failed:', error.message);
    }
  } catch (e) {
    lastError = e;
    console.warn('[createUniversity] Admin client threw:', e);
  }

  // Try anon client if admin failed
  if (lastError) {
    try {
      const { error: anonErr } = await supabase.from('universities').insert([dbPayload]);
      if (!anonErr) {
        lastError = null;
      } else {
        lastError = anonErr;
        console.error('[createUniversity] Anon insert also failed:', anonErr.message);
      }
    } catch (e) {
      lastError = e;
      console.error('[createUniversity] Anon client threw:', e);
    }
  }

  if (lastError) {
    throw new Error(`Failed to save university to database: ${lastError.message || lastError}`);
  }

  // ── Update local cache to reflect the new DB state ────────────────────────
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(MASTER_STORAGE_KEY);
    const existing: University[] = raw ? JSON.parse(raw) : [];
    const updated = [fullObject, ...existing.filter(u => u.id !== newId && u.name.toLowerCase().trim() !== trimmedName.toLowerCase())];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  return fullObject;
}

export async function updateUniversity(id: string, payload: Partial<University>): Promise<University | null> {
  const dbPayload: any = {};
  const allowedCols = [
    'name', 'country', 'city', 'logo_url', 'image_url', 'badge', 'category', 'description',
    'ranking', 'rating', 'programs', 'tuition_range', 'intakes', 'university_fee', 'tuition_fee_enabled',
    'vfs_fee', 'agency_fee', 'agency_fee_description', 'living_cost_monthly', 'nawa_required',
    'installments_enabled', 'course_programs', 'installments', 'semesters', 'is_active'
  ];

  for (const k of allowedCols) {
    if ((payload as any)[k] !== undefined) {
      dbPayload[k] = (payload as any)[k];
    }
  }

  let updatedObj: University | null = null;
  let lastError: any = null;

  // Try admin client
  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('universities').update(dbPayload).eq('id', id);
    if (!error) {
      lastError = null;
    } else {
      lastError = error;
      console.warn('[updateUniversity] Admin update failed:', error.message);
    }
  } catch (e) {
    lastError = e;
    console.warn('[updateUniversity] Admin client threw:', e);
  }

  // Try anon client
  if (lastError) {
    try {
      const { error: anonErr } = await supabase.from('universities').update(dbPayload).eq('id', id);
      if (!anonErr) {
        lastError = null;
      } else {
        console.error('[updateUniversity] Anon update also failed:', anonErr.message);
        lastError = anonErr;
      }
    } catch (e) {
      lastError = e;
      console.error('[updateUniversity] Anon client threw:', e);
    }
  }

  if (lastError) {
    throw new Error(`Failed to update university: ${lastError.message || lastError}`);
  }

  // Update local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(MASTER_STORAGE_KEY);
    if (raw) {
      const current: University[] = JSON.parse(raw);
      const updated = current.map(u => {
        if (u.id === id) {
          updatedObj = { ...u, ...payload };
          return updatedObj;
        }
        return u;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  return updatedObj;
}

export async function deleteUniversity(id: string, name?: string): Promise<void> {
  let lastError: any = null;

  // Try admin client
  try {
    const admin = await getAdminSupabaseClient();
    const { error } = await admin.from('universities').delete().eq('id', id);
    if (!error) {
      lastError = null;
    } else {
      lastError = error;
      console.warn('[deleteUniversity] Admin delete failed:', error.message);
    }
  } catch (e) {
    lastError = e;
    console.warn('[deleteUniversity] Admin client threw:', e);
  }

  // Try anon client
  if (lastError) {
    try {
      const { error: anonErr } = await supabase.from('universities').delete().eq('id', id);
      if (!anonErr) {
        lastError = null;
      } else {
        lastError = anonErr;
        console.error('[deleteUniversity] Anon delete also failed:', anonErr.message);
      }
    } catch (e) {
      lastError = e;
      console.error('[deleteUniversity] Anon client threw:', e);
    }
  }

  if (lastError) {
    throw new Error(`Failed to delete university from database: ${lastError.message || lastError}`);
  }

  // Remove from local cache
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY) || localStorage.getItem(MASTER_STORAGE_KEY);
    if (raw) {
      const current: University[] = JSON.parse(raw);
      const filtered = current.filter(u =>
        u.id !== id && (!name || u.name.toLowerCase().trim() !== name.toLowerCase().trim())
      );
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
      localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(filtered));
    }
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
}

export const updateUniversityRecord = updateUniversity;

export async function clearAllUniversities(): Promise<void> {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch {
    try {
      await supabase.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch {}
  }
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify([]));
  } catch {}
  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
}

// restoreDefaultUniversities: no-op (no mock data to restore)
export async function restoreDefaultUniversities(): Promise<University[]> {
  return [];
}
