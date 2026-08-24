import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, Trash2, Clock, Check } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const initialNotifications = [
  { id: 'NTF-001', title: 'Invoice Paid', desc: 'Reliance Digital paid Invoice #INV-2026-88 (₹4,50,000 via NEFT).', time: '2 hours ago', unread: true, category: 'Finance' },
  { id: 'NTF-002', title: 'New Lead Added', desc: 'HDFC Life Insurance submitted a website redesign inquiry (₹18,00,000 deal value).', time: '4 hours ago', unread: true, category: 'Leads' },
  { id: 'NTF-003', title: 'Meeting Reminder', desc: 'Tata Motors Project Review meeting starting today at 3:00 PM on Google Meet.', time: '5 hours ago', unread: true, category: 'Meetings' },
  { id: 'NTF-004', title: 'Expense Claim Pending', desc: 'Arun Patel submitted a travel expense claim for ₹8,200.', time: 'Yesterday', unread: true, category: 'Finance' },
  { id: 'NTF-005', title: 'Task Completed', desc: 'Sneha Roy completed task "HDFC Life Final Brand Handoff Package".', time: 'Yesterday', unread: false, category: 'Tasks' },
];

export const DigitalNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [toast, setToast] = useState('');
  const [filter, setFilter] = useState('All');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  const deleteNotif = (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
    showToast('Notification cleared');
  };

  const markSingleRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const filtered = notifications.filter(n => {
    if (filter === 'Unread') return n.unread;
    if (filter !== 'All') return n.category === filter;
    return true;
  });

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#6A1B2E]" /> Notifications Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Real-time alerts for payments, lead arrivals, project milestones, and approvals.</p>
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={markAllRead}>
            <Check className="w-4 h-4 mr-1.5" /> Mark All as Read
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200/70 pb-3">
        {['All', 'Unread', 'Finance', 'Leads', 'Meetings', 'Tasks'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${filter === f ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {f} {f === 'Unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(n => (
          <Card key={n.id} className={`p-4 border transition-all ${n.unread ? 'border-[#6A1B2E]/30 bg-slate-50/50 shadow-xs' : 'border-slate-200/70 opacity-80'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.unread ? 'bg-[#6A1B2E] animate-pulse' : 'bg-slate-300'}`} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-extrabold text-slate-900">{n.title}</h3>
                    <span className="text-[9.5px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded-md border border-[#6A1B2E]/20">{n.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{n.desc}</p>
                  <p className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{n.time}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {n.unread && (
                  <button onClick={() => markSingleRead(n.id)} className="p-1.5 text-xs font-bold text-slate-400 hover:text-[#6A1B2E] rounded-lg">Mark Read</button>
                )}
                <button onClick={() => deleteNotif(n.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
