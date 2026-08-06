import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Search, CheckCircle2, Archive, Check } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

export const CentralNotifications: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [toast, setToast] = useState('');

  const [notifications, setNotifications] = useState([
    {
      id: 'NOTIF-301',
      title: 'Batch Tuition Wire Payout Cleared',
      desc: '₹4,80,000 transferred to University of Warsaw corporate swift account.',
      category: 'Payments',
      time: '10m ago',
      read: false,
      archived: false,
      type: 'payment'
    },
    {
      id: 'NOTIF-302',
      title: 'High Priority SLA Alert: Embassy Appointment',
      desc: '2 visa slots for Embassy of Poland require immediate executive clearance.',
      category: 'Security',
      time: '45m ago',
      read: false,
      archived: false,
      type: 'alert'
    },
    {
      id: 'NOTIF-303',
      title: 'New Staff Counselor Registered',
      desc: 'Vikram Singh assigned to Senior Counselor role by Rahul Mehta.',
      category: 'Users',
      time: '2h ago',
      read: true,
      archived: false,
      type: 'user'
    },
    {
      id: 'NOTIF-304',
      title: 'Global 2FA Policy Enforced',
      desc: 'Multi-factor authentication enforced across all 24 active staff accounts.',
      category: 'Security',
      time: '1d ago',
      read: true,
      archived: false,
      type: 'security'
    }
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMarkAsRead = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    showToastMsg('Marked notification as read');
  };

  const handleArchive = (id: string) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, archived: true } : n));
    showToastMsg('Notification archived');
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    showToastMsg('All notifications marked as read');
  };

  const filteredNotifs = notifications.filter(n => {
    const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.desc.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'unread') return matchesSearch && !n.read && !n.archived;
    if (activeTab === 'archived') return matchesSearch && n.archived;
    return matchesSearch && !n.archived;
  });

  return (
    <div className="space-y-6 text-left">
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
            <Bell className="w-5 h-5 text-[#6A1B2E]" /> Central Notification Center
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Executive alerts, system warnings, and ledger activities.
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-xs font-bold" onClick={handleMarkAllRead}>
          <Check className="w-4 h-4 mr-1.5" /> Mark All as Read
        </Button>
      </div>

      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notifications..." className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]" />
        </div>

        <div className="flex items-center gap-2">
          {[
            { key: 'all', label: 'All Notifications' },
            { key: 'unread', label: 'Unread' },
            { key: 'archived', label: 'Archived' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === t.key ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-3">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((notif) => (
            <Card key={notif.id} className={`p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${!notif.read ? 'bg-slate-50/80 border-l-4 border-l-[#6A1B2E]' : ''}`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  notif.type === 'alert' ? 'bg-red-50 text-red-600' : notif.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#6A1B2E]/10 text-[#6A1B2E]'
                }`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">{notif.id} · {notif.category}</span>
                    {!notif.read && <span className="w-2 h-2 rounded-full bg-[#6A1B2E]" />}
                  </div>
                  <h4 className="text-xs font-black text-slate-900 mt-0.5">{notif.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{notif.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="text-[10px] font-bold text-slate-400 mr-2">{notif.time}</span>
                {!notif.read && (
                  <button onClick={() => handleMarkAsRead(notif.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Mark Read">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                {!notif.archived && (
                  <button onClick={() => handleArchive(notif.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Archive">
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-8 text-center text-slate-400 font-semibold text-xs">
            No notifications found in this view.
          </Card>
        )}
      </div>
    </div>
  );
};
