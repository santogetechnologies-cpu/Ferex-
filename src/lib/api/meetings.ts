import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { Meeting } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

const MEETINGS_CATALOG_ID = 'ferex_meetings_catalog';

async function fetchMeetingsCatalog(): Promise<Meeting[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('system_config')
      .select('config')
      .eq('id', MEETINGS_CATALOG_ID)
      .maybeSingle();
    if (data?.config && Array.isArray(data.config)) {
      return data.config;
    }
  } catch {}
  try {
    const raw = localStorage.getItem('ferex_meetings_cloud_catalog');
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

async function syncMeetingToCloudCatalog(meeting: Meeting) {
  try {
    const current = await fetchMeetingsCatalog();
    const filtered = current.filter(m => m.id !== meeting.id);
    const updated = [meeting, ...filtered];
    try {
      localStorage.setItem('ferex_meetings_cloud_catalog', JSON.stringify(updated));
    } catch {}
    const admin = await getAdminSupabaseClient();
    await admin.from('system_config').upsert({
      id: MEETINGS_CATALOG_ID,
      config: updated,
      updated_at: new Date().toISOString()
    });
  } catch (e) {
    console.warn('[syncMeetingToCloudCatalog notice]:', e);
  }
}

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
  try {
    if (!studentId) return getAllMeetings();

    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('meetings')
      .select('*, users:student_id(full_name, email)')
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: true });

    const dbMeetings = (data ?? []) as Meeting[];
    const cloudCatalog = await fetchMeetingsCatalog();
    const studentCloud = cloudCatalog.filter(m => m.student_id === studentId);

    const dbIds = new Set(dbMeetings.map(m => m.id));
    const merged = [...dbMeetings, ...studentCloud.filter(m => !dbIds.has(m.id))];
    return merged;
  } catch (err) {
    const cloudCatalog = await fetchMeetingsCatalog();
    return cloudCatalog.filter(m => m.student_id === studentId);
  }
}

export async function getAllMeetings(): Promise<Meeting[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const { data } = await admin
      .from('meetings')
      .select('*, users:student_id(full_name, email)')
      .order('created_at', { ascending: false });

    const dbMeetings = (data ?? []) as Meeting[];
    const cloudCatalog = await fetchMeetingsCatalog();
    const dbIds = new Set(dbMeetings.map(m => m.id));
    const merged = [...dbMeetings, ...cloudCatalog.filter(m => !dbIds.has(m.id))];
    return merged;
  } catch {
    return fetchMeetingsCatalog();
  }
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
  const newId = generateUUID();
  const calculatedEndTime = payload.end_time || computeEndTime(payload.start_time);

  // Auto-resolve student info if missing
  let resolvedStudentName = payload.student_name || '';
  let resolvedStudentEmail = payload.student_email || '';

  if (!resolvedStudentName && payload.student_id) {
    try {
      const { data: uData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', payload.student_id)
        .maybeSingle();

      if (uData) {
        resolvedStudentName = uData.full_name || '';
        resolvedStudentEmail = uData.email || '';
      }
    } catch {}

    if (!resolvedStudentName) {
      try {
        const rawUser = localStorage.getItem('ferex_user');
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          if (parsed.full_name) resolvedStudentName = parsed.full_name;
          if (parsed.email) resolvedStudentEmail = parsed.email;
        }
      } catch {}
    }
  }

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
    status: 'Scheduled' as const,
    created_at: new Date().toISOString(),
    users: {
      full_name: resolvedStudentName || 'Student',
      email: resolvedStudentEmail || 'student@ferex.com'
    }
  };

  try {
    const { data, error } = await supabase
      .from('meetings')
      .insert({
        id: insertData.id,
        student_id: insertData.student_id,
        advisor_id: insertData.advisor_id,
        subject: insertData.subject,
        advisor_name: insertData.advisor_name,
        scheduled_date: insertData.scheduled_date,
        start_time: insertData.start_time,
        end_time: insertData.end_time,
        meeting_link: insertData.meeting_link,
        notes: insertData.notes,
        status: insertData.status,
        created_at: insertData.created_at,
      })
      .select('*, users:student_id(full_name, email)');

    // Save to unified local storage pool so Edu Admin gets it immediately
    try {
      const existingAll = localStorage.getItem('ferex_all_admin_meetings');
      const list = existingAll ? JSON.parse(existingAll) : [];
      localStorage.setItem('ferex_all_admin_meetings', JSON.stringify([insertData, ...list]));

      if (payload.student_id) {
        const studentKey = `ferex_meetings_${payload.student_id}`;
        const existingStudent = localStorage.getItem(studentKey);
        const sList = existingStudent ? JSON.parse(existingStudent) : [];
        localStorage.setItem(studentKey, JSON.stringify([insertData, ...sList]));
      }
    } catch (e) {}

    // Trigger notification for Student
    if (payload.student_id) {
      try {
        await createNotification({
          user_id: payload.student_id,
          title: 'Counseling Session Scheduled',
          body: `Your session "${payload.subject}" with ${insertData.advisor_name} is set for ${payload.scheduled_date} at ${payload.start_time}.`,
          category: 'Counselor Session'
        });
      } catch (e) {}
    }

    // Trigger notification for Admin
    try {
      await createNotification({
        user_id: 'admin',
        title: 'New Meeting Session Booked',
        body: `Meeting "${payload.subject}" scheduled with ${insertData.advisor_name} for ${resolvedStudentName || 'Student'} on ${payload.scheduled_date} at ${payload.start_time}.`,
        category: 'Counselor Session'
      });
    } catch (e) {}

    window.dispatchEvent(new Event('ferex_meeting_change'));
    window.dispatchEvent(new Event('ferex_notification_change'));

    if (error || !data || data.length === 0) {
      return insertData as unknown as Meeting;
    }
    return (data[0] || insertData) as unknown as Meeting;
  } catch (err) {
    // Save to local pools on error
    try {
      const existingAll = localStorage.getItem('ferex_all_admin_meetings');
      const list = existingAll ? JSON.parse(existingAll) : [];
      localStorage.setItem('ferex_all_admin_meetings', JSON.stringify([insertData, ...list]));

      if (payload.student_id) {
        const studentKey = `ferex_meetings_${payload.student_id}`;
        const existingStudent = localStorage.getItem(studentKey);
        const sList = existingStudent ? JSON.parse(existingStudent) : [];
        localStorage.setItem(studentKey, JSON.stringify([insertData, ...sList]));
      }
    } catch (e) {}

    window.dispatchEvent(new Event('ferex_meeting_change'));
    return insertData as unknown as Meeting;
  }
}

