import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckSquare, Sparkles, FileText, Calendar, DollarSign, MessageSquare, CheckCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';

export const Notifications: React.FC = () => {
  const { user } = useAuth();
  const { notifications, markRead, markAllRead, loading } = useNotifications(user?.id);
  const [filter, setFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleMarkAsRead = (id: string) => {
    markRead(id);
    showToast('Notification marked as read');
  };

  const handleMarkAllAsRead = () => {
    markAllRead();
    showToast('All notifications marked as read');
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'Unread') return !n.is_read;
    if (filter === 'Read') return n.is_read;
    return true;
  });

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </span>
            Notifications & Alerts
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Real-time updates regarding application decisions, document reviews, and payments.
          </p>
        </div>

        {notifications.some(n => !n.is_read) && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="text-xs font-bold self-start md:self-auto"
          >
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        {['All', 'Unread', 'Read'].map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`h-8 px-4 rounded-xl text-xs font-bold transition-all ${
              filter === tab ? 'bg-[#6A1B2E] text-white shadow-xs' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading notifications...</div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200/70 rounded-2xl p-12 text-center shadow-xs">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Notifications</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            You're all caught up! Updates from admissions counselors and portal events will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <Card
              key={n.id}
              className={`p-4 border transition-all ${
                !n.is_read ? 'bg-amber-50/30 border-amber-200/60' : 'bg-white border-slate-200/70'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    !n.is_read ? 'bg-[#6A1B2E] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Bell className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-xs font-black text-slate-900">{n.title}</h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-1.5">{n.body}</p>
                    <span className="text-[10px] font-extrabold text-slate-400">
                      {new Date(n.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-[#6A1B2E] hover:bg-slate-100 transition-colors shrink-0"
                    title="Mark as Read"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
