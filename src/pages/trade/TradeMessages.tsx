import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Search, User, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeMessages, sendTradeMessage, getTradeClients } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradeMessages: React.FC = () => {
  const { profile } = useAuth();
  const [activeConv, setActiveConv] = useState('1');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const senderName = profile?.full_name || 'Trade Operations Desk';

  const loadContacts = useCallback(async () => {
    try {
      const clients = await getTradeClients();
      if (Array.isArray(clients) && clients.length > 0) {
        setContacts(clients.map((c: any, idx: number) => {
          const person = c.contact_person || c.contact || 'Operations Desk';
          const company = c.company_name || 'Global Trade Partner';
          const name = person === company ? company : `${person} (${company})`;

          return {
            id: c.id || `conv-${idx + 1}`,
            name,
            company,
            role: c.category || 'Trade Partner / Buyer',
            email: c.email
          };
        }));
        if (!activeConv || activeConv === '1') {
          setActiveConv(clients[0].id || '1');
        }
      } else {
        setContacts([
          { id: '1', name: 'Marek Wojcik (Baltic Grain Sp. z o.o.)', company: 'Baltic Grain Sp. z o.o.', role: 'Buyer / Importer' },
          { id: '2', name: 'Dr. Klaus Richter (Hamburg Steel)', company: 'Hamburg Steel Handelsgesellschaft', role: 'Buyer / Importer' },
        ]);
      }
    } catch {
      setContacts([
        { id: '1', name: 'Marek Wojcik (Baltic Grain Sp. z o.o.)', company: 'Baltic Grain Sp. z o.o.', role: 'Buyer / Importer' },
      ]);
    }
  }, [activeConv]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true);
    try {
      const data = await getTradeMessages(convId);
      setMessages(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (activeConv) {
      loadMessages(activeConv);
    }

    const channel = supabase
      .channel('realtime_trade_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_messages' }, () => {
        if (activeConv) loadMessages(activeConv);
      })
      .subscribe();

    const handleLocalChange = () => {
      if (activeConv) loadMessages(activeConv);
    };
    window.addEventListener('ferex_trade_msgs_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_msgs_change', handleLocalChange);
    };
  }, [activeConv, loadMessages]);

  const currConv = contacts.find(c => c.id === activeConv) || (contacts.length > 0 ? contacts[0] : null);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currConv) return;

    const textToSend = inputText;
    setInputText('');

    await sendTradeMessage({
      conversation_id: currConv.id,
      contact_name: currConv.name,
      contact_role: currConv.role,
      sender_name: senderName,
      message: textToSend,
      is_self: true
    });

    await loadMessages(currConv.id);
  };

  const filteredContacts = contacts.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#58051E]" /> Global Trade Communication Desk
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Direct messaging with port logistics officers, buyers, and banking LC managers.
        </p>
      </div>

      <Card className="grid grid-cols-1 md:grid-cols-3 overflow-hidden border border-slate-200/80 shadow-xs h-[540px] p-0">
        {/* Left Contact List */}
        <div className="border-r border-slate-200/80 p-3 space-y-2 flex flex-col bg-slate-50/50">
          <div className="relative mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search trade contacts..."
              className="w-full h-8.5 pl-8.5 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto">
            {filteredContacts.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`p-3 rounded-2xl cursor-pointer transition-all ${
                  activeConv === c.id
                    ? 'bg-[#58051E] text-white shadow-md'
                    : 'bg-white hover:bg-slate-100 border border-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-black truncate ${activeConv === c.id ? 'text-white' : 'text-slate-900'}`}>{c.name}</span>
                </div>
                <div className={`text-[10.5px] font-bold ${activeConv === c.id ? 'text-white/80' : 'text-slate-500'}`}>
                  {c.role}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Chat Window */}
        <div className="md:col-span-2 flex flex-col justify-between h-full bg-white">
          {currConv ? (
            <>
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div>
                  <h2 className="text-xs font-black text-slate-900">{currConv.name}</h2>
                  <p className="text-[10px] text-slate-500 font-bold">{currConv.company} • {currConv.role}</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live Encrypted Desk
                </span>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-semibold">
                    <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
                    No messages in this conversation yet. Send a message below to start communicating.
                  </div>
                ) : (
                  messages.map((m: any, idx: number) => (
                    <div key={idx} className={`flex flex-col ${m.is_self ? 'items-end' : 'items-start'}`}>
                      <div className={`p-3 rounded-2xl text-xs max-w-sm ${
                        m.is_self
                          ? 'bg-[#58051E] text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}>
                        <div className="text-[9.5px] font-black opacity-70 mb-0.5">{m.sender_name || 'Trade Rep'}</div>
                        <p className="leading-relaxed font-semibold">{m.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder="Type encrypted message..."
                  className="flex-1 h-9 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
                />
                <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">
                  <Send className="w-3.5 h-3.5 mr-1" /> Send
                </Button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              Select a conversation to begin messaging.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TradeMessages;
