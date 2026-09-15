import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { generateUUID } from '../../utils/uuid';

export interface DocumentRequirement {
  id: string;
  country: string;
  document_name: string;
  document_type: string;
  is_required: boolean;
  description?: string;
  processing_time?: string;
  authority_fee?: string;
  checklist_items?: string[];
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'ferex_document_requirements_config';

export const DEFAULT_DOCUMENT_REQUIREMENTS: DocumentRequirement[] = [
  // Poland Requirements
  {
    id: 'doc-pol-1',
    country: 'Poland',
    document_name: 'Passport (Valid min. 18 months)',
    document_type: 'Identification',
    is_required: true,
    description: 'Color scan of all biometric pages and prior Schengen travel stamps.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Front & back cover', 'Signature page', 'Min. 2 blank visa pages']
  },
  {
    id: 'doc-pol-2',
    country: 'Poland',
    document_name: 'Academic Diplomas & Marksheets',
    document_type: 'Academic',
    is_required: true,
    description: '10th, 12th / High School certificates or Bachelor degree transcripts.',
    processing_time: '3 - 5 Days',
    authority_fee: 'Free',
    checklist_items: ['Provisional / Degree certificate', 'Consolidated marksheets', 'English translation if applicable']
  },
  {
    id: 'doc-pol-3',
    country: 'Poland',
    document_name: 'Apostille / Legalization Attestation',
    document_type: 'Attestation',
    is_required: true,
    description: 'MEA Apostille stamp on original educational qualification certificates.',
    processing_time: '7 - 10 Days',
    authority_fee: '€25',
    checklist_items: ['State HRD Attestation', 'Ministry of External Affairs (MEA) Apostille']
  },
  {
    id: 'doc-pol-4',
    country: 'Poland',
    document_name: 'Legalization Recognition Certificate',
    document_type: 'Legalization',
    is_required: true,
    description: 'Higher education qualification recognition confirmation issued by Polish Ministry / Legalization Agency.',
    processing_time: '14 - 21 Days',
    authority_fee: '€250',
    checklist_items: ['Eligibility statement', 'Official legalization dossier confirmation']
  },
  {
    id: 'doc-pol-5',
    country: 'Poland',
    document_name: 'Medium of Instruction (MOI) / English Proficiency',
    document_type: 'Language',
    is_required: true,
    description: 'Official MOI issued by previous college or IELTS / TOEFL certificate.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Original college letterhead', 'Registrar signature & stamp']
  },
  {
    id: 'doc-pol-6',
    country: 'Poland',
    document_name: 'Bank Solvency Statement & Sponsor Affidavit',
    document_type: 'Financial',
    is_required: true,
    description: '6 months bank statement showing minimum funds of €3,000 equivalent.',
    processing_time: '2 - 3 Days',
    authority_fee: 'Bank charges',
    checklist_items: ['6-month bank statement', 'Bank seal & branch manager sign', 'Sponsorship affidavit']
  },
  {
    id: 'doc-pol-7',
    country: 'Poland',
    document_name: 'Schengen International Health Insurance',
    document_type: 'Insurance',
    is_required: true,
    description: 'Min. €30,000 medical coverage valid across all Schengen member states.',
    processing_time: '1 Day',
    authority_fee: '€75',
    checklist_items: ['€30,000 minimum medical coverage', 'Full repatriation coverage']
  },

  // Germany Requirements
  {
    id: 'doc-ger-1',
    country: 'Germany',
    document_name: 'Valid Passport',
    document_type: 'Identification',
    is_required: true,
    description: 'Original passport valid for at least 12 months from date of visa.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Biometric page scan', 'Address page scan']
  },
  {
    id: 'doc-ger-2',
    country: 'Germany',
    document_name: 'APS Certificate (Akademische Prüfstelle)',
    document_type: 'Legalization',
    is_required: true,
    description: 'Mandatory verification certificate from the German Academic Evaluation Centre.',
    processing_time: '30 - 45 Days',
    authority_fee: '€190',
    checklist_items: ['APS verification token', 'Original academic verification proof']
  },
  {
    id: 'doc-ger-3',
    country: 'Germany',
    document_name: 'Blocked Account Confirmation (Sperrkonto)',
    document_type: 'Financial',
    is_required: true,
    description: 'Proof of blocked funds (approx. €11,208 / year) via Coracle / Expatrio / Fintiba.',
    processing_time: '3 - 5 Days',
    authority_fee: '€11,208',
    checklist_items: ['06 Blocking confirmation document', 'Account release letter']
  },
  {
    id: 'doc-ger-4',
    country: 'Germany',
    document_name: 'Uni-Assist Evaluation / Direct University Admission Letter',
    document_type: 'Academic',
    is_required: true,
    description: 'Preliminary VPD documentation or unconditional Zulassungsbescheid.',
    processing_time: '14 - 28 Days',
    authority_fee: '€75',
    checklist_items: ['VPD certificate', 'Admission letter (Zulassung)']
  },
  {
    id: 'doc-ger-5',
    country: 'Germany',
    document_name: 'German Health Insurance Proof (Public / Private)',
    document_type: 'Insurance',
    is_required: true,
    description: 'TK / Barmer / DAK statutory or Mawista / Dr-Walter private student insurance.',
    processing_time: '1 - 2 Days',
    authority_fee: '€120 / month',
    checklist_items: ['Statutory insurance confirmation letter (M10)']
  },

  // United Kingdom (UK) Requirements
  {
    id: 'doc-uk-1',
    country: 'UK',
    document_name: 'Valid Passport',
    document_type: 'Identification',
    is_required: true,
    description: 'Current passport with at least 6 months validity beyond intended course length.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['All passport pages scanned']
  },
  {
    id: 'doc-uk-2',
    country: 'UK',
    document_name: 'CAS Statement (Confirmation of Acceptance for Studies)',
    document_type: 'Legalization',
    is_required: true,
    description: 'Unique CAS number issued by UK licensed Student Sponsor University.',
    processing_time: '7 - 14 Days',
    authority_fee: '£25',
    checklist_items: ['Official CAS letter', 'Tuition deposit receipt mentioned on CAS']
  },
  {
    id: 'doc-uk-3',
    country: 'UK',
    document_name: 'TB Clearance Test Certificate',
    document_type: 'Medical',
    is_required: true,
    description: 'Tuberculosis test from an IOM / UKVI approved clinic.',
    processing_time: '1 Day',
    authority_fee: '£40',
    checklist_items: ['Approved UKVI test clinic certificate']
  },
  {
    id: 'doc-uk-4',
    country: 'UK',
    document_name: 'UKVI 28-Day Bank Statement',
    document_type: 'Financial',
    is_required: true,
    description: 'Bank account holding remaining course fee + 9 months maintenance for 28 consecutive days.',
    processing_time: '28 Days holding',
    authority_fee: 'Bank charges',
    checklist_items: ['28-day holding letter', 'Stamp and signature on all statement pages']
  },
  {
    id: 'doc-uk-5',
    country: 'UK',
    document_name: 'ATAS Certificate (If applicable for STEM)',
    document_type: 'Academic',
    is_required: false,
    description: 'Academic Technology Approval Scheme clearance for postgraduate STEM courses.',
    processing_time: '30 Days',
    authority_fee: 'Free',
    checklist_items: ['Foreign Commonwealth Office clearance letter']
  },

  // France Requirements
  {
    id: 'doc-fra-1',
    country: 'France',
    document_name: 'Passport (Valid min. 15 months)',
    document_type: 'Identification',
    is_required: true,
    description: 'Biometric international passport.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Biometric page']
  },
  {
    id: 'doc-fra-2',
    country: 'France',
    document_name: 'Campus France EEF Dossier & Accord Préalable',
    document_type: 'Legalization',
    is_required: true,
    description: 'Études en France (EEF) account registration & interview clearance certificate.',
    processing_time: '14 - 21 Days',
    authority_fee: '€200',
    checklist_items: ['EEF File number', 'Campus France NOC interview certificate']
  },
  {
    id: 'doc-fra-3',
    country: 'France',
    document_name: 'Academic Transcripts with French / English Translation',
    document_type: 'Academic',
    is_required: true,
    description: 'Sworn certified translations of high school and university records.',
    processing_time: '3 - 5 Days',
    authority_fee: 'Translation fee',
    checklist_items: ['Sworn translator stamp']
  },
  {
    id: 'doc-fra-4',
    country: 'France',
    document_name: 'Financial Solvency & Housing Guarantee (Attestation d\'Hébergement)',
    document_type: 'Financial',
    is_required: true,
    description: 'Proof of min. €615/month living expenses + proof of accommodation in France.',
    processing_time: '3 - 7 Days',
    authority_fee: 'Free',
    checklist_items: ['Attestation d\'hébergement or CROUS reservation', '3-month sponsor pay slips']
  },

  // Italy Requirements
  {
    id: 'doc-ita-1',
    country: 'Italy',
    document_name: 'Universitaly Pre-Enrollment Summary',
    document_type: 'Legalization',
    is_required: true,
    description: 'Validated Universitaly portal pre-enrollment application signed by Italian University.',
    processing_time: '14 - 20 Days',
    authority_fee: 'Free',
    checklist_items: ['Universitaly summary sheet', 'Italian Embassy endorsement']
  },
  {
    id: 'doc-ita-2',
    country: 'Italy',
    document_name: 'Declaration of Value (DOV) / CIMEA Statement of Comparability',
    document_type: 'Attestation',
    is_required: true,
    description: 'CIMEA comparability & verification certificates for previous degree.',
    processing_time: '15 - 30 Days',
    authority_fee: '€150',
    checklist_items: ['CIMEA DiploMe QR code', 'Original legalized transcript']
  },

  // USA Requirements
  {
    id: 'doc-usa-1',
    country: 'USA',
    document_name: 'Form I-20 (Certificate of Eligibility)',
    document_type: 'Legalization',
    is_required: true,
    description: 'Signed Form I-20 issued by SEVP-certified institution with SEVIS ID.',
    processing_time: '7 - 14 Days',
    authority_fee: 'Free',
    checklist_items: ['Student signature on Page 1', 'SEVIS N00-number']
  },
  {
    id: 'doc-usa-2',
    country: 'USA',
    document_name: 'SEVIS I-901 Fee Payment Receipt',
    document_type: 'Financial',
    is_required: true,
    description: 'Official confirmation of SEVIS I-901 fee payment ($350).',
    processing_time: 'Immediate',
    authority_fee: '$350',
    checklist_items: ['SEVIS payment receipt confirmation']
  },
  {
    id: 'doc-usa-3',
    country: 'USA',
    document_name: 'Form DS-160 Confirmation Page',
    document_type: 'Consular',
    is_required: true,
    description: 'Nonimmigrant Visa Electronic Application confirmation with barcode.',
    processing_time: 'Immediate',
    authority_fee: '$185',
    checklist_items: ['CEAC barcode confirmation page']
  },

  // Canada Requirements
  {
    id: 'doc-can-1',
    country: 'Canada',
    document_name: 'Valid Passport (Min. 6 months beyond intended stay)',
    document_type: 'Identification',
    is_required: true,
    description: 'Biometric page and all pages with prior travel visas and stamps.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Biometric page', 'Address page', 'Valid for duration of study']
  },
  {
    id: 'doc-can-2',
    country: 'Canada',
    document_name: 'Provincial Attestation Letter (PAL) & Letter of Acceptance (LOA)',
    document_type: 'Legalization',
    is_required: true,
    description: 'Official DLI acceptance letter and Provincial Attestation Letter required under IRCC regulations.',
    processing_time: '7 - 14 Days',
    authority_fee: 'Free',
    checklist_items: ['Official DLI Letter of Acceptance', 'Provincial Attestation Letter (PAL) confirmation']
  },
  {
    id: 'doc-can-3',
    country: 'Canada',
    document_name: 'Guaranteed Investment Certificate (GIC) / Proof of Funds',
    document_type: 'Financial',
    is_required: true,
    description: 'CAD $20,635+ GIC certificate from Scotiabank / CIBC / ICICI or proof of 1st year living funds + tuition receipt.',
    processing_time: '3 - 5 Days',
    authority_fee: 'Bank charges',
    checklist_items: ['Official GIC confirmation letter', 'First year tuition payment receipt']
  },
  {
    id: 'doc-can-4',
    country: 'Canada',
    document_name: 'Academic Transcripts & Degree Certificates',
    document_type: 'Academic',
    is_required: true,
    description: 'Secondary and post-secondary official marksheets and passing degrees.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['10th & 12th marksheets', 'Bachelor degree certificate & consolidated transcript']
  },
  {
    id: 'doc-can-5',
    country: 'Canada',
    document_name: 'Language Proficiency / IELTS / MOI Certificate',
    document_type: 'Language',
    is_required: true,
    description: 'IELTS Academic (min. 6.0 bands) or PTE / TOEFL or MOI letter from prior institution.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Valid scorecard or institutional MOI']
  },
  {
    id: 'doc-can-6',
    country: 'Canada',
    document_name: 'Upfront Medical Examination (eMedical Sheet)',
    document_type: 'Medical',
    is_required: true,
    description: 'Immigration medical examination by an IRCC-approved panel physician.',
    processing_time: '2 - 3 Days',
    authority_fee: 'CAD $95',
    checklist_items: ['eMedical information sheet with UMI number']
  },

  // Switzerland Requirements
  {
    id: 'doc-che-1',
    country: 'Switzerland',
    document_name: 'Valid Passport',
    document_type: 'Identification',
    is_required: true,
    description: 'Passport valid for at least 3 months beyond intended exit from Switzerland.',
    processing_time: 'Immediate',
    authority_fee: 'Free',
    checklist_items: ['Biometric page', 'Signature page']
  },
  {
    id: 'doc-che-2',
    country: 'Switzerland',
    document_name: 'Swiss University Certificate of Admission (Zulassungsbestätigung)',
    document_type: 'Academic',
    is_required: true,
    description: 'Confirmation of matriculation from a recognized Swiss higher education institution.',
    processing_time: '7 - 14 Days',
    authority_fee: 'Free',
    checklist_items: ['Official university admission letter', 'Receipt of paid tuition deposit']
  },
  {
    id: 'doc-che-3',
    country: 'Switzerland',
    document_name: 'Proof of Financial Resources (CHF 21,000 / year)',
    document_type: 'Financial',
    is_required: true,
    description: 'Solvency certificate from a bank recognized in Switzerland or sponsor guarantee.',
    processing_time: '3 - 5 Days',
    authority_fee: 'Bank charges',
    checklist_items: ['Bank confirmation letter showing CHF 21,000+ equivalent']
  },

  // India / ind Requirements
  {
    id: 'doc-ind-1',
    country: 'ind',
    document_name: 'eeeeeeeee',
    document_type: 'Academic',
    is_required: true,
    description: 'eeeeeeee',
    processing_time: '3 - 7 Days',
    authority_fee: 'Free',
    checklist_items: ['Requirement 1', 'Requirement 2']
  },
  {
    id: 'doc-ind-2',
    country: 'ind',
    document_name: 'dddddddd',
    document_type: 'Academic',
    is_required: true,
    description: 'dddddddd',
    processing_time: '3 - 7 Days',
    authority_fee: 'Free',
    checklist_items: ['Requirement 1']
  }
];

