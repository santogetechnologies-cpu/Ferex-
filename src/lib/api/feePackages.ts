import { supabase } from '../supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeePackageCoveredService {
  id: string;
  title: string;
  description?: string;
  is_included: boolean;
}

export interface FeePackageInstallment {
  id: string;
  title: string;
  amount: number;
  stage_trigger: number; // 1–12 matching journey stages
  timing: 'before' | 'after';
  due_description?: string;
}

export interface CountryFeePackage {
  id: string;
  country: string;
  name: string;
  description: string;
  is_active: boolean;
  total_amount: number;
  currency: 'INR' | 'EUR' | 'USD' | 'GBP' | 'PLN';
  covered_services: FeePackageCoveredService[];
  installments: FeePackageInstallment[];
  /** Advance registration fee charged on top of the installments. Disabled = not collected for package students. */
  registration_fee: { enabled: boolean; amount: number };
  terms_note?: string;
  created_at: string;
  updated_at: string;
}

/** auto: the active plan for the student's country applies; normal: standard fees only; package: a pinned plan. */
export type StudentBillingFlowMode = 'auto' | 'normal' | 'package';

export interface StudentBillingAssignment {
  student_id: string;
  flow_mode: StudentBillingFlowMode;
  package_id?: string;
  assigned_at?: string;
  assigned_by?: string;
}

// ─── Default Covered Services per Country ────────────────────────────────────

export const DEFAULT_COVERED_SERVICES: Record<string, FeePackageCoveredService[]> = {
  Poland: [
    { id: 'sworn_translation', title: 'Sworn Translation of Academic Documents (10th, 12th, Degree)', is_included: true },
    { id: 'nawa_legalization', title: 'NAWA Academic Recognition & Legalization', is_included: true },
    { id: 'apostille_attestation', title: 'Apostille / Embassy Attestation Assistance', is_included: true },
    { id: 'university_application', title: 'University Application & Admission Letter Procurement', is_included: true },
    { id: 'vfs_booking', title: 'VFS Global Visa Appointment Booking', is_included: true },
    { id: 'visa_documentation', title: 'Schengen D-Type Student Visa Dossier Preparation', is_included: true },
    { id: 'insurance_support', title: 'Travel Health Insurance Guidance (€30,000 Schengen)', is_included: false },
    { id: 'accommodation_support', title: 'Accommodation Search & Dorm Booking Assistance', is_included: false },
  ],
  Germany: [
    { id: 'aps_evaluation', title: 'APS (German Academic Evaluation) Dossier & Interview Prep', is_included: true },
    { id: 'university_application', title: 'University Application & Admission Letter Procurement', is_included: true },
    { id: 'blocked_account', title: 'Blocked Account (Sperrkonto) Setup Assistance', is_included: true },
    { id: 'vfs_booking', title: 'VFS / Embassy Appointment Booking', is_included: true },
    { id: 'visa_documentation', title: 'National Type-D Student Visa Dossier Preparation', is_included: true },
    { id: 'insurance_support', title: 'Public Health Insurance (TK/AOK) Enrollment Support', is_included: false },
    { id: 'accommodation_support', title: 'Student Housing & Dorm Registration Guidance', is_included: false },
  ],
  'United Kingdom': [
    { id: 'cas_support', title: 'CAS (Confirmation of Acceptance for Studies) Guidance', is_included: true },
    { id: 'university_application', title: 'UCAS / Direct University Application Management', is_included: true },
    { id: 'vfs_booking', title: 'VFS UK Biometric Appointment Booking', is_included: true },
    { id: 'visa_documentation', title: 'Student Route Visa Dossier Preparation', is_included: true },
    { id: 'financial_proof', title: 'Financial Maintenance Funds Documentation Support', is_included: false },
    { id: 'accommodation_support', title: 'UK Accommodation & University Halls Guidance', is_included: false },
  ],
  France: [
    { id: 'campus_france', title: 'Campus France EEF Pre-Consular Interview Preparation', is_included: true },
    { id: 'university_application', title: 'University Application (Études en France Portal)', is_included: true },
    { id: 'vfs_booking', title: 'VFS France Visa Appointment Booking', is_included: true },
    { id: 'visa_documentation', title: 'Long-Stay Student Visa Dossier Preparation', is_included: true },
    { id: 'caf_support', title: 'CAF Housing Allowance Application Support', is_included: false },
  ],
  Hungary: [
    { id: 'university_application', title: 'University Application & Admission Letter Procurement', is_included: true },
    { id: 'vfs_booking', title: 'Embassy / VFS Visa Appointment Booking', is_included: true },
    { id: 'visa_documentation', title: 'Hungarian National D Visa Dossier Preparation', is_included: true },
    { id: 'residence_support', title: 'Residence Permit Registration Assistance', is_included: false },
  ],
  Canada: [
    { id: 'pal_support', title: 'PAL / Study Permit Letter of Acceptance (LOA) Coordination', is_included: true },
    { id: 'university_application', title: 'University/College Application Management', is_included: true },
    { id: 'sds_support', title: 'Student Direct Stream (SDS) IELTS & GIC Guidance', is_included: true },
    { id: 'visa_documentation', title: 'Canadian Student Permit Application Dossier', is_included: true },
    { id: 'accommodation_support', title: 'On-Campus Housing & Off-Campus Guidance', is_included: false },
  ],
};

function getDefaultServices(country: string): FeePackageCoveredService[] {
  return DEFAULT_COVERED_SERVICES[country] ?? [
    { id: 'university_application', title: 'University Application & Admission Letter', is_included: true },
    { id: 'visa_documentation', title: 'Student Visa Dossier Preparation', is_included: true },
    { id: 'vfs_booking', title: 'VFS / Embassy Appointment Booking', is_included: true },
  ];
}

