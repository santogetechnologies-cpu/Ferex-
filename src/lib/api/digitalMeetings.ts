import { supabase } from '../supabase';

export interface DigitalMeetingRecord {
  id: string;
  title: string;
  client_id?: string;
  client_name?: string;
  host_staff_name?: string;
  host_staff_email?: string;
  scheduled_at: string;
  time_display?: string;
  date_display?: string;
  platform: 'Google Meet' | 'Zoom' | 'Microsoft Teams' | 'In-Person';
  meeting_type: 'Discovery Call' | 'Sprint Review' | 'Architecture Review' | 'Deliverable Sign-off' | 'Client Demo' | 'General Meeting' | string;
  meeting_url?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  agenda?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('ferex_digital_meetings_change')); };

export async function getDigitalMeetings(): Promise<DigitalMeetingRecord[]> {
  const { data, error } = await supabase.from('digital_meetings').select('*').order('scheduled_at', { ascending: false });
  if (error) throw new Error(`Failed to load meetings: ${error.message}`);
  return (data || []) as DigitalMeetingRecord[];
}

export async function createDigitalMeeting(meeting: Partial<DigitalMeetingRecord>): Promise<DigitalMeetingRecord> {
  if (!meeting.title?.trim()) throw new Error('A meeting needs a title');
  if (!meeting.scheduled_at && !meeting.date_display) throw new Error('Choose a date for the meeting');
  const url = (meeting.meeting_url || '').trim();
  if (url && !/^https?:\/\//i.test(url)) throw new Error('The meeting link must start with http:// or https://');
  const payload = {
    title: meeting.title.trim(),
    client_id: meeting.client_id || null,
    client_name: meeting.client_name || '',
    host_staff_name: meeting.host_staff_name || '',
    host_staff_email: meeting.host_staff_email || '',
    scheduled_at: meeting.scheduled_at || `${meeting.date_display}T10:00:00.000Z`,
    time_display: meeting.time_display || '',
    date_display: meeting.date_display || '',
    platform: meeting.platform || 'Google Meet',
    meeting_type: meeting.meeting_type || 'General Meeting',
    meeting_url: url,
    status: meeting.status || 'Scheduled',
    agenda: meeting.agenda || '',
    notes: meeting.notes || '',
  };
  const { data, error } = await supabase.from('digital_meetings').insert(payload).select('*').single();
  if (error) throw new Error(`Failed to schedule the meeting: ${error.message}`);
  notify();
  return data as DigitalMeetingRecord;
}

export async function updateDigitalMeetingStatus(id: string, status: DigitalMeetingRecord['status']) {
  const { data, error } = await supabase.from('digital_meetings').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select('id');
  if (error) throw new Error(`Failed to update the meeting: ${error.message}`);
  if (!data?.length) throw new Error('You cannot change this meeting');
  notify();
  return { id, status };
}

export async function deleteDigitalMeeting(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('digital_meetings').delete().eq('id', id).select('id');
  if (error) throw new Error(`Failed to delete the meeting: ${error.message}`);
  if (!data?.length) throw new Error('You cannot delete this meeting');
  notify();
  return true;
}
