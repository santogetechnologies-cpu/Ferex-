import { supabase } from '../supabase';
import type { SupportTicket, TicketReply } from '../types';
import { generateUUID } from '../../utils/uuid';

export async function getTickets(studentId?: string): Promise<SupportTicket[]> {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.or(`student_id.eq.${studentId},user_id.eq.${studentId}`);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      if (studentId) {
        try { localStorage.setItem(`ferex_tickets_${studentId}`, JSON.stringify(data)); } catch (e) {}
      }
      return data as SupportTicket[];
    }

    if (studentId) {
      const local = localStorage.getItem(`ferex_tickets_${studentId}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  } catch (err) {
    if (studentId) {
      const local = localStorage.getItem(`ferex_tickets_${studentId}`);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {}
      }
    }
    return [];
  }
}

export async function getTicketReplies(ticketId: string): Promise<TicketReply[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('sent_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as TicketReply[];
    }

    // Try ticket_messages table fallback
    const { data: msgData, error: msgErr } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!msgErr && msgData) {
      return msgData.map(m => ({
        id: m.id,
        ticket_id: m.ticket_id,
        sender_id: m.sender_id,
        sender_name: m.sender_name,
        message: m.message,
        is_staff: m.sender_role !== 'student',
        sent_at: m.created_at
      }));
    }

    const local = localStorage.getItem(`ferex_replies_${ticketId}`);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  } catch (err) {
    return [];
  }
}

export async function createTicket(payload: {
  student_id: string;
  ticket_no?: string;
  subject: string;
  description: string;
  category?: string;
  priority?: SupportTicket['priority'];
}) {
  const newId = generateUUID();
  const ticketNo = payload.ticket_no || `TC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const categoryValue = payload.category || 'General Query';

  const ticketObj = {
    id: newId,
    student_id: payload.student_id,
    user_id: payload.student_id,
    ticket_no: ticketNo,
    subject: payload.subject,
    description: payload.description,
    category: categoryValue,
    priority: payload.priority || 'Medium',
    status: 'Open',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert(ticketObj)
      .select();

    if (!error && data && data.length > 0) {
      return data[0] as SupportTicket;
    }
  } catch (e) {}

  // Local storage backup
  try {
    const key = `ferex_tickets_${payload.student_id}`;
    const local = localStorage.getItem(key);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(key, JSON.stringify([ticketObj, ...existing]));
  } catch (e) {}

  return ticketObj as unknown as SupportTicket;
}

export async function addTicketReply(payload: {
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  is_staff?: boolean;
}) {
  const newId = generateUUID();
  const { data, error } = await supabase
    .from('ticket_replies')
    .insert({
      id: newId,
      ticket_id: payload.ticket_id,
      sender_id: payload.sender_id,
      sender_name: payload.sender_name || 'Admin',
      message: payload.message,
      is_staff: payload.is_staff || false
    })
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || 'Failed to insert ticket reply in database');
  }
  return data[0] as TicketReply;
}

export async function replyToTicket(ticketId: string, message: string, isStaff: boolean = true) {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id || '00000000-0000-0000-0000-000000000000';
  const userName = authData?.user?.user_metadata?.full_name || 'Admissions Staff';
  return addTicketReply({
    ticket_id: ticketId,
    sender_id: userId,
    sender_name: userName,
    message,
    is_staff: isStaff,
  });
}

export async function updateTicketStatus(id: string, status: SupportTicket['status']) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || 'Failed to update ticket status');
  }
  return data[0] as SupportTicket;
}

export async function updateTicketAssignee(id: string, assignedTo: string | null) {
  const { data, error } = await supabase
    .from('support_tickets')
    .update({ assigned_to: assignedTo || null })
    .eq('id', id)
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || 'Failed to update ticket assignee');
  }
  return data[0] as SupportTicket;
}
