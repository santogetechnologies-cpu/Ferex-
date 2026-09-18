import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Send, CheckCircle2, Search, Eye, RefreshCw,
  Download, Clock, Check, Globe, GraduationCap,
  Snowflake, Monitor, X, Inbox, ArrowUpRight, AlertCircle
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { supabase } from '../../lib/supabase';
import { getLocalEmailLogs, type EmailLogEntry, logAutomatedEmail } from '../../lib/api/automatedEmails';
import { sendStudentEmail } from '../../lib/api/email';

export const CentralEmailLogs: React.FC = () => {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [filterDivision, setFilterDivision] = useState<'all' | 'education' | 'trade' | 'rimi' | 'digital'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<EmailLogEntry | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch from Supabase email_logs table
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);

      const localLogs = getLocalEmailLogs();
      let combined: EmailLogEntry[] = [];

      if (!error && data && Array.isArray(data) && data.length > 0) {
        const dbMapped: EmailLogEntry[] = data.map((d: any) => ({
          id: d.id || `EML-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
          division: d.division || 'education',
          provider: d.provider || 'Resend SMTP',
          sender_email: d.sender_email || 'notifications@ferexventures.com',
          sender_name: d.sender_name || 'Ferex Ventures Enterprise HQ',
          recipient_email: d.recipient_email || 'user@ferex.com',
          recipient_name: d.recipient_name || 'System Recipient',
          template_type: d.template_type || 'system_notification',
          subject: d.subject || 'Automated Enterprise Dispatch',
          body_html: d.body_html || '<p>Automated notification message body.</p>',
          status: d.status || 'Delivered',
          reference_id: d.reference_id,
          metadata: d.metadata || {},
          sent_at: d.sent_at || d.created_at || new Date().toISOString(),
        }));

        // Merge with local logs removing duplicates by id
        const map = new Map<string, EmailLogEntry>();
        dbMapped.forEach(l => map.set(l.id, l));
        localLogs.forEach(l => { if (!map.has(l.id)) map.set(l.id, l); });
        combined = Array.from(map.values());
      } else {
        combined = localLogs;
      }

      // Sort by sent_at desc
      combined.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
      setLogs(combined);
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch {
      setLogs(getLocalEmailLogs());
      setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
    const handleEmailEvent = () => loadLogs();
    window.addEventListener('ferex_automated_email_sent', handleEmailEvent);

    const channel = supabase
      .channel('realtime_central_email_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_logs' }, () => loadLogs())
      .subscribe();

    return () => {
      window.removeEventListener('ferex_automated_email_sent', handleEmailEvent);
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  const handleResend = async (log: EmailLogEntry) => {
    setResendingId(log.id);
    try {
      await sendStudentEmail({
        studentEmail: log.recipient_email,
        studentName: log.recipient_name,
        subject: `[RESEND] ${log.subject}`,
        htmlContent: log.body_html,
        templateType: `${log.template_type}_resend`,
        division: log.division,
        referenceId: log.reference_id,
        metadata: { ...log.metadata, resent_from: log.id },
      });
      await loadLogs();
      showToastMsg(`Email successfully re-dispatched to ${log.recipient_email}`);
    } catch {
      showToastMsg(`Re-dispatch failed. Check SMTP configuration.`);
    } finally {
      setResendingId(null);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      showToastMsg('No email records to export.');
      return;
    }
    const headers = ['Log ID', 'Timestamp', 'Recipient Email', 'Recipient Name', 'Subject', 'Division', 'Status', 'Provider', 'Template Type', 'Reference ID'];
    const rows = filteredLogs.map(l => [
      l.id,
      new Date(l.sent_at).toLocaleString(),
      `"${l.recipient_email}"`,
      `"${l.recipient_name || ''}"`,
      `"${l.subject.replace(/"/g, '""')}"`,
      l.division,
      l.status,
      l.provider || 'Resend',
      l.template_type,
      l.reference_id || '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Ferex_Email_Delivery_Logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastMsg('Exported Email Delivery Logs CSV');
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterDivision !== 'all' && log.division !== filterDivision) return false;
      if (statusFilter !== 'All' && log.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          log.recipient_name?.toLowerCase().includes(q) ||
          log.recipient_email?.toLowerCase().includes(q) ||
          log.subject?.toLowerCase().includes(q) ||
          log.reference_id?.toLowerCase().includes(q) ||
          log.template_type?.toLowerCase().includes(q) ||
          log.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [logs, filterDivision, statusFilter, searchQuery]);

  const stats = useMemo(() => ({
    total: logs.length,
    delivered: logs.filter(l => l.status === 'Delivered' || l.status === 'Sent').length,
    failed: logs.filter(l => l.status === 'Failed').length,
    education: logs.filter(l => l.division === 'education').length,
    trade: logs.filter(l => l.division === 'trade').length,
    rimi: logs.filter(l => l.division === 'rimi').length,
    digital: logs.filter(l => l.division === 'digital').length,
  }), [logs]);

  const getDivisionBadge = (div: string) => {
    switch (div) {
      case 'education':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200"><GraduationCap className="w-3 h-3" /> Education</span>;
      case 'trade':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200"><Globe className="w-3 h-3" /> Global Trade</span>;
      case 'rimi':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-700 border border-cyan-200"><Snowflake className="w-3 h-3" /> Rimi Frozen</span>;
      case 'digital':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200"><Monitor className="w-3 h-3" /> Ferex Digital</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">Central HQ</span>;
    }
  };

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast Alert */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#58051E]" /> Automated Email Delivery & Dispatch Logs
            </h1>
            <span className="text-[10px] font-black bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20 px-2.5 py-0.5 rounded-full">
              4-Portal Vault
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Complete delivery audit showing exact timestamps, recipient addresses, subject lines, and dispatch telemetry across all subsidiaries.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-[11px] font-bold text-slate-400 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl">
            Live Stream: <span className="text-slate-700 font-extrabold">{lastRefreshed || 'Active'}</span>
          </div>

          <Button
            size="sm"
            onClick={loadLogs}
            variant="outline"
            className="text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border-slate-200/80"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin text-[#58051E]' : ''}`} /> Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleExportCSV}
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold text-white shadow-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export Logs CSV
          </Button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Dispatches</span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">{stats.total}</span>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Across 4 Subsidiaries</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Delivered & Verified</span>
          <span className="text-xl font-black text-emerald-700 mt-0.5 block">{stats.delivered}</span>
          <span className="text-[10px] text-emerald-600 font-bold mt-1 block">
            {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 100}% Delivery Rate
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Education & Student Mails</span>
          <span className="text-xl font-black text-rose-700 mt-0.5 block">{stats.education}</span>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">Milestones & Offers</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Trade & Commercial Mails</span>
          <span className="text-xl font-black text-indigo-700 mt-0.5 block">{stats.trade + stats.rimi + stats.digital}</span>
          <span className="text-[10px] text-slate-400 font-medium mt-1 block">B2B, Cold Chain & Agency</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by recipient email, recipient name, subject, or reference ID..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#58051E]/40"
            />
          </div>

          {/* Division Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Portals' },
              { id: 'education', label: 'Education' },
              { id: 'trade', label: 'Global Trade' },
              { id: 'rimi', label: 'Rimi Frozen' },
              { id: 'digital', label: 'Ferex Digital' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterDivision(tab.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  filterDivision === tab.id
                    ? 'bg-[#58051E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400">Delivery Status:</span>
          {['All', 'Delivered', 'Sent', 'Failed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </Card>

      {/* Email Logs Table */}
      <Card className="border border-slate-200/80 shadow-xs overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">Exact Timestamp</th>
                <th className="py-3 px-4">Division</th>
                <th className="py-3 px-4">Recipient (To Email)</th>
                <th className="py-3 px-4">Subject Line</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Template / Rail</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#58051E]" />
                    Loading email dispatch records...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                    No automated email records found.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      <div className="font-bold text-slate-800">{new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                      <div className="text-[9.5px] text-slate-400">{new Date(log.sent_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getDivisionBadge(log.division)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 text-[11px]">{log.recipient_email}</div>
                      <div className="text-[9.5px] font-semibold text-slate-400">{log.recipient_name}</div>
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <p className="font-bold text-slate-900 truncate">{log.subject}</p>
                      {log.reference_id && (
                        <span className="text-[9.5px] font-mono text-[#58051E] bg-[#58051E]/5 px-1.5 py-0.2 rounded border border-[#58051E]/10">
                          Ref: {log.reference_id}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        log.status === 'Delivered'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.status === 'Sent'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        <Check className="w-2.5 h-2.5" /> {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {log.template_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Preview HTML Email"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResend(log)}
                          disabled={resendingId === log.id}
                          className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-[#58051E]/10 rounded-lg transition-colors cursor-pointer"
                          title="Re-send Email"
                        >
                          <Send className={`w-3.5 h-3.5 ${resendingId === log.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* HTML Email Modal Preview */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200/80 rounded-2xl shadow-2xl max-w-2xl w-full p-6 text-left space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedLog.subject}</h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    To: <strong className="text-slate-800">{selectedLog.recipient_name}</strong> ({selectedLog.recipient_email})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10.5px]">
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 font-bold block">Timestamp</span>
                  <span className="font-mono text-slate-900 font-bold">{new Date(selectedLog.sent_at).toLocaleString()}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 font-bold block">Division</span>
                  <span className="font-bold text-slate-900 uppercase">{selectedLog.division}</span>
                </div>
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-slate-400 font-bold block">Delivery Status</span>
                  <span className="font-bold text-emerald-700">{selectedLog.status}</span>
                </div>
              </div>

              {/* Rendered HTML Container */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 overflow-y-auto max-h-64 text-slate-800 text-xs">
                <div dangerouslySetInnerHTML={{ __html: selectedLog.body_html }} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResend(selectedLog)}
                  disabled={resendingId === selectedLog.id}
                  className="text-xs font-bold text-slate-700 bg-white"
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" /> Re-dispatch Now
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedLog(null)}
                  className="bg-[#58051E] text-white text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
