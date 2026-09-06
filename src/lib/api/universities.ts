import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

export const BASELINE_UNIVERSITIES: University[] = [
  {
    id: 'u-1',
    name: 'Warsaw University of Technology',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
    badge: 'Top Choice',
    category: 'Engineering',
    description: '#1 Technical University in Poland offering prestigious European engineering and AI programs.',
    ranking: 1,
    rating: 4.9,
    programs: ['B.Sc Computer Science', 'M.Sc Robotics & Autonomous Systems', 'B.Sc Civil Engineering', 'M.Sc Artificial Intelligence'],
    tuition_range: '€3,000 - €4,500 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,000 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€350 - €500 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-wut-1', name: 'B.Sc Computer Science & Systems', degree_level: 'Bachelor', tuition_fee: '€3,000 / yr', duration: '3.5 Years' },
      { id: 'cp-wut-2', name: 'M.Sc Robotics & Artificial Intelligence', degree_level: 'Master', tuition_fee: '€3,800 / yr', duration: '2 Years' },
      { id: 'cp-wut-3', name: 'B.Sc Civil & Structural Engineering', degree_level: 'Bachelor', tuition_fee: '€3,200 / yr', duration: '4 Years' },
      { id: 'cp-wut-4', name: 'M.Sc Cyber Security Engineering', degree_level: 'Master', tuition_fee: '€3,500 / yr', duration: '2 Years' }
    ]
  },
  {
    id: 'u-2',
    name: 'Kozminski University',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
    badge: 'AACSB Accredited',
    category: 'Business',
    description: 'Triple-crown accredited premier European business school ranked top in Central Europe.',
    ranking: 2,
    rating: 4.9,
    programs: ['Bachelor in Management', 'Master in Finance & Accounting', 'MBA International Business', 'Big Data Analytics'],
    tuition_range: '€4,200 - €5,500 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€4,200 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€400 - €550 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-koz-1', name: 'Bachelor in Management (BBA)', degree_level: 'Bachelor', tuition_fee: '€4,200 / yr', duration: '3 Years' },
      { id: 'cp-koz-2', name: 'Master in International Business & AI', degree_level: 'Master', tuition_fee: '€4,900 / yr', duration: '2 Years' },
      { id: 'cp-koz-3', name: 'M.Sc Strategic Finance & Banking', degree_level: 'Master', tuition_fee: '€4,500 / yr', duration: '2 Years' }
    ]
  },
  {
    id: 'u-3',
    name: 'Vistula University',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=800&q=80',
    badge: 'High Acceptance',
    category: 'IT & CS',
    description: '#1 Internationalized university in Poland with high visa success rate and modern IT campus.',
    ranking: 5,
    rating: 4.7,
    programs: ['B.Sc Information Technology', 'B.A. International Relations', 'M.Sc Software Development', 'Graphic Design'],
    tuition_range: '€2,500 - €3,400 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€2,500 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€350 - €450 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-vis-1', name: 'B.Sc Information Technology & Cyber Defense', degree_level: 'Bachelor', tuition_fee: '€2,500 / yr', duration: '3.5 Years' },
      { id: 'cp-vis-2', name: 'M.Sc Computer Engineering & Cloud', degree_level: 'Master', tuition_fee: '€2,900 / yr', duration: '2 Years' },
      { id: 'cp-vis-3', name: 'B.A. International Business & Logistics', degree_level: 'Bachelor', tuition_fee: '€2,600 / yr', duration: '3 Years' }
    ]
  },
  {
    id: 'u-4',
    name: 'AGH University of Krakow',
    country: 'Poland',
    city: 'Kraków',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?auto=format&fit=crop&w=800&q=80',
    badge: 'Research Hub',
    category: 'Engineering',
    description: 'Renowned European technical research campus with state-of-the-art supercomputing laboratories.',
    ranking: 3,
    rating: 4.8,
    programs: ['B.Sc Data Science & AI', 'M.Sc Applied Computer Science', 'B.Sc Electronic Telecommunications', 'Renewable Energy'],
    tuition_range: '€3,200 - €4,200 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,200 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€300 - €450 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-agh-1', name: 'B.Sc Data Science & Artificial Intelligence', degree_level: 'Bachelor', tuition_fee: '€3,200 / yr', duration: '3.5 Years' },
      { id: 'cp-agh-2', name: 'M.Sc Applied Computer Science & Networks', degree_level: 'Master', tuition_fee: '€3,600 / yr', duration: '2 Years' }
    ]
  },
  {
    id: 'u-5',
    name: 'Wroclaw University of Science and Technology',
    country: 'Poland',
    city: 'Wrocław',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=800&q=80',
    badge: 'Industry Partner',
    category: 'Engineering',
    description: 'Leader in European industrial innovation with close partnerships with multinational automotive & IT hubs.',
    ranking: 4,
    rating: 4.8,
    programs: ['M.Sc Mechanical Engineering & Robotics', 'B.Sc Systems Engineering', 'M.Sc Computer Networks', 'Automotive Design'],
    tuition_range: '€2,800 - €3,900 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€2,800 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€320 - €470 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-wro-1', name: 'M.Sc Mechanical Engineering & Robotics', degree_level: 'Master', tuition_fee: '€2,800 / yr', duration: '2 Years' },
      { id: 'cp-wro-2', name: 'B.Sc Information & Communication Systems', degree_level: 'Bachelor', tuition_fee: '€3,000 / yr', duration: '3.5 Years' }
    ]
  },
  {
    id: 'u-6',
    name: 'SWPS University of Social Sciences',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1519452635265-7b1fbfd1e4e0?auto=format&fit=crop&w=800&q=80',
    badge: 'Top Rated',
    category: 'Humanities',
    description: '#1 Private university for Psychology, Design, and Social Sciences with global faculty.',
    ranking: 6,
    rating: 4.8,
    programs: ['B.A. Psychology in English', 'B.A. UI/UX & Interactive Media', 'M.A. Clinical Psychology', 'English Studies'],
    tuition_range: '€3,500 - €4,800 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,500 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€380 - €520 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-swps-1', name: 'B.A. Psychology & Behavioral Science', degree_level: 'Bachelor', tuition_fee: '€3,500 / yr', duration: '3 Years' },
      { id: 'cp-swps-2', name: 'B.A. UI/UX Design & Digital Media', degree_level: 'Bachelor', tuition_fee: '€3,800 / yr', duration: '3 Years' }
    ]
  },
  {
    id: 'u-7',
    name: 'Technical University of Munich (TUM)',
    country: 'Germany',
    city: 'Munich',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80',
    badge: 'Top European Rank',
    category: 'Engineering',
    description: 'Germany’s premier University of Excellence with tuition-free / low administrative fees for high-achieving applicants.',
    ranking: 7,
    rating: 4.9,
    programs: ['M.Sc Informatics', 'B.Sc Management & Technology', 'M.Sc Aerospace Engineering', 'Data Engineering'],
    tuition_range: '€0 - €1,500 / semester',
    is_active: true,
    intakes: ['October 2026', 'April 2027'],
    university_fee: '€1,500 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹30,000',
    living_cost_monthly: '€850 - €1,100 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'cp-tum-1', name: 'M.Sc Informatics & Computer Science', degree_level: 'Master', tuition_fee: '€1,500 / yr', duration: '2 Years' },
      { id: 'cp-tum-2', name: 'B.Sc Management & Technology', degree_level: 'Bachelor', tuition_fee: '€1,200 / yr', duration: '3 Years' }
    ]
  },
  {
    id: 'u-8',
    name: 'Charles University',
    country: 'Czech Republic',
    city: 'Prague',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?auto=format&fit=crop&w=800&q=80',
    badge: 'Historic Heritage',
    category: 'Medicine',
    description: 'One of the oldest universities in Europe offering world-class General Medicine and Computer Science programs.',
    ranking: 8,
    rating: 4.9,
    programs: ['General Medicine (MD)', 'B.Sc Computer Science', 'M.Sc Economics & Finance', 'Pharmacy'],
    tuition_range: '€4,000 - €12,000 / yr',
    is_active: true,
    intakes: ['September 2026', 'February 2027'],
    university_fee: '€4,500 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€400 - €600 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'cp-cuni-1', name: 'B.Sc Computer Science & Data Analytics', degree_level: 'Bachelor', tuition_fee: '€4,500 / yr', duration: '3 Years' },
      { id: 'cp-cuni-2', name: 'General Medicine (6-Year MD Program)', degree_level: 'Master', tuition_fee: '€12,500 / yr', duration: '6 Years' }
    ]
  },
  {
    id: 'u-9',
    name: 'Sapienza University of Rome',
    country: 'Italy',
    city: 'Rome',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
    badge: 'Affordable Living',
    category: 'IT & CS',
    description: 'Top public Italian university with extensive regional DSU scholarships covering tuition and accommodation.',
    ranking: 9,
    rating: 4.8,
    programs: ['B.Sc Applied Computer Science & AI', 'M.Sc Data Science', 'B.A. Sustainable Building Engineering', 'Classics'],
    tuition_range: '€1,000 - €2,800 / yr',
    is_active: true,
    intakes: ['September 2026', 'February 2027'],
    university_fee: '€1,800 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€500 - €750 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'cp-sap-1', name: 'B.Sc Applied Computer Science & Artificial Intelligence', degree_level: 'Bachelor', tuition_fee: '€1,800 / yr', duration: '3 Years' },
      { id: 'cp-sap-2', name: 'M.Sc Data Science & Big Data', degree_level: 'Master', tuition_fee: '€2,200 / yr', duration: '2 Years' }
    ]
  }
];