function getStoredRequirements(): DocumentRequirement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Error reading document requirements from storage:', e);
  }
  return DEFAULT_DOCUMENT_REQUIREMENTS;
}

function saveStoredRequirements(reqs: DocumentRequirement[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));
    window.dispatchEvent(new Event('ferex_doc_requirements_change'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error('Error saving document requirements to storage:', e);
  }
}

const SYSTEM_CONFIG_CATALOG_KEY = 'ferex_document_requirements_catalog';

async function syncToCloudCatalog(items: DocumentRequirement[]) {
  try {
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      key: SYSTEM_CONFIG_CATALOG_KEY,
      value: items,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.warn('[syncToCloudCatalog error]:', e);
  }
}

export async function getAllDocumentRequirements(): Promise<DocumentRequirement[]> {
  try {
    // 1. Live shared Supabase cloud system_config catalog
    const { data: cfg, error: cfgErr } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', SYSTEM_CONFIG_CATALOG_KEY)
      .maybeSingle();

    if (!cfgErr && cfg?.value && Array.isArray(cfg.value) && cfg.value.length > 0) {
      const cloudList = cfg.value as DocumentRequirement[];
      const stored = getStoredRequirements();
      const cloudIds = new Set(cloudList.map(d => d.id));
      const localOnly = stored.filter(s => !cloudIds.has(s.id));
      const merged = [...cloudList, ...localOnly];
      saveStoredRequirements(merged);
      return merged;
    }
  } catch (e) {
    console.warn('[getAllDocumentRequirements] cloud fetch notice:', e);
  }

  // 2. Try direct table if present
  try {
    const { data, error } = await supabase
      .from('document_requirements')
      .select('*')
      .order('country', { ascending: true });

    if (!error && data && data.length > 0) {
      const dbList = data as DocumentRequirement[];
      const stored = getStoredRequirements();
      const dbIds = new Set(dbList.map(d => d.id));
      const localOnly = stored.filter(s => !dbIds.has(s.id));
      const merged = [...dbList, ...localOnly];
      saveStoredRequirements(merged);
      return merged;
    }
  } catch (e) {
    console.warn('[getAllDocumentRequirements] DB query notice:', e);
  }
  return getStoredRequirements();
}

