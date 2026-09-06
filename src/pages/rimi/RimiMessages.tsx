import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Search, Warehouse, Truck, Store, User, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getRimiMessages, sendRimiMessage, getRimiWarehouses, getRimiVehicles, getRimiDistributors } from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

interface Contact {
  id: string;
  name: string;
  role: string;
  type: 'warehouse' | 'fleet' | 'retailer' | 'staff';
  time: string;
}

export const RimiMessages: React.FC = () => {
  const [activeConvId, setActiveConvId] = useState<string>('1');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatForm, setNewChatForm] = useState({ name: '', role: 'Warehouse Manager', type: 'warehouse' as const });

  // Load Contacts dynamically from DB entities
  const loadContacts = useCallback(async () => {
    try {
      const [whList, vehList, distList, allMsgs] = await Promise.all([
        getRimiWarehouses(),
        getRimiVehicles(),
        getRimiDistributors(),
        getRimiMessages()
      ]);

      const baseContacts: Contact[] = [
        { id: '1', name: 'Rajesh Kulkarni (Mumbai Cold Hub)', role: 'Warehouse Manager', type: 'warehouse', time: '11:10 AM' },
        { id: '2', name: 'Sanjay Kumar (Reefer Driver)', role: 'Logistics Fleet', type: 'fleet', time: 'Yesterday' },
        { id: '3', name: 'HyperCity Procurement Head', role: 'Retailer Account', type: 'retailer', time: 'Aug 29' },
      ];

      // Add actual warehouses if available
      if (Array.isArray(whList)) {
        whList.forEach((wh, idx) => {
          if (wh.manager_name && !baseContacts.some(c => c.name.includes(wh.manager_name))) {
            baseContacts.push({
              id: `wh-${wh.id || idx}`,
              name: `${wh.manager_name} (${wh.city || wh.name})`,
              role: `Cold Hub Manager • ${wh.code || ''}`,
              type: 'warehouse',
              time: 'Recent'
            });
          }
        });
      }

      // Add vehicle drivers if available
      if (Array.isArray(vehList)) {
        vehList.forEach((veh, idx) => {
          if (veh.driver_name && !baseContacts.some(c => c.name.includes(veh.driver_name))) {
            baseContacts.push({
              id: `veh-${veh.id || idx}`,
              name: `${veh.driver_name} (${veh.vehicle_number || 'Reefer'})`,
              role: `Logistics Fleet Driver • ${veh.current_temp_celsius ? `${veh.current_temp_celsius}°C` : '-19°C'}`,
              type: 'fleet',
              time: 'Recent'
            });
          }
        });
      }

      // Add distributor accounts if available
      if (Array.isArray(distList)) {
        distList.forEach((dist, idx) => {
          if (dist.business_name && !baseContacts.some(c => c.name.includes(dist.business_name))) {
            baseContacts.push({
              id: `dist-${dist.id || idx}`,
              name: `${dist.contact_person || 'Procurement'} (${dist.business_name})`,
              role: `${dist.tier || 'Retailer'} Partner • ${dist.territory || 'Hub'}`,
              type: 'retailer',
              time: 'Recent'
            });
          }
        });
      }

      // Check messages for any custom conversation threads
      if (Array.isArray(allMsgs)) {
        allMsgs.forEach((m) => {
          if (m.conversation_id && !baseContacts.some(c => c.id === String(m.conversation_id))) {
            baseContacts.push({
              id: String(m.conversation_id),
              name: m.contact_name || `Direct Channel #${m.conversation_id}`,
              role: m.contact_role || 'Active Direct Channel',
              type: 'staff',
              time: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'
            });
          }
        });
      }

      setContacts(baseContacts);
    } catch {}
  }, []);

  const loadMessages = useCallback(async () => {
    const data = await getRimiMessages(activeConvId);
    if (data && data.length > 0) {
      setMessages(data);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  useEffect(() => {
    loadContacts();
    loadMessages();

    const channel = supabase
      .channel('realtime_rimi_messages_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_messages' }, () => {
        loadMessages();
        loadContacts();
      })
      .subscribe();

    const handleLocalChange = () => {
      loadMessages();
      loadContacts();
    };

    window.addEventListener('ferex_rimi_messages_change', handleLocalChange);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_messages_change', handleLocalChange);
    };
  }, [loadContacts, loadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const currConv = contacts.find(c => c.id === activeConvId);
    const sent = await sendRimiMessage({
      conversation_id: activeConvId,
      contact_name: currConv?.name || 'Contact',
      contact_role: currConv?.role || 'Staff',
      sender_name: 'Rimi Cold Chain Lead',
      message: inputText.trim(),
      is_self: true
    });

    setMessages(prev => [...prev, sent]);
    setInputText('');
  };

  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatForm.name) return;

    const newId = `conv-${Date.now().toString().slice(-4)}`;
    const newContact: Contact = {
      id: newId,
      name: newChatForm.name,
      role: newChatForm.role,
      type: newChatForm.type,
      time: 'Just now'
    };

    setContacts(prev => [newContact, ...prev]);
    setActiveConvId(newId);
    setShowNewChatModal(false);
    setNewChatForm({ name: '', role: 'Warehouse Manager', type: 'warehouse' });
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currConv = contacts.find(c => c.id === activeConvId) || {
    id: activeConvId,
    name: 'Cold Chain Desk Channel',
    role: 'Active Direct Channel',
    type: 'staff' as const,
    time: 'Now'
  };

  const getContactIcon = (type: Contact['type']) => {
    switch (type) {
      case 'warehouse': return <Warehouse className="w-3.5 h-3.5 text-blue-600" />;
      case 'fleet': return <Truck className="w-3.5 h-3.5 text-amber-600" />;
      case 'retailer': return <Store className="w-3.5 h-3.5 text-emerald-600" />;
      default: return <User className="w-3.5 h-3.5 text-[#6A1B2E]" />;
    }
  };

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-[#6A1B2E]" /> FMCG Distribution Communication Desk
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Direct messaging with cold warehouse managers, reefer truck drivers, and key store accounts.
          </p>
        </div>
        <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowNewChatModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Start New Dispatch Chat
        </Button>
      </div>

      <Card className="grid grid-cols-1 md:grid-cols-3 overflow-hidden border border-slate-200/80 shadow-xs h-[560px] rounded-2xl">
        {/* Left Contacts Sidebar */}
        <div className="border-r border-slate-200/80 p-3 space-y-2 flex flex-col bg-slate-50/50">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
            />
          </div>

          <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
            {filteredContacts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 font-medium">No contacts matching search</div>
            ) : (
              filteredContacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    activeConvId === c.id
                      ? 'bg-white shadow-xs border border-slate-200/80 ring-1 ring-slate-100'
                      : 'hover:bg-slate-100/70 border border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0 pr-1">
                      {getContactIcon(c.type)}
                      <span className="font-extrabold text-xs text-slate-900 truncate">{c.name}</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">{c.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-semibold truncate pl-5">{c.role}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Chat Pane */}
        <div className="col-span-2 flex flex-col h-full bg-white">
          <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#6A1B2E]/10 flex items-center justify-center text-[#6A1B2E] font-black shrink-0">
                {getContactIcon(currConv.type)}
              </div>
              <div>
                <h3 className="font-black text-xs text-slate-900">{currConv.name}</h3>
                <p className="text-[10px] font-bold text-slate-400">{currConv.role} • Active Cold Channel</p>
              </div>
            </div>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold">No messages in this channel yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Send a telemetry update or dispatch instruction below.</p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={m.id || idx} className={`flex ${m.is_self ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] p-3 rounded-2xl text-xs font-semibold shadow-xs ${
                    m.is_self ? 'bg-[#6A1B2E] text-white rounded-br-xs' : 'bg-slate-100 text-slate-900 rounded-bl-xs'
                  }`}>
                    <div className="text-[10px] font-extrabold opacity-75 mb-0.5">{m.sender_name}</div>
                    <p className="leading-relaxed whitespace-pre-wrap">{m.message || m.text}</p>
                    <div className="text-[9px] opacity-60 text-right mt-1">
                      {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-100 flex gap-2 bg-slate-50/20">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or cold chain instruction..."
              className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
            />
            <Button type="submit" size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold px-4">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </div>
      </Card>

      {/* ─── MODAL: START NEW DISPATCH CHAT ─── */}
      <AnimatePresence>
        {showNewChatModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowNewChatModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#6A1B2E]" /> Open Communication Channel
                </h3>
                <button onClick={() => setShowNewChatModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateNewChat} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Contact / Unit Name</label>
                  <input type="text" required value={newChatForm.name} onChange={(e) => setNewChatForm({ ...newChatForm, name: e.target.value })} placeholder="e.g. Pune Central Freezer Unit" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Role / Department</label>
                  <input type="text" required value={newChatForm.role} onChange={(e) => setNewChatForm({ ...newChatForm, role: e.target.value })} placeholder="e.g. Cold Depot Shift Supervisor" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Channel Type</label>
                  <select value={newChatForm.type} onChange={(e) => setNewChatForm({ ...newChatForm, type: e.target.value as any })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="warehouse">Warehouse Cold Room</option>
                    <option value="fleet">Reefer Truck Fleet</option>
                    <option value="retailer">Retailer Account</option>
                    <option value="staff">Internal Distribution Staff</option>
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowNewChatModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Open Channel</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
