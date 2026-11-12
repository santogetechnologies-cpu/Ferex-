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

let isActivityLogTableAvailable = typeof localStorage !== 'undefined' && localStorage.getItem('ferex_use_remote_activity_log') === 'true';

function saveLocalActivity(payload: ActivityLogEntry) {
  try {
    const stored = JSON.parse(localStorage.getItem('ferex_activity_log') || '[]');
    stored.unshift(payload);
    localStorage.setItem('ferex_activity_log', JSON.stringify(stored.slice(0, 200)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('ferex_activity_change'));
    }
  } catch {}
}

function getLocalActivities(limit: number = 50): ActivityLogEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem('ferex_activity_log') || '[]');
    return stored.slice(0, limit);
  } catch {
    return [];
  }
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

    const payload: ActivityLogEntry = {
      id: generateUUID(),
      user_id: userId || null as any,
      action,
      entity_type: entityType,
      entity_id: entityId || null as any,
      details: details || {},
      created_at: new Date().toISOString(),
    };

    saveLocalActivity(payload);

    if (!isActivityLogTableAvailable) {
      return true;
    }

    const { error } = await supabase.from('activity_log').insert(payload);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        isActivityLogTableAvailable = false;
      } else {
        console.warn('[Activity Log Notice]:', error.message);
      }
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
  if (!isActivityLogTableAvailable) {
    return getLocalActivities(limit);
  }

  try {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        isActivityLogTableAvailable = false;
      } else {
        console.warn('[getActivityLogs Notice]:', error.message);
      }
      return getLocalActivities(limit);
    }
    return data ?? [];
  } catch {
    return getLocalActivities(limit);
  }
}
