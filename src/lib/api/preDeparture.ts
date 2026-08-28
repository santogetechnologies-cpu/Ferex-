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

export async function getPreDepartureRecords(studentId?: string): Promise<PreDepartureRecord[]> {
  try {
    let query = supabase
      .from('pre_departure')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[getPreDepartureRecords Notice]:', error.message);
      return [];
    }

    return (data ?? []) as PreDepartureRecord[];
  } catch (err) {
    console.error('[getPreDepartureRecords Error]:', err);
    return [];
  }
}

export async function savePreDepartureRecord(payload: Partial<PreDepartureRecord> & { student_id: string; student_name: string }): Promise<PreDepartureRecord> {
  const now = new Date().toISOString();
  const newId = payload.id || generateUUID();

  // Compute progress percentage
  const checklistItems = [
    payload.flight_booked,
    payload.airport_pickup_opted,
    payload.dorm_assigned,
    payload.insurance_purchased,
    payload.forex_card_ready,
    payload.sim_card_ready,
    payload.luggage_packed,
    payload.emergency_contacts_saved,
    payload.briefing_attended
  ];
  const completedCount = checklistItems.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  const fullRecord: PreDepartureRecord = {
    id: newId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    student_email: payload.student_email || '',
    university_name: payload.university_name || '',
    flight_booked: payload.flight_booked ?? false,
    airline: payload.airline || '',
    flight_no: payload.flight_no || '',
    departure_date: payload.departure_date || '',
    arrival_date: payload.arrival_date || '',
    arrival_city: payload.arrival_city || '',
    flight_details: payload.flight_details || '',
    airport_pickup_opted: payload.airport_pickup_opted ?? false,
    pickup_driver: payload.pickup_driver || '',
    pickup_contact: payload.pickup_contact || '',
    pickup_details: payload.pickup_details || '',
    dorm_assigned: payload.dorm_assigned ?? false,
    dorm_name: payload.dorm_name || '',
    room_no: payload.room_no || '',
    dorm_address: payload.dorm_address || '',
    dorm_details: payload.dorm_details || '',
    insurance_purchased: payload.insurance_purchased ?? false,
    forex_card_ready: payload.forex_card_ready ?? false,
    sim_card_ready: payload.sim_card_ready ?? false,
    luggage_packed: payload.luggage_packed ?? false,
    emergency_contacts_saved: payload.emergency_contacts_saved ?? false,
    briefing_attended: payload.briefing_attended ?? false,
    overall_progress: progressPercent,
    clearance_status: payload.clearance_status || (progressPercent >= 80 ? 'Cleared' : 'In Progress'),
    notes: payload.notes || 'Pre-departure status updated.',
    created_at: payload.created_at || now,
    updated_at: now
  };

  try {
    await supabase.from('pre_departure').upsert(fullRecord);
  } catch (e) {
    console.warn('[savePreDepartureRecord DB notice]:', e);
  }

  window.dispatchEvent(new Event('ferex_predeparture_change'));
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
        title: '✈️ Pre-Departure Briefing Completed',
        body: 'Your mandatory pre-departure orientation briefing has been verified by the FEREX compliance team. Have a safe journey!',
        category: 'Support'
      });
    } catch (e) {}
  }

  return saved;
}
