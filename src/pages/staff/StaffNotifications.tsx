import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, Check, CheckSquare, Calendar, FileText, Ticket } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const notificationsList = [
  { id: 'NTF-01', title: 'New Task Assigned: Passport Verification', category: 'Tasks', time: '10 mins ago', desc: 'Ananya Sharma assigned you passport scan verification for Priya Sharma (STU-842).', icon: CheckSquare, unread: true },
  { id: 'NTF-02', title: 'Meeting Reminder: Canada Visa SOP Consultation', category: 'Meetings', time: '45 mins ago', desc: 'Upcoming consultation session with Priya Sharma at 02:30 PM IST.', icon: Calendar, unread: true },
  { id: 'NTF-03', title: 'Document Uploaded: IELTS Scorecard', category: 'Documents', time: '2 hours ago', desc: 'Rahul Verma uploaded updated IELTS test report form (TRF).', icon: FileText, unread: false },
  { id: 'NTF-04', title: 'Support Ticket Update', category: 'Tickets', time: '4 hours ago', desc: 'Priya Sharma replied to support ticket TCK-401 regarding CAS scan.', icon: Ticket, unread: false },
];

export const StaffNotifications: React.FC = () => {
  const [toast, setToast] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [notifications, setNotifications] = useState(notificationsList);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  const categories = ['All', 'Tasks', 'Meetings', 'Documents', 'Tickets'];
  const filteredNotifications = notifications.filter(n => activeCategory === 'All' || n.category === activeCategory);

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
            <Bell className="w-5 h-5 text-[#6A1B2E]" /> Enterprise Notification Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Real-time alerts for assigned tasks, student meeting reminders, and ticket updates.</p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={markAllRead}>
          <Check className="w-3.5 h-3.5 mr-1.5" /> Mark All as Read
        </Button>
      </div>

      <div className="flex gap-2 border-b border-slate-200/80 pb-2">
        {categories.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${activeCategory === cat ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{cat}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredNotifications.map(n => {
          const IconComp = n.icon;
          return (
            <Card key={n.id} className={`p-4 border transition-all space-y-2 ${n.unread ? 'border-[#6A1B2E]/40 bg-[#6A1B2E]/5 shadow-xs' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#6A1B2E]/10 text-[#6A1B2E] flex items-center justify-center font-bold">
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">{n.time}</span>
              </div>
              <p className="text-xs font-semibold text-slate-600 pl-9">{n.desc}</p>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
