import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, Send, CheckCircle2, Search, Eye, RefreshCw, 
  Download, Clock, Check, Globe, GraduationCap, 
  Snowflake, Monitor, X, Inbox
} from 'lucide-react';
import { getLocalEmailLogs, type EmailLogEntry, logAutomatedEmail } from '../../lib/api/automatedEmails';

export const CentralEmailLogs: React.FC = () => {
  const [logs, setLogs] = useState<EmailLogEntry[]>([]);
  const [filterDivision, setFilterDivision] = useState<'all' | 'education' | 'trade' | 'rimi' | 'digital'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<EmailLogEntry | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  const loadLogs = () => {
    const data = getLocalEmailLogs();
    setLogs(data);
  };

  useEffect(() => {
    loadLogs();
    const handleEmailEvent = () => loadLogs();
    window.addEventListener('ferex_automated_email_sent', handleEmailEvent);
    return () => window.removeEventListener('ferex_automated_email_sent', handleEmailEvent);
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterDivision !== 'all' && log.division !== filterDivision) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.recipient_name?.toLowerCase().includes(q) ||
        log.recipient_email?.toLowerCase().includes(q) ||
        log.subject?.toLowerCase().includes(q) ||
        log.reference_id?.toLowerCase().includes(q) ||
        log.template_type?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: logs.length,
    education: logs.filter(l => l.division === 'education').length,
    trade: logs.filter(l => l.division === 'trade').length,
    rimi: logs.filter(l => l.division === 'rimi').length,
    digital: logs.filter(l => l.division === 'digital').length,
  };

  const handleResend = async (log: EmailLogEntry) => {
    setResendingId(log.id);
    try {
      await logAutomatedEmail({
        division: log.division,
        recipient_email: log.recipient_email,
        recipient_name: log.recipient_name,
        template_type: `${log.template_type}_resend`,
        subject: `[RESEND] ${log.subject}`,
        body_html: log.body_html,
        reference_id: log.reference_id,
        metadata: { ...log.metadata, resent_from: log.id },
      });
      loadLogs();
      setResendSuccess(log.id);
      setTimeout(() => setResendSuccess(null), 3000);
    } finally {
      setResendingId(null);
    }
  };

  const exportCSV = () => {
    const headers = ['ID', 'Division', 'Recipient Name', 'Recipient Email', 'Subject', 'Status', 'Reference ID', 'Sent At'];
    const rows = filteredLogs.map(l => [
      l.id,
      l.division,
      `"${l.recipient_name || ''}"`,
      l.recipient_email,
      `"${l.subject.replace(/"/g, '""')}"`,
      l.status,
      l.reference_id || '',
      l.sent_at
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ferex_automated_email_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{div}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-black tracking-widest text-[#6A1B2E] uppercase">
            <Mail className="w-4 h-4" /> Cross-Subsidiary Communications
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Automated Email Dispatch Vault</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail of all transactional emails, stage confirmations, trade notices, cold-chain telemetry, and digital milestone alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="#/central/email-settings"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-[#6A1B2E] bg-[#6A1B2E]/10 hover:bg-[#6A1B2E]/15 border border-[#6A1B2E]/20 rounded-xl transition-colors cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" /> Configure Providers & SMTP
          </a>
          <button
            onClick={loadLogs}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Vault
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-[#6A1B2E] hover:bg-[#581626] rounded-xl shadow-md shadow-[#6A1B2E]/20 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Audit Log (.CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Dispatches</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Delivery rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-xs">
          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Education Journey</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.education}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Stage & Visa updates</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-xs">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Global Trade</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.trade}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">BL & LC alerts</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-cyan-100 shadow-xs">
          <p className="text-[10px] font-bold text-cyan-600 uppercase tracking-wider">Rimi Frozen</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.rimi}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Reefer temp & invoice</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-xs">
          <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ferex Digital</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{stats.digital}</p>
          <p className="text-[10px] text-slate-400 font-semibold mt-1">Milestone delivery</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Division Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto p-1 bg-slate-100 rounded-xl">
          {[
            { id: 'all', label: 'All Dispatches' },
            { id: 'education', label: 'Ferex Education' },
            { id: 'trade', label: 'Global Trade' },
            { id: 'rimi', label: 'Rimi Frozen' },
            { id: 'digital', label: 'Ferex Digital' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterDivision(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all whitespace-nowrap cursor-pointer ${
                filterDivision === tab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, recipient, subject, ID..."
            className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#6A1B2E] transition-all"
          />
        </div>
      </div>

      {/* Dispatches List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <Inbox className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No email logs found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Automated emails will appear here when steps are confirmed in Education, Global Trade consignments change stage, Rimi sales dispatch, or Digital milestone updates are triggered.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-400 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Dispatch ID & Time</th>
                  <th className="py-3 px-4">Division & Gateway</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Subject & Reference</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      <div>{log.id}</div>
                      <div className="text-[10px] text-slate-400 font-sans font-normal flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(log.sent_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1">
                        {getDivisionBadge(log.division)}
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase">
                          Via: {log.provider || 'Resend'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{log.recipient_name || 'Client'}</div>
                      <div className="text-[11px] text-slate-500 font-medium">{log.recipient_email}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-800 truncate" title={log.subject}>
                        {log.subject}
                      </div>
                      {log.reference_id && (
                        <div className="text-[10px] text-[#6A1B2E] font-black font-mono mt-0.5">
                          Ref: #{log.reference_id}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check className="w-3 h-3" /> Delivered
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 text-slate-600 hover:text-[#6A1B2E] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Preview Email HTML Body"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleResend(log)}
                          disabled={resendingId === log.id}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-extrabold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          title="Resend email to recipient"
                        >
                          {resendingId === log.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : resendSuccess === log.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>{resendSuccess === log.id ? 'Resent' : 'Resend'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Email Body Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#6A1B2E]" />
                  <span className="text-xs font-black text-slate-900 uppercase">Email Dispatch Inspector</span>
                  {getDivisionBadge(selectedLog.division)}
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 border-b border-slate-100 space-y-2 bg-white">
                <div className="text-xs font-bold text-slate-500">
                  <span className="text-slate-400 uppercase font-black text-[10px] w-16 inline-block">Subject:</span>
                  <span className="text-slate-900 font-extrabold">{selectedLog.subject}</span>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  <span className="text-slate-400 uppercase font-black text-[10px] w-16 inline-block">To:</span>
                  <span className="text-slate-800">{selectedLog.recipient_name} ({selectedLog.recipient_email})</span>
                </div>
                <div className="text-xs font-bold text-slate-500">
                  <span className="text-slate-400 uppercase font-black text-[10px] w-16 inline-block">Sent:</span>
                  <span className="text-slate-600 font-mono">{new Date(selectedLog.sent_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="p-6 overflow-y-auto bg-slate-50/50 flex-1">
                <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedLog.body_html }} />
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="text-[11px] font-mono text-slate-400">
                  Log ID: {selectedLog.id}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResend(selectedLog)}
                    disabled={resendingId === selectedLog.id}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-white bg-[#6A1B2E] hover:bg-[#581626] rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Resend Now
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
