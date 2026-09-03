import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, CheckCircle2, Archive, Check } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getTradeNotifications, markTradeNotificationRead, archiveTradeNotification } from '../../lib/api/trade';
import { supabase } from '../../lib/supabase';

export const TradeNotifications: React.FC = () => {
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getTradeNotifications();
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
    setLoading(false);
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

  const filteredNotifs = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.desc.toLowerCase().includes(searchQuery.toLowerCase());
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
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => {
          notifications.forEach(n => markTradeNotificationRead(n.id));
          setNotifications(notifications.map(n => ({ ...n, read: true })));
          showToastMsg('Marked all notifications as read');
        }}>
          <Check className="w-4 h-4 mr-1.5" /> Mark All as Read
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search alerts..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-1">
          {(['all', 'unread', 'archived'] as const).map((t) => (
            <button key={t} onClick={() => setFilterTab(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${filterTab === t ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {filteredNotifs.map((n) => (
          <Card key={n.id} className={`p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${!n.read ? 'bg-slate-50/80 border-l-4 border-l-[#6A1B2E]' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${!n.read ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-500'}`}>
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[9.5px] font-black uppercase text-[#6A1B2E]">{n.category} · {n.time}</span>
                <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{n.desc}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {!n.read && (
                <button onClick={() => handleMarkRead(n.id)} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#6A1B2E]/10 text-[#6A1B2E] hover:bg-[#6A1B2E] hover:text-white transition-colors">
                  Mark Read
                </button>
              )}
              {!n.archived && (
                <button onClick={() => handleArchive(n.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Archive Alert">
                  <Archive className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
