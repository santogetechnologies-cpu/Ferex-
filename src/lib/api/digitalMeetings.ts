import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

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

/**
 * Loads all digital meetings directly from Supabase (no mock data fallback).
 */
export async function getDigitalMeetings(): Promise<DigitalMeetingRecord[]> {
  const { data, error } = await supabase
    .from('digital_meetings')
    .select('*')
    .order('scheduled_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load digital meetings from database: ${error.message}`);
  }

  return (data || []) as DigitalMeetingRecord[];
}

/**
 * Creates a new client meeting directly in Supabase.
 */
export async function createDigitalMeeting(meeting: Partial<DigitalMeetingRecord>): Promise<DigitalMeetingRecord> {
  const newId = generateUUID();
  const scheduledTime = meeting.scheduled_at || (meeting.date_display ? `${meeting.date_display}T10:00:00.000Z` : new Date().toISOString());

  const payload: DigitalMeetingRecord = {
    id: newId,
    title: meeting.title?.trim() || 'Client Meeting',
    client_id: meeting.client_id || '',
    client_name: meeting.client_name || 'Enterprise Client',
    host_staff_name: meeting.host_staff_name || 'Digital Lead',
    host_staff_email: meeting.host_staff_email || 'pm@ferex.com',
    scheduled_at: scheduledTime,
    time_display: meeting.time_display || '11:00 AM',
    date_display: meeting.date_display || new Date().toISOString().split('T')[0],
    platform: (meeting.platform || 'Google Meet') as any,
    meeting_type: meeting.meeting_type || 'Discovery Call',
    meeting_url: meeting.meeting_url || (meeting as any).link || 'https://meet.google.com/fer-dig-rev',
    status: meeting.status || 'Scheduled',
    agenda: meeting.agenda || '',
    notes: meeting.notes || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('digital_meetings').insert(payload);
  if (error) {
    throw new Error(`Failed to create meeting in database: ${error.message}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_digital_meetings_change'));
  }

  return payload;
}

/**
 * Updates meeting status (e.g. Completed, Cancelled, Scheduled) directly in Supabase.
 */
export async function updateDigitalMeetingStatus(id: string, status: DigitalMeetingRecord['status']) {
  const { error } = await supabase
    .from('digital_meetings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update meeting status: ${error.message}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_digital_meetings_change'));
  }

  return { id, status };
}

/**
 * Deletes a scheduled meeting directly from Supabase.
 */
export async function deleteDigitalMeeting(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('digital_meetings')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete meeting from database: ${error.message}`);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('ferex_digital_meetings_change'));
  }

  return true;
}
