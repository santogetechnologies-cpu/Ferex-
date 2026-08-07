import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle2, X, MessageSquare, User, Clock } from 'lucide-react';

type TicketStatus = 'Open' | 'Pending' | 'Resolved' | 'Closed';
type TicketPriority = 'High' | 'Medium' | 'Low';

interface Ticket {
  id: string; studentId: string; studentName: string;
  subject: string; category: string; priority: TicketPriority; status: TicketStatus;
  assignee: string; created: string; lastUpdate: string; messages: { sender: string; text: string; time: string; self: boolean }[];
}

const STAFF = ['Riya Shah', 'Arjun Pillai', 'Meena Iyer', 'Kabir Nair', 'Unassigned'];

const TICKETS: Ticket[] = [
  { id: 'TK-001', studentId: 'FX-2026-001', studentName: 'Ashly', subject: 'Visa appointment date clarification', category: 'Visa', priority: 'High', status: 'Open', assignee: 'Riya Shah', created: 'Aug 4, 2026', lastUpdate: '2h ago', messages: [{ sender: 'Ashly', text: 'Can you please clarify the visa appointment date for my application?', time: '10:00 AM', self: false }, { sender: 'Riya Shah', text: 'Your visa appointment is scheduled for August 12, 2026. Please carry all original documents.', time: '10:45 AM', self: true }] },
  { id: 'TK-002', studentId: 'FX-2026-002', studentName: 'Rahul Mehta', subject: 'Payment receipt not received', category: 'Payment', priority: 'Medium', status: 'Pending', assignee: 'Arjun Pillai', created: 'Aug 3, 2026', lastUpdate: '5h ago', messages: [{ sender: 'Rahul', text: 'I made the payment yesterday but did not receive the receipt on email.', time: '9:30 AM', self: false }] },
  { id: 'TK-003', studentId: 'FX-2026-003', studentName: 'Priya Sharma', subject: 'IELTS document verification status', category: 'Documents', priority: 'Low', status: 'Resolved', assignee: 'Meena Iyer', created: 'Jul 30, 2026', lastUpdate: '1 day ago', messages: [{ sender: 'Priya', text: 'What is the status of my IELTS document verification?', time: '2:00 PM', self: false }, { sender: 'Meena Iyer', text: 'Your IELTS certificate has been successfully verified and uploaded to your profile.', time: '3:00 PM', self: true }] },
  { id: 'TK-004', studentId: 'FX-2026-004', studentName: 'Amir Hassan', subject: 'Accommodation query for Feb 2026', category: 'Accommodation', priority: 'Medium', status: 'Open', assignee: 'Unassigned', created: 'Aug 5, 2026', lastUpdate: '1h ago', messages: [{ sender: 'Amir', text: 'Can you help me with accommodation options near the University of Warsaw campus?', time: '11:00 AM', self: false }] },
  { id: 'TK-005', studentId: 'FX-2026-005', studentName: 'Fatima Al-Rashid', subject: 'Offer letter address correction needed', category: 'Applications', priority: 'High', status: 'Pending', assignee: 'Kabir Nair', created: 'Aug 2, 2026', lastUpdate: '3h ago', messages: [{ sender: 'Fatima', text: 'There is a spelling error in my name on the offer letter. Can this be corrected?', time: '8:30 AM', self: false }] },
];

