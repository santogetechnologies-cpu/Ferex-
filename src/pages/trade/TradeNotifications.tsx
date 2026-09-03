import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, CheckCircle2, Archive, Check, Plus, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeNotifications, markTradeNotificationRead, archiveTradeNotification, createTradeNotification } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeNotifications: React.FC = () => {
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [newNotif, setNewNotif] = useState({
    title: '',
    description: '',
    category: 'Logistics'
  });

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTradeNotifications();
      if (Array.isArray(data)) {
        const formatted = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          desc: d.description || d.desc,
          category: d.category || 'Logistics',
          read: d.is_read || d.read || false,
          archived: d.is_archived || d.archived || false,
          time: d.created_at ? new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'
        }));
        setNotifications(formatted);
      } else {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_trade_notifs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_notifications' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_notifs_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_notifs_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMarkRead = async (id: string) => {
    await markTradeNotificationRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    showToastMsg('Notification marked as read');
  };

  const handleArchive = async (id: string) => {
    await archiveTradeNotification(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, archived: true } : n));
    showToastMsg('Notification moved to archive');
  };

  const handleCreateNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotif.title) return;
    await createTradeNotification(newNotif);
    setShowAddModal(false);
    showToastMsg('Broadcasted notification');
    setNewNotif({ title: '', description: '', category: 'Logistics' });
    await loadData();
  };

  const filteredNotifs = notifications.filter(n => {
    const matchesSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || (n.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === 'unread') return matchesSearch && !n.read && !n.archived;
    if (filterTab === 'archived') return matchesSearch && n.archived;
    return matchesSearch && !n.archived;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#6A1B2E]" /> Global Trade Notification Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time port alerts, LC banking clearances, customs inspection notices, and swift wire confirms.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => {
            notifications.forEach(n => markTradeNotificationRead(n.id));
            setNotifications(notifications.map(n => ({ ...n, read: true })));
            showToastMsg('Marked all notifications as read');
          }}>
            <Check className="w-4 h-4 mr-1.5" /> Mark All as Read
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Broadcast Alert
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notifications..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1.5">
          {[
            { key: 'all', label: 'All Alerts' },
            { key: 'unread', label: 'Unread' },
            { key: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterTab === tab.key ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </Card>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading notifications...</div>
      ) : filteredNotifs.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No notifications in this view</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchQuery ? 'No alerts match your search.' : 'You have caught up with all live port and banking alerts.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((n) => (
            <Card
              key={n.id}
              className={`p-4 border transition-all ${
                !n.read ? 'border-[#6A1B2E]/30 bg-[#6A1B2E]/5 shadow-xs' : 'border-slate-200/70 bg-white'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2 py-0.5 rounded border border-[#6A1B2E]/20">{n.category}</span>
                    <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#6A1B2E]" />}
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-relaxed">{n.desc}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="text-[10px] font-semibold text-slate-400">{n.time}</span>
                  {!n.read && (
                    <button onClick={() => handleMarkRead(n.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Mark Read">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  {!n.archived && (
                    <button onClick={() => handleArchive(n.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Archive">
                      <Archive className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Broadcast Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">Broadcast Global Trade Alert</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateNotif} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Alert Title</label>
                  <input type="text" required value={newNotif.title} onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })} placeholder="e.g. Port of Gdansk Gate-Out Scheduled" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Alert Category</label>
                  <select value={newNotif.category} onChange={(e) => setNewNotif({ ...newNotif, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Logistics">Logistics</option>
                    <option value="Banking">Banking</option>
                    <option value="Payments">Payments</option>
                    <option value="Customs">Customs</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Detailed Description</label>
                  <textarea required value={newNotif.description} onChange={(e) => setNewNotif({ ...newNotif, description: e.target.value })} rows={3} placeholder="Provide details about customs clearance or dispatch..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Broadcast Alert</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
