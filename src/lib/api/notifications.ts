import { supabase } from '../supabase';
import type { Notification } from '../types';

export async function getNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function markNotificationAsRead(id: string) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Notification;
}

export async function markAllNotificationsAsRead(userId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function createNotification(payload: {
  user_id: string;
  title: string;
  body: string;
  category?: string;
}) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: payload.user_id,
      title: payload.title,
      body: payload.body,
      category: payload.category || 'Support',
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select();

  if (error) throw error;
  return data[0] as Notification;
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
      query = query.eq('user_id', userId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    const { error } = await query;
    if (error) console.warn('[clearAllNotifications Notice]:', error.message);
  } catch (err) {}
  return true;
}