const STATUS_COLORS: Record<TicketStatus, string> = {
  'Open': 'bg-red-50 text-red-700 border-red-100',
  'Pending': 'bg-amber-50 text-amber-700 border-amber-100',
  'Resolved': 'bg-emerald-50 text-emerald-700 border-emerald-100',
  'Closed': 'bg-slate-50 text-slate-600 border-slate-200',
};
const PRIORITY_COLORS: Record<TicketPriority, string> = {
  'High': 'bg-red-50 text-red-700 border-red-100',
  'Medium': 'bg-amber-50 text-amber-700 border-amber-100',
  'Low': 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export const AdminSupportTickets: React.FC = () => {
  const [tickets, setTickets] = useState(TICKETS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);
  const [reply, setReply] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const filtered = tickets.filter(t =>
    (filter === 'All' || t.status === filter) &&
    (t.studentName.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSendReply = () => {
    if (!reply.trim() || !viewTicket) return;
    const updatedTicket = {
      ...viewTicket,
      messages: [...viewTicket.messages, { sender: 'Admin', text: reply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), self: true }],
      lastUpdate: 'Just now',
      status: 'Pending' as TicketStatus,
    };
    setTickets(prev => prev.map(t => t.id === viewTicket.id ? updatedTicket : t));
    setViewTicket(updatedTicket);
    setReply('');
    showToast('Reply sent to student.');
  };

  const handleClose = (id: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' as TicketStatus } : t));
    setViewTicket(null);
    showToast('Ticket marked as resolved.');
  };

  const handleAssign = (id: string, assignee: string) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, assignee } : t));
    if (viewTicket?.id === id) setViewTicket(prev => prev ? { ...prev, assignee } : null);
    showToast(`Ticket assigned to ${assignee}.`);
  };

  const counts = ['All', 'Open', 'Pending', 'Resolved', 'Closed'].map(s => ({
    label: s, count: s === 'All' ? tickets.length : tickets.filter(t => t.status === s).length
  }));

  return (
    <div className="space-y-5 relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Support Tickets</h1>
        <p className="text-xs font-semibold text-slate-400 mt-0.5">Manage and respond to student support requests</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {counts.map(({ label, count }) => (
          <button key={label} onClick={() => setFilter(label)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
              ${filter === label ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
            {label} <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-extrabold ${filter === label ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tickets..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-52" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((t) => (
          <div key={t.id} className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all">
            <div className="flex items-start gap-4 p-5">
              <div className="w-9 h-9 rounded-xl bg-[#6A1B2E] flex items-center justify-center text-white text-[10px] font-extrabold shrink-0">
                {t.studentName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-extrabold text-slate-900">{t.subject}</p>
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{t.studentName} · {t.id} · {t.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_COLORS[t.status]}`}>{t.status}</span>
                    <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {t.lastUpdate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1"><User className="w-3 h-3" /> {t.assignee}</span>
                  <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {t.messages.length} messages</span>
                </div>
              </div>
              <button onClick={() => { setViewTicket(t); setReply(''); }}
                className="shrink-0 h-8 px-3 bg-[#6A1B2E]/10 text-[#6A1B2E] text-[10px] font-extrabold rounded-lg hover:bg-[#6A1B2E]/20 transition-all">
                Open
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-sm font-semibold text-slate-400">No tickets match your search.</div>
        )}
      </div>

      {/* Ticket Detail Drawer */}
      <AnimatePresence>
        {viewTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-50" onClick={() => setViewTicket(null)} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">{viewTicket.id}</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate max-w-[280px]">{viewTicket.subject}</p>
                </div>
                <button onClick={() => setViewTicket(null)} className="p-2 rounded-full hover:bg-slate-50 text-slate-400"><X className="w-4 h-4" /></button>
              </div>

              {/* Metadata bar */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-50 bg-slate-50/50 flex-wrap">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${STATUS_COLORS[viewTicket.status]}`}>{viewTicket.status}</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold border ${PRIORITY_COLORS[viewTicket.priority]}`}>{viewTicket.priority}</span>
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[10px] font-semibold text-slate-400">Assign:</span>
                  <select value={viewTicket.assignee} onChange={(e) => handleAssign(viewTicket.id, e.target.value)}
                    className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none cursor-pointer">
                    {STAFF.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3">
                {viewTicket.messages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.self ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.self ? 'bg-[#6A1B2E] text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                      <p className="text-[10px] font-extrabold opacity-70 mb-1">{msg.sender}</p>
                      <p className="text-xs font-semibold leading-relaxed">{msg.text}</p>
                      <p className="text-[9px] font-bold opacity-50 mt-1">{msg.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              <div className="p-4 border-t border-slate-100 space-y-3">
                <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/40 resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleClose(viewTicket.id)}
                    className="h-9 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-50 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Close Ticket
                  </button>
                  <button onClick={handleSendReply}
                    className="h-9 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#4A101E] transition-all">
                    Send Reply
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
