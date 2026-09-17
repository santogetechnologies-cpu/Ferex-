import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, FolderKanban, CheckSquare, DollarSign,
  ArrowUpRight, Megaphone, Clock, CheckCircle2,
  RefreshCw, Briefcase, Layers, ArrowRight, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import {
  getDigitalDashboardStats,
  getDigitalProjects,
  getDigitalTasks,
  type DigitalProjectRecord,
  type DigitalTaskRecord
} from '../../lib/api/digital';
import { useDigitalConfig } from '../../hooks/useDigitalConfig';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';

export const DigitalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useDigitalConfig();
  const { profile } = useAuth();
  const { isAdmin, isStaff } = useDigitalPermissions();

  const userName = profile?.full_name?.split(' ')[0] || '';
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();
  const roleTitle = isAdmin ? 'Digital Director' : 'Project Specialist';
  const displayName = userName ? `${greeting}, ${userName}` : `${greeting}, ${roleTitle}`;

  // Migration banner
  const [showMigrationBanner, setShowMigrationBanner] = useState(() => {
    return localStorage.getItem('ferex_digital_migrated_v2') !== 'true';
  });

  // Admin Data State
  const [stats, setStats] = useState({
    activeClientsCount: 0,
    activeProjectsCount: 0,
    totalProjectsCount: 0,
    totalPipelineValueStr: '₹0',
    totalCollectedStr: '₹0',
    pendingTasksCount: 0,
  });
  const [recentProjects, setRecentProjects] = useState<DigitalProjectRecord[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  // Staff Data State (Zero confidential financial or unassigned client leakage)
  const [myProjects, setMyProjects] = useState<DigitalProjectRecord[]>([]);
  const [myTasks, setMyTasks] = useState<DigitalTaskRecord[]>([]);

  const [loading, setLoading] = useState(true);

  const handleClearCache = () => {
    localStorage.removeItem('ferex_digital_clients');
    localStorage.removeItem('ferex_digital_projects');
    localStorage.removeItem('ferex_digital_tasks');
    localStorage.removeItem('ferex_digital_invoices');
    localStorage.setItem('ferex_digital_migrated_v2', 'true');
    setShowMigrationBanner(false);
    window.location.reload();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const [dashStats, projectsData, tasksData] = await Promise.all([
          getDigitalDashboardStats(),
          getDigitalProjects(),
          getDigitalTasks(),
        ]);
        setStats(dashStats);
        setRecentProjects(projectsData.slice(0, 4));
        setRecentTasks(tasksData.slice(0, 4));
      } else {
        // Staff Workspace: Strictly load only own assigned projects & tasks
        const staffEmail = profile?.email || '';
        const staffName = profile?.full_name || '';

        const [userProjects, allTasks] = await Promise.all([
          getDigitalProjects({
            staffEmail,
            staffName,
          }),
          getDigitalTasks(),
        ]);

        const assignedTasks = (allTasks || []).filter(
          t => t.assigned_to === staffName || t.assigned_to_email === staffEmail
        );

        setMyProjects(userProjects || []);
        setMyTasks(assignedTasks || []);
      }
    } finally {
      setLoading(false);
    }
  }, [isAdmin, profile]);

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

  // Staff calculations
  const myActiveProjectsCount = myProjects.filter(p => p.status !== 'Delivered' && p.status !== 'Closed').length;
  const myCompletedProjectsCount = myProjects.filter(p => p.status === 'Delivered' || p.status === 'Closed').length;
  const myOpenTasks = myTasks.filter(t => t.status !== 'Completed' && t.status !== 'Done');

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Migration Notice Banner */}
      {showMigrationBanner && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-cyan-500/5 to-transparent border border-cyan-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-5 h-5 text-cyan-600 shrink-0" />
            <div>
              <span className="font-black text-cyan-950">Database-Driven Agency Engine Active: </span>
              <span className="text-cyan-800 font-semibold">
                Clear browser demo cache to synchronize live database projects, deliverables, and invoices.
              </span>
            </div>
          </div>
          <button
            onClick={handleClearCache}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 text-white font-bold hover:bg-cyan-700 transition-colors shrink-0 cursor-pointer text-xs"
          >
            Clear Demo Cache
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950 text-white p-6 md:p-8 shadow-xl border border-cyan-800/30">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest bg-white/15 px-3 py-1 rounded-full border border-white/20 text-white">
                {isAdmin ? 'Executive Agency Dashboard' : 'My Engineering Workspace'}
              </span>
              <span className="text-[10px] font-extrabold text-cyan-300 bg-cyan-500/20 px-2.5 py-1 rounded-full border border-cyan-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Live Realtime Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {displayName}
            </h1>
            <p className="text-xs md:text-sm text-white/85 leading-relaxed font-semibold">
              {isAdmin
                ? 'High-performance digital agency operations, pipeline forecasting, client engagements, sprint velocity, and production deliverables.'
                : 'Your personal production queue. Review assigned project deliverables, sprint tasks, and upcoming milestones.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isAdmin ? (
              <>
                <button
                  onClick={() => navigate('/digital/projects')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  Create Client Project <ArrowUpRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/digital/deliverables')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
                >
                  Deliverables Vault
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate('/digital/projects')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  My Projects <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/digital/deliverables')}
                  className="h-10 px-5 rounded-xl text-xs font-black text-white bg-white/15 hover:bg-white/25 border border-white/30 transition-all shadow-xs cursor-pointer"
                >
                  Submit Deliverable
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ─── ROLE-SPLIT WORKSPACE ─── */}
      {isAdmin ? (
        /* ════════════════════ ADMIN VIEW ════════════════════ */
        <>
          {/* Admin KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Pipeline Project Value', value: stats.totalPipelineValueStr, sub: `${stats.totalProjectsCount} Total Projects`, icon: FolderKanban, color: 'text-blue-600 bg-blue-50 border-blue-100', badge: 'Live Pipeline', path: '/digital/projects' },
              { title: 'Invoices Collected', value: stats.totalCollectedStr, sub: 'Settled Client Billings', icon: DollarSign, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', badge: 'Verified', path: '/digital/invoices' },
              { title: 'Enterprise Clients', value: `${stats.activeClientsCount} Accounts`, sub: 'Active B2B Directory', icon: Users, color: 'text-[#58051E] bg-[#58051E]/10 border-[#58051E]/20', badge: 'Active Directory', path: '/digital/clients' },
              { title: 'Sprint Tasks', value: `${stats.pendingTasksCount} Open`, sub: 'Active Agency Queue', icon: CheckSquare, color: 'text-amber-600 bg-amber-50 border-amber-100', badge: 'In Queue', path: '/digital/tasks' },
            ].map((stat, idx) => (
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

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-6 border border-slate-200/70 shadow-xs text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Active Agency Deliverable Projects</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">Live project stages and milestone delivery</p>
                  </div>
                  <button onClick={() => navigate('/digital/projects')} className="text-xs font-bold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer">
                    View All <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {loading ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">Loading projects...</div>
                ) : recentProjects.length === 0 ? (
                  <div className="py-8 text-center text-xs font-semibold text-slate-400">
                    <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No active projects found.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentProjects.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-xs text-slate-900">{p.title}</div>
                          <span className="text-[10px] font-semibold text-slate-400">Client: {p.client_name} · Lead: {p.assigned_staff_name || 'Unassigned'}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-black text-slate-900">₹{Number(p.budget || 0).toLocaleString('en-IN')}</div>
                          <span className="text-[9px] font-extrabold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-6 border border-slate-200/70 shadow-xs space-y-4 text-left">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-cyan-600" /> Active Sprint Queue
                  </h3>
                  <button onClick={() => navigate('/digital/tasks')} className="text-[11px] font-bold text-cyan-700 hover:underline cursor-pointer">
                    Tasks View
                  </button>
                </div>
                <div className="space-y-3">
                  {recentTasks.slice(0, 4).map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black text-slate-900 line-clamp-1">{t.title}</div>
                        <span className="text-[10px] font-semibold text-slate-500">Assigned: {t.assigned_to}</span>
                      </div>
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0 ml-2">
                        {t.priority || 'Medium'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : (
        /* ════════════════════ STAFF VIEW ════════════════════ */
        /* Staff NEVER sees total revenue or complete client database */
        <>
          {/* Staff Personal Workspace KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card onClick={() => navigate('/digital/projects')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full">
                    Active Projects
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">My Active Projects</span>
                <span className="text-2xl font-black text-slate-900">{myActiveProjectsCount}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                In progress milestones
              </div>
            </Card>

            <Card onClick={() => navigate('/digital/tasks')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                    <CheckSquare className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Queue
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Tasks Due</span>
                <span className="text-2xl font-black text-slate-900">{myOpenTasks.length}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Action items awaiting completion
              </div>
            </Card>

            <Card onClick={() => navigate('/digital/deliverables')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Vault
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Artifacts</span>
                <span className="text-2xl font-black text-slate-900">
                  {myProjects.reduce((acc, p) => acc + (p.deliverables?.length || 0), 0)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Linked Figma, Drive & repos
              </div>
            </Card>

            <Card onClick={() => navigate('/digital/projects')} className="p-5 border border-slate-200/80 hover:shadow-md cursor-pointer flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Completed
                  </span>
                </div>
                <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">Shipped Projects</span>
                <span className="text-2xl font-black text-emerald-600">{myCompletedProjectsCount}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
                Successfully delivered
              </div>
            </Card>
          </div>

          {/* Staff Main Workspace Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Assigned Projects */}
            <Card className="p-6 border border-slate-200/70 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">My Assigned Projects</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Client deliverables and stage progression</p>
                </div>
                <button
                  onClick={() => navigate('/digital/projects')}
                  className="text-xs font-bold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myProjects.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  No active projects currently assigned to you.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myProjects.map(p => (
                    <div key={p.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{p.title}</div>
                        <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-2 mt-0.5">
                          <span>{p.service_category}</span>
                          <span>·</span>
                          <span>Deadline: {p.deadline || 'Ongoing'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* My Tasks Queue */}
            <Card className="p-6 border border-slate-200/70 shadow-xs text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">My Action Items</h3>
                  <p className="text-xs text-slate-400 font-semibold mt-0.5">Sprint tasks awaiting completion</p>
                </div>
                <button
                  onClick={() => navigate('/digital/tasks')}
                  className="text-xs font-bold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Tasks Queue <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myTasks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                  No sprint tasks assigned to you.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myTasks.map((t, idx) => (
                    <div key={idx} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-extrabold text-xs text-slate-900">{t.title}</div>
                        <div className="text-[10px] text-slate-400 font-semibold">
                          Due: {t.due_date || 'This Sprint'}
                        </div>
                      </div>
                      <span className="text-[9px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {t.priority || 'Medium'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
