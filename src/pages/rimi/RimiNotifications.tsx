import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Search, Plus, X, Trash2, CheckCircle2,
  AlertTriangle, Snowflake, Truck, ShoppingCart, Boxes,
  Warehouse, Clock, ArrowUpRight, RefreshCw, ShieldAlert,
  Flame
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiNotifications,
  markRimiNotificationRead,
  markAllRimiNotificationsRead,
  deleteRimiNotification,
  createRimiNotification
} from '../../lib/api/rimi';
import { supabase } from '../../lib/supabase';

interface RimiNotificationItem {
  id: string;
  title: string;
  description: string;
  category: 'Cold Chain' | 'Inventory' | 'Deliveries' | 'Sales Orders' | 'General';
  severity: 'Critical' | 'Warning' | 'Info';
  link?: string;
  actionText?: string;
  is_read: boolean;
  created_at: string;
}

export const RimiNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<RimiNotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({
    title: '',
    description: '',
    category: 'Cold Chain' as RimiNotificationItem['category'],
    severity: 'Warning' as RimiNotificationItem['severity'],
    link: '/rimi/warehouses'
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getRimiNotifications();
      if (Array.isArray(data)) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          title: n.title || 'Operational Alert',
          description: n.description || n.message || '',
          category: (n.category || 'Cold Chain') as RimiNotificationItem['category'],
          severity: (n.severity || (n.category === 'Inventory' ? 'Critical' : n.category === 'Cold Chain' ? 'Warning' : 'Info')) as RimiNotificationItem['severity'],
          link: n.link || (n.category === 'Cold Chain' ? '/rimi/warehouses' : n.category === 'Inventory' ? '/rimi/inventory' : n.category === 'Deliveries' ? '/rimi/deliveries' : '/rimi/sales-orders'),
          actionText: n.actionText || (n.category === 'Cold Chain' ? 'Inspect Facility' : n.category === 'Inventory' ? 'View Batch' : n.category === 'Deliveries' ? 'Track Dispatch' : 'Open Order'),
          is_read: Boolean(n.is_read || n.read),
          created_at: n.created_at || new Date().toISOString(),
        })));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifs();

    const channel = supabase
      .channel('realtime_rimi_notifs_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rimi_notifications' }, () => {
        loadNotifs();
      })
      .subscribe();

    const handleLocalChange = () => loadNotifs();
    window.addEventListener('ferex_rimi_notifications_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_rimi_notifications_change', handleLocalChange);
    };
  }, [loadNotifs]);

  const handleMarkAllRead = async () => {
    await markAllRimiNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    showToastMsg('All notifications marked as read');
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await markRimiNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    showToastMsg('Notification marked as read');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteRimiNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToastMsg('Notification dismissed');
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertForm.title.trim()) return;

    await createRimiNotification({
      title: newAlertForm.title.trim(),
      description: newAlertForm.description.trim(),
      category: newAlertForm.category,
      severity: newAlertForm.severity,
      link: newAlertForm.link
    });

    setShowAddModal(false);
    showToastMsg(`Dispatched FMCG alert: ${newAlertForm.title}`);
    setNewAlertForm({
      title: '',
      description: '',
      category: 'Cold Chain',
      severity: 'Warning',
      link: '/rimi/warehouses'
    });
    await loadNotifs();
  };

  const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

  const categories = [
    { id: 'All', label: 'All Alerts', icon: Bell },
    { id: 'Cold Chain', label: 'Cold Storage & Temp', icon: Snowflake },
    { id: 'Inventory', label: 'Stock & Expiry', icon: Boxes },
    { id: 'Deliveries', label: 'Reefer Dispatch', icon: Truck },
    { id: 'Sales Orders', label: 'Wholesale Orders', icon: ShoppingCart },
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
      case 'Cold Chain': return Snowflake;
      case 'Inventory': return Boxes;
      case 'Deliveries': return Truck;
      case 'Sales Orders': return ShoppingCart;
      default: return Warehouse;
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
              <Snowflake className="w-3.5 h-3.5 text-cyan-600" /> FMCG Cold Chain Monitoring
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Operations Alert & Notification Center
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Cold room temperature alerts, expiring batch notices, reefer fleet dispatches, and incoming wholesale customer orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={() => setShowAddModal(true)}
              className="h-9 px-4 bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Broadcast Alert
            </button>
            <button
              onClick={() => { loadNotifs(); showToastMsg('Notifications synced'); }}
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
              placeholder="Search FMCG alerts..."
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
            Loading real-time cold chain alerts...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="p-12 text-center bg-white border border-slate-200/80 rounded-2xl space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Active Alerts</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              All cold chain facilities, expiring batches, and reefer transit units are operating normally.
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
                        notif.severity === 'Critical'
                          ? 'bg-rose-100 text-rose-700'
                          : notif.severity === 'Warning'
                          ? 'bg-amber-100 text-amber-800'
                          : !notif.is_read
                          ? 'bg-[#58051E]/10 text-[#58051E]'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            notif.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                            notif.severity === 'Warning' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
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
                        title="Dismiss alert"
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

      {/* Compose FMCG Notification Modal */}
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
                    <Snowflake className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Broadcast Operations Alert</h3>
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
                    placeholder="e.g. Cold Room 3 Temperature Variation Warning"
                    value={newAlertForm.title}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Category</label>
                    <select
                      value={newAlertForm.category}
                      onChange={(e) => setNewAlertForm({ ...newAlertForm, category: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Cold Chain">Cold Storage & Temp</option>
                      <option value="Inventory">Stock & Expiry</option>
                      <option value="Deliveries">Reefer Dispatch</option>
                      <option value="Sales Orders">Sales Orders</option>
                      <option value="General">General Notice</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Severity</label>
                    <select
                      value={newAlertForm.severity}
                      onChange={(e) => setNewAlertForm({ ...newAlertForm, severity: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="Critical">Critical</option>
                      <option value="Warning">Warning</option>
                      <option value="Info">Info</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Action Link Route</label>
                  <select
                    value={newAlertForm.link}
                    onChange={(e) => setNewAlertForm({ ...newAlertForm, link: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="/rimi/warehouses">/rimi/warehouses (Cold Storage)</option>
                    <option value="/rimi/inventory">/rimi/inventory (Batches & Expiry)</option>
                    <option value="/rimi/deliveries">/rimi/deliveries (Reefer Trucks)</option>
                    <option value="/rimi/sales-orders">/rimi/sales-orders (Sales Orders)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide incident or operational details..."
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
                    Broadcast Alert
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
