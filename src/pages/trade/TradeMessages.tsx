import React, { useState } from 'react';
import { MessageSquare, Send, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const TradeMessages: React.FC = () => {
  const [activeConv, setActiveConv] = useState(1);
  const [inputText, setInputText] = useState('');

  const [conversations] = useState([
    { id: 1, name: 'Jan Kowalski (Warsaw Logistics)', role: 'Customs Officer', lastMsg: 'Container MSKU-9821 is gate-out cleared.', time: '10:42 AM', unread: 2 },
    { id: 2, name: 'Hans Weber (Berlin Supplies)', role: 'Import Manager', lastMsg: 'LC copy approved by Deutsche Bank.', time: 'Yesterday', unread: 0 },
    { id: 3, name: 'Anouk de Jong (Rotterdam Trade)', role: 'Export Director', lastMsg: 'Sending Phytosanitary cert PDF.', time: 'Aug 04', unread: 0 },
  ]);

  const [chatHistory, setChatHistory] = useState<Record<number, Array<{ sender: string; text: string; time: string; self: boolean }>>>({
    1: [
      { sender: 'Jan Kowalski', text: 'Good morning. Checking status on container MSKU-9821045.', time: '10:30 AM', self: false },
      { sender: 'Trade Director', text: 'Bills of Lading BL-992014 signed. Customs clearance submitted.', time: '10:35 AM', self: true },
      { sender: 'Jan Kowalski', text: 'Container MSKU-9821 is gate-out cleared.', time: '10:42 AM', self: false }
    ],
    2: [
      { sender: 'Hans Weber', text: 'LC copy approved by Deutsche Bank.', time: 'Yesterday', self: false }
    ],
    3: [
      { sender: 'Anouk de Jong', text: 'Sending Phytosanitary cert PDF.', time: 'Aug 04', self: false }
    ]
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg = {
      sender: 'Trade Director',
      text: inputText,
      time: 'Just now',
      self: true
    };

    setChatHistory(prev => ({
      ...prev,
      [activeConv]: [...(prev[activeConv] || []), newMsg]
    }));

    setInputText('');
  };

  const currConv = conversations.find(c => c.id === activeConv);

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

      <Card className="grid grid-cols-1 md:grid-cols-3 overflow-hidden border border-slate-200/70 shadow-xs h-[520px]">
        {/* Left Conv List */}
        <div className="border-r border-slate-200/80 p-3 space-y-2 flex flex-col bg-slate-50/50">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input type="text" placeholder="Search contacts..." className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold" />
          </div>

          <div className="space-y-1 flex-1 overflow-y-auto">
            {conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => setActiveConv(c.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  activeConv === c.id ? 'bg-[#6A1B2E] text-white shadow-xs' : 'hover:bg-white text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black truncate">{c.name}</span>
                  <span className={`text-[9px] font-bold ${activeConv === c.id ? 'text-white/70' : 'text-slate-400'}`}>{c.time}</span>
                </div>
                <p className={`text-[11px] truncate mt-0.5 font-semibold ${activeConv === c.id ? 'text-white/90' : 'text-slate-500'}`}>{c.lastMsg}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Chat Workspace */}
        <div className="md:col-span-2 flex flex-col justify-between p-4 bg-white">
          <div className="border-b border-slate-100 pb-3 mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">{currConv?.name}</h3>
              <span className="text-[10px] font-semibold text-slate-400">{currConv?.role} · Active Now</span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 p-2">
            {(chatHistory[activeConv] || []).map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[75%] p-3 rounded-2xl text-xs font-semibold ${
                  msg.self ? 'bg-[#6A1B2E] text-white rounded-br-none' : 'bg-slate-100 text-slate-900 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleSend} className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to port officer..."
              className="flex-1 h-9 px-3 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
            />
            <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold h-9">
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};