export async function updateMeetingStatus(
  id: string,
  status: Meeting['status'],
  additionalFields?: { scheduled_date?: string; start_time?: string; end_time?: string; notes?: string; advisor_name?: string }
) {
  try {
    const updateObj = { status, ...additionalFields };
    const { data, error } = await supabase
      .from('meetings')
      .update(updateObj)
      .eq('id', id)
      .select('*, users:student_id(full_name, email)');

    const result = (!error && data && data.length > 0) ? (data[0] as Meeting) : ({ id, ...updateObj } as unknown as Meeting);

    // Update in local admin storage pool
    try {
      const existingAll = localStorage.getItem('ferex_all_admin_meetings');
      if (existingAll) {
        const list = JSON.parse(existingAll);
        const updatedList = list.map((m: any) => m.id === id ? { ...m, ...result } : m);
        localStorage.setItem('ferex_all_admin_meetings', JSON.stringify(updatedList));
      }
    } catch (e) {}

    if (result.student_id) {
      try {
        await createNotification({
          user_id: result.student_id,
          title: status === 'Completed' ? 'Counseling Session Completed' : status === 'Cancelled' ? 'Session Cancelled' : 'Session Rescheduled',
          body: `Your counseling session "${result.subject || 'Session'}" status has been updated to "${status}".`,
          category: 'Counselor Session'
        });
      } catch (e) {}
    }

    window.dispatchEvent(new Event('ferex_meeting_change'));
    window.dispatchEvent(new Event('ferex_notification_change'));
    return result;
  } catch (err) {
    window.dispatchEvent(new Event('ferex_meeting_change'));
    return { id, status } as unknown as Meeting;
  }
}

export async function deleteMeeting(id: string) {
  try {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) console.warn('[deleteMeeting notice]:', error.message);
  } catch (err) {}

  try {
    const existingAll = localStorage.getItem('ferex_all_admin_meetings');
    if (existingAll) {
      const list = JSON.parse(existingAll);
      const updatedList = list.filter((m: any) => m.id !== id);
      localStorage.setItem('ferex_all_admin_meetings', JSON.stringify(updatedList));
    }
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_meeting_change'));
  return true;
}

export async function getTodaysMeetingCount() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
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
