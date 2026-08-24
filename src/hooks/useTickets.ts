import { useState, useEffect, useCallback } from 'react';
import { getTickets, createTicket, addTicketReply, updateTicketStatus, updateTicketAssignee } from '../lib/api/tickets';
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
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } as SupportTicket : t));
    return updated;
  };

  const assignTicket = async (id: string, assignedTo: string | null) => {
    const updated = await updateTicketAssignee(id, assignedTo);
    setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updated } as SupportTicket : t));
    return updated;
  };

  return { tickets, loading, error, refresh: fetchTickets, newTicket, reply, changeStatus, assignTicket };
}
