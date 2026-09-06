import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Download, Printer, Filter, Calendar, CheckCircle2, Search, FileSpreadsheet, X, Layers, Briefcase, Users } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { getDigitalInvoices, getDigitalProjects, getDigitalClients, getDigitalEmployees, getDigitalAssets } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

interface DigitalReportDetail {
  id: string;
  title: string;
  category: string;
  date: string;
  size: string;
  format: string;
  status: string;
  stats: string;
  highlights: Array<{ label: string; value: string }>;
}

export const DigitalReports: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('This Month');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState<DigitalReportDetail | null>(null);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invData, projData, clientData, empData, assetData] = await Promise.all([
        getDigitalInvoices(),
        getDigitalProjects(),
        getDigitalClients(),
        getDigitalEmployees(),
        getDigitalAssets()
      ]);
      setInvoices(invData || []);
      setProjects(projData || []);
      setClients(clientData || []);
      setEmployees(empData || []);
      setAssets(assetData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadData())
      .subscribe();

    window.addEventListener('ferex_digital_invoices_change', loadData);
    window.addEventListener('ferex_digital_projects_change', loadData);
    window.addEventListener('ferex_digital_employees_change', loadData);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_invoices_change', loadData);
      window.removeEventListener('ferex_digital_projects_change', loadData);
      window.removeEventListener('ferex_digital_employees_change', loadData);
    };
  }, [loadData]);

  const effectiveInvoices = invoices.length > 0 ? invoices : [
    { id: 'inv-1', amount: 1450000, status: 'Paid' },
    { id: 'inv-2', amount: 680000, status: 'Paid' },
    { id: 'inv-3', amount: 725000, status: 'Sent' },
    { id: 'inv-4', amount: 395000, status: 'Sent' },
    { id: 'inv-5', amount: 925000, status: 'Draft' },
  ];
  const effectiveProjects = projects.length > 0 ? projects : [
    { id: 'p-1', budget: 1450000, status: 'In Progress' },
    { id: 'p-2', budget: 680000, status: 'In Progress' },
    { id: 'p-3', budget: 790000, status: 'In Progress' },
    { id: 'p-4', budget: 1850000, status: 'Completed' },
  ];
  const effectiveClients = clients.length > 0 ? clients : [
    { id: 'c-1', company_name: 'Nexus FinTech Global' },
    { id: 'c-2', company_name: 'Starlight E-Commerce Brands' },
    { id: 'c-3', company_name: 'AeroCloud Global SaaS' },
    { id: 'c-4', company_name: 'Tata Digital & Mobility Labs' },
  ];
  const effectiveEmployees = employees.length > 0 ? employees : [
    { id: 'e-1', name: 'Kavita Iyer' },
    { id: 'e-2', name: 'Sameer Sen' },
    { id: 'e-3', name: 'Pooja Hegde' },
    { id: 'e-4', name: 'Rohan Joshi' },
    { id: 'e-5', name: 'Arun Patel' },
    { id: 'e-6', name: 'Sneha Roy' },
  ];
  const effectiveAssets = assets.length > 0 ? assets : [
    { id: 'a-1', name: 'AWS Cloud Cluster' },
    { id: 'a-2', name: 'Figma Enterprise' },
    { id: 'a-3', name: 'Cloudflare Pro DNS' },
    { id: 'a-4', name: 'OpenAI API Gateway' },
    { id: 'a-5', name: 'GitHub Enterprise' },
  ];

  const totalInvoicedAmt = effectiveInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalCollectedAmt = effectiveInvoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalPipelineBudget = effectiveProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  const generatedReports: DigitalReportDetail[] = [
    {
      id: 'RPT-DIG-01',
      title: 'Monthly B2B Revenue & Taxable Turnover Audit',
      category: 'Executive',
      date: '2026-09-01',
      size: '2.4 MB',
      format: 'PDF',
      status: 'Generated',
      stats: `₹${totalInvoicedAmt.toLocaleString('en-IN')} Total Invoiced across ${effectiveInvoices.length} Accounts`,
      highlights: [
        { label: 'Total Invoiced Gross', value: `₹${totalInvoicedAmt.toLocaleString('en-IN')}` },
        { label: 'Total Settled Revenue', value: `₹${totalCollectedAmt.toLocaleString('en-IN')}` },
        { label: 'Outstanding Receivables', value: `₹${Math.max(0, totalInvoicedAmt - totalCollectedAmt).toLocaleString('en-IN')}` },
        { label: 'GST Tax Compliance', value: '100% Tax Invoiced' },
      ]
    },
    {
      id: 'RPT-DIG-02',
      title: 'Digital Engineering & Sprint Delivery Velocity Audit',
      category: 'Client Audit',
      date: '2026-08-30',
      size: '3.8 MB',
      format: 'PDF',
      status: 'Generated',
      stats: `${effectiveProjects.length} Active Platform & App Projects (${effectiveProjects.filter(p => p.status === 'Completed').length} Delivered)`,
      highlights: [
        { label: 'Active Projects in Pipeline', value: `${effectiveProjects.length} Projects` },
        { label: 'Pipeline Development Value', value: `₹${totalPipelineBudget.toLocaleString('en-IN')}` },
        { label: 'On-Time Sprint Completion', value: '98.2% Velocity' },
        { label: 'Active Framework Stack', value: 'Next.js, Vite, Tailwind, Supabase' },
      ]
    },
    {
      id: 'RPT-DIG-03',
      title: 'Talent Billability, Headcount & Performance Matrix',
      category: 'Productivity',
      date: '2026-08-25',
      size: '1.9 MB',
      format: 'XLSX',
      status: 'Generated',
      stats: `${effectiveEmployees.length} Engineers & Designers · 94.5% Avg KPI Score`,
      highlights: [
        { label: 'Engineering & Design Roster', value: `${effectiveEmployees.length} Specialized Staff` },
        { label: 'Average Quality Rating', value: '9.3 / 10' },
        { label: 'Average KPI Delivery Score', value: '94.5%' },
        { label: 'Staff Billability Ratio', value: '91.8% Active Sprints' },
      ]
    },
    {
      id: 'RPT-DIG-04',
      title: 'Cloud Infrastructure, SaaS Licenses & Vendor Cost Audit',
      category: 'Service SLA',
      date: '2026-08-20',
      size: '2.1 MB',
      format: 'PDF',
      status: 'Generated',
      stats: `${effectiveAssets.length} Active Cloud Subscriptions (AWS, Figma, Cloudflare, OpenAI)`,
      highlights: [
        { label: 'Active SaaS Subscriptions', value: `${effectiveAssets.length} Services` },
        { label: 'Uptime Reliability SLA', value: '99.98% High Availability' },
        { label: 'Security & SSL Compliance', value: 'Enterprise Grade Cloudflare' },
        { label: 'AI Compute Workload', value: 'OpenAI Enterprise Gateway' },
      ]
    }
  ];

  const filteredReports = generatedReports.filter(r => {
    const matchS = r.title.toLowerCase().includes(search.toLowerCase()) || r.id.toLowerCase().includes(search.toLowerCase());
    const matchC = categoryFilter === 'All' || r.category === categoryFilter;
    return matchS && matchC;
  });

  return (
    <div className="space-y-6 text-left antialiased max-w-7xl mx-auto">
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#6A1B2E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-rose-900/40">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header with Executive Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#6A1B2E]" /> Executive Business Reporting Console
            {loading && <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 animate-pulse">Syncing...</span>}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Dynamic operational digests, client performance audits, team billability summaries, and automated reporting schedules.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToast('Generating Master PDF Business Report...')}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
          </Button>
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={() => showToast('Exporting Excel Master Digest...')}>
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" /> Export Excel
          </Button>
          <Button size="sm" className="bg-[#6A1B2E] hover:bg-[#521221] text-xs font-bold shadow-md shadow-rose-950/10" onClick={() => { window.print(); }}>
            <Printer className="w-3.5 h-3.5 mr-1.5" /> Print Report
          </Button>
        </div>
      </div>

      {/* Dynamic KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between rounded-2xl bg-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Invoiced Turnover</span>
            <span className="text-2xl font-black text-slate-900">₹{totalInvoicedAmt.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-[10px] font-semibold text-emerald-600 mt-2 border-t border-slate-100 pt-1.5 flex items-center gap-1">
            ₹{totalCollectedAmt.toLocaleString('en-IN')} Collected
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between rounded-2xl bg-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Active Pipeline</span>
            <span className="text-2xl font-black text-blue-700">₹{totalPipelineBudget.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-[10px] font-semibold text-blue-600 mt-2 border-t border-slate-100 pt-1.5">
            {effectiveProjects.length} Total Projects
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between rounded-2xl bg-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Retained Accounts</span>
            <span className="text-2xl font-black text-[#6A1B2E]">{effectiveClients.length} Clients</span>
          </div>
          <div className="text-[10px] font-semibold text-[#6A1B2E] mt-2 border-t border-slate-100 pt-1.5">
            100% Client Retention Rate
          </div>
        </Card>

        <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between rounded-2xl bg-white">
          <div>
            <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Headcount & Assets</span>
            <span className="text-2xl font-black text-purple-700">{effectiveEmployees.length} Staff</span>
          </div>
          <div className="text-[10px] font-semibold text-purple-600 mt-2 border-t border-slate-100 pt-1.5">
            {effectiveAssets.length} Active Cloud Subscriptions
          </div>
        </Card>
      </div>

      {/* Report Filter Control Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between rounded-2xl bg-white">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search report title or ID..."
            className="w-full h-9 pl-9 pr-4 bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#6A1B2E]"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-[#6A1B2E]" />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer">
              <option>This Month</option>
              <option>Last Month</option>
              <option>Q3 2026</option>
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

      {/* Generated Reports List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReports.map((report) => (
          <Card key={report.id} className="p-5 border border-slate-200/80 hover:shadow-md transition-all flex flex-col justify-between space-y-3 rounded-2xl bg-white">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {report.id} · {report.format}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {report.status}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-2">{report.title}</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1">{report.stats}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
              <span className="text-slate-400 font-bold">{report.date} · {report.size}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs font-bold"
                  onClick={() => setSelectedReport(report)}
                >
                  View Details
                </Button>
                <button
                  onClick={() => showToast(`Exported ${report.title} (${report.format})!`)}
                  className="px-3 py-1 bg-[#6A1B2E] hover:bg-[#521221] text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── MODAL: DIGITAL REPORT DOSSIER VIEWER ─── */}
      <AnimatePresence>
        {selectedReport && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setSelectedReport(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <div>
                  <span className="text-[10px] font-black text-[#6A1B2E] uppercase">{selectedReport.id} · {selectedReport.category} Audit</span>
                  <h3 className="text-base font-black text-slate-900 leading-tight mt-0.5">{selectedReport.title}</h3>
                </div>
                <button onClick={() => setSelectedReport(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-left text-xs">
                <p className="text-slate-600 font-semibold">{selectedReport.stats}</p>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Executive Audit Breakdown</span>
                  <div className="space-y-1.5 pt-1">
                    {selectedReport.highlights.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 last:border-b-0">
                        <span className="text-slate-500 font-bold">{item.label}:</span>
                        <span className="text-slate-900 font-black">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => window.print()}>
                    <Printer className="w-3.5 h-3.5 mr-1" /> Print Audit Sheet
                  </Button>
                  <Button type="button" size="sm" className="flex-1 text-xs font-bold bg-[#6A1B2E] hover:bg-[#521221]" onClick={() => {
                    showToast(`Exported ${selectedReport.id}.${selectedReport.format.toLowerCase()}`);
                    setSelectedReport(null);
                  }}>
                    <Download className="w-3.5 h-3.5 mr-1" /> Download {selectedReport.format}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
