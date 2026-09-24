import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Plus, Search, CheckCircle2, Trash2, X, RefreshCw,
  Clock, AlertCircle, User, Layers, Calendar
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import { getTasks, createTask, updateTaskStatus, deleteTask, reassignTask } from '../../lib/api/tasks';
import { getDivisionStaff, type DivisionStaffMember } from '../../lib/api/staff';
import { supabase } from '../../lib/supabase';
import type { Task } from '../../lib/types';

export const CentralTasks: React.FC = () => {
  const [toast, setToast] = useState('');
  const [selectedDivision, setSelectedDivision] = useState<string>('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [reassigningTask, setReassigningTask] = useState<Task | null>(null);
  const [reassignStaffName, setReassignStaffName] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<DivisionStaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    division: 'Education',
    assignee: 'Admissions Lead',
    priority: 'High' as 'High' | 'Medium' | 'Low',
    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, staffData] = await Promise.all([
        getTasks(),
        getDivisionStaff('all')
      ]);
      setTasks(tasksData || []);
      setStaffList(staffData || []);
      if (staffData && staffData.length > 0 && !newTask.assignee) {
        setNewTask(prev => ({ ...prev, assignee: staffData[0].name }));
      }
    } catch (err: any) {
      console.warn('[CentralTasks load error]:', err);
    } finally {
      setLoading(false);
    }
  }, [newTask.assignee]);

  useEffect(() => {
    loadData();

    // Supabase Realtime channel subscription
    const channel = supabase
      .channel('central_tasks_realtime_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => loadData())
      .subscribe();

    const handleSync = () => loadData();
    window.addEventListener('ferex_tasks_change', handleSync);
    window.addEventListener('ferex_staff_users_change', handleSync);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_tasks_change', handleSync);
      window.removeEventListener('ferex_staff_users_change', handleSync);
    };
  }, [loadData]);

  const handleToggleStatus = async (task: Task) => {
    const nextStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    try {
      await updateTaskStatus(task.id, nextStatus);
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
      showToastMsg(`Task updated to ${nextStatus}`);
    } catch (err: any) {
      showToastMsg(`Error: ${err.message}`);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      setTasks(prev => prev.filter(t => t.id !== id));
      showToastMsg('Task removed from registry');
    } catch (err: any) {
      showToastMsg(`Failed to delete task: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const selectedStaff = staffList.find(s => s.name === newTask.assignee || s.email === newTask.assignee || s.id === newTask.assignee);
      const staffName = selectedStaff?.name || newTask.assignee;
      const staffEmail = selectedStaff?.email || (staffName.includes('@') ? staffName : '');

      const created = await createTask({
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assigned_to: staffName,
        assigned_staff_id: selectedStaff?.id,
        assigned_staff_email: staffEmail,
        priority: newTask.priority,
        due_date: newTask.dueDate,
        category: newTask.division,
        created_by: 'Central Admin',
      });

      setTasks(prev => [created, ...prev.filter(t => t.id !== created.id)]);
      setShowAddModal(false);
      setNewTask({
        title: '',
        description: '',
        division: 'Education',
        assignee: staffList[0]?.name || 'Admissions Lead',
        priority: 'High',
        dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      });
      showToastMsg('Operational Task Created & Dispatched Across Apps');
    } catch (err: any) {
      showToastMsg(`Error creating task: ${err.message}`);
    }
  };

  const handleConfirmReassignment = async () => {
    if (!reassigningTask || !reassignStaffName) return;
    try {
      const staffMember = staffList.find(s => s.name === reassignStaffName || s.email === reassignStaffName || s.id === reassignStaffName);
      const staffName = staffMember?.name || reassignStaffName;
      const staffEmail = staffMember?.email || '';

      await reassignTask({
        taskId: reassigningTask.id,
        assignedTo: staffName,
        assignedStaffId: staffMember?.id,
        assignedStaffEmail: staffEmail,
        division: reassigningTask.category,
      });
      setTasks(prev => prev.map(t => t.id === reassigningTask.id ? { ...t, assigned_to: staffName } : t));
      showToastMsg(`Task reassigned to ${staffName}!`);
      setReassigningTask(null);
    } catch (err: any) {
      showToastMsg(`Failed to reassign task: ${err.message}`);
    }
  };

  const divBadges: Record<string, string> = {
    Education: 'bg-rose-50 text-rose-700 border-rose-200',
    Trade: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Rimi: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    Digital: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    General: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const prioBadges: Record<string, string> = {
    High: 'bg-red-50 text-red-700 border-red-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200 font-bold',
  };

  const filteredTasks = tasks.filter(t => {
    const matchSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.assigned_to || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiv = selectedDivision === 'All' || (t.category || 'Education').toLowerCase() === selectedDivision.toLowerCase();
    const matchPrio = selectedPriority === 'All' || t.priority === selectedPriority;
    const matchStatus = selectedStatus === 'All' || t.status === selectedStatus;
    return matchSearch && matchDiv && matchPrio && matchStatus;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-[#58051E]" /> Cross-Divisional Operations & Task Center
            </h1>
            <span className="text-[10px] font-black bg-[#58051E]/10 text-[#58051E] border border-[#58051E]/20 px-2.5 py-0.5 rounded-full">
              Live Supabase Sync
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Centrally delegate, track, and reassign high-priority operational workflows across all 4 enterprise subsidiaries.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" variant="outline" className="text-xs font-bold" onClick={loadData}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-xs font-bold"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create New Task
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 border border-slate-200/70 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks, descriptions, or assigned staff..."
              className="w-full h-9 pl-9 pr-4 bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {['All', 'Education', 'Trade', 'Rimi', 'Digital'].map((div) => (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedDivision === div ? 'bg-[#58051E] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-400">Priority:</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-7 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <span className="ml-auto text-xs font-bold text-slate-400">
            {filteredTasks.length} Live Tasks ({tasks.filter(t => t.status === 'Completed').length} Completed)
          </span>
        </div>
      </Card>

      {/* Task Cards Listing */}
      {loading ? (
        <div className="py-16 text-center text-xs font-bold text-slate-400">Loading operations tasks from Supabase...</div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200/70 shadow-xs">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No Operations Tasks Listed</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
            No tasks match the active filters. Click "Create New Task" to delegate operational work to subsidiary staff.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => {
            const div = task.category || 'Education';
            const badge = divBadges[div] || 'bg-slate-100 text-slate-700 border-slate-200';
            const isCompleted = task.status === 'Completed';

            return (
              <Card
                key={task.id}
                className={`p-5 border transition-all flex flex-col justify-between ${
                  isCompleted ? 'bg-slate-50/50 border-slate-200/50 opacity-75' : 'border-slate-200/70 shadow-xs hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-[#58051E] text-white flex items-center gap-1 shadow-2xs">
                        🏛️ By Central Admin
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${badge}`}>
                        {div}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${prioBadges[task.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {task.priority} Priority
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold border ${
                      isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {task.status || 'Pending'}
                    </span>
                  </div>

                  <h3 className={`text-sm font-black text-slate-900 ${isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {task.title}
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-1 line-clamp-2">
                    {task.description || 'Cross-divisional operational directive.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Assigned Owner</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <strong className="text-slate-800 font-bold">{task.assigned_to || 'Unassigned'}</strong>
                        <button
                          onClick={() => {
                            setReassigningTask(task);
                            setReassignStaffName(task.assigned_to || (staffList[0]?.name || ''));
                          }}
                          className="text-[10px] font-bold text-[#58051E] hover:underline cursor-pointer"
                        >
                          (Reassign)
                        </button>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block">Target Due Date</span>
                      <span className="text-slate-700 font-semibold font-mono text-[11px] mt-0.5 block">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Immediate'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {isCompleted ? 'Mark Pending' : 'Mark Completed'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setReassigningTask(task);
                        setReassignStaffName(task.assigned_to || (staffList[0]?.name || ''));
                      }}
                      className="p-1.5 text-slate-400 hover:text-[#58051E] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs font-bold"
                      title="Reassign Task"
                    >
                      Reassign
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Create Operational Task</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="e.g. Audit Warsaw Student Wire Receipts"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Description / Deliverables</label>
                  <textarea
                    rows={2}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Provide specific instructions or audit criteria..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Target Subsidiary</label>
                    <select
                      value={newTask.division}
                      onChange={(e) => setNewTask({ ...newTask, division: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="Education">Education</option>
                      <option value="Trade">Global Trade</option>
                      <option value="Rimi">Rimi Frozen</option>
                      <option value="Digital">Digital Agency</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Assignee / Staff</label>
                    <select
                      value={newTask.assignee}
                      onChange={(e) => setNewTask({ ...newTask, assignee: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    >
                      {staffList.map((s) => (
                        <option key={s.id || s.email} value={s.name}>
                          {s.name} ({s.roleLabel || s.division})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]">Dispatch Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Reassign Task Modal */}
      <AnimatePresence>
        {reassigningTask && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50" onClick={() => setReassigningTask(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-black text-slate-900">Reassign Operational Task</h3>
                <button onClick={() => setReassigningTask(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="font-bold text-slate-700">Task: <span className="text-slate-900 font-extrabold">{reassigningTask.title}</span></p>

                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase mb-1">Select New Assignee / Staff</label>
                  <select
                    value={reassignStaffName}
                    onChange={(e) => setReassignStaffName(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                  >
                    {staffList.map((s) => (
                      <option key={s.id || s.email} value={s.name}>
                        {s.name} ({s.roleLabel || s.division})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1 text-xs font-bold" onClick={() => setReassigningTask(null)}>Cancel</Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 text-xs font-bold bg-[#58051E] hover:bg-[#430316]"
                    onClick={handleConfirmReassignment}
                  >
                    Confirm Reassignment
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
