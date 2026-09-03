import { supabase } from '../supabase';
import type { Notification } from '../types';
import { generateUUID } from '../../utils/uuid';

export async function getNotifications(userId: string): Promise<Notification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`user_id.eq.${userId},user_id.eq.admin,user_id.is.null`)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const normalized = data.map(n => ({
        id: n.id,
        user_id: n.user_id || userId,
        title: n.title,
        body: n.body || n.message || '',
        category: n.category || n.type || 'Support',
        is_read: n.is_read ?? n.read ?? false,
        link: n.link || n.action_url || '',
        created_at: n.created_at || new Date().toISOString()
      }));
      try {
        localStorage.setItem(`ferex_notifications_${userId}`, JSON.stringify(normalized));
      } catch (e) {}
      return normalized;
    }

    const local = localStorage.getItem(`ferex_notifications_${userId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }

    return [];
  } catch (err) {
    const local = localStorage.getItem(`ferex_notifications_${userId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  }
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
    await supabase
      .from('notifications')
      .update({ is_read: true, read: true })
      .or(`user_id.eq.${userId},user_id.eq.admin`);
  } catch (e) {}
}

export async function createNotification(payload: {
  user_id: string;
  title: string;
  body: string;
  category?: string;
}) {
  const newId = generateUUID();
  const notifObj = {
    id: newId,
    user_id: payload.user_id,
    title: payload.title,
    body: payload.body,
    message: payload.body,
    category: payload.category || 'Support',
    type: (payload.category || 'info').toLowerCase(),
    is_read: false,
    read: false,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notifObj)
      .select();

    if (!error && data && data.length > 0) {
      return data[0] as Notification;
    }
  } catch (err) {}

  // Local storage backup
  try {
    const key = `ferex_notifications_${payload.user_id}`;
    const local = localStorage.getItem(key);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(key, JSON.stringify([notifObj, ...existing]));
  } catch (e) {}

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
  return true;
}

export async function clearAllNotifications(userId?: string) {
  try {
    let query = supabase.from('notifications').delete();
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.eq.admin`);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    await query;
  } catch (err) {}
  return true;
}
