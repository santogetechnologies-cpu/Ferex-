import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Clock, AlertCircle, Plus, Edit3, Trash2, X,
  UserCheck, ArrowRight, Filter, Search, Calendar, Tag, ShieldCheck
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getRimiTasks,
  createRimiTask,
  updateRimiTask,
  reassignRimiTask,
  renameRimiTaskTitle,
  deleteRimiTask,
  getRimiStaffList,
  type RimiTask,
  type RimiStaffMember
} from '../../lib/api/rimi';
import { useAuth } from '../../contexts/AuthContext';

const RIMI_ADMIN_ROLES = ['rimi_admin', 'rimi_frozen', 'admin', 'education_admin', 'central', 'super_admin', 'superadmin'];

export const RimiTasks: React.FC = () => {
  const { profile } = useAuth();
  const userRole = profile?.role || '';
  const isAdmin = RIMI_ADMIN_ROLES.includes(userRole);
  const currentUserName = profile?.full_name || profile?.email?.split('@')[0] || 'Rimi Operations Desk';
  const currentUserEmail = profile?.email || 'ops@ferex.com';

  const [tasks, setTasks] = useState<RimiTask[]>([]);
  const [staffList, setStaffList] = useState<RimiStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(!isAdmin);

  // Filters
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterStaff, setFilterStaff] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Editing State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTitleTask, setEditingTitleTask] = useState<RimiTask | null>(null);
  const [newTitleValue, setNewTitleValue] = useState('');
  const [reassigningTask, setReassigningTask] = useState<RimiTask | null>(null);
  const [selectedNewStaff, setSelectedNewStaff] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksData, staffData] = await Promise.all([
        getRimiTasks(),
        getRimiStaffList()
      ]);
      setTasks(tasksData || []);
      setStaffList(staffData || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener('ferex_rimi_tasks_change', handleSync);
    return () => window.removeEventListener('ferex_rimi_tasks_change', handleSync);
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const filteredTasks = tasks.filter(t => {
    if (filterCategory !== 'All' && t.category !== filterCategory) return false;
    if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (filterStaff !== 'All' && t.assigned_to_name !== filterStaff && t.assigned_to_id !== filterStaff) return false;
    if (myTasksOnly) {
      const assigned = (t.assigned_to_name || '').toLowerCase();
      const user = currentUserName.toLowerCase();
      const email = currentUserEmail.toLowerCase();
      const isMine = assigned.includes(user) || assigned.includes(email) || t.assigned_to_id === currentUserEmail;
      if (!isMine) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (t.title || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.assigned_to_name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Create form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    category: 'Dispatch & Logistics' as const,
    assigned_to_name: staffList[0]?.name || currentUserName,
    priority: 'High' as const,
    due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    const assignedName = newTask.assigned_to_name || staffList[0]?.name || currentUserName;
    const matchedStaff = staffList.find(s => s.name === assignedName);
    await createRimiTask({
      ...newTask,
      assigned_to_name: assignedName,
      assigned_to_id: matchedStaff?.id || 'staff-1',
      assigned_to_role: (matchedStaff?.role || 'Operations Staff') as any,
      assigned_by: isAdmin ? 'Rimi Distribution Director' : currentUserName
    });

    setShowCreateModal(false);
    showToastMsg('Task created and assigned!');
    setNewTask({
      title: '',
      description: '',
      category: 'Dispatch & Logistics',
      assigned_to_name: staffList[0]?.name || currentUserName,
      priority: 'High',
      due_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]
    });
    loadData();
  };

  const handleSaveRenameTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTitleTask || !newTitleValue.trim()) return;

    await renameRimiTaskTitle(editingTitleTask.id, newTitleValue.trim());
    showToastMsg(`Task title updated: "${newTitleValue.trim()}"`);
    setEditingTitleTask(null);
    loadData();
  };

  const handleSaveReassignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassigningTask || !selectedNewStaff) return;

    const matched = staffList.find(s => s.name === selectedNewStaff);
    await reassignRimiTask(reassigningTask.id, matched?.id || 'staff-1', selectedNewStaff);
    showToastMsg(`Task reassigned to ${selectedNewStaff}`);
    setReassigningTask(null);
    loadData();
  };

  const handleToggleStatus = async (task: RimiTask) => {
    const nextStatus = task.status === 'Completed' ? 'In Progress' : task.status === 'In Progress' ? 'Completed' : 'In Progress';
    await updateRimiTask(task.id, { status: nextStatus });
    showToastMsg(`Task marked as ${nextStatus}`);
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this task?')) return;
    await deleteRimiTask(id);
    showToastMsg('Task deleted.');
    loadData();
  };

  return (
    <div className="space-y-6 text-left antialiased">
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Operations & Task Management
            </h1>
            <span className="text-[10px] uppercase font-black tracking-wider bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
              {isAdmin ? 'Admin & Central Assignment' : 'My Assigned Tasks'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            {isAdmin
              ? 'Assign, rename, and dynamically reassign tasks across operational staff, QC teams, and regional sales executives.'
              : 'Working-level tasks assigned specifically to you. Update progress and mark completion in real time.'}
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-md flex items-center gap-2"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4" /> Assign New Task
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5 bg-white border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search tasks, descriptions, or staff..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Categories</option>
              <option value="Dispatch & Logistics">Dispatch & Logistics</option>
              <option value="Cold Chain QC">Cold Chain QC</option>
              <option value="CRM Followup">CRM Followup</option>
              <option value="Payment Collection">Payment Collection</option>
              <option value="Warehouse Audit">Warehouse Audit</option>
            </select>
          </div>

          <div>
            <select
              value={filterPriority}
              onChange={e => setFilterPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.map(t => (
          <Card key={t.id} className="p-4 bg-white border-slate-200 shadow-xs space-y-3 relative group">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    t.priority === 'Critical' ? 'bg-rose-100 text-rose-800' :
                    t.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {t.priority} Priority
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{t.category}</span>
                </div>

                {/* Editable Task Title */}
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 leading-snug">{t.title}</h3>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingTitleTask(t);
                        setNewTitleValue(t.title);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-all cursor-pointer"
                      title="Rename Task Title"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status Toggle Button */}
              <button
                onClick={() => handleToggleStatus(t)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  t.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                    : t.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                    : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> {t.status}
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium leading-relaxed">{t.description}</p>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 font-bold text-slate-700">
                  <UserCheck className="w-3.5 h-3.5 text-[#58051E]" />
                  <span>{t.assigned_to_name}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setReassigningTask(t);
                      setSelectedNewStaff(t.assigned_to_name || staffList[0]?.name || '');
                    }}
                    className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Reassign
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due: {t.due_date}
                </span>

                {isAdmin && (
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="hover:text-rose-600 cursor-pointer p-1"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {filteredTasks.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-slate-200">
            No operational tasks found for this view.
          </div>
        )}
      </div>

      {/* Modal: Rename Task Title */}
      <AnimatePresence>
        {editingTitleTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingTitleTask(null)} className="fixed inset-0 bg-slate-900/50" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-4">
              <h3 className="text-sm font-black text-slate-900">Rename Task / Project Title</h3>
              <form onSubmit={handleSaveRenameTitle} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Editable Title *</label>
                  <input
                    type="text"
                    required
                    value={newTitleValue}
                    onChange={e => setNewTitleValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setEditingTitleTask(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Save Title</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Reassign Task */}
      <AnimatePresence>
        {reassigningTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReassigningTask(null)} className="fixed inset-0 bg-slate-900/50" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-4">
              <h3 className="text-sm font-black text-slate-900">Reassign Task to Staff</h3>
              <p className="text-xs text-slate-500 font-semibold">{reassigningTask.title}</p>
              <form onSubmit={handleSaveReassignment} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Select Operations Staff *</label>
                  <select
                    value={selectedNewStaff}
                    onChange={e => setSelectedNewStaff(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setReassigningTask(null)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Confirm Reassignment</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Create Task */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="fixed inset-0 bg-slate-900/50" />
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl z-10 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900">Assign New Operational Task</h3>
                <button onClick={() => setShowCreateModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Task / Project Title *</label>
                  <input
                    required
                    placeholder="e.g. Audit Cold Chamber #4 Defrost & Sensor Calibration"
                    value={newTask.title}
                    onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Description & Scope</label>
                  <textarea
                    rows={2}
                    placeholder="Detailed operational steps and instructions..."
                    value={newTask.description}
                    onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Category</label>
                    <select
                      value={newTask.category}
                      onChange={(e: any) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="Dispatch & Logistics">Dispatch & Logistics</option>
                      <option value="Cold Chain QC">Cold Chain QC</option>
                      <option value="CRM Followup">CRM Followup</option>
                      <option value="Payment Collection">Payment Collection</option>
                      <option value="Warehouse Audit">Warehouse Audit</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e: any) => setNewTask({ ...newTask, priority: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Assign to Staff</label>
                    <select
                      value={newTask.assigned_to_name}
                      onChange={e => setNewTask({ ...newTask, assigned_to_name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                    >
                      {staffList.map(s => (
                        <option key={s.id} value={s.name}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.due_date}
                      onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" className="bg-[#58051E] text-white">Create & Assign</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
