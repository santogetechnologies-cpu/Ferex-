import { supabase } from '../supabase';

/** One support thread per student, shared with their assigned counselor. Access is enforced by RLS. */
export interface ChatThread {
  id: string;
  student_id: string;
  counselor_id: string | null;
  last_message: string;
  last_message_at: string;
  unread_count_student: number;
  unread_count_counselor: number;
}

export interface ChatMsg {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
}

const toMsg = (row: any): ChatMsg => ({
  id: row.id,
  conversation_id: row.conversation_id,
  sender_id: row.sender_id,
  content: row.message ?? row.content ?? '',
  sent_at: row.created_at ?? row.sent_at ?? new Date().toISOString(),
});

/** Returns the student's thread id, creating it (with their counselor) if needed. */
export async function ensureChatConversation(studentId?: string): Promise<string> {
  const { data, error } = await supabase.rpc('ensure_chat_conversation', { p_student: studentId ?? null });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Threads the signed-in user may see (students: their own; counselors: theirs; admins: all). */
export async function listChatThreads(): Promise<ChatThread[]> {
  const { data, error } = await supabase.from('chat_conversations').select('*').order('last_message_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as ChatThread[];
}

export async function getChatMessages(conversationId: string): Promise<ChatMsg[]> {
  const { data, error } = await supabase.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []).map(toMsg);
}

export async function sendChatMessage(payload: { conversation_id: string; sender_id: string; content: string }): Promise<ChatMsg> {
  const { data, error } = await supabase.from('chat_messages')
    .insert({ conversation_id: payload.conversation_id, sender_id: payload.sender_id, message: payload.content })
    .select().single();
  if (error) throw new Error(error.message);
  return toMsg(data);
}

export async function markChatRead(conversationId: string, asStudent: boolean): Promise<void> {
  await supabase.from('chat_conversations')
    .update(asStudent ? { unread_count_student: 0 } : { unread_count_counselor: 0 })
    .eq('id', conversationId);
}

/** Calls onMessage for every new message in the thread (including your own, so dedupe by id). Returns an unsubscribe. */
export function subscribeToChat(conversationId: string, onMessage: (m: ChatMsg) => void): () => void {
  const channel = supabase.channel(`chat_thread_${conversationId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => onMessage(toMsg(payload.new)))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
