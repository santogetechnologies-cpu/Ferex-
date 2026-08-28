import { supabase } from '../supabase';
import { generateUUID } from '../../utils/uuid';

export interface ActivityLogEntry {
  id?: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  created_at?: string;
}

/**
 * Records a system or business audit activity log into public.activity_log.
 */
export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, any>
): Promise<boolean> {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    const payload = {
      id: generateUUID(),
      user_id: userId || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || {},
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('activity_log').insert(payload);
    if (error) {
      console.warn('[Activity Log Notice]:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the latest audit activity logs from public.activity_log.
 */
export async function getActivityLogs(limit: number = 50): Promise<ActivityLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[getActivityLogs Notice]:', error.message);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}
