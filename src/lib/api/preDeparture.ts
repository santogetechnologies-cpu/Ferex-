import { supabase } from '../supabase';
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
  clearance_status?: 'Pending' | 'In Progress' | 'Cleared' | 'Clearance Granted' | 'Departed' | 'Documents Incomplete';
  notes?: string;
  created_at: string;
  updated_at?: string;
}

const PRE_DEPARTURE_STORAGE_KEY = 'ferex_pre_departure_records';

function getLocalPreDepartureRecords(): PreDepartureRecord[] {
  try {
    const raw = localStorage.getItem(PRE_DEPARTURE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalPreDepartureRecords(records: PreDepartureRecord[]) {
  try {
    localStorage.setItem(PRE_DEPARTURE_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

export async function getPreDepartureRecords(studentIdentifier?: string): Promise<PreDepartureRecord[]> {
  const local = getLocalPreDepartureRecords();
  try {
    let query = supabase
      .from('pre_departure')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    let allRecs: PreDepartureRecord[] = [];
    if (!error && data && data.length > 0) {
      const dbRecs = data as PreDepartureRecord[];
      const dbIds = new Set(dbRecs.map(r => r.id || r.student_id));
      allRecs = [...dbRecs, ...local.filter(r => !dbIds.has(r.id) && !dbIds.has(r.student_id))];
    } else {
      allRecs = local;
    }

    if (studentIdentifier) {
      const idLower = studentIdentifier.toLowerCase().trim();
      return allRecs.filter(r =>
        (r.student_id && r.student_id.toLowerCase().trim() === idLower) ||
        (r.student_email && r.student_email.toLowerCase().trim() === idLower) ||
        (r.id && r.id.toLowerCase().trim() === idLower)
      );
    }
    return allRecs;
  } catch (err) {
    if (studentIdentifier) {
      const idLower = studentIdentifier.toLowerCase().trim();
      return local.filter(r =>
        (r.student_id && r.student_id.toLowerCase().trim() === idLower) ||
        (r.student_email && r.student_email.toLowerCase().trim() === idLower) ||
        (r.id && r.id.toLowerCase().trim() === idLower)
      );
    }
    return local;
  }
}

export async function savePreDepartureRecord(payload: Partial<PreDepartureRecord> & { student_id: string; student_name: string }): Promise<PreDepartureRecord> {
  const now = new Date().toISOString();
  const newId = payload.id || generateUUID();

  const hasFlight = Boolean(payload.flight_no && payload.flight_no.trim().length > 0);
  const hasDorm = Boolean(payload.dorm_name && payload.dorm_name.trim().length > 0);
  const hasPickup = Boolean(payload.pickup_driver && payload.pickup_driver.trim().length > 0);

  const fullRecord: PreDepartureRecord = {
    id: newId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    student_email: (payload.student_email || '').toLowerCase().trim(),
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

  // 1. Save to Local Storage cache
  const local = getLocalPreDepartureRecords();
  const existingIdx = local.findIndex(r =>
    (newId && r.id === newId) ||
    (fullRecord.student_id && r.student_id === fullRecord.student_id) ||
    (fullRecord.student_email && r.student_email && r.student_email.toLowerCase() === fullRecord.student_email.toLowerCase())
  );
  if (existingIdx >= 0) {
    local[existingIdx] = { ...local[existingIdx], ...fullRecord };
  } else {
    local.unshift(fullRecord);
  }
  saveLocalPreDepartureRecords(local);

  // 2. Try Supabase
  try {
    await supabase.from('pre_departure').upsert(fullRecord);
  } catch (e) {
    console.warn('[savePreDepartureRecord DB notice]:', e);
  }

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
