import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, Search, CheckCircle2, Download, RefreshCw
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { supabase } from '../../lib/supabase';

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const formatted: AuditLog[] = data.map((item: any) => ({
          id: item.id ? `AUD-${item.id.slice(0, 6)}` : 'AUD-000',
          division: item.division || 'HQ',
          divisionBadge:
            item.division === 'Education' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            item.division === 'Trade' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
            item.division === 'Rimi' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
            item.division === 'Digital' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            'bg-[#6A1B2E]/10 text-[#6A1B2E] border-[#6A1B2E]/20',
          action: item.action || item.title || 'System Action',
          details: item.details || item.description || 'System event recorded in central audit trail.',
          actor: item.actor || item.user_email || 'System User',
          ip: item.ip_address || '127.0.0.1',
          timestamp: item.created_at ? new Date(item.created_at).toLocaleString() : 'Recent',
          severity: item.severity || 'Info',
          severityBadge:
            item.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
            item.severity === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
            item.severity === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            'bg-blue-50 text-blue-700 border-blue-200',
        }));
        setLogs(formatted);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleExportAudit = () => {
    if (logs.length === 0) {
      showToastMsg('No audit records to export.');
      return;
    }
    const headers = ['ID', 'Division', 'Action', 'Details', 'Actor', 'IP', 'Timestamp', 'Severity'];
    const rows = logs.map(l => [l.id, l.division, `"${l.action}"`, `"${l.details}"`, l.actor, l.ip, l.timestamp, l.severity]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ferex_Central_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg('Exported Central Security Audit Log (CSV)');
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.toLowerCase().includes(searchQuery.toLowerCase());

      const matchDiv = selectedDivision === 'All' || log.division === selectedDivision;
      const matchSev = selectedSeverity === 'All' || log.severity === selectedSeverity;

      return matchSearch && matchDiv && matchSev;
    });
  }, [logs, searchQuery, selectedDivision, selectedSeverity]);

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
            <Activity className="w-5 h-5 text-[#6A1B2E]" /> Central Security & Multi-App Audit Trail
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Super Admin Console • Live immutable ledger of administrative actions, API webhooks, and settlements across all 4 subsidiaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadLogs}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
          </Button>
          <Button size="sm" className="bg-slate-900 text-white hover:bg-[#6A1B2E] text-xs font-bold" onClick={handleExportAudit}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Audit (CSV)
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action, actor, IP, or ID..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Division Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {['All', 'Education', 'Trade', 'Rimi', 'Digital', 'HQ'].map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedDivision === div
                    ? 'bg-[#6A1B2E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {div}
              </button>
            ))}
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            {['All', 'Info', 'Success', 'Warning', 'Critical'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  selectedSeverity === sev
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Audit Log Table */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Event ID</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Action & Operation</th>
                <th className="py-3 px-4">Details / Metadata</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 text-[11px]">
                      {log.id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${log.divisionBadge}`}>
                        {log.division}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate font-medium">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.actor}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {log.ip}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border ${log.severityBadge}`}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-medium">
                      {log.timestamp}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold">
                    No matching audit activity logged in database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
