import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';
import { createNotification, deleteNotification, clearAllNotifications } from '../lib/api/notifications';

export function useNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stored deleted notification IDs in local storage as well for fallback
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => {
    try {
      const key = userId ? `ferex_deleted_notifications_${userId}` : 'ferex_deleted_notifications';
      const saved = localStorage.getItem(key);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Stored read notification IDs
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const key = userId ? `ferex_read_notifications_${userId}` : 'ferex_read_notifications';
      const saved = localStorage.getItem(key);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('notifications')
        .select('id, user_id, title, body, category, is_read, created_at, link')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const items = (data ?? [])
        .filter((n: any) => !deletedIds.has(n.id))
        .map((n: any) => ({
          ...n,
          is_read: Boolean(n.is_read || readIds.has(n.id))
        }));

      setNotifications(items as Notification[]);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  }, [userId, readIds, deletedIds]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('ferex_read_notifications', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));

    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (e) {}
  };

  const markAllRead = async () => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      try { localStorage.setItem('ferex_read_notifications', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    try {
      if (userId) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
      } else {
        await supabase.from('notifications').update({ is_read: true }).filter('is_read', 'eq', false);
      }
    } catch (e) {}
  };

  const deleteNotif = async (id: string) => {
    setDeletedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('ferex_deleted_notifications', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });

    setNotifications(prev => prev.filter(n => n.id !== id));

    try {
      await deleteNotification(id);
    } catch (e) {}
  };

  const clearAllNotifs = async () => {
    setDeletedIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
      try { localStorage.setItem('ferex_deleted_notifications', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });

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
