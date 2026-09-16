import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LifeBuoy, Search, Plus, PhoneCall, Mail, MessageSquare,
  User, CheckCircle2, Clock, X, Trash2, Edit3, ShieldAlert,
  Building2, UserCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getTradeTickets,
  createTradeTicket,
  updateTradeTicketStatus,
  reassignTradeTicket,
  deleteTradeTicket,
  getTradeStaffOfficers,
  getTradeOrders,
  type TradeTicket,
  type TicketChannel,
  type TicketPriority,
  type TicketStatus,
  type TradeOrder
} from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradeTickets: React.FC = () => {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<TradeTicket[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterChannel, setFilterChannel] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resolvingTicket, setResolvingTicket] = useState<TradeTicket | null>(null);
  const [resolutionText, setResolutionText] = useState('');
  const [toast, setToast] = useState('');

  const staffList = getTradeStaffOfficers();
  const userName = profile?.full_name || 'Trade Desk Admin';

  const initialForm = {
    client_name: '',
    client_contact: '',
    order_no: '',
    channel: 'Phone Call' as TicketChannel,
    subject: '',
    description: '',
    priority: 'Medium' as TicketPriority,
    status: 'Open' as TicketStatus,
    assigned_staff_name: staffList[0].name,
    assigned_staff_email: staffList[0].email,
  };

  const [formData, setFormData] = useState(initialForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTickets, allOrders] = await Promise.all([
        getTradeTickets(),
        getTradeOrders()
      ]);
      setTickets(Array.isArray(allTickets) ? allTickets : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_tickets_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_tickets' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_tickets_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_tickets_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_name || !formData.subject) {
      showToastMsg('Please fill in client name and issue subject.');
      return;
    }

    try {
      const created = await createTradeTicket({
        ...formData,
        logged_by: userName,
      });
      setShowCreateModal(false);
      setFormData(initialForm);
      showToastMsg(`Ticket ${created.ticket_no} logged & assigned to ${created.assigned_staff_name}!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to log ticket: ${err.message}`);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingTicket) return;
    try {
      await updateTradeTicketStatus(resolvingTicket.id, 'Resolved', resolutionText);
      showToastMsg(`Ticket ${resolvingTicket.ticket_no} marked Resolved!`);
      setResolvingTicket(null);
      setResolutionText('');
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to update: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, no: string) => {
    if (!window.confirm(`Delete ticket ${no}?`)) return;
    await deleteTradeTicket(id);
    showToastMsg(`Ticket ${no} deleted.`);
    await loadData();
  };

  const getChannelIcon = (ch: TicketChannel) => {
    switch (ch) {
      case 'Phone Call': return <PhoneCall className="w-3.5 h-3.5 text-blue-500" />;
      case 'Email': return <Mail className="w-3.5 h-3.5 text-purple-500" />;
      case 'WhatsApp': return <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />;
      case 'In-Person': return <User className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.ticket_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.order_no || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesChannel = filterChannel === 'All' || t.channel === filterChannel;
    return matchesSearch && matchesStatus && matchesChannel;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 text-xs font-bold"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#58051E]" />
            Manual Client Support & Inquiry Desk
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Manually log complaints, inquiries, or requests received via Phone, Email, WhatsApp, or In-Person.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Log Manual Ticket
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, clients, order #..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400">Status:</span>
          {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#58051E] text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Tickets Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading tickets...
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <LifeBuoy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No support tickets found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Log calls or emails from clients to assign tracking numbers and resolution actions.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map((t) => (
            <Card key={t.id} className="p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {t.ticket_no}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                      {getChannelIcon(t.channel)} {t.channel}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black ${
                    t.status === 'Resolved' || t.status === 'Closed'
                      ? 'bg-emerald-100 text-emerald-800'
                      : t.status === 'In Progress'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.status}
                  </span>
                </div>

                <h3 className="text-sm font-black text-slate-900 leading-snug mb-1">{t.subject}</h3>
                <div className="text-[11px] text-slate-500 font-bold mb-2">
                  Client: <strong className="text-slate-900">{t.client_name}</strong> {t.client_contact ? `(${t.client_contact})` : ''}
                  {t.order_no ? ` • Linked Order: ${t.order_no}` : ''}
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl mb-3 border border-slate-100">
                  {t.description}
                </p>

                {t.resolution_notes && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl mb-3 border border-emerald-200 text-xs text-emerald-900 font-medium">
                    <strong className="block text-[10px] font-black uppercase text-emerald-700 mb-0.5">Resolution Notes:</strong>
                    {t.resolution_notes}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <div className="text-slate-600">
                  Assigned: <strong className="text-slate-900">{t.assigned_staff_name}</strong>
                  <span className="text-[10px] text-slate-400 block">Logged by {t.logged_by}</span>
                </div>

                <div className="flex items-center gap-2">
                  {t.status !== 'Resolved' && t.status !== 'Closed' && (
                    <button
                      onClick={() => {
                        setResolvingTicket(t);
                        setResolutionText(t.resolution_notes || '');
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10.5px] font-black cursor-pointer shadow-2xs"
                    >
                      Resolve Ticket
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(t.id, t.ticket_no)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Delete Ticket"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── LOG MANUAL TICKET MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 max-h-[90vh] overflow-y-auto text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-[#58051E]" /> Log Manual Issue / Complaint
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">
                    Records phone or email requests so they become trackable and assignable to staff.
                  </p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs font-semibold">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Client Entity *</label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      placeholder="e.g. Baltic Grain Sp. z o.o."
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Incoming Channel *</label>
                    <select
                      value={formData.channel}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value as TicketChannel })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="Phone Call">📞 Phone Call</option>
                      <option value="Email">✉️ Email</option>
                      <option value="WhatsApp">💬 WhatsApp</option>
                      <option value="In-Person">🤝 In-Person</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Client Caller / Contact Person</label>
                    <input
                      type="text"
                      value={formData.client_contact}
                      onChange={(e) => setFormData({ ...formData, client_contact: e.target.value })}
                      placeholder="e.g. Marek Wojcik (+48 58...)"
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Link to Order (Optional)</label>
                    <select
                      value={formData.order_no}
                      onChange={(e) => setFormData({ ...formData, order_no: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="">-- None --</option>
                      {orders.map(o => <option key={o.id} value={o.order_no}>{o.order_no} ({o.client_name})</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Subject / Issue Summary *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Request for updated container seal numbers before customs filing"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Detailed Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide full context of caller statement or email body..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as TicketPriority })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Assign Staff</label>
                    <select
                      value={formData.assigned_staff_name}
                      onChange={(e) => {
                        const st = staffList.find(s => s.name === e.target.value);
                        setFormData({
                          ...formData,
                          assigned_staff_name: e.target.value,
                          assigned_staff_email: st?.email || ''
                        });
                      }}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      {staffList.map(s => <option key={s.email} value={s.name}>{s.name} ({s.role})</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Log Ticket</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── RESOLVE TICKET MODAL ── */}
      <AnimatePresence>
        {resolvingTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onClick={() => setResolvingTicket(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <h3 className="text-sm font-black text-slate-900 mb-1">Resolve Ticket {resolvingTicket.ticket_no}</h3>
              <p className="text-xs text-slate-500 font-semibold mb-3">"{resolvingTicket.subject}"</p>

              <form onSubmit={handleResolveSubmit} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Resolution Actions Taken *</label>
                  <textarea
                    required
                    rows={3}
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe how this issue was resolved with the client..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setResolvingTicket(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">Confirm Resolution</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeTickets;
