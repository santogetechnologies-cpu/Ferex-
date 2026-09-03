import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

const BASELINE_UNIVERSITIES: University[] = [
  {
    id: 'u-1',
    name: 'University of Warsaw',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    ranking: 1,
    rating: 4.9,
    programs: ['Computer Science', 'Data Science', 'International Business', 'Medicine'],
    tuition_range: '€3,500 - €5,200 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,500',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
  },
  {
    id: 'u-2',
    name: 'Warsaw University of Technology',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    ranking: 2,
    rating: 4.8,
    programs: ['Robotics', 'Civil Engineering', 'Software Systems', 'Architecture'],
    tuition_range: '€3,200 - €4,800 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,200',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
  },
  {
    id: 'u-3',
    name: 'Jagiellonian University',
    country: 'Poland',
    city: 'Krakow',
    logo_url: '',
    ranking: 3,
    rating: 4.9,
    programs: ['Biotechnology', 'Law & Governance', 'European Studies'],
    tuition_range: '€3,800 - €5,500 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,800',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
  },
  {
    id: 'u-4',
    name: 'Wroclaw University of Science and Technology',
    country: 'Poland',
    city: 'Wroclaw',
    logo_url: '',
    ranking: 4,
    rating: 4.7,
    programs: ['AI & Automation', 'Mechanical Engineering', 'Cybersecurity'],
    tuition_range: '€3,000 - €4,500 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,000',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
  },
  {
    id: 'u-5',
    name: 'Poznan University of Economics and Business',
    country: 'Poland',
    city: 'Poznan',
    logo_url: '',
    ranking: 5,
    rating: 4.6,
    programs: ['Finance & Accounting', 'Global Supply Chain', 'Digital Marketing'],
    tuition_range: '€2,800 - €4,200 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€2,800',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
  },
  {
    id: 'u-6',
    name: 'Technical University of Munich (TUM)',
    country: 'Germany',
    city: 'Munich',
    logo_url: '',
    ranking: 10,
    rating: 4.9,
    programs: ['Informatics', 'Aerospace Engineering', 'Management'],
    tuition_range: '€0 - €1,500 / semester',
    is_active: true,
    intakes: ['October 2026', 'April 2027'],
    university_fee: '€1,500',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
  }
];

export async function getUniversities(): Promise<University[]> {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('[getUniversities notice]: Using baseline/local universities catalog');
      const local = localStorage.getItem('ferex_local_universities');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
      return BASELINE_UNIVERSITIES;
    }

    // Cache to localStorage
    try {
      localStorage.setItem('ferex_local_universities', JSON.stringify(data));
    } catch (e) {}

    return (data ?? []) as University[];
  } catch (err) {
    console.error('[getUniversities Error]:', err);
    return BASELINE_UNIVERSITIES;
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
    const { error } = await supabase.from('universities').insert(createdObj);
    if (error) {
      console.warn('[createUniversity notice]:', error.message);
    }
  } catch (err: any) {
    console.warn('[createUniversity error]:', err?.message || err);
  }

  // Update local storage backup
  try {
    const local = localStorage.getItem('ferex_local_universities');
    const existing = local ? JSON.parse(local) : BASELINE_UNIVERSITIES;
    const updated = [createdObj, ...existing.filter((u: any) => u.id !== newId)];
    localStorage.setItem('ferex_local_universities', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_university_change'));
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
