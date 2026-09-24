import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Plus, Search, Filter, Calendar, CheckCircle2,
  AlertCircle, X, Clock, Trash2
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/Button';
import { Badge } from '../../../components/Badge';
import { ToastNotification } from '../../../components/ToastNotification';
import { supabase } from '../../../lib/supabase';
import {
  getAssignedDigitalTasks,
  createDigitalTaskDirect,
  updateDigitalTaskStatusDirect,
  getAssignedDigitalProjects,
  type DigitalPMTask
} from '../../../lib/api/digitalPm';

export const DigitalPMTasks: React.FC = () => {
  const { user, profile } = useAuth();

  const [tasks, setTasks] = useState<DigitalPMTask[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [toast, setToast] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    project_id: '',
    priority: 'Medium' as 'Low' | 'Medium' | 'High' | 'Critical',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: '',
    task_type: 'Task' as 'Task' | 'Sprint' | 'Milestone' | 'Ticket'
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };


  const pmIdentity = {
    id: user?.id,
    email: profile?.email || user?.email,
    full_name: profile?.full_name,
    name: profile?.full_name
  };

  const loadTasksData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [tList, pList] = await Promise.all([
        getAssignedDigitalTasks(pmIdentity),
        getAssignedDigitalProjects(pmIdentity)
      ]);
      setTasks(tList || []);
      setProjects(pList || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load assigned tasks from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasksData();

    const channel = supabase
      .channel('realtime_pm_tasks_page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => loadTasksData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadTasksData())
      .subscribe();

    const handleLocalChange = () => loadTasksData();
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);
    window.addEventListener('ferex_tasks_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_tasks_change', handleLocalChange);
    };
  }, [user?.id, profile?.email]);

  const handleToggleStatus = async (task: DigitalPMTask) => {
    const nextStatus = task.status === 'Done' ? 'To Do' : task.status === 'To Do' ? 'In Progress' : 'Done';
    try {
      await updateDigitalTaskStatusDirect(task.id, nextStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      showToast(`Task status updated to "${nextStatus}"`);
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const selectedProj = projects.find(p => p.id === newTask.project_id);
      const created = await createDigitalTaskDirect({
        title: newTask.title,
        project_id: selectedProj?.id,
        project_title: selectedProj?.title || 'General Task',
        priority: newTask.priority,
        status: 'To Do',
        due_date: newTask.due_date,
        notes: newTask.notes,
        task_type: newTask.task_type,
        assigned_to_name: profile?.full_name || 'Project Manager',
        assigned_to_email: profile?.email || user?.email || '',
        assigned_staff_id: user?.id
      });

      setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      setShowAddModal(false);
      showToast(`Created task "${newTask.title}" successfully`);
      setNewTask({
        title: '',
        project_id: '',
        priority: 'Medium',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: '',
        task_type: 'Task'
      });
    } catch (err: any) {
      showToast(`Database Error: ${err.message}`);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.project_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 relative text-left pb-8">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#58051E]/8 text-[#58051E] flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              My Assigned Tasks Queue
            </h1>
            <Badge variant="brand">{filteredTasks.length} Assigned</Badge>
          </div>
          <p className="text-xs text-slate-500">
            Realtime task queue synced with Admin assignments, sprints, milestones, and client tickets.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Create Task
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, deliverables..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Done">Done</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="All">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks Table / Card List */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-subtle overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-[#58051E] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs font-medium">
            No assigned tasks found matching your filter criteria.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5 sm:mt-0 ${
                      t.status === 'Done'
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'border-slate-300 hover:border-[#58051E] bg-white'
                    }`}
                    title="Toggle completion status"
                  >
                    {t.status === 'Done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(t.is_central_directive || t.created_by === 'Central Admin' || t.task_type === 'Central Directive' || (t.notes && t.notes.toLowerCase().includes('central admin'))) && (
                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md bg-[#58051E] text-white flex items-center gap-1 shadow-2xs">
                          🏛️ By Central Admin
                        </span>
                      )}
                      <span className={`text-xs font-bold text-slate-900 ${t.status === 'Done' ? 'line-through text-slate-400' : ''}`}>
                        {t.title}
                      </span>
                      {t.task_type && t.task_type !== 'Task' && t.task_type !== 'Central Directive' && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-violet-50 text-violet-700 border border-violet-200">
                          {t.task_type}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                      <span>{t.project_title || 'General Task'}</span>
                      {t.due_date && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <Calendar className="w-3 h-3" /> Due: {t.due_date}
                        </span>
                      )}
                      {t.notes && <span className="italic text-slate-500 truncate max-w-xs">• {t.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.priority === 'Critical' || t.priority === 'High'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {t.priority}
                  </span>

                  <button
                    onClick={() => handleToggleStatus(t)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      t.status === 'Done'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : t.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    {t.status}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-50 p-6 text-left"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Create New Project Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
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
                    placeholder="e.g. Implement Responsive Navbar Header"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Assigned Project</label>
                    <select
                      value={newTask.project_id}
                      onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="">General Task (No Project)</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Task Type</label>
                    <select
                      value={newTask.task_type}
                      onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="Task">Standard Task</option>
                      <option value="Sprint">Sprint Deliverable</option>
                      <option value="Milestone">Milestone Item</option>
                      <option value="Ticket">Client Ticket Revision</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
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
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Technical Notes / Specs</label>
                  <textarea
                    rows={3}
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Implementation instructions, dependencies, visual guidelines..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button size="sm" type="submit">Create Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
