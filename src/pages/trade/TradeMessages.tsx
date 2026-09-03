import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeMessages, sendTradeMessage, getTradeCRMContacts } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeMessages: React.FC = () => {
  const [activeConv, setActiveConv] = useState('1');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    try {
      const crm = await getTradeCRMContacts();
      if (Array.isArray(crm) && crm.length > 0) {
        setContacts(crm.map((c: any, idx: number) => ({
          id: c.id || `conv-${idx + 1}`,
          name: `${c.contact_person} (${c.company_name})`,
          company: c.company_name,
          role: c.category || 'Trade Partner',
          email: c.email
        })));
        if (!activeConv || activeConv === '1') {
          setActiveConv(crm[0].id || '1');
        }
      } else {
        setContacts([
          { id: '1', name: 'Logistics Desk (Port of Gdansk)', company: 'Maritime Operations', role: 'Customs Officer' },
          { id: '2', name: 'Banking Operations Desk (HSBC)', company: 'HSBC Trade Finance', role: 'LC Guarantee Manager' },
        ]);
      }
    } catch {
      setContacts([
        { id: '1', name: 'Logistics Desk (Port of Gdansk)', company: 'Maritime Operations', role: 'Customs Officer' },
      ]);
    }
  }, [activeConv]);

  const loadMessages = useCallback(async (convId: string) => {
    setLoading(true);
    try {
      const data = await getTradeMessages(convId);
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
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

  const currConv = contacts.find(c => c.id === activeConv) || contacts[0];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currConv) return;

    const textToSend = inputText;
    setInputText('');

    await sendTradeMessage({
      conversation_id: currConv.id,
      contact_name: currConv.name,
      contact_role: currConv.role,
      sender_name: 'Trade Director',
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
          <MessageSquare className="w-5 h-5 text-[#6A1B2E]" /> Global Trade Communication Desk
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Direct messaging with port logistics officers, customs brokers, and banking LC managers.
        </p>
      </div>

      <Card className="grid grid-cols-1 md:grid-cols-3 overflow-hidden border border-slate-200/70 shadow-xs h-[540px] p-0">
        {/* Left Conv List */}
        <div className="border-r border-slate-200/80 p-3 space-y-2 flex flex-col bg-slate-50/50">
          <div className="relative mb-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search trade contacts..."
              className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
            />
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto">
            {filteredContacts.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  activeConv === c.id
                    ? 'bg-[#6A1B2E] text-white shadow-md'
                    : 'bg-white hover:bg-slate-100 border border-slate-100 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-black truncate ${activeConv === c.id ? 'text-white' : 'text-slate-900'}`}>{c.name}</span>
                </div>
                <div className={`text-[10px] font-semibold flex items-center gap-1 ${activeConv === c.id ? 'text-white/80' : 'text-slate-500'}`}>
                  <span>{c.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Active Chat Pane */}
        <div className="md:col-span-2 flex flex-col h-full bg-white">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div>
              <h3 className="text-sm font-black text-slate-900">{currConv?.name || 'Trade Communication'}</h3>
              <p className="text-[11px] font-semibold text-slate-500">{currConv?.company || 'Port Operations'} · {currConv?.role || 'Direct Desk'}</p>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Encrypted Desk
            </span>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/20">
            {loading ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400">Loading conversation history...</div>
            ) : messages.length === 0 ? (
              <div className="py-16 text-center text-xs font-semibold text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No messages in this conversation yet. Send a message below to start communicating.
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.is_self ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[9.5px] font-bold text-slate-400 mb-0.5 px-1">{m.sender_name || (m.is_self ? 'You' : currConv?.name)}</span>
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-xs font-medium leading-relaxed ${
                      m.is_self
                        ? 'bg-[#6A1B2E] text-white rounded-br-xs'
                        : 'bg-white border border-slate-200 text-slate-900 rounded-bl-xs shadow-xs'
                    }`}
                  >
                    {m.message}
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 mt-0.5 px-1">
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${currConv?.name || 'desk'}...`}
              className="flex-1 h-10 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
            />
            <Button type="submit" size="sm" className="h-10 px-4 bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shrink-0">
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
