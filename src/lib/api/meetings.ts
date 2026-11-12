import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Meeting } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

// The meetings table is the only source of truth. JSON and browser copies used to be merged in; they kept
// meetings of deleted students alive and hid failed saves, so they are no longer read or written.

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

export async function getMeetings(studentId?: string): Promise<Meeting[]> {
  if (!studentId) return getAllMeetings();
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const { data, error } = await client
    .from('meetings')
    .select('*, users:student_id(full_name, email)')
    .eq('student_id', studentId)
    .order('scheduled_date', { ascending: true });
  if (error) throw new Error(`Could not load meetings: ${error.message}`);
  return (data ?? []) as Meeting[];
}

export async function getAllMeetings(): Promise<Meeting[]> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const { data, error } = await client
    .from('meetings')
    .select('*, users:student_id(full_name, email)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load meetings: ${error.message}`);
  return (data ?? []) as Meeting[];
}

export async function createMeeting(payload: {
  student_id?: string;
  student_name?: string;
  student_email?: string;
  advisor_id?: string;
  subject: string;
  advisor_name: string;
  scheduled_date: string;
  start_time: string;
  end_time?: string;
  meeting_link?: string;
  notes?: string;
}) {
  const calculatedEndTime = payload.end_time || computeEndTime(payload.start_time);
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('meetings')
    .insert({
      id: generateUUID(),
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
      created_at: new Date().toISOString(),
    })
    .select('*, users:student_id(full_name, email)')
    .single();
  if (error || !data) throw new Error(`Could not schedule the meeting: ${error?.message || 'no data returned'}`);
  const meeting = data as unknown as Meeting;

  if (payload.student_id) {
    try {
      await createNotification({
        user_id: payload.student_id,
        title: 'Counseling Session Scheduled',
        body: `Your session "${payload.subject}" with ${payload.advisor_name || 'your counselor'} is set for ${payload.scheduled_date} at ${payload.start_time}.`,
        category: 'Counselor Session'
      });
    } catch {}
  }

  window.dispatchEvent(new Event('ferex_meeting_change'));
  window.dispatchEvent(new Event('ferex_notification_change'));
  return meeting;
}

export async function updateMeetingStatus(
  id: string,
  status: Meeting['status'],
  additionalFields?: { scheduled_date?: string; start_time?: string; end_time?: string; notes?: string; advisor_name?: string }
) {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const { data, error } = await client
    .from('meetings')
    .update({ status, ...additionalFields })
    .eq('id', id)
    .select('*, users:student_id(full_name, email)');
  if (error) throw new Error(`Could not update the meeting: ${error.message}`);
  if (!data || data.length === 0) throw new Error('Meeting not found or you do not have permission to change it.');
  const result = data[0] as Meeting;

  if (result.student_id) {
    try {
      await createNotification({
        user_id: result.student_id,
        title: status === 'Completed' ? 'Counseling Session Completed' : status === 'Cancelled' ? 'Session Cancelled' : 'Session Rescheduled',
        body: `Your counseling session "${result.subject || 'Session'}" status has been updated to "${status}".`,
        category: 'Counselor Session'
      });
    } catch {}
  }

  window.dispatchEvent(new Event('ferex_meeting_change'));
  window.dispatchEvent(new Event('ferex_notification_change'));
  return result;
}

export async function deleteMeeting(id: string) {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const { error } = await client.from('meetings').delete().eq('id', id);
  if (error) throw new Error(`Could not delete the meeting: ${error.message}`);
  window.dispatchEvent(new Event('ferex_meeting_change'));
  return true;
}

export async function getTodaysMeetingCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { count, error } = await client
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .eq('scheduled_date', today)
      .in('status', ['Scheduled', 'Rescheduled']);
    if (error) return 0;
    return count ?? 0;
  } catch (err) {
    return 0;
  }
}
