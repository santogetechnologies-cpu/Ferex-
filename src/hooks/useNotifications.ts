import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';
import { getNotifications, createNotification, deleteNotification, clearAllNotifications } from '../lib/api/notifications';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const effectiveId = userId || 'STUDENT_GUEST';
      const data = await getNotifications(effectiveId);
      setNotifications(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchNotifications();

    if (!userId) return;

    // Realtime notifications subscription
    const channel = supabase
      .channel(`realtime_notifs_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchNotifications();
    window.addEventListener('ferex_notification_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_notification_change', handleLocalEvent);
    };
  }, [fetchNotifications, userId]);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      if (userId) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
      }
    } catch (e) {}
  };

  const deleteNotif = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (e) {}
  };

  const clearAllNotifs = async () => {
    setNotifications([]);
    try {
      await clearAllNotifications(userId);
    } catch (e) {}
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

  return {
    notifications,
    loading,
    error,
    refresh: fetchNotifications,
    markRead,
    markAllRead,
    deleteNotif,
    clearAllNotifs,
    sendNotification
  };
}
