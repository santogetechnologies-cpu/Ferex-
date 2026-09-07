import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Sparkles, CheckCheck, FileText,
  GraduationCap, CreditCard, ShieldCheck, Calendar,
  ArrowRight, Filter, Trash2, CheckCircle2,
  Clock, Inbox, Search, RefreshCw, ChevronRight,
  FolderOpen, LifeBuoy, Plane, Milestone, ExternalLink,
  SlidersHorizontal, CheckCircle
} from 'lucide-react';
import { Card } from '../components/Card';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../lib/types';

interface CategoryConfig {
  icon: React.ComponentType<{ className?: string }>;
  route: string;
  actionText: string;
  color: string;
  bg: string;
  border: string;
  badgeBg: string;
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  'Offer Letter': {
    icon: FileText,
    route: '/student/offers',
    actionText: 'Review Offer Letter',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50/90',
    border: 'border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800'
  },
  'Application': {
    icon: GraduationCap,
    route: '/student/journey-tracker',
    actionText: 'Track Application Status',
    color: 'text-blue-700',
    bg: 'bg-blue-50/90',
    border: 'border-blue-200',
    badgeBg: 'bg-blue-100 text-blue-800'
  },
  'Payment': {
    icon: CreditCard,
    route: '/student/payments',
    actionText: 'View Payments & Receipts',
    color: 'text-purple-700',
    bg: 'bg-purple-50/90',
    border: 'border-purple-200',
    badgeBg: 'bg-purple-100 text-purple-800'
  },
  'VFS Visa': {
    icon: ShieldCheck,
    route: '/student/visa-tracker',
    actionText: 'Check VFS Visa Step',
    color: 'text-amber-700',
    bg: 'bg-amber-50/90',
    border: 'border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800'
  },
  'Counselor Session': {
    icon: Calendar,
    route: '/student/meetings',
    actionText: 'View Meeting Schedule',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50/90',
    border: 'border-indigo-200',
    badgeBg: 'bg-indigo-100 text-indigo-800'
  },
  'Document': {
    icon: FolderOpen,
    route: '/student/documents',
    actionText: 'Open Document Vault',
    color: 'text-teal-700',
    bg: 'bg-teal-50/90',
    border: 'border-teal-200',
    badgeBg: 'bg-teal-100 text-teal-800'
  },
  'Pre-Departure': {
    icon: Plane,
    route: '/student/pre-departure',
    actionText: 'Check Travel Checklist',
    color: 'text-sky-700',
    bg: 'bg-sky-50/90',
    border: 'border-sky-200',
    badgeBg: 'bg-sky-100 text-sky-800'
  },
  'Support': {
    icon: LifeBuoy,
    route: '/student/support',
    actionText: 'View Support Tickets',
    color: 'text-rose-700',
    bg: 'bg-rose-50/90',
    border: 'border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800'
  },
  'System': {
    icon: Bell,
    route: '/student/dashboard',
    actionText: 'Go to Dashboard',
    color: 'text-slate-700',
    bg: 'bg-slate-100/90',
    border: 'border-slate-200',
    badgeBg: 'bg-slate-100 text-slate-700'
  },
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
    refresh,
    loading
  } = useNotifications(user?.id);

  const [filter, setFilter] = useState<'All' | 'Unread' | 'Read'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
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
    showToast('Notification marked as read');
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
    showToast('Notification removed');
    window.dispatchEvent(new Event('ferex_notification_change'));
  };

  const handleClearAll = () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    clearAllNotifs();
    setLocalDeletedState(new Set(activeNotifs.map(n => n.id)));
    showToast('All notifications cleared');
    window.dispatchEvent(new Event('ferex_notification_change'));
  };

  const getCatConfig = (cat?: string): CategoryConfig => {
    if (!cat) return CATEGORY_CONFIG['System'];
    if (CATEGORY_CONFIG[cat]) return CATEGORY_CONFIG[cat];
    const key = Object.keys(CATEGORY_CONFIG).find(k => k.toLowerCase() === cat.toLowerCase() || cat.toLowerCase().includes(k.toLowerCase()));
    return key ? CATEGORY_CONFIG[key] : CATEGORY_CONFIG['System'];
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
    const catConfig = getCatConfig(n.category);
    navigate(catConfig.route);
  };

  const unreadCount = activeNotifs.filter(n => !n.is_read).length;
  const readCount = activeNotifs.filter(n => n.is_read).length;

  const countByCategory = useMemo(() => {
    const counts: Record<string, number> = { All: activeNotifs.length };
    activeNotifs.forEach(n => {
      const cat = n.category || 'System';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [activeNotifs]);

  const filteredNotifications = useMemo(() => {
    return activeNotifs.filter(n => {
      if (filter === 'Unread' && n.is_read) return false;
      if (filter === 'Read' && !n.is_read) return false;
      if (categoryFilter !== 'All') {
        const cat = n.category || 'System';
        if (cat.toLowerCase() !== categoryFilter.toLowerCase() && !cat.toLowerCase().includes(categoryFilter.toLowerCase())) {
          return false;
        }
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const titleStr = (n.title || '').toLowerCase();
        const bodyStr = (n.body || (n as any).message || '').toLowerCase();
        return titleStr.includes(q) || bodyStr.includes(q);
      }
      return true;
    });
  }, [activeNotifs, filter, categoryFilter, searchQuery]);

  const sideCategoryOptions = [
    { label: 'All Notifications', cat: 'All', icon: Inbox, count: activeNotifs.length, color: 'text-slate-700' },
    { label: 'Unread Priority Alerts', cat: 'Unread', icon: Bell, count: unreadCount, color: 'text-amber-600', isUnreadTab: true },
    { label: 'Offer Letters', cat: 'Offer Letter', icon: FileText, count: countByCategory['Offer Letter'] || 0, color: 'text-emerald-700' },
    { label: 'University Applications', cat: 'Application', icon: GraduationCap, count: countByCategory['Application'] || 0, color: 'text-blue-700' },
    { label: 'Payments & Receipts', cat: 'Payment', icon: CreditCard, count: countByCategory['Payment'] || 0, color: 'text-purple-700' },
    { label: 'VFS Visa Tracker', cat: 'VFS Visa', icon: ShieldCheck, count: countByCategory['VFS Visa'] || 0, color: 'text-amber-700' },
    { label: 'Counselor Meetings', cat: 'Counselor Session', icon: Calendar, count: countByCategory['Counselor Session'] || 0, color: 'text-indigo-700' },
    { label: 'Document Vault', cat: 'Document', icon: FolderOpen, count: countByCategory['Document'] || 0, color: 'text-teal-700' },
    { label: 'Pre-Departure (Stage 12)', cat: 'Pre-Departure', icon: Plane, count: countByCategory['Pre-Departure'] || 0, color: 'text-sky-700' },
    { label: 'Support Tickets', cat: 'Support', icon: LifeBuoy, count: countByCategory['Support'] || 0, color: 'text-rose-700' },
  ];

  const quickJumpPortals = [
    { label: 'Select University / Apply', path: '/student/select-university', icon: GraduationCap, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { label: 'Journey Tracker Roadmap', path: '/student/journey-tracker', icon: Milestone, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { label: 'Pay Registration & Fees', path: '/student/payments', icon: CreditCard, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { label: 'VFS Visa Tracking Center', path: '/student/visa-tracker', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { label: 'Schedule Counselor Call', path: '/student/meetings', icon: Calendar, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { label: 'Upload Verified Docs', path: '/student/documents', icon: FolderOpen, color: 'text-teal-600 bg-teal-50 border-teal-200' },
    { label: 'Open Support Helpdesk', path: '/student/support', icon: LifeBuoy, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  return (
    <div className="space-y-6 text-left relative min-h-[650px] pb-12">
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
              <Bell className="w-3.5 h-3.5" /> Notifications & Communications Hub
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
              Official Portal Updates & Action Center
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Real-time updates for university admissions, offer letters, registration fee invoices, counselor calls, NAWA verification, and VFS visa steps.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => { refresh(); showToast('Notifications synced from server'); }}
              className="h-9 px-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 shadow-xs transition-all flex items-center gap-1.5"
              title="Refresh Notifications"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" /> Mark All Read
              </button>
            )}
            {activeNotifs.length > 0 && (
              <button
                onClick={handleClearAll}
                className="h-9 px-3.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 rounded-xl text-xs font-bold border border-rose-500/30 shadow-xs transition-all flex items-center gap-1.5"
                title="Clear All Notifications"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-300" /> Clear
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
            <span className="text-lg font-extrabold text-slate-900">{activeNotifs.length}</span>
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
            <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">Completed / Read</span>
            <span className="text-lg font-extrabold text-emerald-900">{readCount}</span>
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
            <Filter className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-indigo-600 block tracking-wider">Active Channel</span>
            <span className="text-xs font-black text-slate-800 truncate block">
              {filter === 'Unread' ? 'Unread Priority' : categoryFilter}
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Options Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Full Notification Side Options Panel */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Channel / Category Options Deck */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#6A1B2E]" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Notification Side Channels</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Filter by category</span>
            </div>

            <div className="space-y-1">
              {sideCategoryOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = opt.isUnreadTab
                  ? filter === 'Unread'
                  : categoryFilter === opt.cat && filter !== 'Unread';

                return (
                  <button
                    key={opt.label}
                    onClick={() => {
                      if (opt.isUnreadTab) {
                        setFilter('Unread');
                        setCategoryFilter('All');
                      } else {
                        setFilter('All');
                        setCategoryFilter(opt.cat);
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
                      <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-white/70' : 'text-slate-300'}`} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Jump Portals (Direct Navigation to Student Modules) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-[#6A1B2E]" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Quick Jump Portals</h3>
              </div>
            </div>

            <div className="space-y-1.5">
              {quickJumpPortals.map((portal) => {
                const Icon = portal.icon;
                return (
                  <button
                    key={portal.label}
                    onClick={() => navigate(portal.path)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${portal.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="group-hover:text-[#6A1B2E] transition-colors">{portal.label}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#6A1B2E] group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Management Options */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 shadow-lg border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">Portal Tools</h4>
            </div>
            <p className="text-[11px] font-medium text-slate-300 leading-relaxed">
              Stay ahead of intake deadlines, visa verification milestones, and conditional offer letter releases.
            </p>
            <div className="pt-1 flex flex-col gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="w-full h-8 px-3 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Mark All as Read
              </button>
              <button
                onClick={() => navigate('/student/support')}
                className="w-full h-8 px-3 bg-[#6A1B2E] hover:bg-[#58051E] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <LifeBuoy className="w-3.5 h-3.5 text-white" /> Contact Counselor Support
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Filter Toolbar + Live Notifications Stream */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Top Filter and Search Deck */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['All', 'Unread', 'Read'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setFilter(tab);
                    if (tab !== 'Unread') setCategoryFilter('All');
                  }}
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

            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search alerts, keywords..."
                className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#6A1B2E]"
              />
            </div>
          </div>

          {/* Active Category Indicator */}
          {(categoryFilter !== 'All' || filter !== 'All' || searchQuery) && (
            <div className="flex items-center justify-between px-3 py-2 bg-slate-100/80 rounded-2xl text-xs font-bold text-slate-600 border border-slate-200/60">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-[#6A1B2E]" />
                <span>Showing: <strong className="text-slate-900">{filter === 'Unread' ? 'Unread Priority' : categoryFilter}</strong> ({filteredNotifications.length} items)</span>
              </div>
              <button
                onClick={() => {
                  setFilter('All');
                  setCategoryFilter('All');
                  setSearchQuery('');
                }}
                className="text-[10px] font-black text-[#6A1B2E] hover:underline"
              >
                Reset Filters
              </button>
            </div>
          )}

          {/* Notifications Stream */}
          {loading ? (
            <div className="py-16 text-center text-xs font-bold text-slate-400 animate-pulse space-y-2 bg-white rounded-3xl border border-slate-200/80 p-8">
              <Clock className="w-8 h-8 mx-auto text-slate-300" />
              <p>Fetching portal notifications from database...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-12 text-center border border-slate-200/80 bg-white space-y-3 rounded-3xl">
              <Inbox className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-sm font-extrabold text-slate-800">No Notifications Found</h3>
              <p className="text-xs font-medium text-slate-400 max-w-sm mx-auto">
                {searchQuery || categoryFilter !== 'All' || filter !== 'All'
                  ? 'No notifications match your selected filter or search keyword.'
                  : 'Your notification center is all caught up! Official updates will appear here.'}
              </p>
              {(searchQuery || categoryFilter !== 'All' || filter !== 'All') && (
                <button
                  onClick={() => { setFilter('All'); setCategoryFilter('All'); setSearchQuery(''); }}
                  className="px-4 py-2 bg-[#6A1B2E] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#58051E] transition-all"
                >
                  View All Notifications
                </button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {filteredNotifications.map((n) => {
                  const catConfig = getCatConfig(n.category);
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
                      className={`bg-white border rounded-3xl p-4.5 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-slate-300 transition-all duration-200 cursor-pointer group ${
                        !n.is_read ? 'border-[#6A1B2E]/25 shadow-[#6A1B2E]/5 bg-gradient-to-r from-white via-rose-50/20 to-white' : 'border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Source-specific Module Icon */}
                        <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                          <IconComp className="w-5 h-5" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Top Row: Title + Right Side Category Badge & Timestamp */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <p className={`text-xs sm:text-sm font-extrabold ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                              {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#6A1B2E] shrink-0 animate-pulse" />}
                            </div>

                            {/* Right-aligned Module Badge & Timestamp */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9.5px] font-extrabold border ${catConfig.bg} ${catConfig.color} ${catConfig.border}`}>
                                {n.category || 'System'}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400 hidden sm:flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {new Date(n.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>

                          {/* Notification Body */}
                          <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">{n.body}</p>

                          {/* Action Triggers & Quick Navigation */}
                          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(n);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-[#6A1B2E] text-slate-700 hover:text-white rounded-xl text-[11px] font-extrabold transition-all"
                            >
                              <span>{catConfig.actionText}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex items-center gap-2">
                              {!n.is_read && (
                                <button
                                  onClick={(e) => handleMarkAsRead(n.id, e)}
                                  className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                                  title="Mark as Read"
                                >
                                  <CheckCheck className="w-3.5 h-3.5" /> Mark read
                                </button>
                              )}
                              <button
                                onClick={(e) => handleDeleteOne(n.id, e)}
                                className="text-[10px] font-bold text-slate-400 hover:text-rose-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                                title="Delete Notification"
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
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
