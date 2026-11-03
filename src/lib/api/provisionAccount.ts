import { supabase } from '../supabase';
import type { UserProfile } from '../types';

export async function provisionAccount(payload: { email: string; full_name: string; role: string; password?: string; phone?: string; department?: string; permissions?: unknown[]; assigned_counselor?: string; country?: string }): Promise<UserProfile> {
  const { data, error } = await supabase.functions.invoke('provision-user', { body: payload });
  if (error) {
    let message = error.message;
    try { message = (await error.context?.json())?.error || message; } catch { /* Preserve the gateway error. */ }
    throw new Error(message);
  }
  if (!data?.user?.id || data.error) throw new Error(data?.error || 'Account was not provisioned');
  window.dispatchEvent(new Event('ferex_staff_change'));
  window.dispatchEvent(new Event('ferex_students_change'));
  window.dispatchEvent(new Event('ferex_admin_created'));
  return data.user as UserProfile;
}
