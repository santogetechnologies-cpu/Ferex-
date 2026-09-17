import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, DollarSign, FolderKanban, CheckSquare,
  Users, Layers, ArrowUpRight, Calendar, PieChart, Sparkles, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';
import { supabase } from '../../lib/supabase';
import {
  getDigitalProjects,
  getDigitalClients,
  getDigitalInvoices,
  getDigitalTasks
} from '../../lib/api/digital';

export const DigitalAnalytics: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState<'All' | 'YTD' | 'Q3'>('All');

  const loadAnalyticsData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [pList, cList, iList, tList] = await Promise.all([
        getDigitalProjects(),
        getDigitalClients(),
        getDigitalInvoices(),
        getDigitalTasks()
      ]);

      setProjects(pList || []);
      setClients(cList || []);
      setInvoices(iList || []);
      setTasks(tList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load live analytics from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();

    const channel = supabase
      .channel('realtime_digital_analytics_hub')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadAnalyticsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => loadAnalyticsData())
      .subscribe();

    const handleLocalChange = () => loadAnalyticsData();
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);
    window.addEventListener('ferex_digital_invoices_change', handleLocalChange);
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
      window.removeEventListener('ferex_digital_invoices_change', handleLocalChange);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
    };
  }, []);

  // 1. Revenue calculations from live Supabase projects and invoices
  const totalContractValue = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const totalInvoicedAmount = invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalPaidRevenue = invoices
    .filter(i => i.status === 'Paid')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
  const totalPendingInvoices = invoices
    .filter(i => i.status !== 'Paid' && i.status !== 'Cancelled')
    .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  // 2. Project Stage Breakdown
  const STAGES = ['Briefing', 'In Progress', 'Review', 'Revisions', 'Delivered', 'Closed'];
  const stageCounts = STAGES.map(st => ({
    stage: st,
    count: projects.filter(p => p.status === st).length,
    percentage: projects.length > 0 ? Math.round((projects.filter(p => p.status === st).length / projects.length) * 100) : 0
  }));

  // 3. Category Breakdown
  const categories = [
    'Web & App Development',
    'UI/UX Design',
    'Digital Marketing & Advertising',
    'SEO & Performance PR',
    'Branding & Visual Identity'
  ];

  const categoryStats = categories.map(cat => {
    const matching = projects.filter(p => (p.service_category || '').toLowerCase().includes(cat.toLowerCase().slice(0, 5)));
    const catRevenue = matching.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    return {
      category: cat,
      projectCount: matching.length,
      revenue: catRevenue,
      pct: totalContractValue > 0 ? Math.round((catRevenue / totalContractValue) * 100) : 0
    };
  });

  // 4. Client Portfolio (Internal vs External)
  const internalCount = clients.filter(c => c.client_type === 'Internal').length;
  const externalCount = clients.filter(c => c.client_type !== 'Internal').length;
  const internalRev = projects.filter(p => p.client_type === 'Internal').reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
  const externalRev = projects.filter(p => p.client_type !== 'Internal').reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  // 5. Task & Velocity Stats
  const completedTasks = tasks.filter(t => t.status === 'Done').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-6 relative text-left pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Executive Analytics & Performance Hub
            </h1>
            <Badge variant="brand">Live Database Telemetry</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Realtime financial revenue, stage delivery velocity, client distribution, and task metrics directly from Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {['All', 'YTD', 'Q3'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tf === 'All' ? 'All Time' : tf}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">Live</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Pipeline Value</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            ₹{totalContractValue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across {projects.length} active client projects</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">Settled</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Paid Revenue Collected</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            ₹{totalPaidRevenue.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">₹{totalPendingInvoices.toLocaleString('en-IN')} outstanding</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-700">Projects</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Active Deliveries</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            {projects.filter(p => p.status !== 'Closed').length} / {projects.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{projects.filter(p => p.status === 'Delivered').length} delivered sign-offs</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-700">
              {taskCompletionRate}%
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Task Velocity</p>
          <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">
            {completedTasks} / {tasks.length} Done
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{inProgressTasks} tasks currently in progress</p>
        </div>
      </div>

      {/* Charts & Delivery Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Project Lifecycle Distribution */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Delivery Stage Funnel</h3>
              <p className="text-xs text-slate-400 mt-0.5">Live distribution of projects across the 6 execution stages</p>
            </div>
            <Badge variant="brand">{projects.length} Total</Badge>
          </div>

          <div className="space-y-3.5">
            {stageCounts.map((st) => (
              <div key={st.stage}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">{st.stage}</span>
                  <span className="font-bold text-slate-900">
                    {st.count} projects <span className="text-slate-400 font-normal">({st.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#58051E] rounded-full transition-all"
                    style={{ width: `${st.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Service Category Revenue Contribution */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Revenue by Service Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Budget allocation and project counts by digital capability</p>
            </div>
            <Badge variant="brand">₹{totalContractValue.toLocaleString('en-IN')}</Badge>
          </div>

          <div className="space-y-3.5">
            {categoryStats.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700 truncate max-w-[200px]">{cat.category}</span>
                  <span className="font-bold text-slate-900">
                    ₹{cat.revenue.toLocaleString('en-IN')} <span className="text-slate-400 font-normal">({cat.pct}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all"
                    style={{ width: `${cat.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Client Portfolio & Internal vs External Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Client Portfolio Distribution</h3>
              <p className="text-xs text-slate-400 mt-0.5">Internal FEREX Subsidiaries vs External Enterprise Clients</p>
            </div>
            <Users className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Internal Subsidiaries</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{internalCount} Divisions</p>
              <p className="text-xs font-semibold text-[#58051E] mt-0.5">₹{internalRev.toLocaleString('en-IN')} contracted</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">External Enterprise</span>
              <p className="text-lg font-bold text-slate-900 mt-1">{externalCount} Accounts</p>
              <p className="text-xs font-semibold text-emerald-700 mt-0.5">₹{externalRev.toLocaleString('en-IN')} contracted</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Invoicing & Collections Health</h3>
              <p className="text-xs text-slate-400 mt-0.5">Settlement velocity across active client retainers</p>
            </div>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] font-bold text-emerald-700 block uppercase">Paid / Settled</span>
              <p className="text-sm font-bold text-emerald-900 mt-1">
                ₹{totalPaidRevenue.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {invoices.filter(i => i.status === 'Paid').length} invoices
              </span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] font-bold text-amber-700 block uppercase">Pending / Sent</span>
              <p className="text-sm font-bold text-amber-900 mt-1">
                ₹{invoices.filter(i => i.status === 'Sent').reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-amber-600 font-semibold">
                {invoices.filter(i => i.status === 'Sent').length} invoices
              </span>
            </div>

            <div className="p-3 rounded-xl bg-rose-50 border border-rose-100">
              <span className="text-[10px] font-bold text-rose-700 block uppercase">Overdue</span>
              <p className="text-sm font-bold text-rose-900 mt-1">
                ₹{invoices.filter(i => i.status === 'Overdue').reduce((sum, i) => sum + (Number(i.amount) || 0), 0).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-rose-600 font-semibold">
                {invoices.filter(i => i.status === 'Overdue').length} invoices
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
