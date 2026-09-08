import { supabase } from '../supabase';
import type { University, PaymentInstallment, CourseSemester, CourseProgram } from '../types';
import { generateUUID } from '../../utils/uuid';

export const BASELINE_UNIVERSITIES: University[] = [
  {
    id: '11111111-1111-4000-8000-000000000001',
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
    id: '11111111-1111-4000-8000-000000000002',
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
    id: '11111111-1111-4000-8000-000000000003',
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
    id: '11111111-1111-4000-8000-000000000004',
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
    id: '11111111-1111-4000-8000-000000000005',
    name: 'Wroclaw University of Science and Technology',
    country: 'Poland',
    city: 'Wrocław',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=800&q=80',
    badge: 'Industry Partner',
    category: 'Engineering',
    description: 'Leader in European technical education with direct corporate partnerships and paid industry internships.',
    ranking: 4,
    rating: 4.7,
    programs: ['B.Sc Applied Computer Science', 'M.Sc Artificial Intelligence', 'B.Sc Mechanical Engineering', 'Automotive Systems'],
    tuition_range: '€2,800 - €4,000 / yr',
    is_active: true,
    intakes: ['October 2026', 'February 2027'],
    university_fee: '€2,800 / yr',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€320 - €470 / mo',
    nawa_required: true,
    course_programs: [
      { id: 'cp-wust-1', name: 'B.Sc Applied Computer Science & Software', degree_level: 'Bachelor', tuition_fee: '€2,800 / yr', duration: '3.5 Years' },
      { id: 'cp-wust-2', name: 'M.Sc Artificial Intelligence Systems', degree_level: 'Master', tuition_fee: '€3,200 / yr', duration: '2 Years' }
    ]
  },
  {
    id: '11111111-1111-4000-8000-000000000006',
    name: 'SWPS University of Social Sciences',
    country: 'Poland',
    city: 'Warsaw',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
    badge: 'Top Rated',
    category: 'Humanities',
    description: '#1 Private university in Poland for Psychology, UX/UI Design, and Modern English Studies.',
    ranking: 6,
    rating: 4.8,
    programs: ['B.A. Psychology in English', 'M.A. Clinical Psychology', 'B.A. UX Design', 'Management & Leadership'],
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
      { id: 'cp-swps-2', name: 'B.A. User Experience (UX) & Design', degree_level: 'Bachelor', tuition_fee: '€3,800 / yr', duration: '3 Years' }
    ]
  },
  {
    id: '11111111-1111-4000-8000-000000000007',
    name: 'Technical University of Munich (TUM)',
    country: 'Germany',
    city: 'Munich',
    logo_url: '',
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    badge: 'Top European Rank',
    category: 'Engineering',
    description: 'Germany’s Excellence University ranked among the top 30 universities worldwide with world-class tech facilities.',
    ranking: 7,
    rating: 4.9,
    programs: ['B.Sc Informatics', 'M.Sc Data Engineering and Analytics', 'M.Sc Robotics & Cognition', 'Aerospace Engineering'],
    tuition_range: '€0 - €1,500 / semester',
    is_active: true,
    intakes: ['October 2026', 'April 2027'],
    university_fee: '€1,500 / semester',
    vfs_fee: '₹15,000',
    agency_fee: '₹25,000',
    living_cost_monthly: '€850 - €1,100 / mo',
    nawa_required: false,
    course_programs: [
      { id: 'cp-tum-1', name: 'B.Sc Informatics & Computer Science', degree_level: 'Bachelor', tuition_fee: '€1,500 / sem', duration: '3 Years' },
      { id: 'cp-tum-2', name: 'M.Sc Data Engineering & Analytics', degree_level: 'Master', tuition_fee: '€1,500 / sem', duration: '2 Years' }
    ]
  },
  {
    id: '11111111-1111-4000-8000-000000000008',
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
    id: '11111111-1111-4000-8000-000000000009',
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
  const deletedIds = getDeletedUniversityIds();
  const customUnis = getCustomUniversities();

  let fetchedFromDb: University[] = [];
  try {
    const { data, error } = await supabase
      .from('universities')
      .select('*')
      .order('ranking', { ascending: true });

    if (!error && data && Array.isArray(data) && data.length > 0) {
      fetchedFromDb = data as University[];
    }
  } catch (err) {
    console.warn('[getUniversities DB Warning]:', err);
  }

  // Base list to use if DB returned rows or fallback
  const basePool = fetchedFromDb.length > 0 ? fetchedFromDb : BASELINE_UNIVERSITIES;

  // Merge: custom additions first, then base pool (avoiding duplicates by id or name)
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const merged: University[] = [];

  for (const u of customUnis) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    seenIds.add(u.id);
    seenNames.add(u.name.toLowerCase().trim());
    merged.push(u);
  }

  for (const u of basePool) {
    if (!u || !u.id || isDeletedUniversity(u, deletedIds)) continue;
    const nameKey = (u.name || '').toLowerCase().trim();
    if (seenIds.has(u.id) || seenNames.has(nameKey)) continue;
    seenIds.add(u.id);
    seenNames.add(nameKey);
    merged.push(u);
  }

  // Cache to localStorage
  try {
    localStorage.setItem('ferex_local_universities', JSON.stringify(merged));
  } catch (e) {}

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
  const createdObj: University = {
    id: newId,
    name: payload.name.trim(),
    country: payload.country.trim(),
    city: payload.city?.trim() || '',
    logo_url: payload.logo_url || '',
    image_url: payload.image_url || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=80',
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
  } catch (e) {}

  // 3. Attempt Supabase Insert
  try {
    await supabase.from('universities').insert(createdObj);
  } catch (err: any) {
    console.warn('[createUniversity Supabase Insert Notice]:', err?.message || err);
  }

  // 4. Update local cache
  try {
    const local = localStorage.getItem('ferex_local_universities');
    const existing: University[] = local ? JSON.parse(local) : [];
    const updated = [createdObj, ...existing.filter(u => u.id !== newId && u.name.toLowerCase() !== createdObj.name.toLowerCase())];
    localStorage.setItem('ferex_local_universities', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
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

  // Update in custom universities if present
  try {
    const customList = getCustomUniversities().map(u => u.id === id ? updatedObj : u);
    localStorage.setItem('ferex_custom_universities', JSON.stringify(customList));
  } catch {}

  // Update Supabase
  try {
    await supabase.from('universities').update(payload).eq('id', id);
  } catch (err) {}

  // Update local cache
  try {
    const updated = existingList.map(u => u.id === id ? updatedObj : u);
    localStorage.setItem('ferex_local_universities', JSON.stringify(updated));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
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

  // 7. Delete from Supabase in background (non-blocking, fails gracefully)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const targetName = name || Array.from(toDelete).find(s => s && isNaN(Number(s)) && !s.includes('-'));

  (async () => {
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
  })();

  // 8. Broadcast update events
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
}

export async function restoreDefaultUniversities(): Promise<University[]> {
  try {
    localStorage.removeItem('ferex_deleted_university_ids');
    localStorage.removeItem('ferex_local_universities');
  } catch {}
  window.dispatchEvent(new Event('ferex_university_change'));
  window.dispatchEvent(new Event('storage'));
  return BASELINE_UNIVERSITIES;
}
