import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, CheckCheck, Archive, Clock,
  FileText, GraduationCap, Headphones, CreditCard, ClipboardCheck,
  UserCog, Calendar, Users
} from 'lucide-react';

interface Notification {
  id: number; title: string; body: string; time: string; category: string;
  read: boolean; archived: boolean;
}

const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, title: 'New Document Uploaded', body: 'Ashly uploaded a new Passport document awaiting review.', time: '5 min ago', category: 'Documents', read: false, archived: false },
  { id: 2, title: 'Application Approved', body: 'TU Berlin accepted Rahul Mehta\'s application. Offer letter pending.', time: '22 min ago', category: 'Applications', read: false, archived: false },
  { id: 3, title: 'New Support Ticket', body: 'Support ticket #TK-006 opened by Amir Hassan regarding accommodation.', time: '1h ago', category: 'Support', read: false, archived: false },
  { id: 4, title: 'Payment Received', body: 'Payment of ₹45,000 received from Priya Sharma for registration fee.', time: '2h ago', category: 'Payments', read: true, archived: false },
  { id: 5, title: 'Task Due Tomorrow', body: 'Task TK-002: Follow up TU Berlin application is due tomorrow.', time: '3h ago', category: 'Tasks', read: true, archived: false },
  { id: 6, title: 'Staff Update', body: 'Kabir Nair has requested leave from Aug 10–15, 2026.', time: '4h ago', category: 'Staff', read: true, archived: false },
  { id: 7, title: 'Document Verified', body: 'IELTS certificate for Rahul Mehta successfully verified by Meena Iyer.', time: 'Yesterday', category: 'Documents', read: true, archived: false },
  { id: 8, title: 'Meeting Reminder', body: 'Counseling session with Fatima Al-Rashid scheduled at 3:00 PM today.', time: 'Yesterday', category: 'Meetings', read: true, archived: false },
  { id: 9, title: 'New Student Enrolled', body: 'Carlos Rivera has completed enrollment for Oct 2026 intake.', time: '2 days ago', category: 'Students', read: true, archived: true },
];

const CATEGORY_MAP: Record<string, { icon: React.FC<{ className?: string }>; route: string; color: string }> = {
  Documents: { icon: FileText, route: '/admin/documents', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  Applications: { icon: GraduationCap, route: '/admin/applications', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  Support: { icon: Headphones, route: '/admin/support', color: 'bg-red-50 text-red-600 border-red-100' },
  Payments: { icon: CreditCard, route: '/admin/payments', color: 'bg-violet-50 text-violet-600 border-violet-100' },
  Tasks: { icon: ClipboardCheck, route: '/admin/tasks', color: 'bg-amber-50 text-amber-600 border-amber-100' },
  Staff: { icon: UserCog, route: '/admin/staff', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  Meetings: { icon: Calendar, route: '/admin/dashboard', color: 'bg-cyan-50 text-cyan-600 border-cyan-100' },
  Students: { icon: Users, route: '/admin/students', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
};

export const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read.');
  };

  const markRead = (id: number) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const archiveOne = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
    showToast('Notification archived.');
  };

  const handleCardClick = (category: string) => {
    const config = CATEGORY_MAP[category];
    if (config?.route) {
      navigate(config.route);
    }
  };

  const filtered = notifications.filter(n => {
    if (n.archived && filter !== 'Archived') return false;
    if (filter === 'Unread') return !n.read && !n.archived;
    if (filter === 'Read') return n.read && !n.archived;
    if (filter === 'Archived') return n.archived;
    return !n.archived;
  }).filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.body.toLowerCase().includes(search.toLowerCase())
  );

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;

  return (
    <div className="space-y-6 text-left antialiased font-sans select-none relative">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-3">
          <Bell className="w-5 h-5 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header aligned with shared Admin layout */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-extrabold text-slate-900">Notifications</h1>
          {unreadCount > 0 && (
            <span className="w-6 h-6 rounded-full bg-[#6A1B2E] text-white text-[10px] font-extrabold flex items-center justify-center">{unreadCount}</span>
          )}
        </div>
        <button onClick={markAllRead} className="flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
          <CheckCheck className="w-3.5 h-3.5" /> Mark all read
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['All', 'Unread', 'Read', 'Archived'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`h-8 px-3 rounded-xl text-[10px] font-extrabold border transition-all
                ${filter === f ? 'bg-[#6A1B2E] text-white border-[#6A1B2E]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications..."
            className="h-9 pl-8 pr-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold placeholder-slate-300 focus:outline-none focus:border-[#6A1B2E]/40 w-64" />
        </div>
      </div>

      {/* Notification Cards Stream */}
      <div className="space-y-2.5">
        <AnimatePresence>
          {filtered.map((n) => {
            const categoryConfig = CATEGORY_MAP[n.category] || { icon: Bell, route: '/admin/dashboard', color: 'bg-slate-100 text-slate-600 border-slate-200' };
            const IconComp = categoryConfig.icon;

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                onClick={() => handleCardClick(n.category)}
                className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 cursor-pointer group ${!n.read ? 'border-[#6A1B2E]/20 shadow-[#6A1B2E]/5 bg-slate-50/30' : 'border-slate-100'}`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Source-specific Module Icon */}
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${categoryConfig.color}`}>
                    <IconComp className="w-4.5 h-4.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top Row: Title + Right Side Category Badge & Timestamp */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-extrabold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-[#6A1B2E] shrink-0" />}
                      </div>

                      {/* Right-aligned Module Badge & Timestamp */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${categoryConfig.color}`}>
                          {n.category}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {n.time}
                        </span>
                      </div>
                    </div>

                    {/* Notification Body */}
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">{n.body}</p>

                    {/* Action Triggers */}
                    <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-slate-100/60">
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                            className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCheck className="w-3 h-3" /> Mark read
                          </button>
                        )}
                        {!n.archived && (
                          <button
                            onClick={(e) => { e.stopPropagation(); archiveOne(n.id); }}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors"
                          >
                            <Archive className="w-3 h-3" /> Archive
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">No notifications here</p>
          </div>
        )}
      </div>
    </div>
  );
};
