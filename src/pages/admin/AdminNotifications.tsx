import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search, Bell, CheckCheck, Archive, Clock,
  FileText, GraduationCap, Headphones, CreditCard, ClipboardCheck,
  UserCog, Calendar, Users, Plus, X, Trash2, ArrowRight,
  ShieldCheck, RefreshCw, SlidersHorizontal, ExternalLink,
  Sparkles, FolderOpen, Plane, CheckCircle2, Inbox
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import { getStudents } from '../../lib/api/students';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  category: string;
  read: boolean;
  archived: boolean;
}

const CATEGORY_MAP: Record<string, { icon: React.FC<{ className?: string }>; route: string; color: string; label: string }> = {
  Documents: { icon: FolderOpen, route: '/admin/documents', color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Documents Review' },
  Applications: { icon: GraduationCap, route: '/admin/applications', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'University Applications' },
  Payments: { icon: CreditCard, route: '/admin/payments', color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Fee Payments' },
  Visa: { icon: ShieldCheck, route: '/admin/visa-tracker', color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'VFS Visa Tracker' },
  Legalization: { icon: FileText, route: '/admin/nawa', color: 'bg-teal-50 text-teal-700 border-teal-200', label: 'NAWA Workflows' },
  Tasks: { icon: ClipboardCheck, route: '/admin/tasks', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Task Management' },
  Support: { icon: Headphones, route: '/admin/support', color: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Support Tickets' },
  Meetings: { icon: Calendar, route: '/admin/meetings', color: 'bg-cyan-50 text-cyan-700 border-cyan-200', label: 'Admissions Planner' },
  Students: { icon: Users, route: '/admin/students', color: 'bg-sky-50 text-sky-700 border-sky-200', label: 'Student Directory' },
  Staff: { icon: UserCog, route: '/admin/staff', color: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Staff Management' },
};

export const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications: dbNotifs,
    markRead: apiMarkRead,
    markAllRead: apiMarkAllRead,
    deleteNotif,
    clearAllNotifs,
    sendNotification,
    refresh
  } = useNotifications();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filter, setFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');

  // Compose Notification States
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [targetStudentId, setTargetStudentId] = useState('ALL');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newCategory, setNewCategory] = useState('Applications');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    getStudents().then(data => {
      setStudents(data || []);
    }).catch(() => {});
  }, []);

  const handlePublishNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newBody.trim()) return;

    try {
      setIsPublishing(true);
      if (targetStudentId === 'ALL') {
        await Promise.all(students.map(s => sendNotification({
          user_id: s.id,
          title: newTitle,
          body: newBody,
          category: newCategory
        })));
        showToast('Broadcast alert sent to all registered students.');
      } else {
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
    const mapped = (dbNotifs || []).map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      time: new Date(n.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      category: n.category || 'Applications',
      read: n.is_read,
      archived: false,
    }));
    setNotifications(mapped);
  }, [dbNotifs]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const markAllRead = () => {
    apiMarkAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('All notifications marked as read.');
  };

  const markRead = (id: string) => {
    apiMarkRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleDeleteOne = (id: string) => {
    deleteNotif(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast('Notification deleted.');
  };

  const handleClearAll = () => {
    if (!window.confirm('Clear all notifications?')) return;
    clearAllNotifs();
    setNotifications([]);
    showToast('All notifications cleared.');
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

  const unreadCount = notifications.filter(n => !n.read && !n.archived).length;
  const readCount = notifications.filter(n => n.read && !n.archived).length;

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.forEach(n => {
      counts[n.category] = (counts[n.category] || 0) + 1;
    });
    return counts;
  }, [notifications]);

  const filtered = notifications.filter(n => {
    if (n.archived && filter !== 'Archived') return false;
    if (filter === 'Unread') return !n.read && !n.archived;
    if (filter === 'Read') return n.read && !n.archived;
    if (filter === 'Archived') return n.archived;
    if (selectedCategory !== 'All' && n.category !== selectedCategory) return false;
    return !n.archived;
  }).filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.body.toLowerCase().includes(search.toLowerCase())
  );

  const sideCategoryOptions = [
    { label: 'All Updates', cat: 'All', icon: Inbox, count: notifications.length, color: 'text-slate-700' },
    { label: 'Unread Priority', cat: 'Unread', icon: Bell, count: unreadCount, color: 'text-amber-600', isUnreadTab: true },
    { label: 'Applications', cat: 'Applications', icon: GraduationCap, count: countByCategory['Applications'] || 0, color: 'text-emerald-700' },
    { label: 'Documents Review', cat: 'Documents', icon: FolderOpen, count: countByCategory['Documents'] || 0, color: 'text-blue-700' },
    { label: 'Fee Payments', cat: 'Payments', icon: CreditCard, count: countByCategory['Payments'] || 0, color: 'text-purple-700' },
    { label: 'VFS Visa Tracker', cat: 'Visa', icon: ShieldCheck, count: countByCategory['Visa'] || 0, color: 'text-amber-700' },
    { label: 'NAWA Legalization', cat: 'Legalization', icon: FileText, count: countByCategory['Legalization'] || 0, color: 'text-teal-700' },
    { label: 'Meetings & Planner', cat: 'Meetings', icon: Calendar, count: countByCategory['Meetings'] || 0, color: 'text-cyan-700' },
    { label: 'Support Tickets', cat: 'Support', icon: Headphones, count: countByCategory['Support'] || 0, color: 'text-rose-700' },
  ];

  const adminQuickJumps = [
    { label: 'Review Applications', path: '/admin/applications', icon: GraduationCap, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Verify Payments', path: '/admin/payments', icon: CreditCard, color: 'text-purple-600 bg-purple-50' },
    { label: 'VFS Visa Tracker', path: '/admin/visa-tracker', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
    { label: 'NAWA Legalization', path: '/admin/nawa', icon: FileText, color: 'text-teal-600 bg-teal-50' },
    { label: 'Document Review', path: '/admin/documents', icon: FolderOpen, color: 'text-blue-600 bg-blue-50' },
    { label: 'Pre-Departure Stage 12', path: '/admin/pre-departure', icon: Plane, color: 'text-sky-600 bg-sky-50' },
  ];

  return (
    <div className="space-y-6 text-left antialiased font-sans select-none relative pb-12">
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-3 border border-slate-800">
          <Sparkles className="w-4 h-4 text-emerald-400" /> {toast}
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-wine-950 to-[#6A1B2E] text-white rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Bell className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-amber-300 border border-white/15 mb-2">
              <Bell className="w-3.5 h-3.5" /> Education Admin Alert Command
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Education Notifications & Communications Hub
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Monitor real-time alerts across university applications, student tuition payments, VFS Visa filings, NAWA verification, and publish broadcast announcements.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => setShowComposeModal(true)}
              className="flex items-center gap-1.5 h-9 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" /> Compose Alert
            </button>
            <button
              onClick={() => { refresh(); showToast('Notifications synced from server'); }}
              className="h-9 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition-all flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="h-9 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Alerts</span>
            <span className="text-lg font-extrabold text-slate-900">{notifications.length}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 block tracking-wider">Unread Alerts</span>
            <span className="text-lg font-extrabold text-amber-900">{unreadCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">Acknowledged</span>
            <span className="text-lg font-extrabold text-emerald-900">{readCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-wider">Active Channel</span>
            <span className="text-xs font-black text-slate-800 truncate block">
              {filter === 'Unread' ? 'Unread Priority' : selectedCategory}
            </span>
          </div>
        </div>
      </div>

      {/* 2-Column Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Notification Side Channels & Quick Admin Portals */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Side Channels */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6A1B2E]" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Side Channel Filter</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Categories</span>
            </div>

            <div className="space-y-1">
              {sideCategoryOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = opt.isUnreadTab
                  ? filter === 'Unread'
                  : selectedCategory === opt.cat && filter !== 'Unread';

                return (
                  <button
                    key={opt.label}
                    onClick={() => {
                      if (opt.isUnreadTab) {
                        setFilter('Unread');
                        setSelectedCategory('All');
                      } else {
                        setFilter('All');
                        setSelectedCategory(opt.cat);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#6A1B2E] text-white shadow-md shadow-[#6A1B2E]/20'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : opt.color}`} />
                      <span className="truncate">{opt.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {opt.count > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : opt.isUnreadTab
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {opt.count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Admin Portals */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#6A1B2E]" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Quick Admin Jumps</h3>
              </div>
            </div>

            <div className="space-y-1.5">
              {adminQuickJumps.map((jump) => {
                const Icon = jump.icon;
                return (
                  <button
                    key={jump.label}
                    onClick={() => navigate(jump.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center shrink-0 ${jump.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="group-hover:text-[#6A1B2E] transition-colors">{jump.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#6A1B2E] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Search + Feed */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Top Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {['All', 'Unread', 'Read', 'Archived'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`h-8 px-4 rounded-xl text-xs font-black transition-all ${
                    filter === f ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  {f} {f === 'Unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
                </button>
              ))}
            </div>
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
              />
            </div>
          </div>

          {/* Stream */}
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map((n) => {
                const categoryConfig = CATEGORY_MAP[n.category] || { icon: Bell, route: '/admin/dashboard', color: 'bg-slate-100 text-slate-600 border-slate-200', label: n.category };
                const IconComp = categoryConfig.icon;

                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    onClick={() => handleCardClick(n.category)}
                    className={`bg-white border rounded-3xl p-4.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 cursor-pointer group ${
                      !n.read ? 'border-[#6A1B2E]/25 shadow-[#6A1B2E]/5 bg-gradient-to-r from-white via-rose-50/20 to-white' : 'border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${categoryConfig.color}`}>
                        <IconComp className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs sm:text-sm font-extrabold ${!n.read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#6A1B2E] shrink-0 animate-pulse" />}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold border ${categoryConfig.color}`}>
                              {n.category}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-400 hidden sm:flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" /> {n.time}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">{n.body}</p>

                        <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCardClick(n.category);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-[#6A1B2E] text-slate-700 hover:text-white rounded-xl text-[11px] font-extrabold transition-all"
                          >
                            <span>Open {categoryConfig.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-2">
                            {!n.read && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                                className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Mark read
                              </button>
                            )}
                            {!n.archived && (
                              <button
                                onClick={(e) => { e.stopPropagation(); archiveOne(n.id); }}
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" /> Archive
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteOne(n.id); }}
                              className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200/80 p-8">
                <Bell className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">No notifications in this channel</p>
              </div>
            )}
          </div>
        </div>

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
              className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-lg w-full relative z-10 p-6 space-y-4 text-left border border-slate-100"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#6A1B2E] text-white flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">Compose Student Alert</h3>
                    <p className="text-[10px] font-medium text-slate-400">Broadcast updates to individual students or all enrolled candidates</p>
                  </div>
                </div>
                <button onClick={() => setShowComposeModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handlePublishNotification} className="space-y-3.5 text-xs font-semibold text-left">
                <div>
                  <label className="block text-slate-500 mb-1">Target Recipient</label>
                  <select
                    required
                    value={targetStudentId}
                    onChange={(e) => setTargetStudentId(e.target.value)}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
                  >
                    <option value="ALL">Broadcast to All Students</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.email.split('@')[0]} ({s.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 mb-1">Alert Channel</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white text-slate-700 focus:outline-none focus:border-[#6A1B2E]"
                    >
                      <option value="Applications">Applications</option>
                      <option value="Offer Letter">Offer Letter</option>
                      <option value="Documents">Documents Review</option>
                      <option value="Payments">Fee Payments</option>
                      <option value="Visa">VFS Visa</option>
                      <option value="Meetings">Advisory Session</option>
                      <option value="Support">Support Ticket</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 mb-1">Header Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Offer Letter Issued"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      required
                      className="w-full h-10 px-3 border border-slate-200 rounded-xl text-slate-900 bg-slate-50 focus:bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">Alert Message</label>
                  <textarea
                    rows={4}
                    placeholder="Provide alert content details..."
                    value={newBody}
                    onChange={(e) => setNewBody(e.target.value)}
                    required
                    className="w-full p-3.5 border border-slate-200 rounded-xl text-slate-900 bg-slate-50 focus:bg-white placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
