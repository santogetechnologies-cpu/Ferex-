import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

export const BASELINE_UNIVERSITIES: University[] = [
  {
    id: '22222222-0000-4000-a000-000000000001',
    name: 'Warsaw University of Technology',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80',
    image_url: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
    badge: 'Premier Technical',
    category: 'Engineering',
    description: 'One of the leading technology institutes in Central Europe, ranked top in Poland for engineering & computer science programs taught in English.',
    ranking: 1,
    rating: 4.9,
    programs: ['Computer Science & AI', 'Mechanical Engineering', 'Civil Engineering', 'Applied Cybersecurity'],
    tuition_range: '€3,200 - €4,500 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,500 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€350 - €500 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'prog-wut-1', name: 'B.Sc. Computer Science & Information Systems', degree: 'Bachelor', duration: '3.5 Years', tuition_fee: '€3,500 / yr', intake: 'October 2026', language: 'English' },
      { id: 'prog-wut-2', name: 'M.Sc. Artificial Intelligence & Data Science', degree: 'Master', duration: '2 Years', tuition_fee: '€4,000 / yr', intake: 'October 2026', language: 'English' }
    ],
    installments: [
      { stage: 1, name: 'Tuition Deposit / Seat Confirmation', percentage: 50, amount: '€1,750', due_trigger: 'On Unconditional Offer' },
      { stage: 2, name: 'Balance Semester 1 Tuition', percentage: 50, amount: '€1,750', due_trigger: 'Before Visa Stamping' }
    ]
  },
  {
    id: '22222222-0000-4000-a000-000000000002',
    name: 'Vistula University',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80',
    image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    badge: 'Top International',
    category: 'Business & IT',
    description: 'Renowned for global student diversity and business-oriented computer engineering degrees with comprehensive career internship programs.',
    ranking: 5,
    rating: 4.8,
    programs: ['International Business', 'Computer Engineering', 'Graphic Design & Media', 'Finance & Accounting'],
    tuition_range: '€2,800 - €3,800 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€3,000 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€350 - €500 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'prog-vis-1', name: 'B.Sc. Software Development & Web Technologies', degree: 'Bachelor', duration: '3 Years', tuition_fee: '€3,000 / yr', intake: 'October 2026', language: 'English' },
      { id: 'prog-vis-2', name: 'B.A. International Business Management', degree: 'Bachelor', duration: '3 Years', tuition_fee: '€2,800 / yr', intake: 'October 2026', language: 'English' }
    ],
    installments: [
      { stage: 1, name: 'Full Year 1 Tuition Payment', percentage: 100, amount: '€3,000', due_trigger: 'On Admission Acceptance' }
    ]
  },
  {
    id: '22222222-0000-4000-a000-000000000003',
    name: 'Technical University of Munich (TUM)',
    country: 'Germany',
    city: 'Munich',
    logo_url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=150&auto=format&fit=crop&q=80',
    image_url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
    badge: 'Excellence University',
    category: 'Technology & Science',
    description: 'German University of Excellence, globally renowned for cutting-edge engineering, computing, and high employment outcomes.',
    ranking: 1,
    rating: 4.95,
    programs: ['Informatics & Data Engineering', 'Automotive & Mobility', 'Bioengineering', 'Aerospace Engineering'],
    tuition_range: '€4,000 - €6,000 / yr',
    is_active: true,
    intakes: ['October 2026'],
    university_fee: '€4,500 / yr',
    vfs_fee: '₹18,000',
    agency_fee: '₹30,000',
    living_cost_monthly: '€850 - €1,100 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'prog-tum-1', name: 'M.Sc. Data Engineering and Analytics', degree: 'Master', duration: '2 Years', tuition_fee: '€4,500 / yr', intake: 'October 2026', language: 'English' },
      { id: 'prog-tum-2', name: 'B.Sc. Management and Data Science', degree: 'Bachelor', duration: '3 Years', tuition_fee: '€4,000 / yr', intake: 'October 2026', language: 'English' }
    ],
    installments: [
      { stage: 1, name: 'Semester 1 Administrative & Tuition Contribution', percentage: 50, amount: '€2,250', due_trigger: 'On Unconditional Enrollment' },
      { stage: 2, name: 'Semester 2 Contribution', percentage: 50, amount: '€2,250', due_trigger: 'End of Semester 1' }
    ]
  },
  {
    id: '22222222-0000-4000-a000-000000000004',
    name: 'Berlin International University of Applied Sciences',
    country: 'Germany',
    city: 'Berlin',
    logo_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=150&auto=format&fit=crop&q=80',
    image_url: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=800&auto=format&fit=crop&q=80',
    badge: 'Accredited Berlin',
    category: 'Applied Sciences',
    description: 'State-accredited institution in Berlin offering 100% English-taught bachelor and master degrees in technology, design, and commerce.',
    ranking: 12,
    rating: 4.75,
    programs: ['Data Science & Business Computing', 'Digital Product Management', 'Interior Architecture', 'International Finance'],
    tuition_range: '€7,200 - €8,400 / yr',
    is_active: true,
    intakes: ['October 2026', 'April 2027'],
    university_fee: '€7,800 / yr',
    vfs_fee: '₹18,000',
    agency_fee: '₹30,000',
    living_cost_monthly: '€850 - €1,100 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'prog-biu-1', name: 'B.Sc. Data Science and Business Analytics', degree: 'Bachelor', duration: '3 Years', tuition_fee: '€7,800 / yr', intake: 'October 2026', language: 'English' }
    ],
    installments: [
      { stage: 1, name: 'Semester 1 Tuition & Registration Deposit', percentage: 50, amount: '€3,900', due_trigger: 'On Contract Signing' },
      { stage: 2, name: 'Semester 2 Tuition Fee', percentage: 50, amount: '€3,900', due_trigger: 'Prior to Semester 2 start' }
    ]
  },
  {
    id: '22222222-0000-4000-a000-000000000005',
    name: 'University of Greenwich',
    country: 'United Kingdom',
    city: 'London',
    logo_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=150&auto=format&fit=crop&q=80',
    image_url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
    badge: 'London Campus',
    category: 'Technology & Computing',
    description: 'Historic London campus with state-of-the-art computing facilities, extensive business accreditations, and strong UK graduate route visa support.',
    ranking: 85,
    rating: 4.7,
    programs: ['MSc Big Data & Business Intelligence', 'BSc Computing & Systems', 'MBA International Business'],
    tuition_range: '£15,500 - £17,500 / yr',
    is_active: true,
    intakes: ['September 2026', 'January 2027'],
    university_fee: '£16,000 / yr',
    vfs_fee: '₹22,000',
    agency_fee: '₹35,000',
    living_cost_monthly: '£1,100 - £1,400 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'prog-grw-1', name: 'MSc Data Science & AI', degree: 'Master', duration: '1 Year', tuition_fee: '£16,000 / yr', intake: 'September 2026', language: 'English' }
    ],
    installments: [
      { stage: 1, name: 'Initial CAS Tuition Deposit', percentage: 50, amount: '£8,000', due_trigger: 'For CAS Issuance' },
      { stage: 2, name: 'Enrollment Balance on Arrival', percentage: 50, amount: '£8,000', due_trigger: 'During Campus Enrollment' }
    ]
  },
  {
    id: '22222222-0000-4000-a000-000000000006',
    name: 'Seneca Polytechnic',
    country: 'Canada',
    city: 'Toronto',
    logo_url: 'https://images.unsplash.com/photo-1517935703635-27c946452f7b?w=150&auto=format&fit=crop&q=80',
    image_url: 'https://images.unsplash.com/photo-1517935703635-27c946452f7b?w=800&auto=format&fit=crop&q=80',
    badge: 'Polytechnic Leader',
    category: 'Applied Technology',
    description: 'Premier Canadian polytechnic institution in Toronto offering provincial attestation letter (PAL) supported programs with co-op work placements.',
    ranking: 15,
    rating: 4.8,
    programs: ['Computer Programming & Analysis', 'Cloud Architecture Administration', 'Global Supply Chain Management'],
    tuition_range: 'CAD $16,500 - $19,000 / yr',
    is_active: true,
    intakes: ['September 2026', 'January 2027'],
    university_fee: 'CAD $17,500 / yr',
    vfs_fee: '₹20,000',
    agency_fee: '₹35,000',
    living_cost_monthly: 'CAD $1,200 - $1,600 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'prog-sen-1', name: 'Advanced Diploma in Software Development', degree: 'Diploma', duration: '3 Years', tuition_fee: 'CAD $17,500 / yr', intake: 'September 2026', language: 'English' }
    ],
    installments: [
      { stage: 1, name: 'Year 1 Tuition Deposit for PAL / LOA', percentage: 100, amount: 'CAD $17,500', due_trigger: 'On Unconditional Offer' }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'ferex_universities_cache';
const MASTER_STORAGE_KEY = 'ferex_custom_universities';

export const DEFAULT_CAMPUS_IMAGES = [
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517935703635-27c946452f7b?w=800&auto=format&fit=crop&q=80'
];

function isJunkUniversity(u: any): boolean {
  if (!u || !u.name) return true;
  const name = u.name.toLowerCase().trim();
  if (name.startsWith('ssss') || name === 'test warsaw auth' || name === 'probe uni') return true;
  return false;
}

export async function getUniversities(): Promise<University[]> {
  let list: University[] = [];

  // 1. SUPABASE DATABASE FIRST: Fetch live rows from Supabase
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      list = data.filter((u: any) => !isJunkUniversity(u)) as University[];
    }
  } catch (err) {
    console.warn('[getUniversities DB Warning]:', err);
  }

  // 2. Check system_config catalog backup if table returned empty
  if (list.length === 0) {
    try {
      const { data: cfg } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'ferex_universities_catalog')
        .maybeSingle();

      if (cfg?.value && Array.isArray(cfg.value) && cfg.value.length > 0) {
        list = cfg.value.filter((u: any) => !isJunkUniversity(u));
      }
    } catch {}
  }

  // 3. Fallback to verified baseline universities
  if (list.length === 0) {
    list = [...BASELINE_UNIVERSITIES];
  }

  // Ensure default baseline universities are present
  BASELINE_UNIVERSITIES.forEach(def => {
    if (!list.some(u => u.name.toLowerCase().trim() === def.name.toLowerCase().trim())) {
      list.push(def);
    }
  });

  // Enrich with images/badges if table only stored minimal columns
  const enrichedList = list.map(u => {
    const baselineMatch = BASELINE_UNIVERSITIES.find(b => b.name.toLowerCase().trim() === u.name.toLowerCase().trim());
    return {
      ...u,
      image_url: u.image_url || baselineMatch?.image_url || DEFAULT_CAMPUS_IMAGES[0],
      badge: u.badge || baselineMatch?.badge || 'Accredited Partner',
      category: u.category || baselineMatch?.category || 'Higher Education',
      description: u.description || baselineMatch?.description || `${u.name} offers internationally accredited degree programs with global recognition.`,
      living_cost_monthly: u.living_cost_monthly || baselineMatch?.living_cost_monthly || '€450 - €650 / mo',
      nawa_required: u.nawa_required !== undefined ? u.nawa_required : (u.country?.toLowerCase() === 'poland'),
    };
  });

  // Update local cache
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(enrichedList));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(enrichedList));
  } catch {}

  return enrichedList;
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
  const trimmedName = payload.name.trim();
  const targetCountry = payload.country.trim() || 'Poland';

  const fullObject: University = {
    id: newId,
    name: trimmedName,
    country: targetCountry,
    city: payload.city?.trim() || 'Campus Center',
    logo_url: payload.logo_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80',
    image_url: payload.image_url || DEFAULT_CAMPUS_IMAGES[0],
    badge: payload.badge || 'Accredited Partner',
    category: payload.category || 'Higher Education',
    description: payload.description || `${trimmedName} offers accredited degree programs with global post-study work opportunities.`,
    ranking: payload.ranking || 100,
    rating: payload.rating || 4.8,
    programs: payload.programs && payload.programs.length > 0 ? payload.programs : ['Computer Science', 'Business Management'],
    tuition_range: payload.tuition_range || payload.university_fee || '€3,500 / yr',
    is_active: true,
    intakes: payload.intakes && payload.intakes.length > 0 ? payload.intakes : ['October 2026', 'February 2027'],
    university_fee: payload.university_fee || payload.tuition_range || '€3,500 / yr',
    vfs_fee: payload.vfs_fee || '€150',
    agency_fee: payload.agency_fee || '€250',
    living_cost_monthly: payload.living_cost_monthly || '€450 - €650 / mo',
    nawa_required: payload.nawa_required !== undefined ? payload.nawa_required : (targetCountry.toLowerCase() === 'poland'),
    course_programs: payload.course_programs && payload.course_programs.length > 0 ? payload.course_programs : [
      { id: generateUUID(), name: 'Bachelor of Science (Honours)', degree: 'Bachelor', duration: '3 Years', tuition_fee: payload.university_fee || '€3,500 / yr', intake: 'October 2026', language: 'English' }
    ],
    installments: payload.installments || [],
    semesters: payload.semesters || [],
  };

  // 1. Database insert with schema-safe columns ONLY
  const dbPayload = {
    id: fullObject.id,
    name: fullObject.name,
    country: fullObject.country,
    city: fullObject.city,
    logo_url: fullObject.logo_url?.startsWith('data:') ? '' : fullObject.logo_url,
    ranking: fullObject.ranking,
    rating: fullObject.rating,
    programs: fullObject.programs,
    tuition_range: fullObject.tuition_range,
    intakes: fullObject.intakes,
    university_fee: fullObject.university_fee,
    vfs_fee: fullObject.vfs_fee,
    agency_fee: fullObject.agency_fee,
    course_programs: fullObject.course_programs,
    installments: fullObject.installments,
    semesters: fullObject.semesters,
    is_active: true
  };

  try {
    const admin = await getAdminSupabaseClient();
    const { error: insErr } = await admin.from('universities').insert([dbPayload]);
    if (insErr) {
      console.warn('[createUniversity DB Warning]:', insErr.message);
    }

    // Also update system_config catalog backup with full object
    const currentList = await getUniversities();
    const updatedCatalog = [fullObject, ...currentList.filter(u => u.name.toLowerCase() !== fullObject.name.toLowerCase())];
    await admin.from('system_config').upsert({
      key: 'ferex_universities_catalog',
      value: updatedCatalog,
      updated_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('[createUniversity Error]:', err);
  }

  // 2. Mirror into local caches
  try {
    const existing = await getUniversities();
    const updated = [fullObject, ...existing.filter(u => u.id !== newId && u.name.toLowerCase() !== fullObject.name.toLowerCase())];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('storage'));
  return fullObject;
}

export async function updateUniversity(id: string, payload: Partial<University>): Promise<University | null> {
  const admin = await getAdminSupabaseClient();
  const dbPayload: any = {};
  const allowedCols = [
    'name', 'country', 'city', 'logo_url', 'ranking', 'rating', 'programs',
    'tuition_range', 'intakes', 'university_fee', 'vfs_fee', 'agency_fee',
    'course_programs', 'installments', 'semesters', 'is_active'
  ];

  for (const k of allowedCols) {
    if ((payload as any)[k] !== undefined) {
      dbPayload[k] = (payload as any)[k];
    }
  }

  try {
    await admin.from('universities').update(dbPayload).eq('id', id);
  } catch (err) {
    console.warn('[updateUniversity DB Warning]:', err);
  }

  // Update local
  let updatedObj: University | null = null;
  try {
    const current = await getUniversities();
    const updated = current.map(u => {
      if (u.id === id) {
        updatedObj = { ...u, ...payload };
        return updatedObj;
      }
      return u;
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('storage'));
  return updatedObj;
}

export async function deleteUniversity(id: string, name?: string): Promise<void> {
  try {
    const admin = await getAdminSupabaseClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isUuid) {
      await admin.from('universities').delete().eq('id', id);
    }
    if (name) {
      await admin.from('universities').delete().ilike('name', name.trim());
    }
  } catch (err) {
    console.warn('[deleteUniversity DB Warning]:', err);
  }

  try {
    const current = await getUniversities();
    const filtered = current.filter(u => u.id !== id && (!name || u.name.toLowerCase() !== name.toLowerCase()));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(filtered));
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('storage'));
}

export const updateUniversityRecord = updateUniversity;

export async function clearAllUniversities(): Promise<void> {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await admin.from('system_config').upsert({
      key: 'ferex_universities_catalog',
      value: [],
      updated_at: new Date().toISOString()
    });
  } catch {}
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    localStorage.removeItem(MASTER_STORAGE_KEY);
  } catch {}
  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function restoreDefaultUniversities(): Promise<University[]> {
  const admin = await getAdminSupabaseClient();
  await admin.from('universities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  const sanitized = BASELINE_UNIVERSITIES.map(u => ({
    id: u.id,
    name: u.name,
    country: u.country,
    city: u.city,
    logo_url: u.logo_url,
    ranking: u.ranking,
    rating: u.rating,
    programs: u.programs,
    tuition_range: u.tuition_range,
    intakes: u.intakes,
    university_fee: u.university_fee,
    vfs_fee: u.vfs_fee,
    agency_fee: u.agency_fee,
    course_programs: u.course_programs,
    installments: u.installments,
    semesters: u.semesters,
    is_active: true
  }));

  await admin.from('universities').insert(sanitized);
  await admin.from('system_config').upsert({
    key: 'ferex_universities_catalog',
    value: BASELINE_UNIVERSITIES,
    updated_at: new Date().toISOString()
  });

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(BASELINE_UNIVERSITIES));
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(BASELINE_UNIVERSITIES));
  } catch {}

  window.dispatchEvent(new Event('ferex_universities_change'));
  window.dispatchEvent(new Event('storage'));
  return BASELINE_UNIVERSITIES;
}
