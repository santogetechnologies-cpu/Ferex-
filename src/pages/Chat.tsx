import React, { useState, useRef, useEffect } from 'react';
import { Send, Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getConversations, getChatMessages, sendChatMessage } from '../lib/api/chat';

interface ConversationUI {
  id: string;
  name: string;
  role: string;
  avatar: string;
  online: boolean;
  lastMsg: string;
  time: string;
}

interface MessageUI {
  id: string;
  text: string;
  self: boolean;
  time: string;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationUI[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      getConversations(user.id).then(list => {
        const mapped = list.map(c => ({
          id: c.id,
          name: c.name || 'Admissions Counselor',
          role: 'Education Support Advisor',
          avatar: c.name?.[0]?.toUpperCase() || 'A',
          online: true,
          lastMsg: c.last_message || 'No messages yet',
          time: new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setConversations(mapped);
        if (mapped.length > 0) setActiveId(mapped[0].id);
      }).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (activeId) {
      getChatMessages(activeId).then(msgs => {
        const mapped = msgs.map(m => ({
          id: m.id,
          text: m.content,
          self: m.sender_id === user?.id,
          time: new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }));
        setMessages(mapped);
      }).catch(() => {});
    }
  }, [activeId, user]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartChat = async () => {
    if (!user) return;
    try {
      const { getStaffMembers } = await import('../lib/api/students');
      const staffList = await getStaffMembers();
      const advisor = staffList.find(u => u.role === 'Staff' || u.role === 'Counselor') || staffList[0];
      if (!advisor) {
        alert('No counselors found in database to start chat.');
        return;
      }

      const { supabase } = await import('../lib/supabase');
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [user.id, advisor.id]);

      if (existing && existing.length > 0) {
        setActiveId(existing[0].id);
        getConversations(user.id).then(list => {
          const mapped = list.map(c => ({
            id: c.id,
            name: c.name || 'Admissions Counselor',
            role: 'Education Support Advisor',
            avatar: c.name?.[0]?.toUpperCase() || 'A',
            online: true,
            lastMsg: c.last_message || 'No messages yet',
            time: new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }));
          setConversations(mapped);
        });
        return;
      }

      const { data: created, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, advisor.id],
          name: advisor.full_name || 'Academic Counselor',
          last_message: 'Conversation started',
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      const list = await getConversations(user.id);
      const mapped = list.map(c => ({
        id: c.id,
        name: c.name || 'Admissions Counselor',
        role: 'Education Support Advisor',
        avatar: c.name?.[0]?.toUpperCase() || 'A',
        online: true,
        lastMsg: c.last_message || 'No messages yet',
        time: new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      setConversations(mapped);
      setActiveId(created.id);

    } catch (err: any) {
      alert(`Failed to start chat: ${err.message || 'Error'}`);
    }
  };

  const active = conversations.find(c => c.id === activeId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeId || !user) return;
    const text = message.trim();
    setMessage('');

    try {
      const sent = await sendChatMessage({
        conversation_id: activeId,
        sender_id: user.id,
        content: text,
      });

      setMessages(prev => [...prev, {
        id: sent.id,
        text: sent.content,
        self: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (err) {}
  };

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMsg.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex border border-slate-200/80 rounded-2xl bg-white shadow-xs overflow-hidden text-left">
      
      {/* Sidebar: Thread List */}
      <div className="w-80 border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-900">Support & Advisory Chat</h2>
            {filtered.length > 0 && (
              <button
                onClick={handleStartChat}
                title="Start a new advisor thread"
                className="text-[10px] font-black text-[#6A1B2E] hover:text-[#521221]"
              >
                + New Chat
              </button>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chat threads..."
              className="w-full h-8.5 pl-8.5 pr-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 flex flex-col">
          {filtered.length === 0 ? (
            <div className="text-center p-6 space-y-3.5 flex-1 flex flex-col justify-center items-center">
              <p className="text-xs font-bold text-slate-400">
                No active chat threads.
              </p>
              <button
                onClick={handleStartChat}
                className="px-4 py-2 bg-[#6A1B2E] text-white rounded-xl text-xs font-black hover:bg-[#521221] transition-all shadow-xs"
              >
                💬 Start Chat with Advisor
              </button>
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                  activeId === c.id ? 'bg-[#6A1B2E]/5 border-l-4 border-l-[#6A1B2E]' : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E] text-white flex items-center justify-center text-xs font-black">
                    {c.avatar}
                  </div>
                  {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-black text-slate-900 truncate">{c.name}</h4>
                    <span className="text-[9.5px] font-semibold text-slate-400">{c.time}</span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 truncate">{c.lastMsg}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/40">
        {active ? (
          <>
            {/* Header */}
            <div className="px-6 py-3.5 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#6A1B2E] text-white flex items-center justify-center text-xs font-black">
                  {active.avatar}
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-900">{active.name}</h3>
                  <p className="text-[10px] font-semibold text-slate-400">{active.role}</p>
                </div>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3.5">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-xs font-bold text-slate-400">
                  No messages exchanged yet. Ask your advisor a question below!
                </div>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.self ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed font-semibold shadow-xs ${
                      m.self ? 'bg-[#6A1B2E] text-white rounded-br-xs' : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-xs'
                    }`}>
                      <p>{m.text}</p>
                      <span className={`text-[9px] font-bold block mt-1 text-right ${m.self ? 'text-white/60' : 'text-slate-400'}`}>
                        {m.time}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={endRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-100 flex items-center gap-3">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message to your counselor..."
                className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]/40"
              />
              <button
                type="submit"
                className="h-10 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#4A101E] transition-colors flex items-center gap-1.5 shadow-sm"
              >
                Send <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs font-bold text-slate-400">
            Select an advisory chat thread from the left panel to begin messaging.
          </div>
        )}
      </div>
    </div>
  );
};
