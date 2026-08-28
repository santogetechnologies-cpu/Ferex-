import { supabase } from '../supabase';
import type { SupportTicket, TicketReply } from '../types';
import { generateUUID } from '../../utils/uuid';

export async function getTickets(studentId?: string) {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*, users:student_id(full_name, email)')
      .order('created_at', { ascending: false });

    if (studentId) query = query.eq('student_id', studentId);

    const { data, error } = await query;
    if (error) {
      console.warn('[getTickets notice]:', error.message);
      return [];
    }
    return (data ?? []) as SupportTicket[];
  } catch (err) {
    return [];
  }
}

export async function getTicketReplies(ticketId: string) {
  try {
    const { data, error } = await supabase
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('sent_at', { ascending: true });

    if (error) return [];
    return (data ?? []) as TicketReply[];
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

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      id: newId,
      student_id: payload.student_id,
      ticket_no: ticketNo,
      subject: payload.subject,
      description: payload.description,
      category: categoryValue,
      priority: payload.priority || 'Medium',
      status: 'Open'
    })
    .select();

  if (error || !data || data.length === 0) {
    throw new Error(error?.message || 'Failed to insert support ticket in database');
  }
  return data[0] as SupportTicket;
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
