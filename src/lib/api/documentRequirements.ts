import { supabase } from '../supabase';
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
    authority_fee: '₹1,500',
    checklist_items: ['State HRD Attestation', 'Ministry of External Affairs (MEA) Apostille']
  },
  {
    id: 'doc-pol-4',
    country: 'Poland',
    document_name: 'NAWA Recognition Certificate',
    document_type: 'Legalization',
    is_required: true,
    description: 'Kwalifikator recognition confirmation issued by NAWA Polish Agency.',
    processing_time: '14 - 21 Days',
    authority_fee: '€250',
    checklist_items: ['Eligibility statement', 'Official NAWA dossier confirmation']
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
    authority_fee: '₹6,500',
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
    authority_fee: '₹18,000',
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
    authority_fee: '₹2,500',
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
    authority_fee: '₹18,500',
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

  // Hungary Requirements
  {
    id: 'doc-hun-1',
    country: 'Hungary',
    document_name: 'Official University Admission Letter & Tuition Receipt',
    document_type: 'Academic',
    is_required: true,
    description: 'Letter of acceptance from Hungarian institution + tuition fee payment certificate.',
    processing_time: '5 - 10 Days',
    authority_fee: 'Free',
    checklist_items: ['Dean / Admissions Director signature', 'Tuition cleared confirmation']
  },
  {
    id: 'doc-hun-2',
    country: 'Hungary',
    document_name: 'Accomodation Verification (Szálláshely Igazolás)',
    document_type: 'Consular',
    is_required: true,
    description: 'Dormitory acceptance contract or private lease agreement in Hungary.',
    processing_time: '2 - 4 Days',
    authority_fee: 'Free',
    checklist_items: ['Contract with address & registration']
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
  } catch (e) {
    console.error('Error saving document requirements to storage:', e);
  }
}

export async function getAllDocumentRequirements(): Promise<DocumentRequirement[]> {
  try {
    const { data, error } = await supabase
      .from('document_requirements')
      .select('*')
      .order('country', { ascending: true });

    if (!error && data && data.length > 0) {
      const dbList = data as DocumentRequirement[];
      saveStoredRequirements(dbList);
      return dbList;
    }
  } catch (e) {
    console.warn('[getAllDocumentRequirements] DB query notice:', e);
  }
  return getStoredRequirements();
}

export async function getDocumentRequirements(country?: string): Promise<DocumentRequirement[]> {
  const all = await getAllDocumentRequirements();
  if (!country || country === 'All' || country === 'Not Set' || country === '') {
    return all;
  }
  const normalized = country.toLowerCase().trim();
  const matched = all.filter(d => 
    d.country.toLowerCase().trim() === normalized ||
    (normalized.includes('poland') && d.country.toLowerCase() === 'poland') ||
    (normalized.includes('germany') && d.country.toLowerCase() === 'germany') ||
    ((normalized.includes('uk') || normalized.includes('united kingdom')) && (d.country.toLowerCase() === 'uk' || d.country.toLowerCase() === 'united kingdom')) ||
    ((normalized.includes('usa') || normalized.includes('united states')) && (d.country.toLowerCase() === 'usa' || d.country.toLowerCase() === 'united states')) ||
    (normalized.includes('france') && d.country.toLowerCase() === 'france') ||
    (normalized.includes('italy') && d.country.toLowerCase() === 'italy') ||
    (normalized.includes('hungary') && d.country.toLowerCase() === 'hungary')
  );

  return matched.length > 0 ? matched : all.filter(d => d.country.toLowerCase() === 'poland');
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
  const updated = [newReq, ...all];
  saveStoredRequirements(updated);
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
  return true;
}

export async function resetDocumentRequirementsToDefaults(): Promise<DocumentRequirement[]> {
  saveStoredRequirements(DEFAULT_DOCUMENT_REQUIREMENTS);
  return DEFAULT_DOCUMENT_REQUIREMENTS;
}
