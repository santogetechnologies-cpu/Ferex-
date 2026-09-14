import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

export const BASELINE_UNIVERSITIES: University[] = [
  {
    id: 'uni-pol-1',
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
    id: 'uni-pol-2',
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
    id: 'uni-ger-1',
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
    id: 'uni-ger-2',
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
    id: 'uni-uk-1',
    name: 'University of Greenwich',
    country: 'UK',
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
    id: 'uni-can-1',
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

const MASTER_STORAGE_KEY = 'ferex_custom_universities';
const LOCAL_CACHE_KEY = 'ferex_local_universities';
const DELETED_STORAGE_KEY = 'ferex_deleted_university_ids';

// Fallback campus images if custom image is missing or excessively large
export const DEFAULT_CAMPUS_IMAGES = [
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517935703635-27c946452f7b?w=800&auto=format&fit=crop&q=80'
];

export function getDeletedUniversityIds(): string[] {
  try {
    const raw = localStorage.getItem(DELETED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(x => typeof x === 'string' && x.trim().length > 0);
    }
  } catch {}
  return [];
}

export function isDeletedUniversity(
  u: { id?: string; name?: string } | null | undefined,
  deletedList: string[]
): boolean {
  if (!u) return true;
  if (!deletedList || deletedList.length === 0) return false;
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

function getStoredCustomUniversities(): University[] {
  try {
    const raw = localStorage.getItem(MASTER_STORAGE_KEY) || sessionStorage.getItem(MASTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function sanitizeUniversityForStorage(u: University): University {
  let img = u.image_url || '';
  // If base64 image exceeds 80KB, fallback to CDN image to avoid filling up 5MB localStorage quota
  if (img.startsWith('data:') && img.length > 85000) {
    img = DEFAULT_CAMPUS_IMAGES[Math.floor(Math.random() * DEFAULT_CAMPUS_IMAGES.length)];
  }
  let logo = u.logo_url || '';
  if (logo.startsWith('data:') && logo.length > 40000) {
    logo = '';
  }
  return {
    ...u,
    image_url: img,
    logo_url: logo
  };
}

function saveStoredCustomUniversities(list: University[]) {
  const sanitizedList = list.map(sanitizeUniversityForStorage);
  try {
    localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(sanitizedList));
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(sanitizedList));
  } catch (storageErr) {
    console.warn('[universities API] localStorage save warning, applying compact storage:', storageErr);
    try {
      // Further reduce to preserve all critical university data without large images
      const minimalList = sanitizedList.map(u => ({
        ...u,
        image_url: u.image_url?.startsWith('data:') ? DEFAULT_CAMPUS_IMAGES[0] : u.image_url,
        logo_url: ''
      }));
      localStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(minimalList));
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(minimalList));
    } catch {}
  }
  try {
    sessionStorage.setItem(MASTER_STORAGE_KEY, JSON.stringify(sanitizedList));
  } catch {}
}

export async function getUniversities(): Promise<University[]> {
  const deletedIds = getDeletedUniversityIds();
  const customUnis = getStoredCustomUniversities();

  let fetchedFromDb: University[] = [];
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      fetchedFromDb = data as University[];
    }
  } catch {}

  const merged: University[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  // 1. Custom / Admin-created universities take top priority
  for (const u of customUnis) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    const nameKey = (u.name || '').toLowerCase().trim();
    if (seenIds.has(u.id) || (nameKey && seenNames.has(nameKey))) continue;
    seenIds.add(u.id);
    if (nameKey) seenNames.add(nameKey);
    merged.push(u);
  }

  // 2. Add database universities
  for (const u of fetchedFromDb) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    const nameKey = (u.name || '').toLowerCase().trim();
    if (seenIds.has(u.id) || (nameKey && seenNames.has(nameKey))) continue;
    seenIds.add(u.id);
    if (nameKey) seenNames.add(nameKey);
    merged.push(u);
  }

  // 3. Fallback to baseline default universities if needed
  for (const u of BASELINE_UNIVERSITIES) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    const nameKey = (u.name || '').toLowerCase().trim();
    if (seenIds.has(u.id) || (nameKey && seenNames.has(nameKey))) continue;
    seenIds.add(u.id);
    if (nameKey) seenNames.add(nameKey);
    merged.push(u);
  }

  try {
    localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(merged));
  } catch {}

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
  const newId = generateUUID();
  const trimmedName = payload.name.trim();
  const targetCountry = payload.country.trim() || 'Poland';
  
  const createdObj: University = {
    id: newId,
    name: trimmedName,
    country: targetCountry,
    city: payload.city?.trim() || 'Campus Center',
    logo_url: payload.logo_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=150&auto=format&fit=crop&q=80',
    image_url: payload.image_url || DEFAULT_CAMPUS_IMAGES[0],
    badge: payload.badge || 'Accredited Partner',
    category: payload.category || 'General Studies',
    description: payload.description || `${trimmedName} offers accredited degree programs with global post-study work opportunities.`,
    ranking: payload.ranking || 100,
    rating: payload.rating || 4.8,
    programs: payload.programs && payload.programs.length > 0 ? payload.programs : ['Computer Science', 'Business Management'],
    tuition_range: payload.tuition_range || payload.university_fee || '€3,500 / yr',
    is_active: true,
    intakes: payload.intakes && payload.intakes.length > 0 ? payload.intakes : ['October 2026', 'February 2027'],
    university_fee: payload.university_fee || payload.tuition_range || '€3,500 / yr',
    vfs_fee: payload.vfs_fee || '₹15,000',
    agency_fee: payload.agency_fee || '₹25,000',
    living_cost_monthly: payload.living_cost_monthly || '€450 - €650 / mo',
    nawa_required: payload.nawa_required !== undefined ? payload.nawa_required : targetCountry.toLowerCase() === 'poland',
    course_programs: payload.course_programs && payload.course_programs.length > 0 ? payload.course_programs : [
      { id: generateUUID(), name: 'Bachelor of Science (Honours)', degree: 'Bachelor', duration: '3 Years', tuition_fee: payload.university_fee || '€3,500 / yr', intake: 'October 2026', language: 'English' }
    ],
    installments: payload.installments || [],
    semesters: payload.semesters || [],
  };

  // 1. Un-delete if this name was previously removed
  try {
    const deletedIds = getDeletedUniversityIds().filter(
      id => id.toLowerCase() !== newId.toLowerCase() && id.toLowerCase() !== trimmedName.toLowerCase()
    );
    localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(deletedIds));
  } catch {}

  // 2. Persist in master custom universities store (survives logout & refreshes)
  try {
    const customList = getStoredCustomUniversities().filter(
      u => u.id !== newId && u.name.toLowerCase() !== trimmedName.toLowerCase()
    );
    const updated = [createdObj, ...customList];
    saveStoredCustomUniversities(updated);
  } catch {}

  // 3. Attempt Supabase insert with sanitized payload
  try {
    const dbPayload = {
      id: createdObj.id,
      name: createdObj.name,
      country: createdObj.country,
      city: createdObj.city,
      logo_url: createdObj.logo_url?.startsWith('data:') ? '' : createdObj.logo_url,
      image_url: createdObj.image_url?.startsWith('data:') ? DEFAULT_CAMPUS_IMAGES[0] : createdObj.image_url,
      badge: createdObj.badge,
      category: createdObj.category,
      description: createdObj.description,
      living_cost_monthly: createdObj.living_cost_monthly,
      nawa_required: createdObj.nawa_required,
      ranking: createdObj.ranking,
      rating: createdObj.rating,
      programs: createdObj.programs,
      tuition_range: createdObj.tuition_range,
      intakes: createdObj.intakes,
      university_fee: createdObj.university_fee,
      vfs_fee: createdObj.vfs_fee,
      agency_fee: createdObj.agency_fee,
      course_programs: createdObj.course_programs,
      installments: createdObj.installments,
      semesters: createdObj.semesters,
      is_active: true
    };
    await supabase.from('universities').insert(dbPayload);
  } catch (dbErr) {
    console.warn('[universities API] Supabase insert warning (persisted locally):', dbErr);
  }

  // 4. Auto-register destination country in local registry if not already present
  try {
    const rawDest = localStorage.getItem('ferex_destinations_registry');
    const existingDests = rawDest ? JSON.parse(rawDest) : [];
    if (Array.isArray(existingDests)) {
      const alreadyHas = existingDests.some((d: any) => d.name?.toLowerCase() === targetCountry.toLowerCase());
      if (!alreadyHas) {
        existingDests.push({
          id: 'dest_' + Date.now(),
          name: targetCountry,
          code: targetCountry.substring(0, 2).toUpperCase(),
          flag: '🌍',
          currency: 'EUR',
          authority: `${targetCountry} Higher Education & Legalization Authority`,
          acronym: targetCountry.substring(0, 4).toUpperCase(),
          processing: '15-30 Days',
          fee: '€50',
          desk: `${targetCountry} Admissions Desk`,
          badge: 'Accredited Partner Country',
          is_active: true
        });
        localStorage.setItem('ferex_destinations_registry', JSON.stringify(existingDests));
        window.dispatchEvent(new Event('ferex_destinations_change'));
      }
    }
  } catch {}

  // Broadcast update events immediately across components and tabs
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));

  return createdObj;
}

