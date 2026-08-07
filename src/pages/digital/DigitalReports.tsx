import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Printer, Filter, Calendar, CheckCircle2, Search, Clock, FileSpreadsheet, Send } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';

const recentReports = [
  { id: 'RPT-2026-08', title: 'August Executive Business Performance Digest', category: 'Executive', date: '2026-08-01', size: '2.4 MB', format: 'PDF', status: 'Generated', author: 'Ferex Director' },
  { id: 'RPT-2026-07', title: 'Q2 Client Delivery & Satisfaction Audit', category: 'Client Audit', date: '2026-07-31', size: '4.1 MB', format: 'PDF', status: 'Archived', author: 'Sneha Roy' },
  { id: 'RPT-2026-06', title: 'H1 Team Productivity & Billability Summary', category: 'Productivity', date: '2026-07-15', size: '1.8 MB', format: 'XLSX', status: 'Generated', author: 'Arun Patel' },
  { id: 'RPT-2026-05', title: 'Service Performance & Margins Analysis', category: 'Service SLA', date: '2026-07-01', size: '3.2 MB', format: 'PDF', status: 'Generated', author: 'Riya Thomas' },
];

const scheduledReports = [
  { title: 'Weekly Project Delivery & Velocity Update', frequency: 'Every Monday, 9:00 AM', recipients: 'executives@ferex.com', status: 'Active' },
  { title: 'Monthly Executive Financial Digest', frequency: '1st of every month', recipients: 'cfo@ferex.com, director@ferex.com', status: 'Active' },
  { title: 'Quarterly Client Retention & SLA Audit', frequency: 'End of Quarter', recipients: 'account-leads@ferex.com', status: 'Active' },
];

export const DigitalReports: React.FC = () => {
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('This Month');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filteredReports = recentReports.filter(r => {
    const matchS = r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchC = categoryFilter === 'All' || r.category === categoryFilter;
    return matchS && matchC;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Executive Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6A1B2E]" /> Executive Business Reporting Console
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">High-level operational digests, client performance audits, team billability summaries, and automated reporting schedules.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToast('Generating PDF Business Report...')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToast('Exporting Excel Master Digest...')}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export Excel
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold" onClick={() => showToast('Sending report to printer...')}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Report
          </Button>
        </div>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Executive Health Index', value: '96.4%', sub: 'Based on SLAs & Retainers', color: 'text-emerald-700 bg-emerald-50' },
          { label: 'Projects Completed (H2)', value: '42 Projects', sub: '98.2% On-Time Delivery', color: 'text-blue-700 bg-blue-50' },
          { label: 'Team Billability Rate', value: '88.5%', sub: 'Target: 85.0%', color: 'text-purple-700 bg-purple-50' },
          { label: 'Client Retention Score', value: '99.1%', sub: '38 Active Accounts', color: 'text-[#6A1B2E] bg-[#6A1B2E]/10' },
        ].map((stat, idx) => (
          <Card key={idx} className="p-4 border border-slate-200/70 shadow-xs flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">{stat.label}</span>
              <span className={`text-2xl font-black ${stat.color.split(' ')[0]}`}>{stat.value}</span>
            </div>
            <div className="text-[10px] font-semibold text-slate-500 mt-2 border-t border-slate-100 pt-1.5">{stat.sub}</div>
          </Card>
        ))}
      </div>

      {/* Report Filter Control Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search report title or ID..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option>This Month</option>
              <option>Last Month</option>
              <option>Q2 2026</option>
              <option>Year to Date</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#6A1B2E]" />
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option value="All">All Categories</option>
              <option value="Executive">Executive</option>
              <option value="Client Audit">Client Audit</option>
              <option value="Productivity">Productivity</option>
              <option value="Service SLA">Service SLA</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Executive Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Executive Digest Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-black text-slate-900">Executive Summary & Operational SLA Performance</h2>
              <span className="text-[10px] font-black uppercase text-[#6A1B2E] bg-[#6A1B2E]/10 px-2.5 py-0.5 rounded-full border border-[#6A1B2E]/20">Q3 Audit Active</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-black text-slate-900 uppercase">Monthly Business Report</div>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  Overall business performance across Web, Mobile, Marketing & SEO has grown 18.4% month-over-month with zero active project escalations.
                </p>
                <div className="text-[10px] font-extrabold text-[#6A1B2E] pt-1">38 Enterprise & SMB Accounts Active →</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="text-xs font-black text-slate-900 uppercase">Team Productivity & Capacity</div>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                  Engineers and designers logged 1,840 billable hours this month. Capacity utilization stands at 88.5% with 24 full-time team members.
                </p>
                <div className="text-[10px] font-extrabold text-emerald-700 pt-1">Zero Overtime Escalations →</div>
              </div>
            </div>

            {/* Service SLA Performance Breakdown */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Service Line SLA Compliance</h3>
              {[
                { name: 'Web Development SLA Compliance', pct: 98, color: 'bg-emerald-500' },
                { name: 'Mobile App Delivery Timelines', pct: 94, color: 'bg-blue-500' },
                { name: 'UI/UX Design Review Turnaround', pct: 96, color: 'bg-purple-500' },
                { name: 'Digital Marketing & Campaign Growth SLA', pct: 92, color: 'bg-amber-500' },
              ].map((s, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>{s.name}</span>
                    <span className="font-black text-slate-900">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Generated Reports Table */}
          <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">Recent Generated Reports</h3>
              <span className="text-xs font-bold text-slate-400">{filteredReports.length} Archives</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <th className="py-2.5 px-3">Report Title & ID</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Generated Date</th>
                    <th className="py-2.5 px-3">Size</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                  {filteredReports.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900">{r.title}</div>
                        <span className="text-[10px] text-slate-400 font-bold">{r.id} • Author: {r.author}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">{r.category}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{r.date}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{r.size}</td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => showToast(`Downloading ${r.title}...`)}
                          className="px-2.5 py-1 rounded-lg bg-[#6A1B2E]/10 text-[#6A1B2E] text-[10px] font-extrabold hover:bg-[#6A1B2E] hover:text-white transition-all inline-flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" /> {r.format}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* Scheduled Reports & Automation Panel */}
        <div className="space-y-6">
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#6A1B2E]" /> Scheduled Business Digests
              </h3>
              <button onClick={() => showToast('New report schedule created!')} className="text-[10px] font-bold text-[#6A1B2E] hover:underline">+ New Schedule</button>
            </div>
            <div className="space-y-3">
              {scheduledReports.map((s, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">{s.title}</span>
                    <span className="text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">{s.status}</span>
                  </div>
                  <p className="text-[10.5px] font-semibold text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{s.frequency}</p>
                  <p className="text-[10px] font-mono text-slate-400 truncate">Recipients: {s.recipients}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick PDF Export Builder */}
          <Card className="p-5 border border-slate-200/70 shadow-xs space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Custom Executive Report Builder</h3>
            <p className="text-xs font-semibold text-slate-500">Compile custom metrics into a branded presentation deck for stakeholder meetings.</p>
            <div className="space-y-2 pt-1">
              {['Full Q3 Agency Performance Deck', 'Client Retainer & SLA Audit', 'Team Billability & Resource Matrix'].map((deck, idx) => (
                <button
                  key={idx}
                  onClick={() => showToast(`Compiling ${deck}...`)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800 hover:border-[#6A1B2E]/40 hover:text-[#6A1B2E] hover:bg-[#6A1B2E]/5 transition-all text-left"
                >
                  <span className="truncate">{deck}</span>
                  <Send className="w-3.5 h-3.5 shrink-0 ml-2" />
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
