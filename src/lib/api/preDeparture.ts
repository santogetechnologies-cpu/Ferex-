import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export interface PreDepartureRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  university_name?: string;
  flight_booked: boolean;
  airline?: string;
  flight_no?: string;
  departure_date?: string;
  arrival_date?: string;
  arrival_city?: string;
  flight_details?: string;
  airport_pickup_opted: boolean;
  pickup_driver?: string;
  pickup_contact?: string;
  pickup_details?: string;
  dorm_assigned: boolean;
  dorm_name?: string;
  room_no?: string;
  dorm_address?: string;
  dorm_details?: string;
  insurance_purchased: boolean;
  forex_card_ready: boolean;
  sim_card_ready: boolean;
  luggage_packed: boolean;
  emergency_contacts_saved: boolean;
  briefing_attended: boolean;
  overall_progress: number;
  clearance_status?: 'Pending' | 'Pending Verification' | 'In Progress' | 'Cleared' | 'Clearance Granted' | 'Departed' | 'Documents Incomplete';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

const PREDEP_CATALOG_KEY = 'ferex_predeparture_catalog';

async function fetchPreDepartureCatalog(): Promise<PreDepartureRecord[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('value')
      .eq('key', PREDEP_CATALOG_KEY)
      .maybeSingle();
    if (data?.value && Array.isArray(data.value)) {
      return data.value;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('ferex_predeparture_cloud_catalog');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function syncPreDepartureToCloudCatalog(record: PreDepartureRecord) {
  try {
    const current = await fetchPreDepartureCatalog();
    const filtered = current.filter(r =>
      r.id !== record.id &&
      r.student_id !== record.student_id &&
      (!record.student_email || r.student_email?.toLowerCase() !== record.student_email.toLowerCase())
    );
    const updated = [record, ...filtered];
    try {
      localStorage.setItem('ferex_predeparture_cloud_catalog', JSON.stringify(updated));
    } catch {}
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      key: PREDEP_CATALOG_KEY,
      value: updated,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  } catch (e) {
    console.warn('[syncPreDepartureToCloudCatalog notice]:', e);
  }
}

function matchesStudent(r: PreDepartureRecord, targetId?: string): boolean {
  if (!targetId) return true;
  const t = targetId.toLowerCase().trim();
  return Boolean(
    (r.student_id && r.student_id.toLowerCase().trim() === t) ||
    (r.id && r.id.toLowerCase().trim() === t) ||
    (r.student_email && r.student_email.toLowerCase().trim() === t) ||
    (r.student_name && r.student_name.toLowerCase().trim() === t)
  );
}

export async function getPreDepartureRecords(studentIdentifier?: string): Promise<PreDepartureRecord[]> {
  const cloudCatalog = await fetchPreDepartureCatalog();
  if (studentIdentifier) {
    return cloudCatalog.filter(r => matchesStudent(r, studentIdentifier));
  }
  return cloudCatalog;
}

export async function savePreDepartureRecord(payload: Partial<PreDepartureRecord> & { student_id: string; student_name: string }): Promise<PreDepartureRecord> {
  const now = new Date().toISOString();
  const newId = payload.id || generateUUID();

  const hasFlight = Boolean(payload.flight_no && payload.flight_no.trim().length > 0 && !payload.flight_no.toLowerCase().includes('awaiting'));
  const hasDorm = Boolean(payload.dorm_name && payload.dorm_name.trim().length > 0 && !payload.dorm_name.toLowerCase().includes('pending'));
  const hasPickup = Boolean(payload.pickup_driver && payload.pickup_driver.trim().length > 0 && !payload.pickup_driver.toLowerCase().includes('assigned upon'));

  const studentEmail = (payload.student_email || (payload.student_id?.includes('@') ? payload.student_id : '')).toLowerCase().trim();

  const fullRecord: PreDepartureRecord = {
    id: newId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    student_email: studentEmail,
    university_name: payload.university_name || '',
    flight_booked: payload.flight_booked ?? hasFlight,
    airline: payload.airline || '',
    flight_no: payload.flight_no || '',
    departure_date: payload.departure_date || '',
    arrival_date: payload.arrival_date || '',
    arrival_city: payload.arrival_city || '',
    flight_details: payload.flight_details || '',
    airport_pickup_opted: payload.airport_pickup_opted ?? hasPickup,
    pickup_driver: payload.pickup_driver || '',
    pickup_contact: payload.pickup_contact || '',
    pickup_details: payload.pickup_details || '',
    dorm_assigned: payload.dorm_assigned ?? hasDorm,
    dorm_name: payload.dorm_name || '',
    room_no: payload.room_no || '',
    dorm_address: payload.dorm_address || '',
    dorm_details: payload.dorm_details || '',
    insurance_purchased: payload.insurance_purchased ?? true,
    forex_card_ready: payload.forex_card_ready ?? false,
    sim_card_ready: payload.sim_card_ready ?? false,
    luggage_packed: payload.luggage_packed ?? false,
    emergency_contacts_saved: payload.emergency_contacts_saved ?? false,
    briefing_attended: payload.briefing_attended ?? false,
    overall_progress: 0,
    clearance_status: payload.clearance_status || (hasFlight && hasDorm ? 'Clearance Granted' : 'In Progress'),
    notes: payload.notes || 'Pre-departure status updated.',
    created_at: payload.created_at || now,
    updated_at: now
  };

  // Compute progress percentage
  const checklistItems = [
    fullRecord.flight_booked,
    fullRecord.airport_pickup_opted,
    fullRecord.dorm_assigned,
    fullRecord.insurance_purchased,
    fullRecord.forex_card_ready,
    fullRecord.sim_card_ready,
    fullRecord.luggage_packed,
    fullRecord.emergency_contacts_saved,
    fullRecord.briefing_attended
  ];
  const completedCount = checklistItems.filter(Boolean).length;
  fullRecord.overall_progress = Math.round((completedCount / checklistItems.length) * 100);

  await syncPreDepartureToCloudCatalog(fullRecord);

  // Dispatch both event variations
  window.dispatchEvent(new Event('ferex_predeparture_change'));
  window.dispatchEvent(new Event('ferex_pre_departure_change'));
  return fullRecord;
}

export async function updatePreDepartureField(
  studentId: string,
  field: keyof PreDepartureRecord,
  value: any,
  studentName?: string
): Promise<PreDepartureRecord | null> {
  const existing = await getPreDepartureRecords(studentId);
  const current = existing.length > 0 ? existing[0] : {
    student_id: studentId,
    student_name: studentName || 'Student',
  };

  const updated = {
    ...current,
    [field]: value
  };

  const saved = await savePreDepartureRecord(updated as any);

  if (field === 'briefing_attended' && value === true) {
    try {
      await createNotification({
        user_id: studentId,
        title: 'Pre-Departure Briefing Completed',
        body: 'Your mandatory pre-departure orientation briefing has been verified by the FEREX compliance team. Have a safe journey!',
        category: 'Support'
      });
    } catch (e) {}
  }

  return saved;
}
