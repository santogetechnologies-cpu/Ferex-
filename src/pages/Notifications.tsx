import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Sparkles, CheckCheck, FileText,
  GraduationCap, CreditCard, ShieldCheck, Calendar,
  ArrowRight, Filter, Trash2, CheckCircle2,
  Clock, Inbox
} from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../lib/types';

const CATEGORY_CONFIG: Record<string, { icon: any; route: string; color: string; bg: string; border: string }> = {
  'Offer Letter': { icon: FileText, route: '/student/offers', color: 'text-emerald-700', bg: 'bg-emerald-50/90', border: 'border-emerald-200' },
  'Application': { icon: GraduationCap, route: '/student/journey-tracker', color: 'text-blue-700', bg: 'bg-blue-50/90', border: 'border-blue-200' },
  'Payment': { icon: CreditCard, route: '/student/payments', color: 'text-purple-700', bg: 'bg-purple-50/90', border: 'border-purple-200' },
  'VFS Visa': { icon: ShieldCheck, route: '/student/visa-tracker', color: 'text-amber-700', bg: 'bg-amber-50/90', border: 'border-amber-200' },
  'Counselor Session': { icon: Calendar, route: '/student/meetings', color: 'text-indigo-700', bg: 'bg-indigo-50/90', border: 'border-indigo-200' },
  'Document': { icon: FileText, route: '/student/documents', color: 'text-teal-700', bg: 'bg-teal-50/90', border: 'border-teal-200' },
  'Support': { icon: Bell, route: '/student/support', color: 'text-rose-700', bg: 'bg-rose-50/90', border: 'border-rose-200' },
  'System': { icon: Bell, route: '/student/dashboard', color: 'text-slate-700', bg: 'bg-slate-100/90', border: 'border-slate-200' },
};

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    notifications: dbNotifications,
    markRead,
    markAllRead,
    deleteNotif,
    clearAllNotifs,
    loading
  } = useNotifications(user?.id);

  const [filter, setFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [localReadState, setLocalReadState] = useState<Record<string, boolean>>({});
  const [localDeletedState, setLocalDeletedState] = useState<Set<string>>(new Set());

  const activeNotifs = useMemo(() => {
    return dbNotifications
      .filter(n => !localDeletedState.has(n.id))
      .map(n => ({
        ...n,
        is_read: localReadState[n.id] !== undefined ? localReadState[n.id] : n.is_read
      }));
  }, [dbNotifications, localReadState, localDeletedState]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  const handleMarkAsRead = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    markRead(id);
    setLocalReadState(prev => ({ ...prev, [id]: true }));
    showToast('Marked as read');
    window.dispatchEvent(new Event('ferex_notification_change'));
  };

  const handleMarkAllAsRead = () => {
    markAllRead();
    const updated: Record<string, boolean> = {};
    activeNotifs.forEach(n => { updated[n.id] = true; });
    setLocalReadState(updated);
    showToast('All notifications marked as read');
    window.dispatchEvent(new Event('ferex_notification_change'));
  };

  const handleDeleteOne = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    deleteNotif(id);
    setLocalDeletedState(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    showToast('Notification deleted');
    window.dispatchEvent(new Event('ferex_notification_change'));
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    clearAllNotifs();
    setLocalDeletedState(new Set(activeNotifs.map(n => n.id)));
    showToast('All notifications deleted');
    window.dispatchEvent(new Event('ferex_notification_change'));
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
    const catConfig = CATEGORY_CONFIG[n.category || 'System'] || CATEGORY_CONFIG['System'];
    navigate(catConfig.route);
  };

  const filteredNotifications = activeNotifs.filter(n => {
    if (filter === 'Unread' && n.is_read) return false;
    if (filter === 'Read' && !n.is_read) return false;
    if (categoryFilter !== 'All' && n.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q);
    }
    return true;
  });

  const unreadCount = activeNotifs.filter(n => !n.is_read).length;
  const readCount = activeNotifs.filter(n => n.is_read).length;

  return (
    <div className="space-y-6 text-left relative min-h-[600px] pb-10">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2 border border-slate-800"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-wine-950 to-[#6A1B2E] text-white rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Bell className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-black text-amber-300 border border-white/15 mb-2">
              <Bell className="w-3.5 h-3.5" /> Notification Center
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Official Portal Updates & Alerts
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-300 mt-1 max-w-xl">
              Stay informed with real-time updates for NAWA legalization, university offer letters, tuition payments, counselor meetings, and VFS visa steps.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="h-9 px-4 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 shadow-xs transition-all flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4 text-emerald-400" /> Mark All as Read
              </button>
            )}
            {activeNotifs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="h-9 px-3.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/30 shadow-xs transition-all flex items-center gap-1.5"
                title="Delete All Notifications"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" /> Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Updates</span>
            <span className="text-lg font-extrabold text-slate-900">{activeNotifs.length}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-600 block tracking-wider">Unread</span>
            <span className="text-lg font-extrabold text-amber-900">{unreadCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">Read</span>
            <span className="text-lg font-extrabold text-emerald-900">{readCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-wider">Active Category</span>
            <span className="text-xs font-black text-slate-800 truncate block">{categoryFilter}</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {['All', 'Unread', 'Read'].map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`h-8 px-4 rounded-xl text-xs font-black transition-all ${
                filter === tab
                  ? 'bg-[#6A1B2E] text-white shadow-xs'
                  : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {tab} {tab === 'Unread' && unreadCount > 0 ? `(${unreadCount})` : ''}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs font-bold">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search updates..."
            className="h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Application">Application</option>
            <option value="Offer Letter">Offer Letter</option>
            <option value="Payment">Payment</option>
            <option value="VFS Visa">VFS Visa</option>
            <option value="Counselor Session">Counselor Session</option>
            <option value="Document">Document</option>
            <option value="Support">Support</option>
          </select>
        </div>
      </div>

      {/* Notifications Stream */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse space-y-2">
          <Clock className="w-8 h-8 mx-auto text-slate-300" />
          <p>Fetching portal notifications from database...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200/80 bg-white space-y-3">
          <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-extrabold text-slate-800">No Notifications Found</h3>
          <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
            {searchQuery || categoryFilter !== 'All' || filter !== 'All'
              ? 'No notifications match your current filter or search criteria.'
              : 'Your notification center is all caught up! Official updates will appear here.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          <AnimatePresence>
            {filteredNotifications.map((n) => {
              const catConfig = CATEGORY_CONFIG[n.category || 'System'] || CATEGORY_CONFIG['System'];
              const IconComp = catConfig.icon;

              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleNotificationClick(n)}
                  className={`bg-white border rounded-2xl p-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 cursor-pointer group ${
                    !n.is_read ? 'border-[#6A1B2E]/20 shadow-[#6A1B2E]/5 bg-slate-50/30' : 'border-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Source-specific Module Icon */}
                    <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                      <IconComp className="w-4.5 h-4.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Top Row: Title + Right Side Category Badge & Timestamp */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className={`text-xs font-extrabold ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#6A1B2E] shrink-0" />}
                        </div>

                        {/* Right-aligned Module Badge & Timestamp */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                            {n.category || 'System'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {new Date(n.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Notification Body */}
                      <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">{n.body}</p>

                      {/* Action Triggers */}
                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-slate-100/60">
                        <span className="text-[#6A1B2E] text-[10px] font-black group-hover:underline flex items-center gap-1">
                          View details <ArrowRight className="w-3 h-3" />
                        </span>

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!n.is_read && (
                            <button
                              onClick={(e) => handleMarkAsRead(n.id, e)}
                              className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-emerald-50 transition-colors"
                              title="Mark as Read"
                            >
                              <CheckCheck className="w-3 h-3" /> Mark read
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteOne(n.id, e)}
                            className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-rose-50 transition-colors"
                            title="Delete Notification"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
