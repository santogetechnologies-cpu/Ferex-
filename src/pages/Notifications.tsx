import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Sparkles, CheckSquare, Trash2, Calendar, FileText, DollarSign, MessageSquare } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';

export const Notifications: React.FC = () => {
  // In-memory notifications state
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'document', title: 'Language Test Scores Verified', body: 'Your TOEFL official report scorecard has been verified by the admissions committee.', date: 'Today', unread: true, icon: FileText, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
    { id: 2, type: 'meeting', title: 'Upcoming Advisory Briefing scheduled', body: 'New video meet scheduled with Evelyn Carter for Aug 12, 10:00 AM.', date: 'Today', unread: true, icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { id: 3, type: 'payment', title: 'Invoice INV-2026-0560 generated', body: 'An outstanding invoice of $1,200.00 is generated for NAWA validation.', date: 'Yesterday', unread: true, icon: DollarSign, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { id: 4, type: 'chat', title: 'New chat message from Advisor', body: 'Dr. Evelyn Carter: "Yes, your transcripts look fully verified."', date: 'Yesterday', unread: false, icon: MessageSquare, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { id: 5, type: 'document', title: 'Passport Verification Approved', body: 'Your passport copy has cleared compliance checklists successfully.', date: 'Older', unread: false, icon: FileText, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  ]);

  const [filter, setFilter] = useState('All');
  const [toastMessage, setToastMessage] = useState('');

  // Handle Mark as read
  const handleMarkAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, unread: false } : n)
    );
    showToast('Notification marked as read');
  };

  // Handle Mark all as read
  const handleMarkAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, unread: false }))
    );
    showToast('All notifications marked as read');
  };

  // Handle delete
  const handleDelete = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    showToast('Notification cleared');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  };

  // Filter logic
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'Unread') return n.unread;
    if (filter === 'Read') return !n.unread;
    return true;
  });

  // Groups
  const groups = ['Today', 'Yesterday', 'Older'];

  return (
    <div className="space-y-6 text-left relative min-h-[500px]">
      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#6A1B2E] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-1.5 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#6A1B2E]/5 text-[#6A1B2E] flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </span>
            Notifications
          </h1>
          <p className="text-sm font-semibold text-slate-500">
            Ferex Education • Stay updated on admission board reviews, advisor meets, and invoice statuses.
          </p>
        </div>
        
        {notifications.some(n => n.unread) && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs flex items-center gap-1.5 h-10 border-slate-200 hover:bg-slate-50 text-slate-700 font-bold"
            onClick={handleMarkAllAsRead}
          >
            <CheckSquare className="w-4 h-4" /> Mark all read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 select-none border-b border-slate-100 pb-2">
        {['All', 'Unread', 'Read'].map((t) => {
          const count = t === 'All' 
            ? notifications.length 
            : t === 'Unread' 
              ? notifications.filter(n => n.unread).length 
              : notifications.filter(n => !n.unread).length;

          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all border
                ${filter === t
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-350'
                }`}
            >
              {t} ({count})
            </button>
          );
        })}
      </div>

      {/* Notification items */}
      <div className="space-y-6">
        {groups.map((group) => {
          const groupNotifications = filteredNotifications.filter(n => n.date === group);
          if (groupNotifications.length === 0) return null;

          return (
            <div key={group} className="space-y-3">
              <h3 className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider pl-1">{group}</h3>
              <div className="space-y-2.5">
                {groupNotifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <Card
                      key={n.id}
                      className={`p-4 border flex items-start gap-4 transition-all hover:border-slate-200 relative select-none
                        ${n.unread ? 'border-l-4 border-l-primary bg-[#6A1B2E]/[0.01]' : 'border-slate-100 bg-white'}`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${n.color}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>

                      {/* Info details */}
                      <div className="text-left space-y-1 pr-16 flex-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                          {n.title}
                          {n.unread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block shrink-0 animate-ping" />
                          )}
                        </h4>
                        <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                          {n.body}
                        </p>
                      </div>

                      {/* Row actions */}
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {n.unread && (
                          <button
                            onClick={() => handleMarkAsRead(n.id)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded hover:bg-slate-50 transition-colors"
                            title="Mark as Read"
                          >
                            <Check className="w-4.5 h-4.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(n.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {filteredNotifications.length === 0 && (
          <div className="py-16 text-center font-bold text-slate-400 select-none">
            No notifications to display.
          </div>
        )}
      </div>
    </div>
  );
};
