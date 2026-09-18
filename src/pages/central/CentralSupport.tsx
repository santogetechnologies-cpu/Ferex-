import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Search, MessageSquare, CheckCircle2, X, Send, RefreshCw, UserCheck, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTickets, replyToTicket, updateTicketStatus, updateTicketAssignee } from '../../lib/api/tickets';
import { getDivisionStaff, type DivisionStaffMember } from '../../lib/api/staff';
import { supabase } from '../../lib/supabase';
import type { SupportTicket } from '../../lib/types';

export const CentralSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [reassignTicket, setReassignTicket] = useState<any | null>(null);
  const [reassignStaffName, setReassignStaffName] = useState('');
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<DivisionStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsData, staffData] = await Promise.all([
        getTickets(),
        getDivisionStaff('all')
      ]);

      setStaffList(staffData || []);
      const formatted = (ticketsData || []).map((d: any) => ({
        id: d.ticket_number || d.ticket_no || (d.id ? `TCK-${d.id.slice(0, 6).toUpperCase()}` : 'TCK-801'),
        rawId: d.id,
        student: d.users?.full_name || d.student_name || 'Enterprise Client / Student',
        division: d.division || d.category || 'Education',
        assignedStaff: d.assigned_to || d.assigned_staff || 'Admissions Lead',
        subject: d.subject,
        category: d.category || 'General Query',
        priority: d.priority || 'Medium',
        date: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent',
        status: d.status || 'Open',
        statusBadge: d.status === 'Resolved' || d.status === 'Closed'
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-[#58051E]/10 text-[#58051E] border-[#58051E]/20',
        messages: [
          { sender: d.users?.full_name || 'Client', text: d.description, time: 'Initial Message' }
        ]
      }));
      setTickets(formatted);
      if (staffData && staffData.length > 0 && !reassignStaffName) {
        setReassignStaffName(staffData[0].name);
      }
    } catch (err: any) {
      console.warn('[CentralSupport load error]:', err);
    } finally {
      setLoading(false);
    }
  }, [reassignStaffName]);

  useEffect(() => {
    loadData();

    // Supabase Realtime synchronization
    const channel = supabase
      .channel('central_support_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_replies' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_tickets_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_tickets_change', handleSync);
    };
  }, [loadData]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    try {
      await replyToTicket(selectedTicket.rawId, replyText.trim(), true);
      await updateTicketStatus(selectedTicket.rawId, 'Resolved');

      const updatedMsgs = [...selectedTicket.messages, { sender: 'Executive Super Admin', text: replyText, time: 'Just now' }];
      setTickets(tickets.map(t => t.rawId === selectedTicket.rawId ? {
        ...t,
        messages: updatedMsgs,
        status: 'Resolved',
        statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      } : t));

      showToastMsg('Official resolution response recorded & ticket resolved in Supabase');
      setSelectedTicket(null);
      setReplyText('');
    } catch (err: any) {
      showToastMsg(`Failed to reply: ${err.message}`);
    }
  };

  const handleConfirmReassign = async () => {
    if (!reassignTicket || !reassignStaffName) return;
    try {
      await updateTicketAssignee(reassignTicket.rawId, reassignStaffName);
      setTickets(tickets.map(t => t.rawId === reassignTicket.rawId ? { ...t, assignedStaff: reassignStaffName } : t));
      showToastMsg(`Ticket reassigned to ${reassignStaffName} in Supabase!`);
      setReassignTicket(null);
    } catch (err: any) {
      showToastMsg(`Failed to reassign: ${err.message}`);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assignedStaff || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiv = selectedDivision === 'All' || (t.division || '').toLowerCase().includes(selectedDivision.toLowerCase());
    return matchSearch && matchDiv;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-6 h-6 text-[#58051E]" /> Cross-Divisional Support & Ticket Escalations
            </h1>
            <span className="text-[10px] font-black bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Centrally inspect, reply, resolve, and reassign support tickets across Education, Global Trade, Rimi Frozen, and Digital platforms.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh Desk
        </Button>
      </div>

      {/* Division Filter Tabs & Search Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ticket ID, student, issue, or staff..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['All', 'Education', 'Trade', 'Rimi', 'Digital'].map((div) => (
            <button
              key={div}
              onClick={() => setSelectedDivision(div)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedDivision === div ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {div}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading support tickets from Supabase...</div>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200/70 shadow-xs">
          <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Support Tickets Found</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            All tickets across selected subsidiaries have been resolved or none match your search criteria.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.rawId} className="p-5 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase">{ticket.id} · {ticket.student}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${ticket.statusBadge}`}>{ticket.status}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border bg-slate-50 text-slate-700">{ticket.division}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{ticket.date}</span>
                  </div>
                  <h3 className="text-xs font-black text-slate-900 mt-0.5">{ticket.subject}</h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                    Category: {ticket.category} · Assigned Staff: <strong className="text-slate-700">{ticket.assignedStaff || 'Unassigned'}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold"
                  onClick={() => {
                    setReassignTicket(ticket);
                    setReassignStaffName(ticket.assignedStaff || (staffList[0]?.name || ''));
                  }}
                >
                  Reassign Staff
                </Button>
                <Button
                  size="sm"
                  className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  Reply / Resolve
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reassign Ticket Modal */}
      <AnimatePresence>
        {reassignTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setReassignTicket(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reassign Ticket to Staff</h3>
                <button onClick={() => setReassignTicket(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Ticket: <span className="text-slate-900 font-extrabold">{reassignTicket.subject}</span> ({reassignTicket.id})</p>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select Dedicated Staff Member</label>
                  <select
                    value={reassignStaffName}
                    onChange={(e) => setReassignStaffName(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {staffList.map((s) => (
                      <option key={s.id || s.email} value={s.name}>
                        {s.name} ({s.roleLabel || s.division})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassignTicket(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={handleConfirmReassign}
                  >
                    Confirm Reassign
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reply / Resolution Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedTicket(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedTicket.subject}</h3>
                  <p className="text-[11px] text-slate-500">{selectedTicket.id} · {selectedTicket.student} · {selectedTicket.division}</p>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                {selectedTicket.messages.map((m: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900 mb-1">
                      <span>{m.sender}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{m.time}</span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Super Admin Executive Response</label>
                  <textarea
                    rows={3}
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Enter official resolution notes or dispatch advice to client..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setSelectedTicket(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">
                    <Send className="w-3.5 h-3.5 mr-1" /> Send & Mark Resolved
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
