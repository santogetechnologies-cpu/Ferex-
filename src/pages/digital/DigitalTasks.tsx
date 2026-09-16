import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Search, Plus, X, CheckCircle2, Trash2, Calendar, User, Clock,
  AlertCircle, Filter, FolderKanban, ChevronLeft, ChevronRight, Check
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import {
  getDigitalTasks,
  createDigitalTask,
  updateDigitalTaskStatus,
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

  // Pagination
  const [pageSize, setPageSize] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [newTask, setNewTask] = useState({
    title: '',
    project_id: '',
    assigned_to: profile?.full_name || 'Digital Project Manager',
    assigned_to_email: profile?.email || 'pm@ferex.com',
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
      setStaffList(staffData || []);

      const priorities = await getMasters('digital', 'task_priorities');
      if (priorities && priorities.length > 0) {
        setTaskPriorities(priorities);
      }

      if (staffData && staffData.length > 0 && !newTask.assigned_to) {
        setNewTask(prev => ({
          ...prev,
          assigned_to: isStaff ? (profile?.full_name || staffData[0].name) : staffData[0].name,
          assigned_to_email: isStaff ? (profile?.email || staffData[0].email) : staffData[0].email
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [newTask.assigned_to, isStaff, profile]);

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
    const assignedName = newTask.assigned_to || (staffList.length > 0 ? staffList[0].name : (profile?.full_name || 'Digital Staff'));
    const matchedStaff = staffList.find(s => s.name === assignedName);
    const assignedEmail = matchedStaff?.email || newTask.assigned_to_email || profile?.email || 'pm@ferex.com';

    const created = await createDigitalTask({
      title: newTask.title,
      project_id: selectedProj?.id,
      project_title: selectedProj?.title,
      priority: newTask.priority,
      due_date: newTask.due_date,
      assigned_to_name: assignedName,
      assigned_to_email: assignedEmail,
      notes: newTask.notes,
      status: 'To Do'
    });

    setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
    setShowAddModal(false);
    showToast(`Created task "${newTask.title}"`);
    setNewTask({
      title: '',
      project_id: '',
      assigned_to: profile?.full_name || (staffList.length > 0 ? staffList[0].name : 'Digital Project Manager'),
      assigned_to_email: profile?.email || (staffList.length > 0 ? staffList[0].email : 'pm@ferex.com'),
      priority: taskPriorities[0] || 'Medium',
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleToggleStatus = async (task: any) => {
    try {
      const nextStatus = task.status === 'Done' ? 'To Do' : task.status === 'To Do' ? 'In Progress' : 'Done';
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
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast('Task removed from sprint');
      await deleteDigitalTask(id);
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

    const myName = (profile?.full_name || '').toLowerCase();
    const myEmail = (profile?.email || '').toLowerCase();
    const assignedName = (t.assigned_to_name || '').toLowerCase();
    const assignedEmail = (t.assigned_to_email || '').toLowerCase();

    // Strict staff role scoping: Staff see ONLY tasks assigned to themselves
    if (isStaff) {
      const isAssignedToMe = Boolean(
        (myName && assignedName.includes(myName)) ||
        (myEmail && (assignedEmail === myEmail || assignedName.includes(myEmail.split('@')[0]))) ||
        (myEmail.includes('pm') && (assignedName.includes('pm') || assignedName.includes('manager')))
      );
      if (!isAssignedToMe) return false;
    }

    let matchStaff = true;
    if (!isStaff) {
      if (staffFilter === 'ME') {
        matchStaff = Boolean(
          (myName && assignedName.includes(myName)) ||
          (myEmail && (assignedEmail === myEmail || assignedName.includes(myEmail.split('@')[0])))
        );
      } else if (staffFilter !== 'All') {
        matchStaff = assignedName === staffFilter.toLowerCase();
      }
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
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />{toast}
          </motion.div>
        )}
      </AnimatePresence>

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
                <option value="ME">⚡ Assigned To Me</option>
                {staffList.map((s: any) => (
                  <option key={s.id || s.email} value={s.name}>{s.name}</option>
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
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getPriorityStyle(t.priority)}`}>
                        {t.priority || 'Medium'} Priority
                      </span>
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
                      {isDone ? 'Reopen Task' : t.status === 'In Progress' ? 'Mark Done ✓' : 'Start Task →'}
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
                    Assign Staff Member *
                  </label>
                  {isStaff ? (
                    <input
                      type="text"
                      disabled
                      value={`${profile?.full_name || 'My Desk'} (${profile?.email || 'pm@ferex.com'})`}
                      className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={newTask.assigned_to}
                      onChange={(e) => {
                        const name = e.target.value;
                        const matched = staffList.find(s => s.name === name);
                        setNewTask({
                          ...newTask,
                          assigned_to: name,
                          assigned_to_email: matched?.email || `${name.toLowerCase().replace(/[^a-z]/g, '')}@ferex.com`
                        });
                      }}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
                    >
                      {staffList.map((s: any) => (
                        <option key={s.id || s.email} value={s.name}>
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
    </div>
  );
};
