import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

export async function getUniversities(): Promise<University[]> {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (error) {
      console.warn('[getUniversities Notice]:', error.message);
      return [];
    }

    return (data ?? []) as University[];
  } catch (err) {
    console.error('[getUniversities Error]:', err);
    return [];
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
    rating: payload.rating || 4.8,
    programs: payload.programs || ['Computer Science', 'Management & Engineering'],
    tuition_range: payload.tuition_range || '₹3,50,000 / yr',
    is_active: true,
    intakes: payload.intakes || ['Fall 2026', 'Spring 2027'],
    university_fee: payload.university_fee || '₹3,50,000',
    vfs_fee: payload.vfs_fee || '₹15,000',
    agency_fee: payload.agency_fee || '₹25,000',
    course_programs: payload.course_programs || [],
    installments: payload.installments || [],
    semesters: payload.semesters || [],
  };

  try {
    await supabase.from('universities').insert(createdObj);
  } catch (err: any) {
    console.warn('[createUniversity Error]:', err?.message || err);
  }

  return createdObj;
}

export async function updateUniversityRecord(id: string, payload: Partial<University>): Promise<University> {
  const updatedObj: University = {
    id,
    name: payload.name ?? 'University',
    country: payload.country ?? 'Poland',
    city: payload.city ?? '',
    logo_url: payload.logo_url ?? '',
    ranking: payload.ranking ?? 100,
    rating: payload.rating ?? 4.8,
    programs: payload.programs ?? ['Computer Science'],
    tuition_range: payload.tuition_range ?? '₹3,50,000 / yr',
    is_active: payload.is_active ?? true,
    intakes: payload.intakes ?? ['Fall 2026', 'Spring 2026'],
    university_fee: payload.university_fee ?? '₹3,50,000',
    vfs_fee: payload.vfs_fee ?? '₹15,000',
    agency_fee: payload.agency_fee ?? '₹25,000',
    course_programs: payload.course_programs ?? [],
    installments: payload.installments ?? [],
    semesters: payload.semesters ?? [],
  };

  try {
    await supabase.from('universities').update(payload).eq('id', id);
  } catch (err) {}

  return updatedObj;
}

export async function deleteUniversity(id: string) {
  try {
    await supabase.from('universities').delete().eq('id', id);
  } catch (err) {
    console.warn('[deleteUniversity Error]:', err);
  }
}
