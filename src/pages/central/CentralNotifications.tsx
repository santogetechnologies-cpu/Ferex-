import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCircle2, Check
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

interface AlertItem {
  id: string;
  division: 'Education' | 'Trade' | 'Rimi' | 'Digital' | 'HQ';
  divisionBadge: string;
  title: string;
  message: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Info';
  severityBadge: string;
  read: boolean;
}

export const CentralNotifications: React.FC = () => {
  const [toast, setToast] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Unread' | 'Critical'>('All');

  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: 'ALT-101',
      division: 'Trade',
      divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      title: 'High-Value Letter of Credit Pending Executive Authorization',
      message: 'EUR 120,000 MT700 wire for Maersk Line shipment reaches 24h review deadline.',
      timestamp: '10m ago',
      severity: 'Critical',
      severityBadge: 'bg-red-50 text-red-700 border-red-200',
      read: false,
    },
    {
      id: 'ALT-102',
      division: 'Rimi',
      divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      title: 'Cold Storage Warehouse Unit Alert',
      message: 'Warehouse Hub-2 telemetry detected temperature variation of +1.8°C above threshold.',
      timestamp: '45m ago',
      severity: 'Warning',
      severityBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      read: false,
    },
    {
      id: 'ALT-103',
      division: 'Education',
      divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      title: 'VFS Visa Lodgement Deadline Warning',
      message: '24 student visa slots approaching booking deadline for German Embassy intake.',
      timestamp: '2h ago',
      severity: 'Warning',
      severityBadge: 'bg-amber-50 text-amber-700 border-amber-200',
      read: true,
    },
    {
      id: 'ALT-104',
      division: 'Digital',
      divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Automated Razorpay Webhook Settlement Captured',
      message: 'Successfully cleared ₹1,50,000 for Nexus FinTech Mobile Sprint milestone 3.',
      timestamp: '3h ago',
      severity: 'Info',
      severityBadge: 'bg-blue-50 text-blue-700 border-blue-200',
      read: true,
    },
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleMarkAllRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
    showToastMsg('All alerts marked as acknowledged');
  };

  const handleClearAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    showToastMsg('Alert dismissed');
  };

  const filteredAlerts = alerts.filter(a => {
    if (selectedFilter === 'Unread') return !a.read;
    if (selectedFilter === 'Critical') return a.severity === 'Critical';
    return true;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-[#6A1B2E]" /> Executive Alerts & Dispatch Desk
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              4-App Broadcast
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time critical escalations, payment anomalies, freight warnings, and cold-chain compliance alerts across all divisions.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            className="text-xs font-bold"
          >
            <Check className="w-4 h-4 mr-1.5" /> Mark All Acknowledged
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(['All', 'Unread', 'Critical'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedFilter === tab
                  ? 'bg-[#6A1B2E] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <span className="text-xs font-bold text-slate-400 mr-2">
          {filteredAlerts.length} Alerts Shown
        </span>
      </Card>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {filteredAlerts.map(alert => (
          <Card
            key={alert.id}
            className={`p-5 border transition-all ${
              !alert.read
                ? 'border-l-4 border-l-[#6A1B2E] border-slate-200/90 bg-white shadow-sm'
                : 'border-slate-200/60 bg-slate-50/50'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black border ${alert.divisionBadge}`}>
                  {alert.division}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${alert.severityBadge}`}>
                  {alert.severity}
                </span>
                <h3 className="text-sm font-black text-slate-900">{alert.title}</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{alert.timestamp}</span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed mb-3">{alert.message}</p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => handleClearAlert(alert.id)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
