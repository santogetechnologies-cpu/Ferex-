import { useState, useEffect, useCallback } from 'react';
import { getTickets, createTicket, addTicketReply, updateTicketStatus, updateTicketAssignee } from '../lib/api/tickets';
import { supabase } from '../lib/supabase';
import type { SupportTicket } from '../lib/types';

export function useTickets(studentId?: string) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTickets(studentId);
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchTickets();

    // Supabase Realtime Subscription on support_tickets
    const channelName = studentId ? `realtime_tickets_student_${studentId}` : 'realtime_tickets_admin';
    const filterStr = studentId ? `student_id=eq.${studentId}` : undefined;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: filterStr,
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    const handleLocalEvent = () => fetchTickets();
    window.addEventListener('ferex_ticket_change', handleLocalEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_ticket_change', handleLocalEvent);
    };
  }, [fetchTickets, studentId]);

  const newTicket = async (payload: {
    student_id: string;
    ticket_no: string;
    subject: string;
    description: string;
    category: string;
    priority: SupportTicket['priority'];
  }) => {
    const created = await createTicket(payload);
    setTickets(prev => [created, ...prev]);
    window.dispatchEvent(new Event('ferex_ticket_change'));
    return created;
  };

  const reply = async (payload: {
    ticket_id: string;
    sender_id: string;
    sender_name: string;
    message: string;
    is_staff?: boolean;
  }) => {
    return await addTicketReply(payload);
  };

  const changeStatus = async (id: string, status: SupportTicket['status']) => {
    const updated = await updateTicketStatus(id, status);
    setTickets(prev => prev.map(t => (t.id === id ? ({ ...t, ...updated } as SupportTicket) : t)));
    window.dispatchEvent(new Event('ferex_ticket_change'));
    return updated;
  };

  const assignTicket = async (id: string, assignedTo: string | null) => {
    const updated = await updateTicketAssignee(id, assignedTo);
    setTickets(prev => prev.map(t => (t.id === id ? ({ ...t, ...updated } as SupportTicket) : t)));
    window.dispatchEvent(new Event('ferex_ticket_change'));
    return updated;
  };

  return { tickets, loading, error, refresh: fetchTickets, newTicket, reply, changeStatus, assignTicket };
}
