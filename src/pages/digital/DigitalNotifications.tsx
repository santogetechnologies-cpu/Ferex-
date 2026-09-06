import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCircle2, Check, Search, Plus, X } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalNotifications, markDigitalNotificationRead, createDigitalNotification } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAlertForm, setNewAlertForm] = useState({ title: '', description: '', category: 'Projects' });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDigitalNotifications();
      if (Array.isArray(data) && data.length > 0) {
        setNotifications(data.map((n: any) => ({
          id: n.id,
          title: n.title,
          desc: n.description,
          time: n.created_at ? new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent',
          unread: !n.is_read,
          category: n.category || 'Engineering',
        })));
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
      .channel('realtime_digital_notifs')
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

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
    showToast('All notifications marked as read');
  };

  const handleMarkRead = async (id: string) => {
    await markDigitalNotificationRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, unread: false } : n));
    showToast('Notification marked as read');
  };

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertForm.title) return;

    await createDigitalNotification({
      title: newAlertForm.title,
      description: newAlertForm.description,
      category: newAlertForm.category
    });

    setShowAddModal(false);
    showToast(`Dispatched agency alert: ${newAlertForm.title}`);
    setNewAlertForm({ title: '', description: '', category: 'Projects' });
    await loadData();
  };

  const filtered = notifications.filter(n => {
    const matchSearch = (n.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (n.desc || '').toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === 'unread') return matchSearch && n.unread;
    return matchSearch;
  });

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-rose-900/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[#6A1B2E]" /> Agency Operations Notification Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Ferex Digital ERP • Real-time alerts for retainer invoice payments, sprint milestones, and client meetings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Dispatch Alert
          </Button>
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={markAllRead}>
            <Check className="w-4 h-4 mr-1.5" /> Mark All as Read
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'unread'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${filterTab === tab ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full h-9 pl-9 pr-4 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-bold text-slate-400">Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No alerts found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">There are no operational alerts in this view.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n) => (
            <Card key={n.id} className={`p-4 border transition-all flex items-start justify-between gap-4 rounded-2xl ${!n.unread ? 'bg-white border-slate-200/80 shadow-xs' : 'bg-[#6A1B2E]/5 border-[#6A1B2E]/20 shadow-xs'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${!n.unread ? 'bg-slate-100 text-slate-500' : 'bg-[#6A1B2E] text-white'}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                    <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{n.category}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 leading-relaxed">{n.desc}</p>
                  <span className="text-[10px] font-bold text-slate-400 block">{n.time}</span>
                </div>
              </div>

              {n.unread && (
                <button onClick={() => handleMarkRead(n.id)} className="p-1.5 text-[#6A1B2E] hover:bg-[#6A1B2E]/10 rounded-lg shrink-0 cursor-pointer" title="Mark Read">
                  <Check className="w-4 h-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ─── MODAL: DISPATCH AGENCY ALERT ─── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#6A1B2E]" /> Dispatch Operations Alert
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleCreateAlert} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Alert Headline</label>
                  <input type="text" required value={newAlertForm.title} onChange={(e) => setNewAlertForm({ ...newAlertForm, title: e.target.value })} placeholder="e.g. S3 Storage Bucket Threshold Notice" className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Category</label>
                  <select value={newAlertForm.category} onChange={(e) => setNewAlertForm({ ...newAlertForm, category: e.target.value })} className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                    <option value="Finance">Finance & Billing</option>
                    <option value="Projects">Sprint Projects</option>
                    <option value="DevOps">DevOps & Cloud</option>
                    <option value="Client Relations">Client Relations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Detailed Description</label>
                  <textarea rows={3} required value={newAlertForm.description} onChange={(e) => setNewAlertForm({ ...newAlertForm, description: e.target.value })} placeholder="Transaction receipt, commit details, or status updates..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold" />
                </div>
                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]">Dispatch Alert</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
