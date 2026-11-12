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

async function getClient() {
  try {
    return await getAdminSupabaseClient();
  } catch {
    return supabase;
  }
}

// pre_departure_checklists is the only source of truth. A JSON copy in system_config used to be merged in; it
// kept records of deleted students alive and hid failed saves, so it is no longer read or written.

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
  const client = await getClient();

  let query = client
    .from('pre_departure_checklists')
    .select(`
      *,
      student:student_id (
        id,
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(studentIdentifier || '');
  if (isUuid && studentIdentifier) {
    query = query.or(`student_id.eq.${studentIdentifier},id.eq.${studentIdentifier}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Could not load pre-departure records: ${error.message}`);

    const records: PreDepartureRecord[] = (data || []).map((d: any) => {
      const studentObj = Array.isArray(d.student) ? d.student[0] : d.student;
      return {
        id: d.id,
        student_id: d.student_id,
        student_name: studentObj?.full_name || d.student_name || 'Student',
        student_email: studentObj?.email || d.student_email || '',
        university_name: d.university_name || '',
        flight_booked: Boolean(d.flight_booked),
        airline: d.airline || '',
        flight_no: d.flight_no || '',
        departure_date: d.departure_date || '',
        arrival_date: d.arrival_date || '',
        arrival_city: d.arrival_city || '',
        flight_details: d.flight_details || '',
        airport_pickup_opted: Boolean(d.airport_pickup_opted),
        pickup_driver: d.pickup_driver || '',
        pickup_contact: d.pickup_contact || '',
        pickup_details: d.pickup_details || '',
        dorm_assigned: Boolean(d.dorm_assigned),
        dorm_name: d.dorm_name || '',
        room_no: d.room_no || '',
        dorm_address: d.dorm_address || '',
        dorm_details: d.dorm_details || '',
        insurance_purchased: Boolean(d.insurance_purchased),
        forex_card_ready: Boolean(d.forex_card_ready),
        sim_card_ready: Boolean(d.sim_card_ready),
        luggage_packed: Boolean(d.luggage_packed),
        emergency_contacts_saved: Boolean(d.emergency_contacts_saved),
        briefing_attended: Boolean(d.briefing_attended),
        overall_progress: Number(d.overall_progress) || 0,
        clearance_status: d.clearance_status || 'Pending',
        notes: d.notes || '',
        created_at: d.created_at || new Date().toISOString(),
        updated_at: d.updated_at || new Date().toISOString()
      };
    });

  return studentIdentifier ? records.filter(r => matchesStudent(r, studentIdentifier)) : records;
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
    departure_date: payload.departure_date || undefined,
    arrival_date: payload.arrival_date || undefined,
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

  // Persist to pre_departure_checklists; a failed save must be reported, not hidden.
  const client = await getClient();
  const { error: saveError } = await client.from('pre_departure_checklists').upsert({
    id: fullRecord.id,
    student_id: fullRecord.student_id,
    flight_booked: fullRecord.flight_booked,
    airline: fullRecord.airline,
    flight_no: fullRecord.flight_no,
    departure_date: fullRecord.departure_date ? fullRecord.departure_date.split('T')[0] : null,
    arrival_date: fullRecord.arrival_date ? fullRecord.arrival_date.split('T')[0] : null,
    arrival_city: fullRecord.arrival_city,
    flight_details: fullRecord.flight_details,
    airport_pickup_opted: fullRecord.airport_pickup_opted,
    pickup_driver: fullRecord.pickup_driver,
    pickup_contact: fullRecord.pickup_contact,
    pickup_details: fullRecord.pickup_details,
    dorm_assigned: fullRecord.dorm_assigned,
    dorm_name: fullRecord.dorm_name,
    room_no: fullRecord.room_no,
    dorm_address: fullRecord.dorm_address,
    dorm_details: fullRecord.dorm_details,
    insurance_purchased: fullRecord.insurance_purchased,
    forex_card_ready: fullRecord.forex_card_ready,
    sim_card_ready: fullRecord.sim_card_ready,
    luggage_packed: fullRecord.luggage_packed,
    emergency_contacts_saved: fullRecord.emergency_contacts_saved,
    briefing_attended: fullRecord.briefing_attended,
    overall_progress: fullRecord.overall_progress,
    clearance_status: fullRecord.clearance_status,
    notes: fullRecord.notes,
    updated_at: now,
  }, { onConflict: 'student_id' });
  if (saveError) throw new Error(`Could not save pre-departure details: ${saveError.message}`);

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