// ─── Default Installments ─────────────────────────────────────────────────────

function getDefaultInstallments(totalAmount: number, currency: CountryFeePackage['currency']): FeePackageInstallment[] {
  const half = Math.round(totalAmount / 2);
  return [
    {
      id: 'deposit',
      title: 'Admission Booking Deposit',
      amount: half,
      stage_trigger: 2,
      timing: 'after',
      due_description: 'Due after signing Service Agreement',
    },
    {
      id: 'completion',
      title: 'Visa & Final Processing Fee',
      amount: totalAmount - half,
      stage_trigger: 9,
      timing: 'before',
      due_description: 'Due before Visa Application submission',
    },
  ];
}

// ─── Storage key ──────────────────────────────────────────────────────────────

const CONFIG_KEY = 'ferex_country_fee_packages';
const LOCAL_KEY = 'ferex_country_fee_packages_cache';

// ─── API Functions ────────────────────────────────────────────────────────────

const normalizePackages = (list: CountryFeePackage[]): CountryFeePackage[] =>
  list.map(p => ({ ...p, registration_fee: p.registration_fee ?? { enabled: false, amount: 0 } }));

export async function getCountryFeePackages(): Promise<CountryFeePackage[]> {
  try {
    const { data } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', CONFIG_KEY)
      .maybeSingle();

    if (data?.value) {
      const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
      if (Array.isArray(parsed)) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(parsed));
        }
        return normalizePackages(parsed as CountryFeePackage[]);
      }
    }
  } catch {}

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return normalizePackages(JSON.parse(raw) as CountryFeePackage[]);
    } catch {}
  }
  return [];
}

export async function saveCountryFeePackages(packages: CountryFeePackage[]): Promise<void> {
  const { error } = await supabase.from('system_config').upsert({
    key: CONFIG_KEY,
    value: packages,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
  if (error) throw new Error(`Could not save fee plans: ${error.message}`);

  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(packages));
    window.dispatchEvent(new Event('ferex_fee_packages_change'));
  }
}

export function createBlankPackage(country: string): CountryFeePackage {
  const now = new Date().toISOString();
  const id = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    country,
    name: `${country} Complete Admission Package`,
    description: `All-inclusive admissions, legalization, and visa assistance for ${country} study pathway.`,
    // Starts inactive so creating a draft never changes what live students are billed; activate when ready.
    is_active: false,
    total_amount: 50000,
    currency: ['Germany', 'France', 'Poland', 'Hungary'].includes(country) ? 'INR' : 'INR',
    covered_services: getDefaultServices(country),
    installments: getDefaultInstallments(50000, 'INR'),
    registration_fee: { enabled: false, amount: 0 },
    terms_note: 'Package fees are non-refundable once legalization or visa processes are initiated. FEREX acts as the authorized admissions representative for all services listed.',
    created_at: now,
    updated_at: now,
  };
}

// ─── Student Billing Flow Assignment ─────────────────────────────────────────

export async function getStudentBillingAssignment(studentId: string): Promise<StudentBillingAssignment | null> {
  try {
    const { data } = await supabase
      .from('education_student_preferences')
      .select('fee_flow_mode, fee_package_id, fee_package_assigned_at, fee_package_assigned_by')
      .eq('student_id', studentId)
      .maybeSingle();

    if (data) {
      return {
        student_id: studentId,
        flow_mode: (data.fee_flow_mode as StudentBillingFlowMode) || 'auto',
        package_id: data.fee_package_id || undefined,
        assigned_at: data.fee_package_assigned_at || undefined,
        assigned_by: data.fee_package_assigned_by || undefined,
      };
    }
  } catch {}
  return null;
}

/** Destination used for billing: latest open application's university country, else the saved preference. */
export async function getStudentFeeCountry(studentId: string): Promise<string> {
  try {
    const { data: apps } = await supabase.from('applications').select('status, created_at, universities(country)')
      .eq('student_id', studentId).not('university_id', 'is', null).order('created_at', { ascending: false });
    const open = (apps || []).find((a: any) => !['Rejected', 'Withdrawn', 'Closed'].includes(a.status) && a.universities?.country);
    if (open) return (open as any).universities.country;
  } catch {}
  try {
    const { data } = await supabase.from('education_student_preferences').select('country').eq('student_id', studentId).maybeSingle();
    return data?.country || '';
  } catch { return ''; }
}

export async function setStudentBillingFlow(
  studentId: string,
  flowMode: StudentBillingFlowMode,
  packageId: string | null,
  assignedBy: string
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await supabase.from('education_student_preferences').upsert({
    student_id: studentId,
    fee_flow_mode: flowMode,
    fee_package_id: flowMode === 'package' ? packageId : null,
    fee_package_assigned_at: now,
    fee_package_assigned_by: assignedBy,
    updated_at: now,
  }, { onConflict: 'student_id' });
  if (error) throw new Error(`Could not save billing flow: ${error.message}`);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ferex_student_billing_flow_change', { detail: { studentId } }));
  }
}

export function money(value: number, currency: CountryFeePackage['currency'] = 'INR'): string {
  if (currency === 'PLN') return `${new Intl.NumberFormat('en-IN').format(value)} PLN`;
  if (currency === 'EUR') return `€${new Intl.NumberFormat('en-IN').format(value)}`;
  if (currency === 'GBP') return `£${new Intl.NumberFormat('en-IN').format(value)}`;
  if (currency === 'USD') return `$${new Intl.NumberFormat('en-US').format(value)}`;
  return `₹${new Intl.NumberFormat('en-IN').format(value)}`;
}

