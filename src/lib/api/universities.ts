import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

export const BASELINE_UNIVERSITIES: University[] = [];

// Helper to get deleted IDs
export function getDeletedUniversityIds(): string[] {
  try {
    const raw = localStorage.getItem('ferex_deleted_university_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(x => typeof x === 'string' && x.trim().length > 0);
      }
    }
  } catch {}
  return [];
}

export function isDeletedUniversity(
  u: { id?: string; name?: string } | null | undefined,
  deletedList: string[]
): boolean {
  if (!u) return true;
  const uid = (u.id || '').trim().toLowerCase();
  const uname = (u.name || '').trim().toLowerCase();
  const cleanUname = uname.replace(/[^a-z0-9]/g, '');

  return deletedList.some(item => {
    if (!item) return false;
    const norm = item.trim().toLowerCase();
    if (uid && norm === uid) return true;
    if (uname && norm === uname) return true;
    const cleanNorm = norm.replace(/[^a-z0-9]/g, '');
    if (cleanUname && cleanNorm && cleanUname === cleanNorm) return true;
    return false;
  });
}

function getCustomUniversities(): University[] {
  try {
    const raw = localStorage.getItem('ferex_custom_universities');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export async function getUniversities(): Promise<University[]> {
  console.log('[Universities API] getUniversities() called');
  const deletedIds = getDeletedUniversityIds();
  console.log('[Universities API] Deleted IDs:', deletedIds.length);
  const customUnis = getCustomUniversities();
  console.log('[Universities API] Custom universities:', customUnis.length);

  let fetchedFromDb: University[] = [];
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (error) {
      console.error('[Universities API] Supabase error:', error);
    } else if (data && Array.isArray(data)) {
      fetchedFromDb = data as University[];
      console.log('[Universities API] ✅ Fetched from Supabase:', fetchedFromDb.length);
      
      // IMMEDIATELY cache Supabase data to ensure persistence
      try {
        localStorage.setItem('ferex_local_universities', JSON.stringify(fetchedFromDb));
        console.log('[Universities API] ✅ Cached to localStorage:', fetchedFromDb.length);
      } catch (e) {
        console.error('[Universities API] ❌ LocalStorage cache failed:', e);
      }
    }
  } catch (err) {
    console.error('[getUniversities DB Error]:', err);
  }

  // IMPORTANT: Prioritize Supabase data over localStorage
  const merged: University[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // First add database universities
  for (const u of fetchedFromDb) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    seenIds.add(u.id);
    if (u.name) seenNames.add(u.name.toLowerCase().trim());
    merged.push(u);
  }

  // Then add custom universities that aren't in database
  for (const u of customUnis) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    const nameKey = (u.name || '').toLowerCase().trim();
    if (seenIds.has(u.id) || (nameKey && seenNames.has(nameKey))) continue; // Skip duplicates
    seenIds.add(u.id);
    if (nameKey) seenNames.add(nameKey);
    merged.push(u);
  }

  console.log('[Universities API] ✅ Final merged count:', merged.length);
  console.log('[Universities API] University names:', merged.map(u => u.name).join(', '));

  return merged;
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
  vfs_fee?: string;
  agency_fee?: string;
  living_cost_monthly?: string;
  nawa_required?: boolean;
  course_programs?: CourseProgram[];
  installments?: PaymentInstallment[];
  semesters?: CourseSemester[];
}): Promise<University> {
  console.log('[createUniversity] Creating:', payload.name, 'in', payload.country);
  
  const newId = generateUUID();
  const createdObj: University = {
    id: newId,
    name: payload.name.trim(),
    country: payload.country.trim(),
    city: payload.city?.trim() || '',
    logo_url: payload.logo_url || '',
    image_url: payload.image_url || '',
    badge: payload.badge || 'Top Choice',
    category: payload.category || 'Engineering',
    description: payload.description || `${payload.name} offers accredited degree programs with global post-study work opportunities.`,
    ranking: payload.ranking || 100,
    rating: payload.rating || 4.8,
    programs: payload.programs || ['Computer Science', 'Business Management'],
    tuition_range: payload.tuition_range || payload.university_fee || '€3,200 / yr',
    is_active: true,
    intakes: payload.intakes || ['October 2026', 'February 2027'],
    university_fee: payload.university_fee || '€3,200 / yr',
    vfs_fee: payload.vfs_fee || '₹15,000',
    agency_fee: payload.agency_fee || '₹25,000',
    living_cost_monthly: payload.living_cost_monthly || '€350 - €500 / mo',
    nawa_required: payload.nawa_required !== undefined ? payload.nawa_required : payload.country.toLowerCase() === 'poland',
    course_programs: payload.course_programs || [],
    installments: payload.installments || [],
    semesters: payload.semesters || [],
  };

  // 1. Remove from deleted tracking if previously deleted
  try {
    const deletedIds = getDeletedUniversityIds().filter(id => id !== newId && id !== createdObj.name);
    localStorage.setItem('ferex_deleted_university_ids', JSON.stringify(deletedIds));
  } catch {}

  // 2. Persist in custom universities collection
  try {
    const customList = getCustomUniversities().filter(u => u.id !== newId && u.name.toLowerCase() !== createdObj.name.toLowerCase());
    localStorage.setItem('ferex_custom_universities', JSON.stringify([createdObj, ...customList]));
    console.log('[createUniversity] ✅ Saved to custom localStorage');
  } catch (e) {
    console.error('[createUniversity] ❌ localStorage save failed:', e);
  }

  // 3. CRITICAL: Persist to Supabase FIRST (most important)
  try {
    console.log('[createUniversity] 🔄 Attempting Supabase insert...', { id: newId, name: createdObj.name, country: createdObj.country });
    const { data, error } = await supabase.from('universities').insert(createdObj).select();
    if (error) {
      console.error('[createUniversity] ❌ Supabase insert failed:', error.message, error.details, error.hint);
      // Continue anyway - localStorage will serve as backup
    } else if (data && data.length > 0) {
      console.log('[createUniversity] ✅ Successfully inserted to Supabase:', data[0].id, data[0].name);
    } else {
      console.warn('[createUniversity] ⚠️ Supabase insert returned no data (might be RLS issue)');
    }
  } catch (err: any) {
    console.error('[createUniversity] ❌ Supabase exception:', err?.message || err);
  }

  // 4. Update local cache
  try {
    const local = localStorage.getItem('ferex_local_universities');
    const existing: University[] = local ? JSON.parse(local) : [];
    const updated = [createdObj, ...existing.filter(u => u.id !== newId && u.name.toLowerCase() !== createdObj.name.toLowerCase())];
    localStorage.setItem('ferex_local_universities', JSON.stringify(updated));
    console.log('[createUniversity] ✅ Updated local cache');
  } catch (e) {
    console.error('[createUniversity] ❌ Local cache update failed:', e);
  }

  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  console.log('[createUniversity] ✅ Complete - dispatched events');
  return createdObj;
}

