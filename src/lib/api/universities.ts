import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

const STORAGE_KEY = 'ferex_custom_universities';

function getStoredUniversities(): University[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading custom universities from localStorage:', e);
    return [];
  }
}

function saveStoredUniversities(unis: University[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unis));
  } catch (e) {
    console.error('Error saving custom universities to localStorage:', e);
  }
}

export async function getUniversities(): Promise<University[]> {
  const localUnis = getStoredUniversities();

  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (error) {
      console.warn('[Supabase API] getUniversities notice:', error.message);
      return localUnis;
    }

    const dbUnis = (data ?? []) as University[];
    // Merge database universities and local custom universities without duplicates
    const dbIds = new Set(dbUnis.map(u => u.id));
    const merged = [...dbUnis, ...localUnis.filter(u => !dbIds.has(u.id))];
    return merged;
  } catch (err) {
    console.warn('[Supabase API] getUniversities catch:', err);
    return localUnis;
  }
}

export async function createUniversity(payload: {
  name: string;
  country: string;
  city?: string;
  ranking?: number;
  rating?: number;
  programs?: string[];
  tuition_range?: string;
  intakes?: string[];
  university_fee?: string;
  vfs_fee?: string;
  agency_fee?: string;
  course_programs?: CourseProgram[];
  installments?: PaymentInstallment[];
  semesters?: CourseSemester[];
}): Promise<University> {
  const newId = generateUUID();

  const createdObj: University = {
    id: newId,
    name: payload.name,
    country: payload.country,
    city: payload.city || '',
    logo_url: '',
    ranking: payload.ranking || 100,
    rating: payload.rating || 4.5,
    programs: payload.programs || ['Computer Science', 'Business Management'],
    tuition_range: payload.tuition_range || (payload.university_fee ? `${payload.university_fee} / yr` : '₹3,50,000 / yr'),
    is_active: true,
    intakes: payload.intakes || ['Fall 2026', 'Spring 2026'],
    university_fee: payload.university_fee || '₹3,50,000',
    vfs_fee: payload.vfs_fee || '₹15,000',
    agency_fee: payload.agency_fee || '₹25,000',
    course_programs: payload.course_programs || [],
    installments: payload.installments || [],
    semesters: payload.semesters || []
  };

  // Try inserting complete payload into Supabase
  try {
    const fullPayload: any = {
      id: newId,
      name: payload.name,
      country: payload.country,
      city: payload.city || '',
      ranking: payload.ranking || 100,
      rating: payload.rating || 4.5,
      programs: payload.programs || ['Computer Science', 'Business'],
      tuition_range: payload.tuition_range || '₹3,50,000 / yr',
      is_active: true,
      intakes: createdObj.intakes,
      university_fee: createdObj.university_fee,
      vfs_fee: createdObj.vfs_fee,
      agency_fee: createdObj.agency_fee,
      course_programs: createdObj.course_programs,
      installments: createdObj.installments,
      semesters: createdObj.semesters
    };

    let { error } = await supabase
      .from('universities')
      .insert(fullPayload)
      .select();

    if (error) {
      console.warn('[createUniversity Warning]: Column missing on Supabase, attempting fallback insert...', error.message);
      const fallbackPayload = {
        id: newId,
        name: payload.name,
        country: payload.country,
        city: payload.city || '',
        ranking: payload.ranking || 100,
        rating: payload.rating || 4.5,
        programs: payload.programs || ['Computer Science', 'Business'],
        tuition_range: payload.tuition_range || '₹3,50,000 / yr',
        is_active: true
      };

      await supabase
        .from('universities')
        .insert(fallbackPayload)
        .select();
    }
  } catch (err: any) {
    console.warn('[createUniversity Supabase Error]:', err?.message || err);
  }

  // Always save to localStorage so the data is NEVER lost!
  const currentLocal = getStoredUniversities();
  const updatedLocal = [createdObj, ...currentLocal.filter(u => u.id !== newId)];
  saveStoredUniversities(updatedLocal);

  return createdObj;
}

export async function updateUniversityRecord(id: string, payload: Partial<University>): Promise<University> {
  const currentLocal = getStoredUniversities();
  const existing = currentLocal.find(u => u.id === id);

  const updatedObj: University = {
    id,
    name: payload.name ?? existing?.name ?? 'University',
    country: payload.country ?? existing?.country ?? 'Poland',
    city: payload.city ?? existing?.city ?? '',
    logo_url: payload.logo_url ?? existing?.logo_url ?? '',
    ranking: payload.ranking ?? existing?.ranking ?? 100,
    rating: payload.rating ?? existing?.rating ?? 4.8,
    programs: payload.programs ?? existing?.programs ?? ['Computer Science'],
    tuition_range: payload.tuition_range ?? existing?.tuition_range ?? '₹3,50,000 / yr',
    is_active: payload.is_active ?? existing?.is_active ?? true,
    intakes: payload.intakes ?? existing?.intakes ?? ['Fall 2026', 'Spring 2026'],
    university_fee: payload.university_fee ?? existing?.university_fee ?? '₹3,50,000',
    vfs_fee: payload.vfs_fee ?? existing?.vfs_fee ?? '₹15,000',
    agency_fee: payload.agency_fee ?? existing?.agency_fee ?? '₹25,000',
    course_programs: payload.course_programs ?? existing?.course_programs ?? [],
    installments: payload.installments ?? existing?.installments ?? [],
    semesters: payload.semesters ?? existing?.semesters ?? [],
  };

  const updatedLocal = [updatedObj, ...currentLocal.filter(u => u.id !== id)];
  saveStoredUniversities(updatedLocal);

  // Sync to Supabase
  try {
    const fullUpdateObj = {
      name: updatedObj.name,
      country: updatedObj.country,
      city: updatedObj.city,
      ranking: updatedObj.ranking,
      rating: updatedObj.rating,
      programs: updatedObj.programs,
      tuition_range: updatedObj.tuition_range,
      intakes: updatedObj.intakes,
      university_fee: updatedObj.university_fee,
      vfs_fee: updatedObj.vfs_fee,
      agency_fee: updatedObj.agency_fee,
      course_programs: updatedObj.course_programs,
      installments: updatedObj.installments,
      semesters: updatedObj.semesters
    };

    let { error } = await supabase.from('universities').update(fullUpdateObj).eq('id', id);

    if (error) {
      // Fallback update for core schema if custom columns not added yet
      await supabase.from('universities').update({
        name: updatedObj.name,
        country: updatedObj.country,
        city: updatedObj.city,
        ranking: updatedObj.ranking,
        rating: updatedObj.rating,
        programs: updatedObj.programs,
        tuition_range: updatedObj.tuition_range,
      }).eq('id', id);
    }
  } catch (err) {}

  return updatedObj;
}

export async function deleteUniversity(id: string) {
  // Remove from localStorage
  const currentLocal = getStoredUniversities();
  saveStoredUniversities(currentLocal.filter(u => u.id !== id));

  // Remove from Supabase if present
  try {
    await supabase
      .from('universities')
      .delete()
      .eq('id', id);
  } catch (err) {
    console.warn('[deleteUniversity Supabase Error]:', err);
  }
}
