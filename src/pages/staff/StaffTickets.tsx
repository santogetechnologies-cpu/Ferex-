import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ticket, CheckCircle2, Send, X, Clock } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const ticketsList = [
  {
    id: 'TCK-401', student: 'Priya Sharma (STU-842)', title: 'Urgent: Passport Scan Clarification for UK CAS', priority: 'High', sla: '2h SLA Remaining', status: 'Open', date: '2026-08-06', desc: 'UKVI requesting clear scan of page 36. Original upload was slightly blurred.', comments: [
      { author: 'Priya Sharma', text: 'I have re-scanned page 36 using a high-res scanner.', time: '2h ago' },
      { author: 'Arun Patel (Staff)', text: 'Received. Validating resolution now.', time: '1h ago' }
    ]
  },
  {
    id: 'TCK-402', student: 'Rahul Verma (STU-889)', title: 'GIC Payment Confirmation Slip Required', priority: 'Medium', sla: '5h SLA Remaining', status: 'In Progress', date: '2026-08-05', desc: 'Scotiabank GIC confirmation receipt needed before Canada Study Permit lodging.', comments: [
      { author: 'Rahul Verma', text: 'Attached Scotiabank PDF receipt.', time: '5h ago' }
    ]
  }
];

export const StaffTickets: React.FC = () => {
  const [toast, setToast] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyText, setReplyText] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSendReply = () => {
    if (!replyText) return;
    showToast(`Response sent for ticket ${selectedTicket.id}`);
    setReplyText('');
    setSelectedTicket(null);
  };

  return (
    <div className="space-y-6 text-left antialiased select-none">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#6A1B2E]" /> Enterprise Ticket Support Inbox
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Student application queries, SLA countdown timers, and document clarification support queue.</p>
        </div>
      </div>

      <div className="space-y-4">
        {ticketsList.map(ticket => (
          <Card key={ticket.id} className="p-5 border border-slate-200/80 shadow-xs hover:shadow-lg transition-all space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase text-[#6A1B2E]">{ticket.id} • {ticket.student}</span>
                  <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-600" /> {ticket.sla}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-0.5">{ticket.title}</h3>
              </div>
              <span className={`text-xs font-black px-3 py-1 rounded-full ${ticket.status === 'Open' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>{ticket.status}</span>
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed">{ticket.desc}</p>

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
              <span className="text-slate-500">{ticket.comments.length} Discussion Responses</span>
              <button onClick={() => setSelectedTicket(ticket)} className="text-[#6A1B2E] font-black hover:underline flex items-center gap-1">
                Reply to Ticket →
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Reply Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900 z-40" onClick={() => setSelectedTicket(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">{selectedTicket.title} ({selectedTicket.id})</h3>
                <button onClick={() => setSelectedTicket(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {selectedTicket.comments.map((c: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl text-xs space-y-0.5">
                    <span className="font-extrabold text-slate-900 block">{c.author}</span>
                    <p className="text-slate-600 font-semibold">{c.text}</p>
                  </div>
                ))}
              </div>

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your official staff response..."
                className="w-full h-24 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
              />

              <Button size="sm" className="w-full bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={handleSendReply}>
                Send Official Response <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
