import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FolderKanban, CheckSquare, TrendingUp, DollarSign,
  ArrowUpRight, Clock, Star, Zap, Bell, Calendar
} from 'lucide-react';
import { Card } from '../../components/Card';
import { getDigitalDashboardStats, getDigitalProjects, getDigitalTasks, getDigitalInvoices } from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';

export const DigitalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeClientsCount: 0,
    activeProjectsCount: 0,
    totalProjectsCount: 0,
    totalPipelineValueStr: '₹0',
    totalCollectedStr: '₹0',
    pendingTasksCount: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashStats, projectsData, tasksData] = await Promise.all([
        getDigitalDashboardStats(),
        getDigitalProjects(),
        getDigitalTasks(),
      ]);
      setStats(dashStats);
      setRecentProjects(projectsData.slice(0, 4));
      setRecentTasks(tasksData.slice(0, 4));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_clients' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_invoices' }, () => loadData())
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_clients_change', handleLocalChange);
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);
    window.addEventListener('ferex_digital_invoices_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_clients_change', handleLocalChange);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_digital_invoices_change', handleLocalChange);
    };
  }, [loadData]);

  const kpis = [
    { title: 'Pipeline Project Value', value: stats.totalPipelineValueStr, sub: `${stats.totalProjectsCount} Total Projects`, icon: FolderKanban, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: 'Live Pipeline', path: '/digital/projects' },
    { title: 'Invoices Collected', value: stats.totalCollectedStr, sub: 'Settled Payments', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'Verified', path: '/digital/invoices' },
    { title: 'Enterprise Clients', value: `${stats.activeClientsCount} Accounts`, sub: 'Active B2B Directory', icon: Users, color: 'text-[#6A1B2E] bg-[#6A1B2E]/10 border-[#6A1B2E]/20', badge: 'Active Directory', path: '/digital/clients' },
    { title: 'Sprint Tasks', value: `${stats.pendingTasksCount} Open`, sub: 'Realtime Pipeline', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 border-amber-100', badge: 'In Queue', path: '/digital/tasks' },
  ];

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#6A1B2E] via-[#521221] to-[#3B0B16] text-white p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white">
                Ferex Digital Agency ERP
              </span>
              <span className="text-[10px] font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Supabase Realtime Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Good Morning, Digital Director
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              Managing full-stack web applications, mobile platforms, UI/UX design systems, performance marketing, and client deliverables.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/digital/projects')}
              className="h-10 px-5 rounded-xl text-xs font-black text-[#6A1B2E] bg-white hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 cursor-pointer"
            >
              View All Projects <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate('/digital/leads')}
              className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all cursor-pointer"
            >
              Manage Lead Pipeline
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((stat, idx) => (
          <Card key={idx} onClick={() => navigate(stat.path)} className="p-5 border border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${stat.color} group-hover:scale-105 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                  {stat.badge}
                </span>
              </div>
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">{stat.title}</span>
              <span className="text-2xl font-black text-slate-900 leading-none">{stat.value}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500 truncate">
              {stat.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Projects */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
              <div>
                <h3 className="text-sm font-black text-slate-900">Active Engineering & Design Sprints</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Live project completion telemetry and client deliverables</p>
              </div>
              <button onClick={() => navigate('/digital/projects')} className="text-xs font-bold text-[#6A1B2E] hover:underline flex items-center gap-1 cursor-pointer">
                View All Projects <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading active projects...</div>
            ) : recentProjects.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">No projects registered yet. Create your first project via the Projects module.</div>
            ) : (
              <div className="space-y-4">
                {recentProjects.map((p) => (
                  <div key={p.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{p.title}</h4>
                        <span className="text-[10px] font-bold text-slate-500">{p.client?.company_name || 'Enterprise Client'} · {p.service_category}</span>
                      </div>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs pt-1">
                      <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-[#6A1B2E] h-full rounded-full transition-all duration-500" style={{ width: `${p.progress || 0}%` }} />
                      </div>
                      <span className="text-[11px] font-black text-slate-800 shrink-0">{p.progress || 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Active Tasks */}
        <div className="space-y-6">
          <Card className="p-6 text-left border border-slate-200/70 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-[#6A1B2E]" /> Engineering Tasks
              </h3>
              <button onClick={() => navigate('/digital/tasks')} className="text-[11px] font-bold text-[#6A1B2E] hover:underline cursor-pointer">
                View All
              </button>
            </div>

            {loading ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading tasks...</div>
            ) : recentTasks.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No open tasks recorded.</div>
            ) : (
              <div className="space-y-2.5">
                {recentTasks.map((t) => (
                  <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-black text-slate-900">{t.title}</div>
                      <span className="text-[10px] text-slate-500 font-semibold">{t.project?.title || 'Project Task'}</span>
                    </div>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
