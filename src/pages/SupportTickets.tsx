import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, CheckCircle2, X, MessageSquare, Clock, 
  HelpCircle, Send, RefreshCw, Plus, User
} from 'lucide-react';
import { useTickets } from '../hooks/useTickets';
import { getTicketReplies } from '../lib/api/tickets';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
const QUICK_REPLIES = [
  "Thank you for the update!",
  "I have uploaded the requested documents.",
  "Understood, checking on this now.",
];
type TicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';
type TicketPriority = 'High' | 'Medium' | 'Low';

interface Ticket {
  id: string;
  ticketNo: string;
  studentId: string;
  studentName: string;
  subject: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  created: string;
  lastUpdate: string;
  messages: { sender: string; text: string; time: string; self: boolean }[];
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  Open: 'bg-rose-50 text-rose-700 border-rose-100',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-100',
  Resolved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Closed: 'bg-slate-50 text-slate-600 border-slate-200',
};

const PRIORITY_COLORS: Record<TicketPriority, string> = {
  High: 'bg-red-50 text-red-700 border-red-100',
  Medium: 'bg-amber-50 text-amber-700 border-amber-100',
  Low: 'bg-blue-50 text-blue-700 border-blue-100',
};

export const SupportTickets: React.FC = () => {
  const { user, profile } = useAuth();
  const { tickets: dbTickets, reply: sendReplyApi, newTicket, loading, refresh } = useTickets(user?.id);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState('');
  const [replies, setReplies] = useState<any[]>([]);
  const [isReplying, setIsReplying] = useState(false);

  // New ticket modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('General Query');
  const [newPriority, setNewPriority] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    if (dbTickets.length > 0) {
      const mapped = dbTickets.map(t => {
        const studentDisplayName = t.users?.full_name || (t.users?.email ? t.users.email.split('@')[0] : (t as any).user_name || profile?.full_name || 'Student');
        const prio = (t.priority === 'Normal' ? 'Medium' : t.priority === 'Urgent' ? 'High' : t.priority || 'Medium') as TicketPriority;
        const stat = (t.status || 'Open') as TicketStatus;

        return {
          id: t.id,
          ticketNo: t.ticket_no || `TC-${t.id.slice(0, 6).toUpperCase()}`,
          studentId: t.student_id || (t as any).user_id || '',
          studentName: studentDisplayName,
          subject: t.subject || 'General Inquiry',
          category: t.category || 'General Query',
          priority: prio,
          status: stat,
          assignee: t.assigned_to || 'Admissions Counselor',
          created: new Date(t.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          lastUpdate: 'Recently',
          messages: [{ sender: studentDisplayName, text: t.description || 'Initial Request Details', time: 'Initial Request', self: false }],
        };
      });
      setTickets(mapped);
    } else {
      setTickets([]);
    }
  }, [dbTickets, profile?.full_name]);

  // Sync replies when active ticket changes
  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  useEffect(() => {
    if (!activeTicket) {
      setReplies([]);
      return;
    }

    // 1. Initial Fetch
    getTicketReplies(activeTicket.id).then(data => {
      const mapped = data.map(r => ({
        id: r.id,
        sender: r.sender_name || 'System',
        text: r.message,
        time: new Date(r.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        self: r.sender_id === user?.id || (r.sender_name !== 'Admin' && r.sender_name !== 'Support Staff' && !r.is_staff),
      }));
      setReplies([
        { sender: activeTicket.studentName, text: activeTicket.messages[0]?.text || '', time: 'Initial Request', self: true },
        ...mapped
      ]);
    }).catch(() => {});

    // 2. Realtime listener for replies
    const channel = supabase
      .channel(`replies:${activeTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_replies',
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          const newReply = payload.new;
          setReplies(prev => {
            const exists = prev.some(r => r.id === newReply.id);
            if (exists) return prev;
            return [
              ...prev,
              {
                id: newReply.id,
                sender: newReply.sender_name || 'System',
                text: newReply.message,
                time: new Date(newReply.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                self: newReply.sender_id === user?.id || (!newReply.is_staff && newReply.sender_name !== 'Admin' && newReply.sender_name !== 'Support Staff'),
              }
            ];
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedTicketId, tickets, user?.id]);

  // Realtime subscription to tickets queue changes
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student_tickets_queue_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
          filter: `student_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, refresh]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const handleSendReplyText = async (text: string) => {
    if (!text.trim() || !activeTicket || !user) return;
    try {
      setIsReplying(true);
      await sendReplyApi({
        ticket_id: activeTicket.id,
        sender_id: user.id,
        sender_name: profile?.full_name || user.email?.split('@')[0] || 'Student',
        message: text.trim(),
        is_staff: false,
      });

      setReplies(prev => [...prev, {
        sender: profile?.full_name || user.email?.split('@')[0] || 'You',
        text: text.trim(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        self: true
      }]);

      showToast('Reply sent successfully.');
    } catch (err: any) {
      showToast(err.message || 'Failed to post reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket || !user) return;
    const msgText = replyText.trim();
    setReplyText('');
    await handleSendReplyText(msgText);
  };

  // Submit new ticket to Supabase DB
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDesc.trim() || !user) return;

    const ticketNo = `TC-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      await newTicket({
        student_id: user.id,
        ticket_no: ticketNo,
        subject: newSubject.trim(),
        description: newDesc.trim(),
        category: newCategory,
        priority: newPriority,
      });

      setShowCreateModal(false);
      setNewSubject('');
      setNewDesc('');
      showToast(`Support Ticket ${ticketNo} created successfully!`);
    } catch (err: any) {
      showToast(`Error: ${err.message || 'Failed to file ticket'}`);
    }
  };

  const filtered = tickets.filter(t =>
    (filter === 'All' || t.status === filter) &&
    (t.subject.toLowerCase().includes(search.toLowerCase()) || t.ticketNo.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
  );

  const counts = ['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => ({
    label: s, count: s === 'All' ? tickets.length : tickets.filter(t => t.status === s).length
  }));

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] antialiased select-none font-sans text-left relative">
      {/* Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3.5 rounded-xl shadow-2xl text-xs font-bold flex items-center gap-3"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-950 flex items-center gap-2">
            Support Helpdesk
          </h1>
          <p className="text-xs font-semibold text-slate-450 mt-0.5">Submit inquiries, track statuses, and chat with counselors in real-time.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 h-9 px-4 bg-[#6A1B2E] hover:bg-[#4A101E] text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Ticket
        </button>
      </div>

      {/* Main Dual-Pane Window */}
      <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
        
        {/* LEFT PANEL: Ticket Queue (38%) */}
        <div className="w-[38%] flex flex-col border border-slate-200/70 rounded-2xl bg-white overflow-hidden shrink-0 shadow-2xs">
          {/* Filters strip */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
            {counts.map(({ label, count }) => (
              <button
                key={label}
                onClick={() => setFilter(label)}
                className={`h-7 px-2.5 rounded-lg text-[10px] font-black uppercase flex items-center gap-1.5 transition-all whitespace-nowrap border ${
                  filter === label 
                    ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' 
                    : 'bg-white text-slate-500 hover:bg-slate-105 border-slate-200/80'
                }`}
              >
                {label}
                <span className={`px-1.5 py-0.2 rounded-md text-[8.5px] font-extrabold ${filter === label ? 'bg-white/20 text-white' : 'bg-slate-105 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-100 shrink-0 relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject or ticket ID..."
              className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-202 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]/30"
            />
          </div>

          {/* Scrollable Queue Stream */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-105">
            {loading ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-slate-350" /> Loading queue...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <HelpCircle className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-400">No support tickets found</p>
              </div>
            ) : (
              filtered.map(t => {
                const isSelected = selectedTicketId === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className={`p-4 text-left cursor-pointer transition-all hover:bg-slate-50/70 border-l-4 ${
                      isSelected 
                        ? 'bg-rose-50/15 border-[#6A1B2E]' 
                        : 'border-transparent bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="text-[9px] font-bold text-slate-455 uppercase tracking-wider">{t.ticketNo}</span>
                        <h4 className="text-xs font-black text-slate-900 mt-1 leading-tight">{t.subject}</h4>
                      </div>
                      <span className={`px-2 py-0.5 border rounded-full text-[8.5px] font-black uppercase whitespace-nowrap ${STATUS_COLORS[t.status]}`}>
                        {t.status}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-3 text-[9px] font-semibold text-slate-400">
                      <span className="uppercase tracking-wider">{t.category}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t.created}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Live Chat Thread (62%) */}
        <div className="flex-1 flex flex-col border border-slate-200/70 rounded-2xl bg-white overflow-hidden shadow-2xs">
          {activeTicket ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#6A1B2E] text-white flex items-center justify-center font-black text-sm shadow-sm">
                    {activeTicket.ticketNo[0]}
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900 leading-tight flex items-center gap-1.5">
                      {activeTicket.category}
                      <span className={`px-2 py-0.5 border rounded-full text-[8px] font-black uppercase ${STATUS_COLORS[activeTicket.status]}`}>
                        {activeTicket.status}
                      </span>
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{activeTicket.ticketNo} · {activeTicket.priority} Priority</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedTicketId(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Central Area: Chat History & Metadata Split */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                
                {/* Scrollable Conversation Stream (70%) */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {/* Log details */}
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-xs text-left mb-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-slate-800">Subject: {activeTicket.subject}</span>
                        <span className={`px-2 py-0.5 border rounded-full text-[9px] font-black uppercase ${PRIORITY_COLORS[activeTicket.priority]}`}>
                          {activeTicket.priority}
                        </span>
                      </div>
                      <p className="text-slate-500 font-semibold leading-relaxed">{activeTicket.messages[0]?.text}</p>
                    </div>

                    {replies.slice(1).map((msg, idx) => (
                      <div key={idx} className={`flex gap-3 ${msg.self ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                          msg.self ? 'bg-[#6A1B2E] text-white' : 'bg-slate-105 text-slate-600 border border-slate-200'
                        }`}>
                          {msg.sender[0]}
                        </div>
                        <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs space-y-1 ${
                          msg.self 
                            ? 'bg-[#6A1B2E] text-white rounded-tr-none' 
                            : 'bg-slate-50 border border-slate-150 text-slate-800 rounded-tl-none'
                        }`}>
                          <div className={`flex items-center justify-between gap-3 border-b pb-1 mb-1 ${
                            msg.self ? 'border-white/10' : 'border-slate-150/40'
                          }`}>
                            <span className="font-extrabold">{msg.sender}</span>
                            <span className={`text-[8.5px] font-bold opacity-60`}>{msg.time}</span>
                          </div>
                          <p className="font-semibold leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Reply Input Area */}
                  <div className="p-4 border-t border-slate-100 shrink-0 space-y-3 bg-white">
                    {activeTicket.status !== 'Closed' && activeTicket.status !== 'Resolved' ? (
                      <div className="space-y-3">
                        {/* Quick Replies chips */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {QUICK_REPLIES.map((replyText, idx) => (
                            <button
                              key={idx}
                              disabled={isReplying}
                              onClick={() => handleSendReplyText(replyText)}
                              className="h-7 px-3 bg-slate-50 hover:bg-[#6A1B2E]/10 border border-slate-200/80 hover:border-[#6A1B2E]/30 text-slate-600 hover:text-[#6A1B2E] text-[9.5px] font-black rounded-lg transition-all whitespace-nowrap cursor-pointer disabled:opacity-50"
                            >
                              {replyText}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={replyText} 
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your message here..."
                            className="flex-1 h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E] placeholder-slate-350" 
                          />
                          <button 
                            onClick={handleSendReply}
                            disabled={isReplying}
                            className="h-10 px-4 bg-[#6A1B2E] hover:bg-[#4A101E] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl text-[10px] text-center text-slate-400 font-extrabold uppercase tracking-wider">
                        This support ticket has been closed.
                      </div>
                    )}
                  </div>
                </div>

                {/* Sidebar Controls (30%) */}
                <div className="w-[30%] border-l border-slate-100 p-4 space-y-5 bg-slate-50/20 overflow-y-auto shrink-0 scrollbar-none">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ticket Priority</span>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 border rounded-full text-xs font-black uppercase ${PRIORITY_COLORS[activeTicket.priority]}`}>
                        {activeTicket.priority}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Counselor</span>
                    <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-450" /> {activeTicket.assignee === 'Unassigned' ? 'Assigning shortly' : 'Senior Advisor'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Submitted On</span>
                    <p className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-450" /> {activeTicket.created}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
              <h3 className="text-sm font-black text-slate-800">No Ticket Selected</h3>
              <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm text-center">
                Select an inquiry ticket from the left panel queue to review conversation logs and chat with your counselor in real-time.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE TICKET MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full relative z-10 p-6 space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">File Support Request</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 text-xs font-semibold text-left">
                <div>
                  <label className="block text-slate-500 mb-1">Subject Description</label>
                  <input
                    type="text"
                    placeholder="Briefly state your concern..."
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
                    >
                      <option value="Admissions Assistance">Admissions Help</option>
                      <option value="Billing & Payments">Billing & Payments</option>
                      <option value="Academic Documents">Academic Documents</option>
                      <option value="Visa Coordination">Visa Coordination</option>
                      <option value="General Query">General Query</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e: any) => setNewPriority(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Provide explicit details so our support specialists can assist you..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    required
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] resize-none text-xs font-semibold leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" className="text-xs h-9 px-4 rounded-xl" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="text-xs bg-[#6A1B2E] hover:bg-[#4A101E] text-white h-9 px-5 rounded-xl">
                    File Ticket
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
