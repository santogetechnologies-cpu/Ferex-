import { supabase } from '../supabase';
import type { Notification } from '../types';
import { generateUUID } from '../../utils/uuid';

/**
 * The signed-in person's real notifications, newest first. Staff also receive the staff-wide alerts (no owner).
 * The database is the only source: made-up sample notifications and browser copies are gone.
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
  if (!isUuid) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) {
    console.warn('[getNotifications]', error.message);
    return [];
  }

  return (data || []).map(n => ({
    id: n.id,
    user_id: n.user_id || userId,
    title: n.title,
    body: n.body || n.message || '',
    category: n.category || n.type || 'Support',
    is_read: n.is_read ?? n.read ?? false,
    link: n.link || n.action_url || '',
    created_at: n.created_at || new Date().toISOString(),
  }));
}

export async function markNotificationAsRead(id: string) {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read: true })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[markNotificationAsRead notice]:', error.message);
    }
    return data as Notification;
  } catch (e) {
    return null;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
    if (isUuid) {
      await supabase
        .from('notifications')
        .update({ is_read: true, read: true })
        .eq('user_id', userId);
    }
  } catch (e) {}
}

export async function createNotification(payload: {
  user_id?: string | null;
  title: string;
  body: string;
  category?: string;
  link?: string;
}) {
  const newId = generateUUID();
  const rawUserId = payload.user_id?.trim();
  const isUuid = Boolean(rawUserId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId));
  const targetUserId = isUuid ? rawUserId : null;

  const notifObj = {
    id: newId,
    user_id: targetUserId,
    title: payload.title,
    body: payload.body,
    message: payload.body,
    category: payload.category || 'Support',
    type: (payload.category || 'info').toLowerCase(),
    link: payload.link || '',
    action_url: payload.link || '',
    is_read: false,
    read: false,
    created_at: new Date().toISOString()
  };

  if (targetUserId) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notifObj)
        .select();

      if (!error && data && data.length > 0) {
        window.dispatchEvent(new Event('ferex_notification_change'));
        return data[0] as Notification;
      }
    } catch (err) {}
  }

  // Local storage backup
  try {
    const key = `ferex_notifications_${payload.user_id || 'general'}`;
    const local = localStorage.getItem(key);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(key, JSON.stringify([notifObj, ...existing]));
  } catch (e) {}

  window.dispatchEvent(new Event('ferex_notification_change'));
  return notifObj as unknown as Notification;
}

export async function deleteNotification(id: string) {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) console.warn('[deleteNotification Notice]:', error.message);
  } catch (err) {}
  window.dispatchEvent(new Event('ferex_notification_change'));
  return true;
}

export async function clearAllNotifications(userId?: string) {
  try {
    const isUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
    if (isUuid) {
      await supabase.from('notifications').delete().eq('user_id', userId);
    } else {
      await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }
  } catch (err) {}
  window.dispatchEvent(new Event('ferex_notification_change'));
  return true;
}
