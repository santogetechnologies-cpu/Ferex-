import { supabase } from '../supabase';
import type { Meeting } from '../types';
import { generateUUID } from '../../utils/uuid';
import { createNotification } from './notifications';

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

    const { data, error } = await supabase
      .from('meetings')
      .select('*, users:student_id(full_name, email)')
      .eq('student_id', studentId)
      .order('scheduled_date', { ascending: true });

    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(`ferex_meetings_${studentId}`, JSON.stringify(data));
      } catch (e) {}
      return data as Meeting[];
    }

    const local = localStorage.getItem(`ferex_meetings_${studentId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    // Check in unified admin meetings list
    const allAdmin = localStorage.getItem('ferex_all_admin_meetings');
    if (allAdmin) {
      try {
        const parsed = JSON.parse(allAdmin);
        if (Array.isArray(parsed)) {
          const studentMeetings = parsed.filter((m: any) => m.student_id === studentId);
          if (studentMeetings.length > 0) return studentMeetings;
        }
      } catch (e) {}
    }

    return [];
  } catch (err) {
    const local = localStorage.getItem(`ferex_meetings_${studentId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }
}

export async function getAllMeetings(): Promise<Meeting[]> {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*, users:student_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem('ferex_all_admin_meetings', JSON.stringify(data));
      } catch (e) {}
      return data as Meeting[];
    }

    // Fallback: collect from ferex_all_admin_meetings and student caches
    const meetingMap = new Map<string, Meeting>();
    const local = localStorage.getItem('ferex_all_admin_meetings');
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          parsed.forEach((m: Meeting) => meetingMap.set(m.id, m));
        }
      } catch (e) {}
    }

    // Also scan all ferex_meetings_* in localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('ferex_meetings_')) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach((m: Meeting) => meetingMap.set(m.id, m));
              }
            }
          } catch (e) {}
        }
      }
    }

    const aggregated = Array.from(meetingMap.values());
    return aggregated;
  } catch {
    return [];
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
          title: '📅 Counseling Session Scheduled',
          body: `Your session "${payload.subject}" with ${insertData.advisor_name} is set for ${payload.scheduled_date} at ${payload.start_time}.`,
          category: 'Counselor Session'
        });
      } catch (e) {}
    }

    // Trigger notification for Admin
    try {
      await createNotification({
        user_id: 'admin',
        title: '📅 New Meeting Session Booked',
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
  additionalFields?: { scheduled_date?: string; start_time?: string; end_time?: string }
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
          title: status === 'Completed' ? '✅ Counseling Session Completed' : status === 'Cancelled' ? '❌ Session Cancelled' : '📅 Session Rescheduled',
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