export async function updateUniversityRecord(id: string, payload: Partial<University>): Promise<University> {
  console.log('[updateUniversityRecord] Updating:', id);
  
  let existingList: University[] = [];
  try {
    const local = localStorage.getItem('ferex_local_universities');
    existingList = local ? JSON.parse(local) : [];
  } catch (e) {}

  const customUnis = getCustomUniversities();
  const current = existingList.find(u => u.id === id) || customUnis.find(u => u.id === id);

  const updatedObj: University = {
    id,
    name: payload.name ?? current?.name ?? 'University',
    country: payload.country ?? current?.country ?? 'Poland',
    city: payload.city ?? current?.city ?? '',
    logo_url: payload.logo_url ?? current?.logo_url ?? '',
    image_url: payload.image_url ?? current?.image_url ?? '',
    badge: payload.badge ?? current?.badge ?? 'Accredited',
    category: payload.category ?? current?.category ?? 'General',
    description: payload.description ?? current?.description ?? '',
    ranking: payload.ranking ?? current?.ranking ?? 100,
    rating: payload.rating ?? current?.rating ?? 4.8,
    programs: payload.programs ?? current?.programs ?? ['Computer Science'],
    tuition_range: payload.tuition_range ?? current?.tuition_range ?? '€3,200 / yr',
    is_active: payload.is_active ?? current?.is_active ?? true,
    intakes: payload.intakes ?? current?.intakes ?? ['October 2026', 'February 2027'],
    university_fee: payload.university_fee ?? current?.university_fee ?? '€3,200 / yr',
    vfs_fee: payload.vfs_fee ?? current?.vfs_fee ?? '₹15,000',
    agency_fee: payload.agency_fee ?? current?.agency_fee ?? '₹25,000',
    living_cost_monthly: payload.living_cost_monthly ?? current?.living_cost_monthly ?? '€350 - €500 / mo',
    nawa_required: payload.nawa_required !== undefined ? payload.nawa_required : current?.nawa_required ?? true,
    course_programs: payload.course_programs ?? current?.course_programs ?? [],
    installments: payload.installments ?? current?.installments ?? [],
    semesters: payload.semesters ?? current?.semesters ?? [],
  };

  // Update in custom universities if present or add to ensure persistence
  try {
    const isCustom = customUnis.some(u => u.id === id);
    let newCustomList: University[];
    if (isCustom) {
      newCustomList = customUnis.map(u => u.id === id ? updatedObj : u);
    } else {
      newCustomList = [updatedObj, ...customUnis.filter(u => u.id !== id)];
    }
    localStorage.setItem('ferex_custom_universities', JSON.stringify(newCustomList));
    console.log('[updateUniversityRecord] ✅ Updated custom localStorage');
  } catch (e) {
    console.error('[updateUniversityRecord] ❌ Custom update failed:', e);
  }

  // Update Supabase - CRITICAL
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      const { error } = await supabase.from('universities').update(payload).eq('id', id);
      if (error) {
        console.error('[updateUniversityRecord] ❌ Supabase update failed:', error);
      } else {
        console.log('[updateUniversityRecord] ✅ Supabase updated');
      }
    }
  } catch (err) {
    console.error('[updateUniversityRecord] ❌ Supabase error:', err);
  }

  // Update local cache
  try {
    const updated = existingList.some(u => u.id === id)
      ? existingList.map(u => u.id === id ? updatedObj : u)
      : [updatedObj, ...existingList];
    localStorage.setItem('ferex_local_universities', JSON.stringify(updated));
    console.log('[updateUniversityRecord] ✅ Updated local cache');
  } catch (e) {
    console.error('[updateUniversityRecord] ❌ Cache update failed:', e);
  }

  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  console.log('[updateUniversityRecord] ✅ Complete');
  return updatedObj;
}

