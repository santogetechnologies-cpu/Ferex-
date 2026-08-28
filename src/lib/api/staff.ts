import { supabase } from '../supabase';

export async function getStaffAssignedStudents(staffName?: string) {
  try {
    let query = supabase.from('users').select('*').eq('role', 'student');
    if (staffName) {
      query = query.or(`assigned_counselor.ilike.%${staffName}%,assigned_counselor.eq.${staffName}`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getStaffTasks(staffName?: string) {
  try {
    let query = supabase.from('tasks').select('*');
    if (staffName) {
      query = query.ilike('assigned_to', `%${staffName}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getStaffMeetings(counselorName?: string) {
  try {
    let query = supabase.from('meetings').select('*');
    if (counselorName) {
      query = query.ilike('advisor_name', `%${counselorName}%`);
    }
    const { data, error } = await query.order('scheduled_date', { ascending: true });
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}
