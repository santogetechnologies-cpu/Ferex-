import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Plus, Search, Calendar, CheckCircle2, AlertCircle,
  X, CheckSquare, Clock, ArrowRight, User, ShieldCheck, Globe, Filter
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ToastNotification } from '../../../components/ToastNotification';
import { supabase } from '../../../lib/supabase';
import {
  getAssignedDigitalTasks,
  getAssignedDigitalSprints,
  createDigitalSprintDirect,
  createDigitalTaskDirect,
  updateDigitalTaskStatusDirect,
  getAssignedDigitalProjects,
  getTaskOrigin,
  type DigitalPMTask,
  type DigitalSprint,
  type TaskOriginInfo
} from '../../../lib/api/digitalPm';

const COLUMNS: { title: string; status: DigitalPMTask['status']; color: string }[] = [
  { title: 'Sprint Backlog', status: 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { title: 'In Progress', status: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { title: 'QA & Review', status: 'In Review', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { title: 'Done / Delivered', status: 'Done', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export const DigitalPMSprints: React.FC = () => {
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<DigitalPMTask[]>([]);
  const [sprints, setSprints] = useState<DigitalSprint[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState<string>('All');
  const [originFilter, setOriginFilter] = useState<'All' | 'me' | 'digital_admin' | 'central_admin'>('All');
  const [showAddSprint, setShowAddSprint] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const [newSprint, setNewSprint] = useState({
    name: '',
    project_id: '',
    goal: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  });

  const [newTask, setNewTask] = useState({
    title: '',
    project_id: '',
    sprint_id: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
    task_type: 'Sprint' as 'Task' | 'Sprint' | 'Milestone' | 'Ticket'
  });

  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadSprintData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [tList, sList, pList] = await Promise.all([
        getAssignedDigitalTasks(pmIdentity),
        getAssignedDigitalSprints(),
        getAssignedDigitalProjects(pmIdentity)
      ]);
      setTasks(tList || []);
      setSprints(sList || []);
      setProjects(pList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load sprint data from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSprintData();

    const channel = supabase
      .channel('realtime_pm_sprints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => loadSprintData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_sprints' }, () => loadSprintData())
      .subscribe();

    const handleLocalChange = () => loadSprintData();
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);
    window.addEventListener('ferex_digital_sprints_change', handleLocalChange);
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_digital_sprints_change', handleLocalChange);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const handleMoveTask = async (task: DigitalPMTask, newStatus: DigitalPMTask['status']) => {
    try {
      await updateDigitalTaskStatusDirect(task.id, newStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
      showToast(`Task moved to ${newStatus}`);
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprint.name.trim()) return;

    try {
      const selectedProj = projects.find(p => p.id === newSprint.project_id);
      const created = await createDigitalSprintDirect({
        name: newSprint.name,
        project_id: selectedProj?.id,
        project_title: selectedProj?.title || 'General',
        goal: newSprint.goal,
        start_date: newSprint.start_date,
        end_date: newSprint.end_date,
        status: 'Active'
      });

      setSprints(prev => [created, ...prev]);
      setShowAddSprint(false);
      showToast(`Created sprint "${newSprint.name}" successfully`);
      setNewSprint({
        name: '',
        project_id: '',
        goal: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
      });
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const selectedProj = projects.find(p => p.id === newTask.project_id);
      const selectedSprint = sprints.find(s => s.id === newTask.sprint_id);
      const myCreator = profile?.full_name || profile?.email || user?.email || user?.id || 'Me';

      const created = await createDigitalTaskDirect({
        title: newTask.title.trim(),
        project_id: selectedProj?.id,
        project_title: selectedProj?.title || 'Sprint Task',
        priority: newTask.priority,
        status: 'To Do',
        due_date: newTask.due_date,
        notes: newTask.notes,
        task_type: newTask.task_type,
        sprint_id: selectedSprint?.id || (selectedSprintId !== 'All' ? selectedSprintId : undefined),
        sprint_name: selectedSprint?.name || '',
        created_by: myCreator,
        assigned_to_name: profile?.full_name || 'Me',
        assigned_to_email: profile?.email || user?.email || '',
        assigned_staff_id: user?.id
      });

      setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      setShowAddTask(false);
      showToast(`Created task "${newTask.title}" successfully`);
      setNewTask({
        title: '',
        project_id: '',
        sprint_id: '',
        priority: 'Medium',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: '',
        task_type: 'Sprint'
      });
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const activeSprint = sprints.find(s => s.id === selectedSprintId);

  // Compute provenance origins for each task
  const myId = user?.id;
  const myEmail = profile?.email || user?.email;
  const myName = profile?.full_name;

  const tasksWithOrigin = tasks.map(t => ({
    ...t,
    origin: getTaskOrigin(t, myId, myEmail, myName)
  }));

  // Counts by origin
  const meCount = tasksWithOrigin.filter(t => t.origin.type === 'me').length;
  const adminCount = tasksWithOrigin.filter(t => t.origin.type === 'digital_admin').length;
  const centralCount = tasksWithOrigin.filter(t => t.origin.type === 'central_admin').length;

  const filteredTasks = tasksWithOrigin.filter(t => {
    // 1. Sprint filter
    if (selectedSprintId !== 'All') {
      const matchesSprint = t.sprint_id === selectedSprintId || t.project_id === activeSprint?.project_id;
      if (!matchesSprint) return false;
    }
    // 2. Origin / Creator filter
    if (originFilter !== 'All') {
      if (t.origin.type !== originFilter) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sprints
            </h1>
            <Badge variant="brand">{filteredTasks.length} Active Items</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Agile sprint iterations, story points, task provenance (Created by Me, Digital Admin, Central Admin), and live QA delivery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddSprint(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            New Sprint
          </Button>
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-white"
            onClick={() => {
              if (projects.length > 0 && !newTask.project_id) {
                setNewTask(prev => ({ ...prev, project_id: projects[0].id }));
              }
              setShowAddTask(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Task
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar: Sprint Iteration & Creator Provenance */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-subtle space-y-3">
        {/* Row 1: Sprint Iteration Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> Sprint:
            </span>
            <button
              onClick={() => setSelectedSprintId('All')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedSprintId === 'All'
                  ? 'bg-[#58051E] text-white shadow-xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Sprints ({tasks.length})
            </button>
            {sprints.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSprintId(s.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedSprintId === s.id
                    ? 'bg-[#58051E] text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s.name} ({s.status})
              </button>
            ))}
          </div>

          {activeSprint && (
            <div className="text-[11px] text-slate-500 flex items-center gap-3">
              <span>Goal: <strong className="text-slate-800">{activeSprint.goal || 'Sprint Objectives'}</strong></span>
              <span>{activeSprint.start_date} → {activeSprint.end_date}</span>
            </div>
          )}
        </div>

        {/* Row 2: Creator / Provenance Filter (Created by Me, Digital Admin, Central Admin) */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-slate-400" /> Creator Origin:
          </span>
          <button
            onClick={() => setOriginFilter('All')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              originFilter === 'All'
                ? 'bg-slate-900 text-white shadow-xs font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Creators ({tasks.length})
          </button>
          <button
            onClick={() => setOriginFilter('me')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              originFilter === 'me'
                ? 'bg-blue-600 text-white shadow-xs font-bold'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80'
            }`}
          >
            <User className="w-3 h-3" /> Created by Me ({meCount})
          </button>
          <button
            onClick={() => setOriginFilter('digital_admin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              originFilter === 'digital_admin'
                ? 'bg-amber-600 text-white shadow-xs font-bold'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80'
            }`}
          >
            <ShieldCheck className="w-3 h-3" /> Digital Admin ({adminCount})
          </button>
          <button
            onClick={() => setOriginFilter('central_admin')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              originFilter === 'central_admin'
                ? 'bg-rose-600 text-white shadow-xs font-bold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80'
            }`}
          >
            <Globe className="w-3 h-3" /> Central Admin ({centralCount})
          </button>
        </div>
      </div>

      {/* Kanban Columns Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter(t => t.status === col.status);

            return (
              <div
                key={col.title}
                className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3.5 min-h-[500px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        col.status === 'Done' ? 'bg-emerald-500' : col.status === 'In Progress' ? 'bg-blue-500' : col.status === 'In Review' ? 'bg-purple-500' : 'bg-slate-400'
                      }`} />
                      {col.title}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {colTasks.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-[11px] font-medium border border-dashed border-slate-200 rounded-xl">
                        No tasks in {col.title}
                      </div>
                    ) : (
                      colTasks.map((t) => {
                        const origin = t.origin;

                        return (
                          <div
                            key={t.id}
                            className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                          >
                            {/* Provenance Badge (Central Admin, Digital Admin, Created by Me) */}
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              {origin.type === 'central_admin' ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                  <Globe className="w-2.5 h-2.5" />
                                  Central Admin Directive
                                </span>
                              ) : origin.type === 'me' ? (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                                  <User className="w-2.5 h-2.5" />
                                  Created by Me
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  Digital Admin
                                </span>
                              )}

                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                t.priority === 'Critical' || t.priority === 'High'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {t.priority}
                              </span>
                            </div>

                            {/* Task Title */}
                            <div>
                              <span className="text-xs font-bold text-slate-900 leading-snug block">
                                {t.title}
                              </span>
                              {t.project_title && (
                                <span className="text-[10px] font-semibold text-slate-500 truncate block mt-0.5">
                                  📁 {t.project_title}
                                </span>
                              )}
                            </div>

                            {t.notes && (
                              <p className="text-[10.5px] text-slate-500 line-clamp-2 bg-slate-50 p-1.5 rounded-md border border-slate-100">
                                {t.notes}
                              </p>
                            )}

                            {/* Bottom Controls */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span>{t.due_date ? `Due: ${t.due_date}` : 'No deadline'}</span>

                              {/* Quick Move Trigger */}
                              <select
                                value={t.status}
                                onChange={(e) => handleMoveTask(t, e.target.value as any)}
                                className="text-[9.5px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 cursor-pointer text-slate-700"
                              >
                                <option value="To Do">To Do</option>
                                <option value="In Progress">In Progress</option>
                                <option value="In Review">QA Review</option>
                                <option value="Done">Done</option>
                              </select>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Task Modal (Directly on Sprint Board) ── */}
      <AnimatePresence>
        {showAddTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddTask(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 flex items-center justify-center text-[#58051E]">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Create Sprint Task</h3>
                    <p className="text-[11px] text-slate-400">Created by you • Visible in Sprint Backlog</p>
                  </div>
                </div>
                <button onClick={() => setShowAddTask(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Implement OAuth Flow for Mobile Apps"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Associated Project *</label>
                  {projects.length > 0 ? (
                    <select
                      required
                      value={newTask.project_id}
                      onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title} ({p.client_name || 'Client'})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 font-semibold p-2 bg-amber-50 rounded-lg border border-amber-200">
                      No assigned projects found.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Sprint Iteration</label>
                    <select
                      value={newTask.sprint_id}
                      onChange={(e) => setNewTask({ ...newTask, sprint_id: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="">General Backlog (No Specific Sprint)</option>
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Scope / Execution Notes</label>
                  <textarea
                    rows={3}
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Provide execution details, dependencies, or links..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddTask(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Create Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── New Sprint Modal ── */}
      <AnimatePresence>
        {showAddSprint && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddSprint(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Start New Sprint Iteration</h3>
                <button onClick={() => setShowAddSprint(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSprint} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Sprint Name *</label>
                  <input
                    type="text"
                    required
                    value={newSprint.name}
                    onChange={(e) => setNewSprint({ ...newSprint, name: e.target.value })}
                    placeholder="e.g. Sprint 24 — Mobile Layout & Auth Integration"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Project</label>
                  <select
                    value={newSprint.project_id}
                    onChange={(e) => setNewSprint({ ...newSprint, project_id: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  >
                    <option value="">General Sprint (Across Projects)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={newSprint.start_date}
                      onChange={(e) => setNewSprint({ ...newSprint, start_date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={newSprint.end_date}
                      onChange={(e) => setNewSprint({ ...newSprint, end_date: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Sprint Objective / Goal</label>
                  <textarea
                    rows={3}
                    value={newSprint.goal}
                    onChange={(e) => setNewSprint({ ...newSprint, goal: e.target.value })}
                    placeholder="Key deliverables to ship by sprint deadline..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddSprint(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Start Sprint</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