export async function updateUniversityRecord(id: string, payload: Partial<University>): Promise<University> {
  const customUnis = getStoredCustomUniversities();
  const current = customUnis.find(u => u.id === id) || BASELINE_UNIVERSITIES.find(u => u.id === id);

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

  try {
    const updatedCustom = customUnis.some(u => u.id === id)
      ? customUnis.map(u => u.id === id ? updatedObj : u)
      : [updatedObj, ...customUnis];
    saveStoredCustomUniversities(updatedCustom);
  } catch {}

  try {
    await supabase.from('universities').update(payload).eq('id', id);
  } catch {}

  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  return updatedObj;
}

export async function deleteUniversity(id: string, name?: string) {
  const toDelete = new Set<string>();
  if (id) { toDelete.add(id.trim()); toDelete.add(id.trim().toLowerCase()); }
  if (name) { toDelete.add(name.trim()); toDelete.add(name.trim().toLowerCase()); }

  const deleteItems = Array.from(toDelete).filter(Boolean);

  try {
    const existingDeleted = getDeletedUniversityIds();
    localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(Array.from(new Set([...existingDeleted, ...deleteItems]))));
  } catch {}

  try {
    const customList = getStoredCustomUniversities().filter(u => !isDeletedUniversity(u, deleteItems));
    saveStoredCustomUniversities(customList);
  } catch {}

  try {
    await supabase.from('universities').delete().eq('id', id);
    if (name) await supabase.from('universities').delete().ilike('name', name.trim());
  } catch {}

  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function clearAllUniversities(): Promise<void> {
  try {
    localStorage.removeItem(MASTER_STORAGE_KEY);
    localStorage.removeItem(LOCAL_CACHE_KEY);
    localStorage.removeItem(DELETED_STORAGE_KEY);
  } catch {}
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function restoreDefaultUniversities(): Promise<University[]> {
  try {
    localStorage.removeItem(DELETED_STORAGE_KEY);
    localStorage.removeItem(MASTER_STORAGE_KEY);
    localStorage.removeItem(LOCAL_CACHE_KEY);
  } catch {}
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  return getUniversities();
}
