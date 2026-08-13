import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, CheckCheck, Archive, Clock,
  FileText, GraduationCap, Headphones, CreditCard, ClipboardCheck,
  UserCog, Calendar, Users, Plus, X
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { getStudents } from '../../lib/api/students';

interface NotificationItem {
  id: string; title: string; body: string; time: string; category: string;
  read: boolean; archived: boolean;
}

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
  const { notifications: dbNotifs, markRead: apiMarkRead, markAllRead: apiMarkAllRead, loading, sendNotification } = useNotifications();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Compose Notification States
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [targetStudentId, setTargetStudentId] = useState('ALL'); // 'ALL' = Broadcast
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('Support');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    getStudents().then(data => {
      setStudents(data);
    }).catch(() => {});
  }, []);

  const handlePublishNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    try {
      setIsPublishing(true);
      if (targetStudentId === 'ALL') {
        // Broadcast
        await Promise.all(students.map(s => sendNotification({
          user_id: s.id,
          title: newTitle,
          body: newBody,
          category: newCategory
        })));
        showToast('Broadcast alert sent to all students.');
      } else {
        // Single target
        await sendNotification({
          user_id: targetStudentId,
          title: newTitle,
          body: newBody,
          category: newCategory
        });
        showToast('Notification published successfully.');
      }
      setShowComposeModal(false);
      setNewTitle('');
      setNewBody('');
    } catch (err: any) {
      showToast(`Error publishing: ${err.message || 'Failed'}`);
    } finally {
      setIsPublishing(false);
    }
  };

  useEffect(() => {
    const mapped = dbNotifs.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      time: new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      category: n.category || 'Support',
      read: n.is_read,
      archived: false,
    }));
    setNotifications(mapped);
  }, [dbNotifs]);

  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2000); };

  const markAllRead = () => {
    apiMarkAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read.');
  };

  const markRead = (id: string) => {
    apiMarkRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const archiveOne = (id: string) => {
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComposeModal(true)}
            className="flex items-center gap-1.5 h-8 px-3.5 bg-[#6A1B2E] text-white text-xs font-bold rounded-xl hover:bg-[#521221] transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Compose Alert
          </button>
          <button onClick={markAllRead} className="flex items-center gap-1.5 h-8 px-3 bg-white border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 transition-all">
            <CheckCheck className="w-3.5 h-3.5" /> Mark all read
          </button>
        </div>
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

      {/* Compose Notification Modal */}
      <AnimatePresence>
        {showComposeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComposeModal(false)}
              className="fixed inset-0 bg-black"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full relative z-10 p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">Compose & Send Alert</h3>
                <button onClick={() => setShowComposeModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePublishNotification} className="space-y-4 text-xs font-semibold text-left">
                <div>
                  <label className="block text-slate-500 mb-1">Target Recipient</label>
                  <select
                    required
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="ALL">Broadcast to All Students</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email.split('@')[0]} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">Alert Type / Module</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
                    >
                      <option value="Support">Support Helpdesk</option>
                      <option value="Documents">Documents Verification</option>
                      <option value="Applications">University Application</option>
                      <option value="Payments">Fee Installments</option>
                      <option value="Meetings">Advisory Session</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Topic Title</label>
                    <input
                      type="text"
                      placeholder="Enter subject header..."
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Notification message</label>
                  <textarea
                    rows={4}
                    placeholder="Provide alert content details to students..."
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    required
                    className="w-full p-3.5 border border-slate-200 rounded-lg text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowComposeModal(false)}
                    className="h-9 px-4 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="h-9 px-5 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold hover:bg-[#521221] shadow-xs"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Alert'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
