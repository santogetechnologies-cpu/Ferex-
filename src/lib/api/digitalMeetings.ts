import { digitalList, digitalInsert, digitalUpdate, digitalDelete } from './digitalStore';
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
 * Loads all digital meetings directly from Supabase (with resilient local merge).
 */
export async function getDigitalMeetings(): Promise<DigitalMeetingRecord[]> {
return digitalList('digital_meetings');
}

/**
 * Creates a new client meeting directly in Supabase with resilient schema fallback.
 */
export async function createDigitalMeeting(meeting: Partial<DigitalMeetingRecord>): Promise<DigitalMeetingRecord> {
if(!meeting.title?.trim() || !meeting.scheduled_at || !Number.isFinite(Date.parse(meeting.scheduled_at)))throw new Error('Meeting title and valid schedule required');
 if(meeting.meeting_url && !/^https:\/\//.test(meeting.meeting_url))throw new Error('Use an HTTPS meeting URL');
 return digitalInsert('digital_meetings',{...meeting,id:generateUUID(),client_id:meeting.client_id || null,status:'Scheduled',created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
}

/**
 * Updates meeting status (e.g. Completed, Cancelled, Scheduled) directly in Supabase with fallback.
 */
export async function updateDigitalMeetingStatus(id: string, status: DigitalMeetingRecord['status']) {
return digitalUpdate('digital_meetings',id,{status});
}

/**
 * Deletes a scheduled meeting directly from Supabase.
 */
export async function deleteDigitalMeeting(id: string): Promise<boolean> {
return digitalDelete('digital_meetings',id);
}

