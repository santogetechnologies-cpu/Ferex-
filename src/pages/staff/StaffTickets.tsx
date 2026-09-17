import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ticket, CheckCircle2, Send, X, Clock, MessageSquare,
  Search, AlertCircle, RotateCcw, ShieldCheck, User
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTickets, getTicketReplies, replyToTicket } from '../../lib/api/tickets';
import type { SupportTicket, TicketReply } from '../../lib/types';

export const StaffTickets: React.FC = () => {
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [repliesLoading, setRepliesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTickets();
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load tickets from database');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('ferex_tickets_change', loadData);
    return () => {
      window.removeEventListener('ferex_tickets_change', loadData);
    };
  }, []);

  // When a ticket is opened, load its replies
  const handleOpenTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setRepliesLoading(true);
    try {
      const rep = await getTicketReplies(ticket.id);
      setReplies(rep || []);
    } catch {
      setReplies([]);
    } finally {
      setRepliesLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      setIsSending(true);
      await replyToTicket(selectedTicket.id, replyText.trim(), true);
      showToast(`Advisory response dispatched for ticket #${selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)}`);
      setReplyText('');

      // Refresh replies
      const updatedReplies = await getTicketReplies(selectedTicket.id);
      setReplies(updatedReplies || []);
      await loadData();
    } catch (err: any) {
      showToast(`Error sending reply: ${err.message || 'Failed'}`);
    } finally {
      setIsSending(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const matchesStatus =
        statusFilter === 'All' ||
        (t.status || 'Open').toLowerCase() === statusFilter.toLowerCase();

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.subject.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.ticket_number || '').toLowerCase().includes(q) ||
        (t.student_name || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [tickets, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 text-left antialiased select-none font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-2.5 py-0.5 rounded-md border border-[#58051E]/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-[#58051E]" /> STUDENT COMMUNICATION
            </span>
            <span className="text-[10px] font-bold text-slate-400">● Realtime Supabase Tickets</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-2">
            <Ticket className="w-6 h-6 text-[#58051E]" /> Student Support Tickets
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Student admission queries, application clarification requests, document guidance, and communication thread responses.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} />
            Refresh Tickets
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['All', 'Open', 'In Progress', 'Resolved', 'Closed'].map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by student, subject, ticket #..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
            />
          </div>
        </div>
      </Card>

      {/* Real DB Error Alert */}
      {error && (
        <Card className="p-6 border border-red-200 bg-red-50/40 shadow-xs text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-red-900">Database Connection Notice</h3>
            <p className="text-xs font-semibold text-red-700 mt-1 max-w-md mx-auto leading-relaxed">
              {error}
            </p>
          </div>
          <Button
            size="sm"
            onClick={loadData}
            className="bg-[#58051E] text-white hover:bg-[#430316] font-bold text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retry Connection
          </Button>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-5 border border-slate-200/80 shadow-xs animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State — Strictly no mock fallback */}
      {!loading && !error && filteredTickets.length === 0 && (
        <Card className="p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No support tickets found</h3>
            <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              {tickets.length === 0
                ? 'There are currently zero support tickets filed by students in the database. When a student submits a query, it will appear here.'
                : 'No tickets match your active status and search query.'}
            </p>
          </div>
        </Card>
      )}

      {/* Real Tickets List */}
      {!loading && !error && filteredTickets.length > 0 && (
        <div className="space-y-3">
          {filteredTickets.map(ticket => {
            const ticketNo = ticket.ticket_number || `TCK-${ticket.id.slice(0, 6)}`;
            const studentName = ticket.student_name || 'Student Candidate';
            const status = ticket.status || 'Open';

            return (
              <Card
                key={ticket.id}
                className="p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-[#58051E]">
                        {ticketNo} • {studentName}
                      </span>
                      {ticket.category && (
                        <span className="text-[9.5px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {ticket.category}
                        </span>
                      )}
                      <span
                        className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                          ticket.priority === 'High' || (ticket.priority as string) === 'Critical'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {ticket.priority || 'Normal'}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-0.5">
                      {ticket.subject}
                    </h3>
                  </div>

                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full border shrink-0 ${
                      status === 'Open'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : status === 'Resolved' || status === 'Closed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {status}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  {ticket.description}
                </p>

                <div className="flex items-center justify-between pt-1 text-xs font-bold">
                  <span className="text-slate-400 text-[11px] font-medium">
                    Created: {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenTicket(ticket)}
                    className="text-xs font-bold text-[#58051E] border-[#58051E]/30 hover:bg-[#58051E]/5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" /> View Thread & Reply
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ticket Conversation & Reply Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50"
              onClick={() => setSelectedTicket(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-xl max-h-[90vh] bg-white rounded-3xl p-6 shadow-2xl space-y-4 overflow-y-auto text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedTicket.subject}</h3>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {selectedTicket.ticket_number || selectedTicket.id.slice(0, 8)} • Student: {selectedTicket.student_name || 'Candidate'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Initial Student Message */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block">Original Student Query</span>
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Conversation Thread */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                  Discussion Thread ({replies.length} Responses)
                </span>

                {repliesLoading ? (
                  <p className="text-xs font-semibold text-slate-400 py-3 text-center">Loading conversation...</p>
                ) : replies.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
                    No replies sent yet. Use the form below to respond to the student.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {replies.map(rep => {
                      const isMe = rep.is_staff;
                      return (
                        <div
                          key={rep.id}
                          className={`p-3 rounded-2xl text-xs space-y-1 ${
                            isMe
                              ? 'bg-[#58051E]/8 border border-[#58051E]/20 ml-6 text-slate-900'
                              : 'bg-slate-100 mr-6 text-slate-800'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className={isMe ? 'text-[#58051E]' : 'text-slate-500'}>
                              {rep.sender_name || (isMe ? 'Admissions Counselor' : 'Student')}
                            </span>
                            <span className="text-slate-400">
                              {new Date(rep.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-semibold leading-relaxed">{rep.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reply Form */}
              <form onSubmit={handleSendReply} className="space-y-3 border-t border-slate-100 pt-3">
                <label className="block text-[10px] font-black uppercase text-slate-400">
                  Admissions Counselor Response
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Type your official counseling advisory..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#58051E]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSending || !replyText.trim()}
                    className="bg-[#58051E] hover:bg-[#430316] text-white font-black text-xs shrink-0"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    {isSending ? 'Sending...' : 'Send Reply'}
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
