import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTradeTasks } from '../lib/api/trade';
import { useRealtimeTable } from './useRealtimeTable';

export interface TradeBadgeItem { id: string; title: string; description: string; to: string }

const seenKey = (uid: string) => `ferex_trade_seen_tasks_${uid}`;
const readSeen = (uid: string): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(seenKey(uid)) || '[]')); } catch { return new Set(); } };

/**
 * Trade admin: leave requests from Trade Logistics waiting for a decision.
 * Trade Logistics: tasks assigned to them that they have not opened yet (cleared when they open the Tasks page).
 */
export function useTradeBadges(opts: { isAdmin: boolean; userId?: string; email?: string; name?: string }) {
  const { isAdmin, userId, email, name } = opts;
  const [leaves, setLeaves] = useState<TradeBadgeItem[]>([]);
  const [newTasks, setNewTasks] = useState<TradeBadgeItem[]>([]);
  const openIds = useRef<string[]>([]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      if (isAdmin) {
        const { data } = await supabase.from('attendance_leaves').select('id,user_id,user_name,start_date,end_date,type_code,division,status').eq('status', 'pending').order('created_at', { ascending: false });
        setLeaves((data || []).filter((l: any) => !l.division || l.division === 'trade').filter((l: any) => l.user_id !== userId).map((l: any) => ({
          id: l.id, title: `${l.user_name || 'Team member'} requested leave`,
          description: `${l.start_date}${l.end_date && l.end_date !== l.start_date ? ` → ${l.end_date}` : ''} · waiting for approval`, to: '/trade/attendance?tab=leave',
        })));
      } else {
        const tasks = await getTradeTasks(email || name || undefined);
        const seen = readSeen(userId);
        const mine = tasks.filter(t => t.status !== 'Completed' && ((t as any).assigned_staff_id === userId || (email && (t.assigned_staff_email || '').toLowerCase() === email.toLowerCase()) || (name && (t.assigned_staff_name || '').toLowerCase() === name.toLowerCase())));
        openIds.current = mine.map(t => t.id);
        setNewTasks(mine.filter(t => !seen.has(t.id)).map(t => ({ id: t.id, title: `New task: ${t.title}`, description: `${t.priority || ''}${t.due_date ? ` · due ${t.due_date}` : ''}`.replace(/^ · /, ''), to: '/trade/tasks' })));
      }
    } catch { /* badges are a convenience; the pages still show the data */ }
  }, [isAdmin, userId, email, name]);

  useEffect(() => { void load(); }, [load]);
  useRealtimeTable('attendance_leaves', load);
  useRealtimeTable('trade_tasks', load);
  useRealtimeTable('tasks', load);
  useEffect(() => { window.addEventListener('ferex_trade_tasks_change', load); window.addEventListener('ferex-attendance-updated', load); return () => { window.removeEventListener('ferex_trade_tasks_change', load); window.removeEventListener('ferex-attendance-updated', load); }; }, [load]);

  /** Called when the person opens the Tasks page: everything assigned so far counts as seen. */
  const markTasksSeen = useCallback(() => {
    if (!userId) return;
    try { const seen = readSeen(userId); openIds.current.forEach(id => seen.add(id)); newTasks.forEach(t => seen.add(t.id)); localStorage.setItem(seenKey(userId), JSON.stringify([...seen].slice(-500))); } catch { /* ignore */ }
    setNewTasks([]);
  }, [userId, newTasks]);

  const items = isAdmin ? leaves : newTasks;
  return { items, count: items.length, leaveCount: leaves.length, newTaskCount: newTasks.length, markTasksSeen };
}