export async function getUniversities(): Promise<University[]> {
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (error || !data || data.length === 0) {
      const local = localStorage.getItem('ferex_local_universities');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
      localStorage.setItem('ferex_local_universities', JSON.stringify(BASELINE_UNIVERSITIES));
      return BASELINE_UNIVERSITIES;
    }

    // Cache to localStorage
    try {
      localStorage.setItem('ferex_local_universities', JSON.stringify(data));
    } catch (e) {}

    return (data ?? []) as University[];
  } catch (err) {
    console.error('[getUniversities Error]:', err);
    const local = localStorage.getItem('ferex_local_universities');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return BASELINE_UNIVERSITIES;
  }
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
  const newId = generateUUID();
  const createdObj: University = {
    id: newId,
    name: payload.name,
    country: payload.country,
    city: payload.city || '',
    logo_url: payload.logo_url || '',
    image_url: payload.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
    badge: payload.badge || 'Accredited',
    category: payload.category || 'General',
    description: payload.description || 'Premier European institution with accredited English taught programs.',
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
  let existingList: University[] = [];
  try {
    const local = localStorage.getItem('ferex_local_universities');
    existingList = local ? JSON.parse(local) : BASELINE_UNIVERSITIES;
  } catch (e) {}

  const current = existingList.find(u => u.id === id) || BASELINE_UNIVERSITIES.find(u => u.id === id);

  const updatedObj: University = {
    id,
    name: payload.name ?? current?.name ?? 'University',
    country: payload.country ?? current?.country ?? 'Poland',
    city: payload.city ?? current?.city ?? '',
    logo_url: payload.logo_url ?? current?.logo_url ?? '',
    image_url: payload.image_url ?? current?.image_url ?? 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
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

  try {
    await supabase.from('universities').update(payload).eq('id', id);
  } catch (err) {}

  try {
    const updated = existingList.map(u => u.id === id ? updatedObj : u);
    localStorage.setItem('ferex_local_universities', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_university_change'));
  return updatedObj;
}

export async function deleteUniversity(id: string) {
  try {
    await supabase.from('universities').delete().eq('id', id);
  } catch (err) {
    console.warn('[deleteUniversity Error]:', err);
  }

  try {
    const local = localStorage.getItem('ferex_local_universities');
    if (local) {
      const parsed = JSON.parse(local);
      const filtered = parsed.filter((u: any) => u.id !== id);
      localStorage.setItem('ferex_local_universities', JSON.stringify(filtered));
    }
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_university_change'));
}
