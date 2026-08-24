import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

export interface PreDepartureRecord {
  id: string;
  student_id: string;
  student_name: string;
  student_email?: string;
  university_name: string;
  flight_no: string;
  airline: string;
  departure_date: string;
  arrival_date?: string;
  arrival_city: string;
  dorm_name: string;
  dorm_address: string;
  room_no: string;
  pickup_driver: string;
  pickup_contact: string;
  pickup_details?: string;
  orientation_date: string;
  clearance_status: 'Pending Verification' | 'Clearance Granted' | 'Departed';
  notes: string;
  created_at: string;
  updated_at?: string;
}

const LOCAL_STORAGE_KEY = 'ferex_pre_departure_db_cache_v1';

function getLocalPreDepartureCache(): Record<string, PreDepartureRecord> {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveLocalPreDepartureCache(record: PreDepartureRecord) {
  try {
    const current = getLocalPreDepartureCache();
    if (record.id) current[record.id] = record;
    if (record.student_id) current[record.student_id] = record;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

export async function getPreDepartureRecords(studentId?: string): Promise<PreDepartureRecord[]> {
  const localCache = getLocalPreDepartureCache();

  try {
    let query = supabase
      .from('pre_departure')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (!error && data) {
      if (data.length === 0 && studentId) {
        return [];
      }
      const records = data as PreDepartureRecord[];
      records.forEach(r => saveLocalPreDepartureCache(r));
      return records;
    }
  } catch (err) {
    console.warn('[getPreDepartureRecords Supabase notice]:', err);
  }

  // Local storage cache fallback
  const allCached = Object.values(localCache);
  const seen = new Set<string>();
  const uniqueCached = allCached.filter(r => {
    if (!r.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  if (studentId) {
    return uniqueCached.filter(r => r.student_id === studentId || r.id === studentId);
  }

  return uniqueCached;
}

export async function savePreDepartureRecord(payload: Partial<PreDepartureRecord> & { student_id: string; student_name: string }): Promise<PreDepartureRecord> {
  const cleanId = payload.id || payload.student_id || generateUUID();
  const now = new Date().toISOString();

  const record: PreDepartureRecord = {
    id: cleanId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    student_email: payload.student_email || '',
    university_name: payload.university_name || 'European Partner University',
    flight_no: payload.flight_no || 'Awaiting Flight Ticket Booking',
    airline: payload.airline || 'Awaiting Airline Confirmation',
    departure_date: payload.departure_date || 'To Be Scheduled',
    arrival_date: payload.arrival_date || 'To Be Scheduled',
    arrival_city: payload.arrival_city || 'European Chopin Airport',
    dorm_name: payload.dorm_name || 'Pending Dorm Allotment',
    dorm_address: payload.dorm_address || 'University On-Campus Housing',
    room_no: payload.room_no || 'Pending Assignment',
    pickup_driver: payload.pickup_driver || 'FEREX Student Concierge Lead',
    pickup_contact: payload.pickup_contact || '+48 22 552 0999',
    pickup_details: payload.pickup_details || 'Driver will await student at Airport Arrivals Exit holding name sign.',
    orientation_date: payload.orientation_date || 'To Be Scheduled',
    clearance_status: payload.clearance_status || 'Clearance Granted',
    notes: payload.notes || 'Pre-departure flight, dorm housing & concierge packet.',
    created_at: payload.created_at || now,
    updated_at: now
  };

  saveLocalPreDepartureCache(record);

  // Direct upsert into Supabase pre_departure table
  try {
    const dbPayload: any = {
      id: record.id,
      student_id: record.student_id,
      student_name: record.student_name,
      student_email: record.student_email,
      university_name: record.university_name,
      flight_no: record.flight_no,
      airline: record.airline,
      departure_date: record.departure_date,
      arrival_date: record.arrival_date,
      arrival_city: record.arrival_city,
      dorm_name: record.dorm_name,
      dorm_address: record.dorm_address,
      room_no: record.room_no,
      pickup_driver: record.pickup_driver,
      pickup_contact: record.pickup_contact,
      pickup_details: record.pickup_details,
      orientation_date: record.orientation_date,
      clearance_status: record.clearance_status,
      notes: record.notes,
      updated_at: now
    };

    const { data, error } = await supabase.from('pre_departure').upsert(dbPayload).select();

    if (error) {
      console.warn('[savePreDepartureRecord DB Notice]:', error.message || error);
      // Fallback: If arrival_date or pickup_details column is missing in Supabase schema, retry without them
      if (error.message?.includes('column') || error.code === 'PGRST204' || String(error.details || '').includes('column')) {
        delete dbPayload.arrival_date;
        delete dbPayload.pickup_details;
        const { data: retryData, error: retryError } = await supabase.from('pre_departure').upsert(dbPayload).select();
        if (!retryError && retryData && retryData.length > 0) {
          const inserted = retryData[0] as PreDepartureRecord;
          saveLocalPreDepartureCache(inserted);
        } else if (retryError) {
          console.error('[savePreDepartureRecord Retry DB Error]:', retryError);
        }
      }
    } else if (data && data.length > 0) {
      const inserted = data[0] as PreDepartureRecord;
      saveLocalPreDepartureCache(inserted);
    }
  } catch (e) {
    console.warn('[savePreDepartureRecord DB Notice]:', e);
  }

  // Send student notification
  try {
    await createNotification({
      user_id: payload.student_id,
      title: '✈️ Pre-Departure Packet Issued',
      body: `Your Stage 12 Pre-Departure Flight & Housing packet for ${record.university_name} has been updated by Admin. Status: ${record.clearance_status}.`,
      category: 'Application'
    });
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_pre_departure_change'));
  return record;
}