export async function deleteUniversity(id: string, name?: string) {
  const toDelete = new Set<string>();

  if (id && typeof id === 'string' && id.trim()) {
    toDelete.add(id.trim());
    toDelete.add(id.trim().toLowerCase());
  }

  if (name && typeof name === 'string' && name.trim()) {
    toDelete.add(name.trim());
    toDelete.add(name.trim().toLowerCase());
  }

  // 1. Search in BASELINE_UNIVERSITIES for any match to ensure both UUID and name are captured
  for (const b of BASELINE_UNIVERSITIES) {
    const bIdMatch = id && (b.id === id || b.id.toLowerCase() === id.toLowerCase());
    const bNameMatch = name && b.name.toLowerCase().trim() === name.toLowerCase().trim();
    if (bIdMatch || bNameMatch) {
      toDelete.add(b.id);
      toDelete.add(b.id.toLowerCase());
      toDelete.add(b.name);
      toDelete.add(b.name.toLowerCase().trim());
    }
  }

  // 2. Search in local universities cache
  try {
    const local = localStorage.getItem('ferex_local_universities');
    if (local) {
      const parsed: University[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          const uIdMatch = id && (u.id === id || u.id.toLowerCase() === id.toLowerCase());
          const uNameMatch = name && u.name.toLowerCase().trim() === name.toLowerCase().trim();
          if (uIdMatch || uNameMatch) {
            toDelete.add(u.id);
            toDelete.add(u.id.toLowerCase());
            toDelete.add(u.name);
            toDelete.add(u.name.toLowerCase().trim());
          }
        }
      }
    }
  } catch {}

  // 3. Search in custom universities
  try {
    const customUnis = getCustomUniversities();
    for (const u of customUnis) {
      const uIdMatch = id && (u.id === id || u.id.toLowerCase() === id.toLowerCase());
      const uNameMatch = name && u.name.toLowerCase().trim() === name.toLowerCase().trim();
      if (uIdMatch || uNameMatch) {
        toDelete.add(u.id);
        toDelete.add(u.id.toLowerCase());
        toDelete.add(u.name);
        toDelete.add(u.name.toLowerCase().trim());
      }
    }
  } catch {}

  const deleteItems = Array.from(toDelete).filter(Boolean);

  // 4. Persist in deleted tracking so it never resurrects
  try {
    const existingDeleted = getDeletedUniversityIds();
    const updatedDeleted = Array.from(new Set([...existingDeleted, ...deleteItems]));
    localStorage.setItem('ferex_deleted_university_ids', JSON.stringify(updatedDeleted));
  } catch {}

  // 5. Remove from custom universities
  try {
    const customList = getCustomUniversities().filter(u => !isDeletedUniversity(u, deleteItems));
    localStorage.setItem('ferex_custom_universities', JSON.stringify(customList));
  } catch {}

  // 6. Remove from local universities cache immediately
  try {
    const local = localStorage.getItem('ferex_local_universities');
    if (local) {
      const parsed: University[] = JSON.parse(local);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(u => !isDeletedUniversity(u, deleteItems));
        localStorage.setItem('ferex_local_universities', JSON.stringify(filtered));
      }
    }
  } catch {}

  // Broadcast update events immediately
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));

  // 7. Delete from Supabase in background (non-blocking, fails gracefully)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const targetName = name || Array.from(toDelete).find(s => s && isNaN(Number(s)) && !s.includes('-'));

  try {
    if (isUuid) {
      await supabase.from('universities').delete().eq('id', id);
    }
    if (targetName) {
      await supabase.from('universities').delete().ilike('name', targetName.trim());
    }
  } catch (err) {
    console.warn('[deleteUniversity Supabase Warning]:', err);
  }
}

export async function clearAllUniversities(): Promise<void> {
  try {
    await supabase.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  } catch (err) {
    console.warn('[clearAllUniversities Supabase Warning]:', err);
  }
  try {
    localStorage.removeItem('ferex_local_universities');
    localStorage.removeItem('ferex_custom_universities');
    localStorage.removeItem('ferex_deleted_university_ids');
  } catch {}
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function restoreDefaultUniversities(): Promise<University[]> {
  try {
    localStorage.removeItem('ferex_deleted_university_ids');
    localStorage.removeItem('ferex_local_universities');
    localStorage.removeItem('ferex_custom_universities');
  } catch {}
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  return getUniversities();
}
