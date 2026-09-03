import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiMessages, sendRimiMessage } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

export const RimiMessages: React.FC = () => {
  const [activeConv, setActiveConv] = useState(1);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);

  const conversations = [
    { id: 1, name: 'Rajesh Kulkarni (Mumbai Cold Hub)', role: 'Warehouse Manager', time: '11:10 AM' },
    { id: 2, name: 'Sanjay Kumar (Reefer Driver)', role: 'Logistics Fleet', time: 'Yesterday' },
    { id: 3, name: 'HyperCity Procurement Head', role: 'Retailer Account', time: 'Aug 29' },
  ];

  const loadMessages = useCallback(async () => {
    const data = await getRimiMessages(String(activeConv));
    if (data && data.length > 0) {
      setMessages(data);
    } else {
      // Default initial message
      if (activeConv === 1) {
        setMessages([
          { id: '1', sender_name: 'Rajesh Kulkarni', message: 'Good morning. Checking cold room #2 telemetry.', created_at: new Date(Date.now() - 3600000).toISOString(), is_self: false },
          { id: '2', sender_name: 'Rimi Cold Chain Lead', message: 'Confirmed. Keep temperature locked at -22°C.', created_at: new Date(Date.now() - 1800000).toISOString(), is_self: true },
          { id: '3', sender_name: 'Rajesh Kulkarni', message: 'Temperature steady at -22.4°C across all sensors.', created_at: new Date().toISOString(), is_self: false }
        ]);
      } else if (activeConv === 2) {
        setMessages([
          { id: '1', sender_name: 'Sanjay Kumar', message: 'Approaching Reliance Fresh Bhiwandi drop site. Reefer temp -19°C.', created_at: new Date().toISOString(), is_self: false }
        ]);
      } else {
        setMessages([
          { id: '1', sender_name: 'HyperCity Procurement', message: 'Please dispatch 50 packs King Prawns with tomorrow morning delivery schedule.', created_at: new Date().toISOString(), is_self: false }
        ]);
      }
    }
  }, [activeConv]);

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel('realtime_rimi_messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_messages' }, () => {
        loadMessages();
      })
      .subscribe();

    const handleLocalChange = () => loadMessages();
    window.addEventListener('ferex_rimi_messages_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_messages_change', handleLocalChange);
    };
  }, [loadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currConv = conversations.find(c => c.id === activeConv);
    const sent = await sendRimiMessage({
      conversation_id: String(activeConv),
      contact_name: currConv?.name || 'Contact',
      contact_role: currConv?.role || 'Staff',
      sender_name: 'Rimi Cold Chain Lead',
      message: inputText.trim(),
      is_self: true
    });

    setMessages(prev => [...prev, sent]);
    setInputText('');
  };

  const currConv = conversations.find(c => c.id === activeConv);

  return (
    <div className="space-y-6 text-left antialiased">
      <div>
        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-[#6A1B2E]" /> FMCG Distribution Communication Desk
        </h1>
        <p className="text-xs font-semibold text-slate-500 mt-1">
          Direct messaging with cold warehouse managers, reefer truck drivers, and key store accounts.
        </p>
      </div>

      <Card className="grid grid-cols-1 md:grid-cols-3 overflow-hidden border border-slate-200/70 shadow-xs h-[520px]">
        <div className="border-r border-slate-200/80 p-3 space-y-2 flex flex-col bg-slate-50/50">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search contacts..." className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold" />
          </div>

          <div className="space-y-1 overflow-y-auto flex-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`w-full p-3 rounded-xl text-left transition-all ${activeConv === c.id ? 'bg-white shadow-xs border border-slate-200/80' : 'hover:bg-slate-100/70'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-extrabold text-xs text-slate-900 truncate">{c.name}</span>
                  <span className="text-[9px] font-bold text-slate-400">{c.time}</span>
                </div>
                <div className="text-[11px] text-slate-500 font-semibold truncate">{c.role}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex flex-col h-full bg-white">
          <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <div>
              <h3 className="font-black text-xs text-slate-900">{currConv?.name}</h3>
              <p className="text-[10px] font-bold text-slate-400">{currConv?.role} • Active Cold Channel</p>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.is_self ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-xs font-semibold shadow-xs ${m.is_self ? 'bg-[#6A1B2E] text-white rounded-br-xs' : 'bg-slate-100 text-slate-900 rounded-bl-xs'}`}>
                  <div className="text-[10px] font-extrabold opacity-75 mb-0.5">{m.sender_name}</div>
                  <p className="leading-relaxed">{m.message || m.text}</p>
                  <div className="text-[9px] opacity-60 text-right mt-1">
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or cold chain instruction..."
              className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#6A1B2E]"
            />
            <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold px-4">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
