import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../adminAuthClient';
import type { SupportTicket, TicketReply } from '../types';
import { generateUUID } from '../../utils/uuid';

const TICKETS_CACHE_KEY = 'ferex_all_tickets_cache';

export async function getTickets(studentId?: string): Promise<SupportTicket[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    let query = client
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (studentId) {
      query = query.or(`student_id.eq.${studentId},user_id.eq.${studentId}`);
    }

    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      if (studentId) {
        try { localStorage.setItem(`ferex_tickets_${studentId}`, JSON.stringify(data)); } catch {}
      } else {
        try { localStorage.setItem(TICKETS_CACHE_KEY, JSON.stringify(data)); } catch {}
      }
      return data as SupportTicket[];
    }
  } catch (err) {
    console.warn('[getTickets DB notice]:', err);
  }

  // Offline fallback
  try {
    const key = studentId ? `ferex_tickets_${studentId}` : TICKETS_CACHE_KEY;
    const local = localStorage.getItem(key);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

export async function getTicketReplies(ticketId: string): Promise<TicketReply[]> {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    const { data, error } = await client
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('sent_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      try { localStorage.setItem(`ferex_replies_${ticketId}`, JSON.stringify(data)); } catch {}
      return data as TicketReply[];
    }
  } catch (err) {
    console.warn('[getTicketReplies DB notice]:', err);
  }

  try {
    const local = localStorage.getItem(`ferex_replies_${ticketId}`);
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}

  return [];
}

export async function createTicket(payload: {
  student_id: string;
  ticket_no?: string;
  subject: string;
  description: string;
  category?: string;
  priority?: SupportTicket['priority'];
}): Promise<SupportTicket> {
  const newId = generateUUID();
  const ticketNo = payload.ticket_no || `TC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const categoryValue = payload.category || 'General Query';
  const now = new Date().toISOString();

  const ticketObj: any = {
    id: newId,
    student_id: payload.student_id,
    user_id: payload.student_id,
    ticket_number: ticketNo,
    subject: payload.subject.trim(),
    description: payload.description.trim(),
    category: categoryValue,
    priority: payload.priority || 'Medium',
    status: 'Open',
    created_at: now,
    updated_at: now,
  };

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('support_tickets')
    .insert(ticketObj)
    .select();

  if (error) {
    throw new Error(`Failed to create ticket: ${error.message}`);
  }

  const result = (data && data[0]) ? data[0] : ticketObj;

  try {
    const key = `ferex_tickets_${payload.student_id}`;
    const local = localStorage.getItem(key);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(key, JSON.stringify([result, ...existing]));
    window.dispatchEvent(new Event('ferex_tickets_change'));
  } catch {}

  return result as SupportTicket;
}

export async function addTicketReply(payload: {
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  is_staff?: boolean;
}): Promise<TicketReply> {
  const newId = generateUUID();
  const now = new Date().toISOString();
  const replyObj: TicketReply = {
    id: newId,
    ticket_id: payload.ticket_id,
    sender_id: payload.sender_id,
    sender_name: payload.sender_name || 'Staff',
    message: payload.message.trim(),
    is_staff: payload.is_staff || false,
    sent_at: now,
  } as unknown as TicketReply;

  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;

  const { data, error } = await client
    .from('ticket_replies')
    .insert({
      id: newId,
      ticket_id: payload.ticket_id,
      sender_id: payload.sender_id,
      sender_name: payload.sender_name || 'Admin',
      message: payload.message.trim(),
      is_staff: payload.is_staff || false,
      sent_at: now,
    })
    .select();

  if (error) {
    throw new Error(`Failed to send reply: ${error.message}`);
  }

  const result = (data && data[0]) ? data[0] : replyObj;

  // Also update ticket's last_activity
  try {
    await client
      .from('support_tickets')
      .update({ updated_at: now, last_activity: now })
      .eq('id', payload.ticket_id);
  } catch {}

  try {
    const localKey = `ferex_replies_${payload.ticket_id}`;
    const local = localStorage.getItem(localKey);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(localKey, JSON.stringify([...existing, result]));
    window.dispatchEvent(new Event('ferex_tickets_change'));
  } catch {}

  return result as TicketReply;
}

export async function replyToTicket(ticketId: string, message: string, isStaff: boolean = true): Promise<TicketReply> {
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

export async function updateTicketStatus(id: string, status: SupportTicket['status']): Promise<SupportTicket> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('support_tickets')
    .update({ status, updated_at: now })
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(`Failed to update ticket status: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_tickets_change'));
  return (data && data[0]) ? data[0] : ({ id, status } as unknown as SupportTicket);
}

export async function updateTicketAssignee(id: string, assignedTo: string | null): Promise<SupportTicket> {
  const admin = await getAdminSupabaseClient();
  const client = admin || supabase;
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('support_tickets')
    .update({ assigned_to: assignedTo || null, updated_at: now })
    .eq('id', id)
    .select();

  if (error) {
    throw new Error(`Failed to assign ticket: ${error.message}`);
  }

  window.dispatchEvent(new Event('ferex_tickets_change'));
  return (data && data[0]) ? data[0] : ({ id, assigned_to: assignedTo } as unknown as SupportTicket);
}
