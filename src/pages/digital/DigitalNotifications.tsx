import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Search, Plus, X, Trash2, CheckCircle2,
  AlertCircle, Clock, Calendar, FileText, Layers, FolderKanban,
  CheckSquare, ArrowUpRight, Filter, Sparkles, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getDigitalNotifications,
  markDigitalNotificationRead,
  markAllDigitalNotificationsRead,
  deleteDigitalNotification,
  createDigitalNotification
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'Projects' | 'Deliverables' | 'Invoices' | 'Tasks' | 'Meetings' | 'General';
  severity: 'Urgent' | 'Action Required' | 'Info' | 'Completed';
  link?: string;
  actionText?: string;
  is_read: boolean;
  created_at: string;
}

export const DigitalNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({
    title: '',
    description: '',
    category: 'Projects' as NotificationItem['category'],
    severity: 'Info' as NotificationItem['severity'],
    link: '/digital/projects'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalNotifications();
      if (Array.isArray(data)) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          title: n.title || 'System Notification',
          description: n.description || n.message || '',
          category: (n.category || n.type || 'Projects') as NotificationItem['category'],
          severity: (n.severity || (n.category === 'Invoices' ? 'Urgent' : n.category === 'Tasks' ? 'Action Required' : 'Info')) as NotificationItem['severity'],
          link: n.link || (n.category === 'Invoices' ? '/digital/invoices' : n.category === 'Deliverables' ? '/digital/deliverables' : n.category === 'Meetings' ? '/digital/meetings' : '/digital/projects'),
          actionText: n.actionText || (n.category === 'Invoices' ? 'View Invoice' : n.category === 'Deliverables' ? 'Inspect Deliverable' : n.category === 'Meetings' ? 'Join Session' : 'Open Workspace'),
          is_read: Boolean(n.is_read),
          created_at: n.created_at || new Date().toISOString(),
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_notifs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_notifications' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_notifications_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_notifications_change', handleLocalChange);
    };
  }, [loadData]);

  const handleMarkAllRead = async () => {
    await markAllDigitalNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    showToast('All notifications marked as read');
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markDigitalNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    showToast('Notification marked as read');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteDigitalNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast('Notification dismissed');
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertForm.title.trim()) return;

    await createDigitalNotification({
      title: newAlertForm.title.trim(),
      description: newAlertForm.description.trim(),
      category: newAlertForm.category,
      link: newAlertForm.link
    });

    setShowAddModal(false);
    showToast(`Dispatched alert: ${newAlertForm.title}`);
    setNewAlertForm({
      title: '',
      description: '',
      category: 'Projects',
      severity: 'Info',
      link: '/digital/projects'
    });
    await loadData();
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const categories = [
    { id: 'All', label: 'All Updates', icon: Bell },
    { id: 'Projects', label: 'Projects & Milestones', icon: FolderKanban },
    { id: 'Invoices', label: 'Billing & Invoices', icon: FileText },
    { id: 'Tasks', label: 'Sprint Tasks', icon: CheckSquare },
    { id: 'Deliverables', label: 'Deliverables', icon: Layers },
    { id: 'Meetings', label: 'Meetings', icon: Calendar },
  ];

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      const matchSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === 'All' || n.category === selectedCategory;
      const matchRead = filterTab === 'all' || !n.is_read;
      return matchSearch && matchCategory && matchRead;
    });
  }, [notifications, searchQuery, selectedCategory, filterTab]);

  const formatTimeAgo = (iso: string) => {
    try {
      const diff = Date.now() - new Date(iso).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recent';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Invoices': return FileText;
      case 'Deliverables': return Layers;
      case 'Tasks': return CheckSquare;
      case 'Meetings': return Calendar;
      default: return FolderKanban;
    }
  };

  return (
    <div className="space-y-6 text-left antialiased max-w-6xl mx-auto pb-12">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 md:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#58051E]/10 rounded-md text-[10px] font-black uppercase text-[#58051E] mb-2">
              <Bell className="w-3.5 h-3.5" /> Digital Agency Activity Feed
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Agency Notifications & Updates
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Real-time updates for client invoice settlements, project deliverables, assigned sprint milestones, and client review meetings.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Dispatch Alert
            </button>
            <button
              onClick={() => { loadData(); showToast('Notifications synced'); }}
              className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/80 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="h-9 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Mark All Read ({unreadCount})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search and Unread Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 text-xs font-bold">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${filterTab === 'unread' ? 'bg-white text-[#58051E] shadow-xs' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Unread {unreadCount > 0 && <span className="w-2 h-2 rounded-full bg-[#58051E]" />}
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="w-full h-9 pl-9 pr-3 bg-white border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#58051E]"
            />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 bg-white rounded-2xl border border-slate-200/80">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
            Loading real-time agency alerts...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Notifications</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              You are all caught up. New sprint updates, invoice settlements, and meetings will show up here.
            </p>
          </Card>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notif) => {
              const Icon = getCategoryIcon(notif.category);
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div
                    onClick={() => {
                      if (!notif.is_read) handleMarkRead(notif.id);
                      if (notif.link) navigate(notif.link);
                    }}
                    className={`p-4 md:p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${
                      !notif.is_read
                        ? 'bg-white border-[#58051E]/30 shadow-xs ring-1 ring-[#58051E]/10'
                        : 'bg-white/80 hover:bg-white border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        !notif.is_read
                          ? 'bg-[#58051E]/10 text-[#58051E]'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            notif.severity === 'Urgent' ? 'bg-red-50 text-red-700 border border-red-200' :
                            notif.severity === 'Action Required' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                            notif.severity === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {notif.category}
                          </span>
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#58051E]" title="Unread" />
                          )}
                          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>

                        <h4 className={`text-sm tracking-tight ${!notif.is_read ? 'font-black text-slate-900' : 'font-bold text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                          {notif.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {notif.link && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!notif.is_read) handleMarkRead(notif.id);
                            navigate(notif.link!);
                          }}
                          className="h-8 px-3 rounded-lg bg-slate-100 hover:bg-[#58051E] hover:text-white text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <span>{notif.actionText || 'Open'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {!notif.is_read && (
                        <button
                          onClick={(e) => handleMarkRead(notif.id, e)}
                          className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleDelete(notif.id, e)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Compose Notification Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900 z-50 backdrop-blur-xs"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200/80 text-left space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 text-[#58051E] flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Broadcast Team Notification</h3>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAlert} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Alert Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Client Retainer Milestone Released"
                    value={newAlertForm.title}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Category</label>
                  <select
                    value={newAlertForm.category}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, category: e.target.value as any })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="Projects">Projects & Milestones</option>
                    <option value="Invoices">Billing & Invoices</option>
                    <option value="Deliverables">Deliverables</option>
                    <option value="Tasks">Sprint Tasks</option>
                    <option value="Meetings">Meetings</option>
                    <option value="General">General Notice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Target Action Route</label>
                  <select
                    value={newAlertForm.link}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, link: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="/digital/projects">/digital/projects</option>
                    <option value="/digital/invoices">/digital/invoices</option>
                    <option value="/digital/deliverables">/digital/deliverables</option>
                    <option value="/digital/tasks">/digital/tasks</option>
                    <option value="/digital/meetings">/digital/meetings</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details for team members..."
                    value={newAlertForm.description}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, description: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white font-bold">
                    Dispatch Alert
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
