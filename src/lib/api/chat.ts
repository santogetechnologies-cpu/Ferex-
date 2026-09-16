import { supabase } from '../supabase';
import type { Conversation, ChatMessage } from '../types';
import { generateUUID } from '../../utils/uuid';

export async function getConversations(userId: string): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .contains('participant_ids', [userId])
      .order('last_message_at', { ascending: false });

    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(`ferex_conversations_${userId}`, JSON.stringify(data));
      } catch {}
      return data as Conversation[];
    }
  } catch (err) {
    console.warn('[getConversations notice]:', err);
  }

  try {
    const local = localStorage.getItem(`ferex_conversations_${userId}`);
    if (local) return JSON.parse(local) as Conversation[];
  } catch {}

  return [];
}

export async function getChatMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (!error && data && data.length > 0) {
      try {
        localStorage.setItem(`ferex_chat_msgs_${conversationId}`, JSON.stringify(data));
      } catch {}
      return data as ChatMessage[];
    }
  } catch (err) {
    console.warn('[getChatMessages notice]:', err);
  }

  try {
    const local = localStorage.getItem(`ferex_chat_msgs_${conversationId}`);
    if (local) return JSON.parse(local) as ChatMessage[];
  } catch {}

  return [];
}

export async function sendChatMessage(payload: {
  conversation_id: string;
  sender_id: string;
  content: string;
  is_attachment?: boolean;
  attachment_url?: string;
}): Promise<ChatMessage> {
  const newMsg = {
    id: generateUUID(),
    conversation_id: payload.conversation_id,
    sender_id: payload.sender_id,
    content: payload.content,
    is_attachment: payload.is_attachment || false,
    attachment_url: payload.attachment_url || null,
    sent_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      try {
        await supabase
          .from('conversations')
          .update({
            last_message: payload.content,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', payload.conversation_id);
      } catch {}

      window.dispatchEvent(new CustomEvent('ferex_chat_message', { detail: data }));
      return data as ChatMessage;
    }
  } catch (err) {
    console.warn('[sendChatMessage notice]:', err);
  }

  // Local storage fallback
  try {
    const key = `ferex_chat_msgs_${payload.conversation_id}`;
    const local = localStorage.getItem(key);
    const existing = local ? JSON.parse(local) : [];
    localStorage.setItem(key, JSON.stringify([...existing, newMsg]));

    // Update local conversations last message
    const convKey = `ferex_conversations_${payload.sender_id}`;
    const convRaw = localStorage.getItem(convKey);
    if (convRaw) {
      const convs: Conversation[] = JSON.parse(convRaw);
      const updatedConvs = convs.map(c =>
        c.id === payload.conversation_id
          ? { ...c, last_message: payload.content, last_message_at: new Date().toISOString() }
          : c
      );
      localStorage.setItem(convKey, JSON.stringify(updatedConvs));
    }
  } catch {}

  window.dispatchEvent(new CustomEvent('ferex_chat_message', { detail: newMsg }));
  return newMsg as unknown as ChatMessage;
}

