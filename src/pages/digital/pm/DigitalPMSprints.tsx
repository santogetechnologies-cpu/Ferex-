import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Plus, Search, Calendar, CheckCircle2, AlertCircle,
  X, CheckSquare, Clock, ArrowRight, User
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
  updateDigitalTaskStatusDirect,
  getAssignedDigitalProjects,
  type DigitalPMTask,
  type DigitalSprint
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
  const [showAddSprint, setShowAddSprint] = useState(false);

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

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_digital_sprints_change', handleLocalChange);
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

  const activeSprint = sprints.find(s => s.id === selectedSprintId);
  const sprintTasks = tasks.filter(t => {
    if (selectedSprintId === 'All') return true;
    return t.sprint_id === selectedSprintId || t.project_id === activeSprint?.project_id;
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
              Sprint Kanban Board
            </h1>
            <Badge variant="brand">{sprintTasks.length} Active Items</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Agile sprint iterations, story points, and QA delivery pipelines for assigned projects.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddSprint(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          New Sprint
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Sprint Selector Filter */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-semibold text-slate-400">Sprint:</span>
          <button
            onClick={() => setSelectedSprintId('All')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedSprintId === 'All'
                ? 'bg-[#58051E] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Assigned Sprints ({tasks.length})
          </button>
          {sprints.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedSprintId(s.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedSprintId === s.id
                  ? 'bg-[#58051E] text-white shadow-xs'
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

      {/* Kanban Columns Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colTasks = sprintTasks.filter(t => t.status === col.status);

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
                      colTasks.map((t) => (
                        <div
                          key={t.id}
                          className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-all space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 leading-snug">
                              {t.title}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                              t.priority === 'Critical' || t.priority === 'High'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {t.priority}
                            </span>
                          </div>

                          <p className="text-[10.5px] text-slate-400 line-clamp-2">
                            {t.notes || t.project_title || 'General Task'}
                          </p>

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
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Sprint Modal */}
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
                  <Button size="sm" type="submit">Create Sprint</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
