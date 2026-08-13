import { supabase } from '../supabase';
import type { Meeting } from '../types';
import { generateUUID } from '../../utils/uuid';

export function computeEndTime(startTime: string): string {
  if (!startTime) return '10:45 AM';
  const match = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return startTime;
  let [_, hoursStr, minsStr, period] = match;
  let hours = parseInt(hoursStr, 10);
  let mins = parseInt(minsStr, 10);

  mins += 45;
  if (mins >= 60) {
    mins -= 60;
    hours += 1;
    if (hours === 12) {
      period = period.toUpperCase() === 'AM' ? 'PM' : 'AM';
    } else if (hours > 12) {
      hours -= 12;
    }
  }
  const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
  const formattedMins = mins < 10 ? `0${mins}` : `${mins}`;
  return `${formattedHours}:${formattedMins} ${period.toUpperCase()}`;
}

export async function getMeetings(studentId?: string) {
  try {
    let query = supabase.from('meetings').select('*, users:student_id(full_name, email)');
    if (studentId) query = query.or(`student_id.eq.${studentId},student_id.is.null`);

    const { data, error } = await query;
    if (error || !data) return [];
    return data as Meeting[];
  } catch (err) {
    return [];
  }
}

export async function createMeeting(payload: {
  student_id?: string;
  advisor_id?: string;
  subject: string;
  advisor_name: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  meeting_link?: string;
  notes?: string;
}) {
  const newId = generateUUID();
  const calculatedEndTime = payload.end_time || computeEndTime(payload.start_time);

  const insertData = {
    id: newId,
    student_id: payload.student_id || null,
    advisor_id: payload.advisor_id || null,
    subject: payload.subject,
    advisor_name: payload.advisor_name || 'Academic Counselor',
    scheduled_date: payload.scheduled_date,
    start_time: payload.start_time,
    end_time: calculatedEndTime,
    meeting_link: payload.meeting_link || 'https://meet.google.com/fer-exed-app',
    notes: payload.notes || '',
    status: 'Scheduled',
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('meetings')
      .insert(insertData)
      .select();

    if (error || !data || data.length === 0) {
      return insertData as unknown as Meeting;
    }
    return data[0] as Meeting;
  } catch (err) {
    return insertData as unknown as Meeting;
  }
}

export async function updateMeetingStatus(
  id: string,
  status: Meeting['status'],
  additionalFields?: { scheduled_date?: string; start_time?: string; end_time?: string }
) {
  try {
    const updateObj = { status, ...additionalFields };
    const { data, error } = await supabase
      .from('meetings')
      .update(updateObj)
      .eq('id', id)
      .select();

    if (error || !data || data.length === 0) {
      return { id, ...updateObj } as unknown as Meeting;
    }
    return data[0] as Meeting;
  } catch (err) {
    return { id, status } as unknown as Meeting;
  }
}

export async function deleteMeeting(id: string) {
  try {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) console.warn('[deleteMeeting notice]:', error.message);
    return true;
  } catch (err) {
    return true;
  }
}

export async function getTodaysMeetingCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .eq('status', 'Scheduled');
    if (error) return 0;
    return count ?? 0;
  } catch (err) {
    return 0;
  }
}
