import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LifeBuoy, Plus, X, Eye, CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const SupportTickets: React.FC = () => {
  // In-memory support tickets
  const [tickets, setTickets] = useState([
    {
      id: 1,
      ticketNo: 'TC-2026-9041',
      subject: 'Transcript Translation Equivalence Validation Delay',
      category: 'Academic Documents',
      priority: 'High',
      status: 'Open',
      date: 'Aug 04, 2026',
      desc: 'Polish legalization team is waiting on confirmation from Warsaw evaluation desk. Request status check.',
      replies: [
        { sender: 'Sarah Jenkins', text: 'Evaluation agency states they need 10 days.', time: 'Aug 04, 2:10 PM', self: true },
        { sender: 'Adam Kowalski (Ferex)', text: 'We contact Warsaw desk directly to expedite validation.', time: 'Aug 04, 4:30 PM', self: false }
      ]
    },
    {
      id: 2,
      ticketNo: 'TC-2026-8790',
      subject: 'Outstanding Balance Installments Query',
      category: 'Billing & Payments',
      priority: 'Medium',
      status: 'Resolved',
      date: 'Jul 28, 2026',
      desc: 'Can the legalization fee of $1,200 be split into two monthly installments?',
      replies: [
        { sender: 'Sarah Jenkins', text: 'Requesting split invoices.', time: 'Jul 28, 9:00 AM', self: true },
        { sender: 'Accounting Team', text: 'Split billing is approved. New invoices INV-0560 and INV-0561 generated.', time: 'Jul 28, 11:45 AM', self: false }
      ]
    }
  ]);

  // Drawer / Modal states
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('Admissions Assistance');
  const [newPriority, setNewPriority] = useState('Low');
  const [newDesc, setNewDesc] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Submit new ticket
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newDesc) return;

    const newTicket = {
      id: tickets.length + 1,
      ticketNo: `TC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: newSubject,
      category: newCategory,
      priority: newPriority,
      status: 'Open',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }),
      desc: newDesc,
      replies: []
    };

    setTickets([newTicket, ...tickets]);
    setShowCreateModal(false);
    setNewSubject('');
    setNewDesc('');
    showToast(`Support Ticket ${newTicket.ticketNo} created successfully!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const activeTicket = tickets.find(t => t.id === selectedTicketId);

  const getPriorityBadge = (p: string) => {
    if (p === 'High') return 'bg-red-50 text-red-700 border-red-100';
    if (p === 'Medium') return 'bg-amber-50 text-amber-700 border-amber-100';
    return 'bg-blue-50 text-blue-700 border-blue-100';
  };

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <LifeBuoy className="w-5 h-5" />
            </span>
            Support Tickets
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Secure help desk resolving issues concerning payments, document translations, and visas.
          </p>
        </div>
        <Button
          size="sm"
          className="text-xs flex items-center gap-2 h-10 shadow-none font-bold"
          onClick={() => setShowCreateModal(true)}
        >
          <Plus className="w-4 h-4" /> Create Ticket
        </Button>
      </div>

      {/* Tickets Table */}
      <Card className="overflow-hidden border border-slate-100 shadow-sm text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-semibold select-none">
            <thead className="bg-slate-50 text-[10px] font-extrabold uppercase text-slate-400 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Ticket ID</th>
                <th className="px-6 py-4">Subject</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Priority</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {tickets.map((t) => {
                const isOpen = t.status === 'Open';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{t.ticketNo}</td>
                    <td className="px-6 py-4 text-slate-800 font-bold max-w-[200px] truncate">{t.subject}</td>
                    <td className="px-6 py-4 text-slate-400">{t.category}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 border rounded-full text-[9px] uppercase font-bold ${getPriorityBadge(t.priority)}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 border rounded-full text-[9px] uppercase font-bold ${
                        isOpen 
                          ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {isOpen ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {t.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedTicketId(t.id)}
                        className="p-1 text-slate-400 hover:text-[#6A1B2E] rounded hover:bg-slate-50 transition-colors"
                        title="View Conversation"
                      >
                        <Eye className="w-4.5 h-4.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

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
              className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-md w-full relative z-10 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Create Support Ticket</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
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
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
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
                      onChange={(e) => setNewPriority(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
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
                    className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="text-xs">
                    File Ticket
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SUPPORT TICKET DETAILS DRAWER */}
      <AnimatePresence>
        {selectedTicketId && activeTicket && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicketId(null)}
              className="fixed inset-0 bg-black z-45"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeOut' }}
              className="fixed right-0 top-0 h-screen w-full max-w-[440px] bg-white border-l border-slate-100 shadow-2xl z-50 p-6 flex flex-col justify-between text-left"
            >
              <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{activeTicket.ticketNo}</span>
                    <h3 className="text-sm font-extrabold text-slate-950 leading-snug mt-1">{activeTicket.category}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTicketId(null)}
                    className="p-1 rounded hover:bg-slate-100 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Subject Description */}
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-900 leading-normal">{activeTicket.subject}</h4>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">{activeTicket.desc}</p>
                </div>

                {/* Conversation replies */}
                <div className="space-y-4 pt-2">
                  <h5 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
                    Resolutions log
                  </h5>
                  
                  {activeTicket.replies.length > 0 ? (
                    <div className="space-y-4">
                      {activeTicket.replies.map((reply, index) => {
                        return (
                          <div key={index} className={`p-3 rounded-lg text-xs space-y-1 ${
                            reply.self 
                              ? 'bg-[#6A1B2E]/5 border border-[#6A1B2E]/10 ml-6' 
                              : 'bg-slate-100/50 border border-slate-200/50 mr-6'
                          }`}>
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100/50 pb-1 mb-1">
                              <span className="font-extrabold text-slate-800">{reply.sender}</span>
                              <span className="text-[9px] text-slate-400 font-semibold">{reply.time}</span>
                            </div>
                            <p className="text-slate-600 font-semibold leading-relaxed">{reply.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 font-semibold text-xs border border-dashed border-slate-150 rounded-lg flex flex-col items-center justify-center">
                      <HelpCircle className="w-6 h-6 mb-1 text-slate-300" />
                      Pending advisor assignment.
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs font-bold"
                  onClick={() => setSelectedTicketId(null)}
                >
                  Close Ticket Files
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
