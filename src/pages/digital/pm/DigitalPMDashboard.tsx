import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban, CheckSquare, Headphones, Layers, Target,
  FileText, ArrowUpRight, ArrowRight, CheckCircle2, Clock,
  AlertCircle, Sparkles, Plus, Users
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { supabase } from '../../../lib/supabase';
import {
  getAssignedDigitalProjects,
  getAssignedDigitalTasks,
  getAssignedDigitalTickets,
  getAssignedDigitalMilestones,
  getAssignedDigitalSprints,
  updateDigitalTaskStatusDirect,
  type DigitalPMTask
} from '../../../lib/api/digitalPm';

export const DigitalPMDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<DigitalPMTask[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadDashboardData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [projData, taskData, ticketData, milestoneData, sprintData] = await Promise.all([
        getAssignedDigitalProjects(pmIdentity),
        getAssignedDigitalTasks(pmIdentity),
        getAssignedDigitalTickets(undefined, pmIdentity),
        getAssignedDigitalMilestones(),
        getAssignedDigitalSprints()
      ]);

      setProjects(projData || []);
      setTasks(taskData || []);
      setTickets(ticketData || []);
      setMilestones(milestoneData || []);
      setSprints(sprintData || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load project manager metrics from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    const channel = supabase
      .channel('realtime_pm_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_projects' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tickets' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_milestones' }, () => loadDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_sprints' }, () => loadDashboardData())
      .subscribe();

    const handleLocalChange = () => loadDashboardData();
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);
    window.addEventListener('ferex_tasks_change', handleLocalChange);
    window.addEventListener('ferex_digital_tickets_change', handleLocalChange);
    window.addEventListener('ferex_digital_milestones_change', handleLocalChange);
    window.addEventListener('ferex_digital_sprints_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_digital_tickets_change', handleLocalChange);
      window.removeEventListener('ferex_digital_milestones_change', handleLocalChange);
      window.removeEventListener('ferex_digital_sprints_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const handleQuickStatusChange = async (task: DigitalPMTask) => {
    const nextStatus = task.status === 'Done' ? 'To Do' : task.status === 'To Do' ? 'In Progress' : 'Done';
    try {
      await updateDigitalTaskStatusDirect(task.id, nextStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    } catch (err: any) {
      alert(`Database Error: ${err.message}`);
    }
  };

  const pendingTasks = tasks.filter(t => t.status !== 'Done');
  const openTickets = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress');
  const activeSprints = sprints.filter(s => s.status === 'Active');
  const completedMilestones = milestones.filter(m => m.status === 'Completed' || m.status === 'Approved');

  const statCards = [
    {
      label: 'Assigned Projects',
      value: String(projects.length),
      subtext: `${projects.filter(p => p.status !== 'Closed').length} in active delivery`,
      icon: FolderKanban,
      color: 'text-blue-600 bg-blue-50/80',
      path: '/digital/pm/projects'
    },
    {
      label: 'My Open Tasks',
      value: String(pendingTasks.length),
      subtext: `${tasks.filter(t => t.status === 'Done').length} completed`,
      icon: CheckSquare,
      color: 'text-emerald-700 bg-emerald-50/80',
      path: '/digital/pm/tasks'
    },
    {
      label: 'Client Tickets',
      value: String(openTickets.length),
      subtext: `${tickets.filter(t => t.status === 'Resolved').length} resolved`,
      icon: Headphones,
      color: 'text-amber-700 bg-amber-50/80',
      path: '/digital/pm/tickets'
    },
    {
      label: 'Active Sprints',
      value: String(activeSprints.length),
      subtext: 'Current sprint iteration',
      icon: Layers,
      color: 'text-violet-600 bg-violet-50/80',
      path: '/digital/pm/sprints'
    },
    {
      label: 'Project Milestones',
      value: `${completedMilestones.length}/${milestones.length || 0}`,
      subtext: 'Deliverables verified',
      icon: Target,
      color: 'text-orange-600 bg-orange-50/80',
      path: '/digital/pm/milestones'
    },
    {
      label: 'Deliverables Vault',
      value: String(projects.reduce((acc, p) => acc + (p.deliverables?.length || 0), 0)),
      subtext: 'Figma, GitHub, Docs',
      icon: FileText,
      color: 'text-[#58051E] bg-[#58051E]/8',
      path: '/digital/pm/documents'
    }
  ];

  return (
    <div className="space-y-6 relative text-left pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Project Manager Workspace
            </h1>
            <Badge variant="brand">FEREX Digital</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Sprint management, client deliverables, project milestones, assigned tasks, and tickets queue.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={() => navigate('/digital/pm/tasks')}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Task
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/digital/pm/sprints')}
            leftIcon={<Layers className="w-3.5 h-3.5" />}
          >
            Sprint Board
          </Button>
        </div>
      </div>

      {/* Database Error Banner if any */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.15 }}
              onClick={() => navigate(card.path)}
              className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-subtle hover:border-slate-300 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              </div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{card.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5 tracking-tight">{card.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{card.subtext}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Tasks Queue & Active Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Assigned Tasks Queue */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">My Assigned Tasks Queue</h3>
                <p className="text-xs text-slate-400 mt-0.5">Tasks assigned to your account by Admin / Digital Lead</p>
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigate('/digital/pm/tasks')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                View All Tasks
              </Button>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center items-center">
                <div className="w-6 h-6 border-2 border-[#58051E] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-medium">
                No tasks currently assigned to your account in Supabase.
              </div>
            ) : (
              <div className="space-y-2.5">
                {tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => handleQuickStatusChange(t)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                          t.status === 'Done'
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'border-slate-300 hover:border-[#58051E] bg-white'
                        }`}
                        title="Click to toggle status"
                      >
                        {t.status === 'Done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold text-slate-900 truncate ${t.status === 'Done' ? 'line-through text-slate-400' : ''}`}>
                          {t.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {t.project_title || 'General Task'} • Due: {t.due_date || 'No deadline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.priority === 'Critical' || t.priority === 'High'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {t.priority}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        t.status === 'Done'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : t.status === 'In Progress'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>Showing {Math.min(5, tasks.length)} of {tasks.length} assigned tasks</span>
            <span className="font-semibold text-slate-600">Realtime Supabase Sync</span>
          </div>
        </div>

        {/* Right Col: Active Projects & Client Tickets */}
        <div className="space-y-5">
          {/* Active Projects Widget */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Assigned Projects</h3>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => navigate('/digital/pm/projects')}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                All
              </Button>
            </div>

            {projects.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No projects assigned to your account.</p>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate('/digital/pm/projects')}
                    className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-100/70 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[170px]">
                        {p.title}
                      </span>
                      <span className="text-[10px] font-bold text-[#58051E] bg-[#58051E]/8 px-1.5 py-0.5 rounded">
                        {p.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                      <span>{p.client_name || 'Client'}</span>
                      <span>Progress {p.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#58051E] rounded-full transition-all"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Client Tickets Widget */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-subtle">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Client Tickets</h3>
              <Badge variant="warning">{openTickets.length} Open</Badge>
            </div>

            {tickets.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No client revision tickets found.</p>
            ) : (
              <div className="space-y-2.5">
                {tickets.slice(0, 3).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate('/digital/pm/tickets')}
                    className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 truncate">{t.title}</span>
                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {t.status}
                      </span>
                    </div>
                    <p className="text-[10.5px] text-slate-400 truncate">
                      {t.project_title || t.client_name || 'Support Desk'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
