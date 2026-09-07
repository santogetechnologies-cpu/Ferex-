import { supabase } from '../supabase';
import type { Notification } from '../types';
import { generateUUID } from '../../utils/uuid';

const DEFAULT_STUDENT_NOTIFICATIONS = (userId: string): Notification[] => [
  {
    id: `notif-welcome-${userId}`,
    user_id: userId,
    title: '🎓 Welcome to FEREX International Student Portal',
    body: 'Your international student portal is active. You can now track your university applications, legalizations, VFS visa filing, and pre-departure arrangements.',
    category: 'System',
    is_read: false,
    link: '/student/dashboard',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: `notif-nawa-${userId}`,
    user_id: userId,
    title: '📑 Document Legalization & Compliance Check',
    body: 'Please make sure all mandatory academic transcripts and passport color scans are uploaded to your Document Vault for verification.',
    category: 'Document',
    is_read: false,
    link: '/student/documents',
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: `notif-app-${userId}`,
    user_id: userId,
    title: '🏛️ University Application Tracker Active',
    body: 'Track your university shortlisting, application preparation, and unconditional offer letters in real-time under Journey Tracker.',
    category: 'Application',
    is_read: false,
    link: '/student/journey-tracker',
    created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
  },
  {
    id: `notif-vfs-${userId}`,
    user_id: userId,
    title: '🛡️ VFS Visa Processing & Checklist Ready',
    body: 'Review the VFS Global Visa roadmap and required embassy documents in your dedicated Visa Tracker.',
    category: 'VFS Visa',
    is_read: true,
    link: '/student/visa-tracker',
    created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
  },
];

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
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }

    // Default notifications for active student experience
    const defaults = DEFAULT_STUDENT_NOTIFICATIONS(userId);
    try {
      localStorage.setItem(`ferex_notifications_${userId}`, JSON.stringify(defaults));
    } catch (e) {}
    return defaults;
  } catch (err) {
    const local = localStorage.getItem(`ferex_notifications_${userId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_STUDENT_NOTIFICATIONS(userId);
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
