import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Search, MessageSquare, CheckCircle2, X, Send } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTickets } from '../../lib/api/tickets';

export const CentralSupport: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [toast, setToast] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const data = await getTickets();
    const formatted = data.map((d: any) => ({
      id: d.ticket_no || (d.id ? `TCK-${d.id.slice(0, 4).toUpperCase()}` : 'TCK-801'),
      rawId: d.id,
      student: d.users?.full_name || 'Student',
      subject: d.subject,
      category: d.category || 'General Query',
      priority: d.priority || 'Medium',
      date: d.created_at ? new Date(d.created_at).toLocaleDateString() : 'Recent',
      status: d.status || 'Open',
      statusBadge: d.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
      messages: [
        { sender: d.users?.full_name || 'Student', text: d.description, time: 'Initial Ticket' }
      ]
    }));
    setTickets(formatted);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    const updatedMsgs = [...selectedTicket.messages, { sender: 'Super Admin', text: replyText, time: 'Just now' }];
    setTickets(tickets.map(t => t.id === selectedTicket.id ? { ...t, messages: updatedMsgs, status: 'Resolved', statusBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200' } : t));
    showToastMsg('Response sent to student ticket desk');
    setSelectedTicket(null);
    setReplyText('');
  };

  const filteredTickets = tickets.filter(t =>
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 text-left">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-[#6A1B2E]" /> Global Support & Escalations Desk
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Executive ticket resolution desk and SLA monitoring.
          </p>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search ticket ID or subject..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>
        <span className="text-xs font-bold text-slate-400">{filteredTickets.length} Support Tickets</span>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading support tickets...</div>
      ) : null}

      <div className="space-y-3">
        {filteredTickets.map((ticket) => (
          <Card key={ticket.id} className="p-5 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase">{ticket.id} · {ticket.student}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${ticket.statusBadge}`}>{ticket.status}</span>
                </div>
                <h3 className="text-xs font-black text-slate-900 mt-0.5">{ticket.subject}</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Category: {ticket.category} · Opened {ticket.date}</p>
              </div>
            </div>

            <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold self-end sm:self-center" onClick={() => setSelectedTicket(ticket)}>
              Reply / Resolve
            </Button>
          </Card>
        ))}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedTicket(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedTicket.subject}</h3>
                  <span className="text-[10px] font-bold text-slate-400">{selectedTicket.id} · {selectedTicket.student}</span>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-3 max-h-56 overflow-y-auto p-3 bg-slate-50 rounded-xl mb-4 text-xs font-semibold">
                {selectedTicket.messages.map((m: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded-xl max-w-[85%] ${m.sender === 'Super Admin' ? 'bg-[#6A1B2E] text-white ml-auto text-right' : 'bg-white text-slate-800 border border-slate-200'}`}>
                    <span className="text-[9px] font-extrabold opacity-75 block">{m.sender} · {m.time}</span>
                    <p className="mt-0.5">{m.text}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="space-y-3">
                <textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type official response to student..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setSelectedTicket(null)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">
                    <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Response
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