export async function getDocumentRequirements(country?: string): Promise<DocumentRequirement[]> {
  const all = await getAllDocumentRequirements();
  if (!country || country === 'All' || country === 'Not Set' || country === '') {
    const seen = new Set<string>();
    return all.filter(d => {
      const k = `${(d.country || '').toLowerCase()}_${(d.document_name || '').toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  const normalized = country.toLowerCase().trim();
  const matched = all.filter(d => {
    const c = d.country.toLowerCase().trim();
    return c === normalized ||
      ((normalized === 'ind' || normalized === 'india') && (c === 'ind' || c === 'india')) ||
      (normalized.includes('poland') && c === 'poland') ||
      (normalized.includes('germany') && c === 'germany') ||
      (normalized.includes('canada') && c === 'canada') ||
      (normalized.includes('switzerland') && (c === 'switzerland' || c === 'che')) ||
      ((normalized.includes('uk') || normalized.includes('united kingdom')) && (c === 'uk' || c === 'united kingdom')) ||
      ((normalized.includes('usa') || normalized.includes('united states')) && (c === 'usa' || c === 'united states')) ||
      (normalized.includes('france') && c === 'france') ||
      (normalized.includes('italy') && c === 'italy') ||
      (normalized.includes('hungary') && c === 'hungary');
  });

  const seen = new Set<string>();
  const uniqueMatched: DocumentRequirement[] = [];
  for (const item of matched) {
    const key = (item.document_name || '').toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueMatched.push(item);
    }
  }

  if (uniqueMatched.length > 0) return uniqueMatched;

  // Standard universal international student document requirements for any destination
  return [
    {
      id: `doc-gen-${normalized}-1`,
      country,
      document_name: 'Valid International Passport',
      document_type: 'Identification',
      is_required: true,
      description: 'Full biometric passport valid for the duration of the degree program.',
      processing_time: 'Immediate',
      authority_fee: 'Free',
      checklist_items: ['Biometric page', 'Prior visas and entry stamps']
    },
    {
      id: `doc-gen-${normalized}-2`,
      country,
      document_name: 'Academic Transcripts & Degree Certificates',
      document_type: 'Academic',
      is_required: true,
      description: 'Official academic marksheets with apostille / embassy attestation as required by destination authority.',
      processing_time: '3 - 7 Days',
      authority_fee: 'Free',
      checklist_items: ['Certified transcripts', 'Graduation certificates']
    },
    {
      id: `doc-gen-${normalized}-3`,
      country,
      document_name: 'Official Institutional Admission / Offer Letter',
      document_type: 'Academic',
      is_required: true,
      description: `Official acceptance letter issued by destination institution in ${country}.`,
      processing_time: '7 - 14 Days',
      authority_fee: 'Free',
      checklist_items: ['Institutional offer letter', 'Tuition invoice / deposit receipt']
    },
    {
      id: `doc-gen-${normalized}-4`,
      country,
      document_name: 'Financial Solvency & Living Cost Proof',
      document_type: 'Financial',
      is_required: true,
      description: `Proof of living expenses and tuition funding compliant with ${country} immigration guidelines.`,
      processing_time: '3 - 5 Days',
      authority_fee: 'Bank charges',
      checklist_items: ['Bank statement / GIC / Solvency certificate', 'Affidavit of financial sponsorship']
    },
    {
      id: `doc-gen-${normalized}-5`,
      country,
      document_name: 'Destination Legalization / Attestation Dossier',
      document_type: 'Legalization',
      is_required: true,
      description: `Academic recognition and consular attestation required for ${country} visa processing.`,
      processing_time: '14 - 21 Days',
      authority_fee: 'As per authority',
      checklist_items: ['Legalized documents', 'Ministry clearance statement']
    }
  ];
}

export async function addDocumentRequirement(
  country: string,
  payload: Omit<DocumentRequirement, 'id' | 'country' | 'created_at' | 'updated_at'>
): Promise<DocumentRequirement> {
  const now = new Date().toISOString();
  const newReq: DocumentRequirement = {
    id: generateUUID(),
    country: country.trim(),
    document_name: payload.document_name.trim(),
    document_type: payload.document_type || 'General',
    is_required: payload.is_required !== undefined ? payload.is_required : true,
    description: payload.description || '',
    processing_time: payload.processing_time || '1 - 3 Days',
    authority_fee: payload.authority_fee || 'Free',
    checklist_items: payload.checklist_items || [],
    created_at: now,
    updated_at: now,
  };

  try {
    await supabase.from('document_requirements').insert(newReq);
  } catch (e) {
    console.warn('[addDocumentRequirement] DB notice:', e);
  }

  const all = getStoredRequirements();
  const updated = [newReq, ...all.filter(r => r.id !== newReq.id)];
  saveStoredRequirements(updated);
  await syncToCloudCatalog(updated);
  return newReq;
}

export async function updateDocumentRequirement(
  id: string,
  payload: Partial<DocumentRequirement>
): Promise<DocumentRequirement | null> {
  const now = new Date().toISOString();
  const updateData = { ...payload, updated_at: now };

  try {
    await supabase.from('document_requirements').update(updateData).eq('id', id);
  } catch (e) {
    console.warn('[updateDocumentRequirement] DB notice:', e);
  }

  const all = getStoredRequirements();
  let updatedReq: DocumentRequirement | null = null;
  const updated = all.map(r => {
    if (r.id === id) {
      updatedReq = { ...r, ...updateData };
      return updatedReq;
    }
    return r;
  });

  saveStoredRequirements(updated);
  await syncToCloudCatalog(updated);
  return updatedReq;
}

export async function removeDocumentRequirement(id: string): Promise<boolean> {
  try {
    await supabase.from('document_requirements').delete().eq('id', id);
  } catch (e) {
    console.warn('[removeDocumentRequirement] DB notice:', e);
  }

  const all = getStoredRequirements();
  const filtered = all.filter(r => r.id !== id);
  saveStoredRequirements(filtered);
  await syncToCloudCatalog(filtered);
  return true;
}

export async function resetDocumentRequirementsToDefaults(): Promise<DocumentRequirement[]> {
  saveStoredRequirements(DEFAULT_DOCUMENT_REQUIREMENTS);
  await syncToCloudCatalog(DEFAULT_DOCUMENT_REQUIREMENTS);
  return DEFAULT_DOCUMENT_REQUIREMENTS;
}

export interface RequirementSatisfaction {
  requirement: DocumentRequirement;
  isSatisfied: boolean;
  status: 'Missing' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  doc?: any;
}

export interface DossierStatusResult {
  totalCount: number;
  mandatoryCount: number;
  uploadedCount: number;
  uploadedMandatoryCount: number;
  missingMandatoryCount: number;
  isComplete: boolean;
  results: RequirementSatisfaction[];
}

export function isRequirementSatisfied(req: DocumentRequirement, studentDocs: any[]): {
  isSatisfied: boolean;
  status: 'Missing' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  doc?: any;
} {
  const reqNameNorm = (req.document_name || '').toLowerCase().trim();
  const reqTypeNorm = (req.document_type || '').toLowerCase().trim();

  const matchingDocs = (studentDocs || []).filter(d => {
    const dName = (d.name || d.file_name || '').toLowerCase().trim();
    const dType = (d.type || d.doc_type || '').toLowerCase().trim();
    const dReqId = (d as any).requirement_id;

    if (dReqId && dReqId === req.id) return true;
    if (dName === reqNameNorm) return true;
    if (dName && reqNameNorm && (dName.includes(reqNameNorm) || reqNameNorm.includes(dName))) return true;
    if (dType === reqTypeNorm && dName && reqNameNorm && (dName.slice(0, 4) === reqNameNorm.slice(0, 4))) return true;
    return false;
  });

  if (matchingDocs.length === 0) {
    const looseMatch = (studentDocs || []).find(d => {
      const dName = (d.name || d.file_name || '').toLowerCase().trim();
      const dType = (d.type || d.doc_type || '').toLowerCase().trim();
      return (dName && reqNameNorm && reqNameNorm.length >= 4 && (dName.includes(reqNameNorm.slice(0, 6)) || reqNameNorm.includes(dName.slice(0, 6)))) ||
             (dType && reqTypeNorm && dType === reqTypeNorm && studentDocs.length === 1);
    });

    if (looseMatch) {
      const rawStatus = (looseMatch.status || '').toLowerCase();
      if (rawStatus.includes('reject') || rawStatus.includes('re-upload')) {
        return { isSatisfied: false, status: 'Rejected', doc: looseMatch };
      }
      if (rawStatus.includes('approved') || rawStatus.includes('verified') || rawStatus.includes('passed')) {
        return { isSatisfied: true, status: 'Approved', doc: looseMatch };
      }
      if (rawStatus.includes('under review')) {
        return { isSatisfied: true, status: 'Under Review', doc: looseMatch };
      }
      return { isSatisfied: true, status: 'Submitted', doc: looseMatch };
    }

    return { isSatisfied: false, status: 'Missing' };
  }

  const approved = matchingDocs.find(d => {
    const s = (d.status || '').toLowerCase();
    return s.includes('approved') || s.includes('verified') || s.includes('passed');
  });
  if (approved) return { isSatisfied: true, status: 'Approved', doc: approved };

  const underReview = matchingDocs.find(d => (d.status || '').toLowerCase().includes('under review'));
  if (underReview) return { isSatisfied: true, status: 'Under Review', doc: underReview };

  const rejected = matchingDocs.find(d => {
    const s = (d.status || '').toLowerCase();
    return s.includes('reject') || s.includes('re-upload');
  });

  const submitted = matchingDocs.find(d => {
    const s = (d.status || '').toLowerCase();
    return s.includes('submitted') || s.includes('pending');
  });
  if (submitted) return { isSatisfied: true, status: 'Submitted', doc: submitted };

  if (rejected) return { isSatisfied: false, status: 'Rejected', doc: rejected };

  return { isSatisfied: true, status: 'Submitted', doc: matchingDocs[0] };
}

export function calculateDossierStatus(
  requirements: DocumentRequirement[],
  studentDocs: any[]
): DossierStatusResult {
  const reqs = requirements || [];
  const results: RequirementSatisfaction[] = reqs.map(req => {
    const satisfaction = isRequirementSatisfied(req, studentDocs);
    return {
      requirement: req,
      isSatisfied: satisfaction.isSatisfied,
      status: satisfaction.status,
      doc: satisfaction.doc
    };
  });

  const mandatoryResults = results.filter(r => r.requirement.is_required);
  const mandatoryCount = mandatoryResults.length;
  const uploadedMandatoryCount = mandatoryResults.filter(r => r.isSatisfied).length;
  const missingMandatoryCount = mandatoryCount - uploadedMandatoryCount;
  const isComplete = mandatoryCount > 0 ? missingMandatoryCount === 0 : (studentDocs && studentDocs.length > 0);

  return {
    totalCount: reqs.length,
    mandatoryCount,
    uploadedCount: results.filter(r => r.isSatisfied).length,
    uploadedMandatoryCount,
    missingMandatoryCount,
    isComplete,
    results
  };
}
