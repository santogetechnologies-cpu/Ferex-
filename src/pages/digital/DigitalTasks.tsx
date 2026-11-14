import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Search, Plus, X, CheckCircle2, Trash2, Calendar, User, Clock,
  AlertCircle, Filter, FolderKanban, ChevronLeft, ChevronRight, Check, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getDigitalTasks,
  createDigitalTask,
  updateDigitalTask, updateDigitalTaskStatus,
  deleteDigitalTask,
  getDigitalProjects,
  getDigitalStaffMembers
} from '../../lib/api/digital';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useDigitalPermissions } from '../../hooks/usePermissions';
import { getMasters } from '../../lib/api/masters';

export const DigitalTasks: React.FC = () => {
  const { profile } = useAuth();
  const { isAdmin, isStaff, isCentral, canDelete } = useDigitalPermissions();

  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [taskPriorities, setTaskPriorities] = useState<string[]>(['Critical', 'High', 'Medium', 'Low']);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [staffFilter, setStaffFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [toast, setToast] = useState('');
  const [formError, setFormError] = useState('');
  const [reassignTask, setReassignTask] = useState<any | null>(null);
  const [reassignStaffName, setReassignStaffName] = useState<string>('');

  // Pagination
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [newTask, setNewTask] = useState({
    title: '',
    project_id: '',
    assigned_staff_id: '',
    priority: 'Medium',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    notes: ''
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, projData, staffData] = await Promise.all([
        getDigitalTasks(),
        getDigitalProjects(),
        getDigitalStaffMembers()
      ]);
      setProjects(projData || []);
      setTasks(tasksData || []);
      // Only real team members with a login can be assigned work.
      setStaffList((staffData || []).filter((m: any) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(m.id || '')));

      const priorities = await getMasters('digital', 'task_priorities');
      if (priorities && priorities.length > 0) {
        setTaskPriorities(priorities);
      }
    } catch (err: any) {
      setToast(`Could not load tasks: ${err.message || 'Database error'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('realtime_digital_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'digital_tasks' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_digital_tasks_change', handleLocalChange);
    window.addEventListener('ferex_staff_users_change', handleLocalChange);
    window.addEventListener('ferex_digital_projects_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_digital_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_staff_users_change', handleLocalChange);
      window.removeEventListener('ferex_digital_projects_change', handleLocalChange);
    };
  }, [loadData]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newTask.title.trim()) {
      setFormError('Task title is required.');
      return;
    }

    if (!newTask.project_id) {
      setFormError('Associated Project is required. All digital tasks must link to an active project.');
      return;
    }

    const selectedProj = projects.find(p => p.id === newTask.project_id);
    const assignedId = isStaff ? (profile?.id || '') : newTask.assigned_staff_id;
    const matchedStaff = staffList.find(m => m.id === assignedId);
    if (!matchedStaff) {
      setFormError('Choose the team member this task is assigned to.');
      return;
    }

    try {
      const created = await createDigitalTask({
        title: newTask.title,
        project_id: selectedProj?.id,
        project_title: selectedProj?.title,
        priority: newTask.priority,
        due_date: newTask.due_date,
        assigned_staff_id: matchedStaff.id,
        notes: newTask.notes,
        status: 'To Do'
      });
      setShowAddModal(false);
      showToast(`Created task "${newTask.title}" for ${matchedStaff.name}`);
      setNewTask({
        title: '',
        project_id: '',
        assigned_staff_id: '',
        priority: taskPriorities[0] || 'Medium',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        notes: ''
      });
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'The task could not be created.');
    }
  };

  const handleToggleStatus = async (task: any) => {
    try {
      const nextStatus = task.status === 'Done' ? 'To Do' : task.status === 'To Do' ? 'In Progress' : task.status === 'In Progress' ? 'In Review' : 'Done';
      await updateDigitalTaskStatus(task.id, nextStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      showToast(`Task status updated to ${nextStatus}`);
    } catch (err: any) {
      showToast(`Error updating task status: ${err.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteDigitalTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast('Task removed');
    } catch (err: any) {
      showToast(`Error deleting task: ${err.message || 'Unknown error'}`);
      await loadData();
    }
  };

  const filtered = tasks.filter(t => {
    const matchSearch =
      (t.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.project?.title || t.project_title || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.assigned_to_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (t.notes || '').toLowerCase().includes(search.toLowerCase());

    const matchPriority = priorityFilter === 'All' || t.priority === priorityFilter;
    const matchStatus = statusFilter === 'All' || t.status === statusFilter;

    // The database already limits staff to their own tasks; this keeps the screen consistent with it.
    const isMine = Boolean(
      (profile?.id && t.assigned_staff_id === profile.id) ||
      (profile?.email && (t.assigned_to_email || '').toLowerCase() === profile.email.toLowerCase())
    );
    if (isStaff && !isMine) return false;

    let matchStaff = true;
    if (!isStaff) {
      if (staffFilter === 'ME') matchStaff = isMine;
      else if (staffFilter !== 'All') matchStaff = t.assigned_staff_id === staffFilter;
    }

    return matchSearch && matchPriority && matchStatus && matchStaff;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'High':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Medium':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#58051E]" />
            {isStaff ? 'My Assigned Sprint Tasks' : 'Sprint Task Assignment & Pipeline'}
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            {isStaff
              ? 'Your active deliverables, tickets, and scheduled deadlines across all assigned client projects.'
              : 'Ferex Digital ERP • Multi-project sprint backlogs, staff assignments, due dates, and real-time execution tracking.'}
          </p>
        </div>
        <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold shadow-sm" onClick={() => setShowAddModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> Create Sprint Task
        </Button>
      </div>

      {/* Control & Filter Bar */}
      <Card className="p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={isStaff ? "Search my tasks..." : "Search task, project, staff member..."}
              className="w-full h-9 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Staff Filter (Admin/Central Only) */}
            {!isStaff && (
              <select
                value={staffFilter}
                onChange={(e) => { setStaffFilter(e.target.value); setCurrentPage(1); }}
                className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
              >
                <option value="All">All Assigned Staff</option>
                <option value="ME">Assigned to Me</option>
                {staffList.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            {/* Priority Filter (From Masters) */}
            <select
              value={priorityFilter}
              onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
            >
              <option value="All">All Priorities</option>
              {taskPriorities.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-[#58051E]"
            >
              <option value="All">All Statuses</option>
              <option value="To Do">To Do</option>
              <option value="In Review">In Review</option>
              <option value="In Progress">In Progress</option>
              <option value="Done">Done</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-slate-400 pt-1 border-t border-slate-100">
          <span>{filtered.length} Sprint Tasks matched {isStaff ? '(Personal Queue)' : ''}</span>
          <span className="text-[11px] text-slate-500 font-semibold">Real-time sync with Admin & Staff desks</span>
        </div>
      </Card>

      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400">Loading sprint tasks queue...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200">
          <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">No sprint tasks found matching your filters.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((t) => {
              const isDone = t.status === 'Done';
              const assigneeName = t.assigned_to_name || 'Digital Staff';
              const initials = assigneeName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

              return (
                <Card
                  key={t.id}
                  className={`p-5 border shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                    isDone
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200/80 hover:border-[#58051E]/40 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Priority & Status Controls */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(t.is_central_directive || t.created_by === 'Central Admin' || t.task_type === 'Central Directive' || (t.notes && t.notes.toLowerCase().includes('central admin'))) ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3 h-3" /> Central Admin Directive
                          </span>
                        ) : (t.created_by && (t.created_by === profile?.full_name || t.created_by === profile?.email || t.created_by === 'Me')) ? (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 shadow-2xs">
                            <User className="w-3 h-3" /> Created by Me
                          </span>
                        ) : (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3 h-3" /> Digital Admin
                          </span>
                        )}
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getPriorityStyle(t.priority)}`}>
                          {t.priority || 'Medium'} Priority
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border cursor-pointer transition-colors ${
                          t.status === 'Done'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : t.status === 'In Progress'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {t.status || 'To Do'}
                      </button>
                    </div>

                    {/* Title & Project Name */}
                    <div>
                      <h3 className={`text-base font-black leading-snug ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                        {t.title}
                      </h3>
                      <p className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-1.5 truncate">
                        <FolderKanban className="w-3.5 h-3.5 text-[#58051E] shrink-0" />
                        <span className="truncate">{t.project?.title || t.project_title || 'General Engineering Sprint'}</span>
                      </p>
                      {t.notes && (
                        <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2">
                          {t.notes}
                        </p>
                      )}
                    </div>

                    {/* Assignee & Due Date Pill */}
                    <div className="p-3 bg-slate-50/80 rounded-xl space-y-2 text-xs text-slate-600 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                          <User className="w-3.5 h-3.5" /> Assigned To:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-[#58051E] text-white text-[9px] font-black flex items-center justify-center">
                            {initials}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{assigneeName}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Target Date:
                        </span>
                        <span className="font-mono font-bold text-slate-700">{t.due_date || 'Ongoing'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs font-bold"
                      onClick={() => handleToggleStatus(t)}
                    >
                      {isDone ? 'Reopen Task' : t.status === 'In Progress' ? 'Send for review' : t.status === 'In Review' ? 'Mark Done' : 'Start Task'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs font-bold text-slate-700 hover:text-[#58051E] hover:border-[#58051E]"
                      onClick={() => {
                        setReassignTask(t);
                        setReassignStaffName(t.assigned_staff_id || '');
                      }}
                      title="Reassign Task"
                    >
                      <User className="w-3.5 h-3.5 mr-1" /> Reassign
                    </Button>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete task (Admin only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Pagination Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs font-bold text-slate-500">
            <div className="flex items-center gap-2">
              <span>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} tasks</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
              >
                <option value={12}>12 / page</option>
                <option value={24}>24 / page</option>
                <option value={48}>48 / page</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="h-8 px-3 text-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
              </Button>
              <span className="px-2 font-mono text-slate-700">Page {currentPage} of {totalPages}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="h-8 px-3 text-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* ── CREATE SPRINT TASK MODAL ── */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">Create Sprint Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {formError}
                </div>
              )}

              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Implement Webhook Handlers for Payment Gateway"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Associated Project * (Mandatory Link)
                  </label>
                  {projects.length > 0 ? (
                    <select
                      required
                      value={newTask.project_id}
                      onChange={(e) => setNewTask({ ...newTask, project_id: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- Select Project (Required) --</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title} ({p.client_name || 'Client'})</option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs text-amber-600 font-bold p-2 bg-amber-50 rounded-xl border border-amber-200">
                      No active projects found. Please create a project first before adding tasks.
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Priority Level (From Masters)
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {taskPriorities.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                      Target Due Date
                    </label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Assign Staff Member (Account Manager / PM / Engineer) *
                  </label>
                  {isStaff ? (
                    <input
                      type="text"
                      disabled
                      value={`${profile?.full_name || 'My Desk'} (${profile?.email || 'staff'})`}
                      className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      required
                      value={newTask.assigned_staff_id}
                      onChange={(e) => setNewTask({ ...newTask, assigned_staff_id: e.target.value })}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      <option value="">-- Choose team member --</option>
                      {staffList.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.roleLabel || s.role || 'Staff'}) · {s.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Task Scope / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    placeholder="Provide execution details, dependencies, or links..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">
                    Save Task
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Reassign Task Modal ── */}
      <AnimatePresence>
        {reassignTask && (
          <>
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
              onClick={() => setReassignTask(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.95, y: '-50%', x: '-50%' }}
              className="fixed top-1/2 left-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#58051E]/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#58051E]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Reassign Sprint Task</h3>
                    <p className="text-xs text-slate-500 truncate max-w-xs">{reassignTask.title}</p>
                  </div>
                </div>
                <button
                  onClick={() => setReassignTask(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="text-xs text-slate-600">
                  Select a Digital Project Manager or Staff member to reassign this sprint task to. It will immediately reflect in real time.
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">
                    Select Assignee (Account Manager / PM / Engineer) *
                  </label>
                  <select
                    value={reassignStaffName}
                    onChange={(e) => setReassignStaffName(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                  >
                    <option value="">-- Choose Staff Member --</option>
                    {staffList.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.roleLabel || s.role || 'Staff'}) · {s.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs font-bold"
                    onClick={() => setReassignTask(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!reassignStaffName}
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={async () => {
                      const matched = staffList.find(m => m.id === reassignStaffName);
                      if (!matched) { showToast('Choose a team member from the list.'); return; }
                      try {
                        await updateDigitalTask(reassignTask.id, { assigned_staff_id: matched.id });
                        showToast(`Task reassigned to ${matched.name}`);
                        setReassignTask(null);
                        await loadData();
                      } catch (err: any) {
                        showToast(`Could not reassign: ${err.message}`);
                      }
                    }}
                  >
                    Confirm Reassign
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
