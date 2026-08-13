import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';
import { createNotification } from '../lib/api/notifications';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      setNotifications((data ?? []) as Notification[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (userId) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    } else {
      await supabase.from('notifications').update({ is_read: true }).filter('is_read', 'eq', false);
    }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const sendNotification = async (payload: {
    user_id: string;
    title: string;
    body: string;
    category?: string;
  }) => {
    const created = await createNotification(payload);
    setNotifications(prev => [created, ...prev]);
    return created;
  };

  return { notifications, loading, error, refresh: fetchNotifications, markRead, markAllRead, sendNotification };
}
