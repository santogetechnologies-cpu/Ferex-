import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, Paperclip, Phone, Video } from 'lucide-react';

interface Conversation {
  id: number; name: string; role: string; avatar: string; online: boolean;
  lastMsg: string; time: string; unread: number;
  messages: { id: number; text: string; self: boolean; time: string }[];
}

const CONVERSATIONS: Conversation[] = [
  { id: 1, name: 'Ashly', role: 'FX-2026-001 · India', avatar: 'A', online: true, lastMsg: 'Can you clarify my visa appointment?', time: '10:42 AM', unread: 2, messages: [{ id: 1, text: 'Hello, I need some help with my visa appointment date.', self: false, time: '10:30 AM' }, { id: 2, text: 'Of course! Your visa appointment is scheduled for Aug 12, 2026. You will need to carry your passport, offer letter, and financial statements.', self: true, time: '10:35 AM' }, { id: 3, text: 'Can you clarify my visa appointment?', self: false, time: '10:42 AM' }] },
  { id: 2, name: 'Rahul Mehta', role: 'FX-2026-002 · India', avatar: 'RM', online: true, lastMsg: 'Did not receive payment receipt', time: '9:55 AM', unread: 1, messages: [{ id: 1, text: 'Hi, I made the payment yesterday but did not receive any receipt on my email.', self: false, time: '9:50 AM' }, { id: 2, text: 'Thank you for reaching out. Let me check on your payment status right away.', self: true, time: '9:52 AM' }, { id: 3, text: 'Did not receive payment receipt', self: false, time: '9:55 AM' }] },
  { id: 3, name: 'Priya Sharma', role: 'FX-2026-003 · India', avatar: 'PS', online: false, lastMsg: 'Thank you for the update!', time: 'Yesterday', unread: 0, messages: [{ id: 1, text: 'Your IELTS document has been verified successfully!', self: true, time: '2:00 PM' }, { id: 2, text: 'Thank you for the update!', self: false, time: '2:10 PM' }] },
  { id: 4, name: 'Amir Hassan', role: 'FX-2026-004 · UAE', avatar: 'AH', online: true, lastMsg: 'What are the accommodation options?', time: '8:30 AM', unread: 0, messages: [{ id: 1, text: 'Hello! Can you help me with accommodation options near the University of Warsaw?', self: false, time: '8:25 AM' }, { id: 2, text: 'Hello Amir! We have partnerships with several student residences near the university. I will send you the options shortly.', self: true, time: '8:28 AM' }, { id: 3, text: 'What are the accommodation options?', self: false, time: '8:30 AM' }] },
  { id: 5, name: 'Fatima Al-Rashid', role: 'FX-2026-005 · Qatar', avatar: 'FA', online: false, lastMsg: 'Offer letter has a typo in my name', time: 'Yesterday', unread: 0, messages: [{ id: 1, text: 'There is a spelling error in my name on the offer letter. It says Fatimah instead of Fatima.', self: false, time: '11:00 AM' }, { id: 2, text: 'Thank you for flagging this. We will get an updated letter issued within 24 hours.', self: true, time: '11:15 AM' }] },
];

export const AdminChatSupport: React.FC = () => {
  const [conversations, setConversations] = useState(CONVERSATIONS);
  const [activeId, setActiveId] = useState(1);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const active = conversations.find(c => c.id === activeId)!;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    const newMsg = { id: Date.now(), text: message, self: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setConversations(prev => prev.map(c => c.id === activeId
      ? { ...c, messages: [...c.messages, newMsg], lastMsg: message, time: 'Just now', unread: 0 }
      : c
    ));
    setMessage('');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const name = e.target.files[0].name;
    const newMsg = { id: Date.now(), text: `📎 Attachment: ${name}`, self: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, newMsg] } : c));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectConv = (id: number) => {
    setActiveId(id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: 0 } : c));
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />

      {/* Left panel */}
      <div className="w-72 border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-sm font-extrabold text-slate-900 mb-3">Chat Support</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search students..."
              className="w-full h-9 pl-8 pr-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => handleSelectConv(c.id)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 text-left transition-all
                ${c.id === activeId ? 'bg-[#6A1B2E]/5 border-l-2 border-l-[#6A1B2E]' : 'hover:bg-slate-50'}`}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-[#6A1B2E] flex items-center justify-center text-white text-xs font-extrabold">{c.avatar}</div>
                {c.online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-extrabold text-slate-900 truncate">{c.name}</p>
                  <span className="text-[9px] font-semibold text-slate-400 shrink-0">{c.time}</span>
                </div>
                <p className="text-[10px] font-semibold text-slate-400 truncate">{c.role}</p>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate">{c.lastMsg}</p>
              </div>
              {c.unread > 0 && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-[#6A1B2E] text-white text-[9px] font-extrabold flex items-center justify-center">{c.unread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-[#6A1B2E] flex items-center justify-center text-white text-xs font-extrabold">{active.avatar}</div>
            {active.online && <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-slate-900">{active.name}</p>
            <p className="text-[10px] font-semibold text-slate-400">{active.online ? '🟢 Online' : 'Offline'} · {active.role}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"><Phone className="w-4 h-4" /></button>
            <button className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all"><Video className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-slate-50/30">
          {active.messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.self ? 'justify-end' : 'justify-start'}`}>
              {!msg.self && (
                <div className="w-7 h-7 rounded-lg bg-[#6A1B2E] flex items-center justify-center text-white text-[9px] font-extrabold shrink-0">{active.avatar}</div>
              )}
              <div className="max-w-[70%] space-y-0.5">
                <div className={`px-4 py-2.5 rounded-2xl text-xs font-semibold leading-relaxed ${msg.self ? 'bg-[#6A1B2E] text-white rounded-tr-none shadow-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-sm'}`}>
                  {msg.text}
                </div>
                <p className={`text-[9px] font-bold text-slate-400 ${msg.self ? 'text-right' : 'text-left'} px-1`}>{msg.time}</p>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3.5 border-t border-slate-100 bg-white">
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
            <Paperclip className="w-4 h-4" />
          </button>
          <input type="text" value={message} onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 h-9 px-3.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#6A1B2E]/40 transition-all" />
          <button type="submit"
            className="w-9 h-9 bg-[#6A1B2E] rounded-xl flex items-center justify-center text-white hover:bg-[#4A101E] transition-all shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
