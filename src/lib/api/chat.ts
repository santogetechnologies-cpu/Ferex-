import { supabase } from '../supabase';
import type { Conversation, ChatMessage } from '../types';

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .contains('participant_ids', [userId])
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Conversation[];
}

export async function getChatMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, users!sender_id(*)')
    .eq('conversation_id', conversationId)
    .order('sent_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(payload: {
  conversation_id: string;
  sender_id: string;
  content: string;
  is_attachment?: boolean;
  attachment_url?: string;
}) {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  // Update conversation last message timestamp & text
  await supabase
    .from('conversations')
    .update({
      last_message: payload.content,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', payload.conversation_id);

  return data as ChatMessage;
}
