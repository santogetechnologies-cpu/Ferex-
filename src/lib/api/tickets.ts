import { supabase } from '../supabase';
import { getAdminSupabaseClient } from '../supabaseAdmin';
import type { SupportTicket, TicketReply } from '../types';
import { generateUUID } from '../../utils/uuid';

const TICKETS_CONFIG_KEY = 'ferex_tickets_catalog';
const REPLIES_CONFIG_KEY = 'ferex_replies_catalog';

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
    if (!error && data && data.length > 0) {
      if (studentId) {
        try { localStorage.setItem(`ferex_tickets_${studentId}`, JSON.stringify(data)); } catch (e) {}
      }
      return data as SupportTicket[];
    }

    // Cloud system_config catalog fallback
    const { data: catalogData } = await client
      .from('system_config')
      .select('value')
      .eq('key', TICKETS_CONFIG_KEY)
      .maybeSingle();

    if (catalogData?.value && Array.isArray(catalogData.value) && catalogData.value.length > 0) {
      const allTickets: SupportTicket[] = catalogData.value;
      if (studentId) {
        return allTickets.filter(t => t.student_id === studentId || (t as any).user_id === studentId);
      }
      return allTickets;
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
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;

    const { data, error } = await client
      .from('ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('sent_at', { ascending: true });

    if (!error && data && data.length > 0) {
      return data as TicketReply[];
    }

    // Try ticket_messages table fallback
    const { data: msgData, error: msgErr } = await client
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (!msgErr && msgData && msgData.length > 0) {
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

    // Cloud system_config replies catalog
    const { data: catData } = await client
      .from('system_config')
      .select('value')
      .eq('key', `${REPLIES_CONFIG_KEY}_${ticketId}`)
      .maybeSingle();

    if (catData?.value && Array.isArray(catData.value)) {
      return catData.value;
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
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data, error } = await client
      .from('support_tickets')
      .insert(ticketObj)
      .select();

    // Sync to cloud catalog
    const { data: curCat } = await client.from('system_config').select('value').eq('key', TICKETS_CONFIG_KEY).maybeSingle();
    const existing = (curCat?.value && Array.isArray(curCat.value)) ? curCat.value : [];
    await client.from('system_config').upsert({
      key: TICKETS_CONFIG_KEY,
      value: [ticketObj, ...existing.filter((t: any) => t.id !== newId)],
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

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
  const replyObj: TicketReply = {
    id: newId,
    ticket_id: payload.ticket_id,
    sender_id: payload.sender_id,
    sender_name: payload.sender_name || 'Staff',
    message: payload.message,
    is_staff: payload.is_staff || false,
    sent_at: new Date().toISOString()
  } as unknown as TicketReply;

  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data } = await client
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

    // Update cloud catalog for this ticket
    const { data: curCat } = await client.from('system_config').select('value').eq('key', `${REPLIES_CONFIG_KEY}_${payload.ticket_id}`).maybeSingle();
    const existing = (curCat?.value && Array.isArray(curCat.value)) ? curCat.value : [];
    await client.from('system_config').upsert({
      key: `${REPLIES_CONFIG_KEY}_${payload.ticket_id}`,
      value: [...existing, replyObj],
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    if (data && data.length > 0) {
      return data[0] as TicketReply;
    }
  } catch {}

  try {
    const localKey = `ferex_replies_${payload.ticket_id}`;
    const local = localStorage.getItem(localKey);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(localKey, JSON.stringify([...existing, replyObj]));
  } catch {}

  return replyObj;
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
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data } = await client
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (data && data.length > 0) {
      return data[0] as SupportTicket;
    }
  } catch {}

  return { id, status } as unknown as SupportTicket;
}

export async function updateTicketAssignee(id: string, assignedTo: string | null) {
  try {
    const admin = await getAdminSupabaseClient();
    const client = admin || supabase;
    const { data } = await client
      .from('support_tickets')
      .update({ assigned_to: assignedTo || null, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select();

    if (data && data.length > 0) {
      return data[0] as SupportTicket;
    }
  } catch {}

  return { id, assigned_to: assignedTo } as unknown as SupportTicket;
}

