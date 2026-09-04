import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Search, CheckCircle2, Download
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

interface AuditLog {
  id: string;
  division: 'Education' | 'Trade' | 'Rimi' | 'Digital' | 'HQ';
  divisionBadge: string;
  action: string;
  details: string;
  actor: string;
  ip: string;
  timestamp: string;
  severity: 'Info' | 'Success' | 'Warning' | 'Critical';
  severityBadge: string;
}

export const CentralActivity: React.FC = () => {
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');

  const [logs, setLogs] = useState<AuditLog[]>([
    {
      id: 'AUD-8821',
      division: 'Trade',
      divisionBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      action: 'Letter of Credit Settlement Approved',
      details: 'EUR 120,000 MT700 wire release authorized for Hamburg Port shipping consignment.',
      actor: 'Central Super Admin',
      ip: '192.168.1.104',
      timestamp: '5m ago',
      severity: 'Success',
      severityBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'AUD-8822',
      division: 'Education',
      divisionBadge: 'bg-rose-50 text-rose-700 border-rose-200',
      action: 'Student Tuition Wire Verified',
      details: '₹4,80,000 ledger deposit cleared for Warsaw University batch Autumn 2026.',
      actor: 'Rahul Mehta (Admissions)',
      ip: '103.21.58.12',
      timestamp: '18m ago',
      severity: 'Success',
      severityBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      id: 'AUD-8823',
      division: 'Rimi',
      divisionBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      action: 'Cold Chain Expiry Sensor Trigger',
      details: 'Hub-2 Cold storage unit temperature telemetry logged minor fluctuation (-16.5°C).',
      actor: 'Automated IoT Daemon',
      ip: '10.0.4.88',
      timestamp: '42m ago',
      severity: 'Warning',
      severityBadge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      id: 'AUD-8824',
      division: 'Digital',
      divisionBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      action: 'Production Webhook Payment Captured',
      details: 'Razorpay settlement ₹1,50,000 for Nexus FinTech Mobile Sprint milestone 3.',
      actor: 'Razorpay Webhook API',
      ip: '52.66.12.90',
      timestamp: '1h ago',
      severity: 'Info',
      severityBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      id: 'AUD-8825',
      division: 'HQ',
      divisionBadge: 'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
      action: 'Division Admin Login Provisioned',
      details: 'Created access credentials for Trade Admin: tradeadmin@santoge.com.',
      actor: 'Central Super Admin',
      ip: '192.168.1.104',
      timestamp: '2h ago',
      severity: 'Info',
      severityBadge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
  ]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportAudit = () => {
    showToastMsg('Exporting complete Central Security Audit Log (CSV)...');
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchSearch =
        l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.actor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchDiv = selectedDivision === 'All' || l.division === selectedDivision;
      const matchSev = selectedSeverity === 'All' || l.severity === selectedSeverity;
      return matchSearch && matchDiv && matchSev;
    });
  }, [logs, searchQuery, selectedDivision, selectedSeverity]);

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
              <Activity className="w-6 h-6 text-[#6A1B2E]" /> Universal Security Audit Trail & Activity Feed
            </h1>
            <span className="text-[10px] font-black bg-[#6A1B2E]/10 text-[#6A1B2E] border border-[#6A1B2E]/20 px-2.5 py-0.5 rounded-full">
              Real-time Logs
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Immutable executive record of user logins, permission escalations, wire clearances, and operational events across the enterprise.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleExportAudit}
            className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold text-white shadow-xs"
          >
            <Download className="w-4 h-4 mr-1.5" /> Download Audit CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto w-full sm:w-auto scrollbar-none">
            {['All', 'Education', 'Trade', 'Rimi', 'Digital', 'HQ'].map(div => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  selectedDivision === div
                    ? 'bg-[#6A1B2E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {div === 'All' ? 'All Divisions' : div}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit actions, IP, actor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-[#6A1B2E]"
            />
          </div>
        </div>
      </Card>

      {/* Log Feed */}
      <div className="space-y-3">
        {filteredLogs.map(l => (
          <Card key={l.id} className="p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5 mb-2.5">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black border ${l.divisionBadge}`}>
                  {l.division}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold border ${l.severityBadge}`}>
                  {l.severity}
                </span>
                <span className="font-mono text-xs font-black text-slate-900">{l.id}</span>
                <span className="text-xs font-black text-slate-800">— {l.action}</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{l.timestamp}</span>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">{l.details}</p>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span>Actor: <strong className="text-slate-700">{l.actor}</strong></span>
              <span>Source IP: <strong className="font-mono text-slate-700">{l.ip}</strong></span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
