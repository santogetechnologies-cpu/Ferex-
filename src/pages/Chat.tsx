import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Search, Phone, Video, MoreVertical } from 'lucide-react';
import { Button } from '../components/Button';

export const Chat: React.FC = () => {
  // Mock conversations list
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileName = e.target.files[0].name;
      const newMsg = {
        id: Date.now(),
        text: `📎 Attached file: ${fileName}`,
        self: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, newMsg]);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const [conversations, setConversations] = useState([
    {
      id: 1,
      name: 'Dr. Evelyn Carter',
      role: 'Academic Lead Advisor',
      avatar: 'EC',
      online: true,
      lastMsg: 'Yes, your transcripts look fully verified.',
      time: '10:42 AM',
      unread: false,
    },
    {
      id: 2,
      name: 'Admissions Support Group',
      role: 'IT & Documents Operations',
      avatar: 'AS',
      online: true,
      lastMsg: 'The NAWA evaluation has been filed.',
      time: 'Yesterday',
      unread: true,
    },
    {
      id: 3,
      name: 'Polish Legal translation team',
      role: 'Translation Specialists',
      avatar: 'PL',
      online: false,
      lastMsg: 'We completed the certified copy drafts.',
      time: 'Aug 04',
      unread: false,
    }
  ]);

  // Messages database matching active conversation (ID: 1)
  const [messages, setMessages] = useState([
    { id: 1, text: 'Hello Evelyn, I have uploaded my TOEFL scorecard PDF. Could you verify if it is received?', time: '10:15 AM', self: true },
    { id: 2, text: 'Hi Sarah, yes! Ferex compliance logs show it was received and marked as checked.', time: '10:24 AM', self: false },
    { id: 3, text: 'Excellent, is there any further requirement for Stanford?', time: '10:30 AM', self: true },
    { id: 4, text: 'No, everything looks clear. We are now preparing the Polish equivalence files for Warsaw. Let me check the translation status.', time: '10:41 AM', self: false },
    { id: 5, text: 'Yes, your transcripts look fully verified.', time: '10:42 AM', self: false },
  ]);

  const [activeId, setActiveId] = useState(1);
  const [typedMessage, setTypedMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle Send Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim()) return;

    const newMsg = {
      id: messages.length + 1,
      text: typedMessage.trim(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      self: true
    };

    setMessages([...messages, newMsg]);

    // Update last message preview in conversation list
    setConversations(prev =>
      prev.map(c =>
        c.id === activeId ? { ...c, lastMsg: newMsg.text, time: newMsg.time } : c
      )
    );

    setTypedMessage('');
  };

  const activeConv = conversations.find(c => c.id === activeId) || conversations[0];

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm text-left select-none">
      
      {/* 1. Left Conversation List Panel */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col shrink-0">
        
        {/* Search header */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chat folders..."
              disabled
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
        </div>

        {/* List items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {conversations.map((conv) => {
            const isActive = conv.id === activeId;
            return (
              <button
                key={conv.id}
                onClick={() => setActiveId(conv.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left focus-visible:outline-none
                  ${isActive ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Avatar */}
                  <div className="relative w-10 h-10 rounded-full bg-[#6A1B2E]/5 text-[#6A1B2E] font-bold flex items-center justify-center shrink-0 border border-[#6A1B2E]/10">
                    {conv.avatar}
                    {conv.online && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full" />
                    )}
                  </div>

                  {/* Name preview */}
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">{conv.name}</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block leading-tight mt-0.5">{conv.role}</span>
                    <p className="text-[11px] text-slate-500 truncate font-semibold mt-1 max-w-[150px] leading-none">
                      {conv.lastMsg}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] font-bold text-slate-400">{conv.time}</span>
                  {conv.unread && (
                    <span className="w-2 h-2 rounded-full bg-primary block ml-auto mt-1" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Right Chat Feed Window */}
      <div className="flex-1 flex flex-col justify-between min-w-0 bg-slate-50/20">
        
        {/* Chat Feed Header */}
        <div className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#6A1B2E]/5 text-[#6A1B2E] font-bold flex items-center justify-center border border-[#6A1B2E]/10">
              {activeConv.avatar}
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900 leading-tight">{activeConv.name}</h3>
              <div className="flex items-center gap-1 mt-0.5 select-none">
                <span className={`w-1.5 h-1.5 rounded-full ${activeConv.online ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                <span className="text-[10px] font-bold text-slate-400">
                  {activeConv.online ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          {/* Action triggers */}
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              <Phone className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              <Video className="w-4 h-4" />
            </button>
            <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors">
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conversation Bubbles stream */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-thin">
          {messages.map((msg) => {
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[80%] ${msg.self ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Bubble avatar */}
                <div className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 border select-none
                  ${msg.self ? 'bg-primary/5 text-primary border-primary/10' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
                >
                  {msg.self ? 'SJ' : activeConv.avatar}
                </div>

                <div className="space-y-1">
                  {/* Bubble text */}
                  <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed
                    ${msg.self 
                      ? 'bg-primary text-white rounded-tr-none shadow-sm shadow-primary/10' 
                      : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none shadow-2xs'}`}
                  >
                    {msg.text}
                  </div>
                  {/* Time metadata */}
                  <span className={`text-[9px] font-bold text-slate-400 block px-1 ${msg.self ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator simulator (Render only on MIT chat if active) */}
          {activeId === 2 && (
            <div className="flex gap-3 mr-auto items-center">
              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center border border-slate-200">
                AS
              </div>
              {/* Animated dots */}
              <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-2xs flex items-center gap-1 h-8">
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Chat input box */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleAttachment} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>
          
          <input
            type="text"
            placeholder="Type your message here..."
            value={typedMessage}
            onChange={(e) => setTypedMessage(e.target.value)}
            className="flex-grow h-10 px-3.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-primary/50 transition-all"
          />

          <button
            type="button"
            onClick={() => setTypedMessage(prev => prev + '🎯 ')}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <Smile className="w-4.5 h-4.5" />
          </button>

          <Button
            type="submit"
            className="h-10 w-10 p-0 rounded-lg shrink-0 flex items-center justify-center shadow-none"
            disabled={!typedMessage.trim()}
          >
            <Send className="w-4.5 h-4.5" />
          </Button>
        </form>

      </div>

    </div>
  );
};
