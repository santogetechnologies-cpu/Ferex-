import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';

export interface ServiceAgreementData {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone?: string;
  company_address: string;
  contact_numbers: string[];
  official_email: string;
  signature_data: string;
  signature_type: 'drawn' | 'typed';
  signed_at: string;
  registration_fee: number;
  application_fee: number;
  visa_fee: number;
  currency: string;
  status: 'Signed' | 'Pending';
  version: string;
}

export const COMPANY_OFFICIAL_DETAILS = {
  name: 'Ferex Education (Under Ferex Ventures Private Limited)',
  address: '12/640 Thachukuzhi, Companipady Road , Nellikuzhy PO, Kothamangalam, Kerala - 686 691',
  phones: ['+91 95448 85077', '+44 78678 67779'],
  email: 'ferexventuresoffice@gmail.com',
  gstin: '32AAGCF8602A1Z8',
  pan: 'AAGCF8602A',
};

const STORAGE_PREFIX = 'ferex_service_agreement_';

export function getLocalAgreement(studentId: string): ServiceAgreementData | null {
  if (!studentId) return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${studentId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local agreement:', err);
  }
  return null;
}

export function isAgreementSigned(studentId: string): boolean {
  if (!studentId) return false;
  const agreement = getLocalAgreement(studentId);
  return Boolean(agreement && agreement.status === 'Signed' && agreement.signature_data);
}

export async function fetchStudentAgreement(studentId: string, email?: string): Promise<ServiceAgreementData | null> {
  const local = getLocalAgreement(studentId);
  if (local && local.status === 'Signed') {
    return local;
  }

  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    // Check system_config or service_agreements table
    const { data: configRow } = await client
      .from('system_config')
      .select('value')
      .eq('key', `agreement_${studentId}`)
      .maybeSingle();

    if (configRow?.value) {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${studentId}`, JSON.stringify(configRow.value));
        return configRow.value as ServiceAgreementData;
      } catch {}
    }

    // Fallback: check by email if available
    if (email) {
      const { data: configByEmail } = await client
        .from('system_config')
        .select('value')
        .eq('key', `agreement_email_${email.toLowerCase().trim()}`)
        .maybeSingle();
      if (configByEmail?.value) {
        try {
          localStorage.setItem(`${STORAGE_PREFIX}${studentId}`, JSON.stringify(configByEmail.value));
          return configByEmail.value as ServiceAgreementData;
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Could not fetch agreement from remote db, using local:', err);
  }

  return local;
}

export async function saveStudentAgreement(agreement: ServiceAgreementData): Promise<ServiceAgreementData> {
  const key = `${STORAGE_PREFIX}${agreement.student_id}`;
  try {
    localStorage.setItem(key, JSON.stringify(agreement));
    if (agreement.student_email) {
      localStorage.setItem(`ferex_agreement_signed_${agreement.student_email.toLowerCase()}`, 'true');
    }
    window.dispatchEvent(new CustomEvent('ferex_agreement_change', { detail: agreement }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.error('Failed to save agreement locally:', err);
  }

  // Persist to remote Supabase in background
  (async () => {
    try {
      const admin = await getAdminSupabaseClient();
      const client = admin || supabase;
      const now = new Date().toISOString();

      await client.from('system_config').upsert([
        {
          key: `agreement_${agreement.student_id}`,
          value: agreement,
          updated_at: now,
        },
        ...(agreement.student_email
          ? [
              {
                key: `agreement_email_${agreement.student_email.toLowerCase().trim()}`,
                value: agreement,
                updated_at: now,
              },
            ]
          : []),
      ], { onConflict: 'key' });

      // Update public.users agreement timestamp flag if exists
      try {
        await client
          .from('users')
          .update({
            agreement_signed_at: agreement.signed_at,
            agreement_status: 'Signed',
          })
          .eq('id', agreement.student_id);
      } catch {}
    } catch (remoteErr) {
      console.warn('Notice saving agreement remotely:', remoteErr);
    }
  })();

  return agreement;
}

export async function getAllSignedAgreementsAdmin(): Promise<ServiceAgreementData[]> {
  const results: ServiceAgreementData[] = [];
  const visitedIds = new Set<string>();

  // Gather from localStorage
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.student_id && !visitedIds.has(parsed.student_id)) {
            visitedIds.add(parsed.student_id);
            results.push(parsed);
          }
        }
      }
    }
  } catch {}

  // Gather from Supabase
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data } = await client
      .from('system_config')
      .select('key, value')
      .like('key', 'agreement_%');

    if (data) {
      for (const row of data) {
        if (row.value && row.value.student_id && !visitedIds.has(row.value.student_id)) {
          visitedIds.add(row.value.student_id);
          results.push(row.value as ServiceAgreementData);
        }
      }
    }
  } catch {}

  return results;
}
