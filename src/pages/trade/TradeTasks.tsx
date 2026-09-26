import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ListTodo, Search, Plus, CheckCircle2, Clock, X,
  UserCheck, AlertCircle, Trash2, Edit3, ArrowRight,
  Filter, Calendar, Building2, Layers, RefreshCw, UserPlus, Sparkles
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ToastNotification } from '../../components/ToastNotification';
import {
  getTradeTasks,
  createTradeTask,
  updateTradeTaskStatus,
  reassignTradeTask,
  deleteTradeTask,
  getTradeStaffOfficers,
  getTradeStaff,
  getTradeOrders,
  type TradeTask,
  type TaskPriority,
  type TaskStatus,
  type TradeOrder
} from '../../lib/api/trade';
import { createDivisionStaff } from '../../lib/api/staff';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export const TradeTasks: React.FC = () => {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<TradeTask[]>([]);
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState<string>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [reassigningTask, setReassigningTask] = useState<TradeTask | null>(null);
  const [toast, setToast] = useState('');

  const [staffList, setStaffList] = useState(getTradeStaffOfficers());
  const userEmail = profile?.email || 'trade@ferex.com';
  const userName = profile?.full_name || 'Trade Logistics Desk';

  // Mode for staff assignment inside modal: 'select' | 'new'
  const [staffAssignMode, setStaffAssignMode] = useState<'select' | 'new'>('select');
  const [newStaffForm, setNewStaffForm] = useState({
    name: '',
    email: '',
    role: 'logistics_officer',
    department: 'Trade Logistics & Customs'
  });

  const initialForm = {
    title: '',
    category: 'Order Handling' as TradeTask['category'],
    order_no: '',
    client_name: '',
    assigned_staff_name: staffList[0]?.name || userName,
    assigned_staff_email: staffList[0]?.email || userEmail,
    priority: 'Medium' as TaskPriority,
    status: 'Pending' as TaskStatus,
    due_date: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    notes: '',
  };

  const [formData, setFormData] = useState(initialForm);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [allTasks, allOrders, realStaff] = await Promise.all([
        getTradeTasks(),
        getTradeOrders(),
        getTradeStaff()
      ]);
      setTasks(Array.isArray(allTasks) ? allTasks : []);
      setOrders(Array.isArray(allOrders) ? allOrders : []);
      if (Array.isArray(realStaff) && realStaff.length > 0) {
        setStaffList(realStaff);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('trade_tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trade_tasks' }, () => {
        loadData();
      })
      .subscribe();

    const handleLocalChange = () => loadData();
    window.addEventListener('ferex_trade_tasks_change', handleLocalChange);
    window.addEventListener('ferex_trade_staff_change', handleLocalChange);
    window.addEventListener('ferex_staff_users_change', handleLocalChange);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('ferex_trade_tasks_change', handleLocalChange);
      window.removeEventListener('ferex_trade_staff_change', handleLocalChange);
      window.removeEventListener('ferex_staff_users_change', handleLocalChange);
    };
  }, [loadData]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOrderSelect = (orderNo: string) => {
    const ord = orders.find(o => o.order_no === orderNo);
    setFormData(prev => ({
      ...prev,
      order_no: orderNo,
      client_name: ord?.client_name || prev.client_name,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToastMsg('Please enter a task title.');
      return;
    }

    let assignedName = formData.assigned_staff_name;
    let assignedEmail = formData.assigned_staff_email;

    // If admin is entering a new custom staff officer
    if (staffAssignMode === 'new') {
      if (!newStaffForm.name.trim() || !newStaffForm.email.trim()) {
        showToastMsg('Please enter the new staff officer name and email.');
        return;
      }
      try {
        const createdStaff = await createDivisionStaff({
          name: newStaffForm.name.trim(),
          email: newStaffForm.email.trim().toLowerCase(),
          role: newStaffForm.role,
          division: 'trade',
          department: newStaffForm.department || 'Trade Logistics & Customs'
        });
        assignedName = createdStaff.name;
        assignedEmail = createdStaff.email;
        showToastMsg(`Registered new staff officer: ${createdStaff.name}`);
      } catch (err: any) {
        console.error('Failed to auto-register new staff:', err);
        assignedName = newStaffForm.name.trim();
        assignedEmail = newStaffForm.email.trim().toLowerCase();
      }
    }

    try {
      const created = await createTradeTask({
        ...formData,
        assigned_staff_name: assignedName,
        assigned_staff_email: assignedEmail
      });
      setShowCreateModal(false);
      setFormData(initialForm);
      setStaffAssignMode('select');
      setNewStaffForm({ name: '', email: '', role: 'logistics_officer', department: 'Trade Logistics & Customs' });
      showToastMsg(`Task "${created?.title || 'Task'}" assigned to ${created?.assigned_staff_name || 'Staff'}!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to create task: ${err.message || 'Error'}`);
    }
  };

  const handleDirectAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffForm.name.trim() || !newStaffForm.email.trim()) {
      showToastMsg('Please enter staff name and email.');
      return;
    }
    try {
      const createdStaff = await createDivisionStaff({
        name: newStaffForm.name.trim(),
        email: newStaffForm.email.trim().toLowerCase(),
        role: newStaffForm.role,
        division: 'trade',
        department: newStaffForm.department || 'Trade Logistics & Customs'
      });
      setShowAddStaffModal(false);
      setNewStaffForm({ name: '', email: '', role: 'logistics_officer', department: 'Trade Logistics & Customs' });
      showToastMsg(`Staff officer "${createdStaff.name}" added successfully!`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to add staff: ${err.message || 'Error'}`);
    }
  };

  const handleStatusToggle = async (task: TradeTask) => {
    const nextStatus: TaskStatus = task.status === 'Pending' ? 'In Progress' : task.status === 'In Progress' ? 'Completed' : 'Pending';
    try {
      await updateTradeTaskStatus(task.id, nextStatus);
      showToastMsg(`Task updated to ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Error: ${err.message}`);
    }
  };

  const handleReassignSubmit = async (newStaffName: string, newStaffEmail: string) => {
    if (!reassigningTask) return;
    try {
      await reassignTradeTask(reassigningTask.id, newStaffName, newStaffEmail);
      showToastMsg(`Task reassigned to ${newStaffName}!`);
      setReassigningTask(null);
      await loadData();
    } catch (err: any) {
      showToastMsg(`Failed to reassign: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    await deleteTradeTask(id);
    showToastMsg('Task removed');
    await loadData();
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'Urgent': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Low': return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.assigned_staff_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.order_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.client_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6 text-left antialiased">
      {/* Toast */}
      <ToastNotification message={toast} onClose={() => setToast('')} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-[#58051E]" />
            Trade Task & Operations Assignment
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Assign and monitor order handling, documentation, customs, and logistics tasks across Trade Officers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddStaffModal(true)}
            className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 mr-1.5 text-[#58051E]" />
            Add New Staff
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setStaffAssignMode('select');
              setShowCreateModal(true);
            }}
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Assign New Task
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3.5 border border-slate-200/80 bg-white">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">All Tasks</div>
          <div className="text-xl font-black text-slate-900 mt-1">{counts.all}</div>
        </Card>
        <Card className="p-3.5 border border-amber-200/80 bg-amber-50/40">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-amber-700">Pending</div>
          <div className="text-xl font-black text-amber-900 mt-1">{counts.pending}</div>
        </Card>
        <Card className="p-3.5 border border-blue-200/80 bg-blue-50/40">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-blue-700">In Progress</div>
          <div className="text-xl font-black text-blue-900 mt-1">{counts.inProgress}</div>
        </Card>
        <Card className="p-3.5 border border-emerald-200/80 bg-emerald-50/40">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">Completed</div>
          <div className="text-xl font-black text-emerald-900 mt-1">{counts.completed}</div>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, officers, orders..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Status:</span>
          {[
            { key: 'All', label: 'All', count: counts.all },
            { key: 'Pending', label: 'Pending', count: counts.pending },
            { key: 'In Progress', label: 'In Progress', count: counts.inProgress },
            { key: 'Completed', label: 'Completed', count: counts.completed }
          ].map(st => (
            <button
              key={st.key}
              onClick={() => setFilterStatus(st.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterStatus === st.key
                  ? 'bg-[#58051E] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span>{st.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                filterStatus === st.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {st.count}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Task List */}
      {loading ? (
        <div className="p-12 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[#58051E]" /> Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center border border-dashed border-slate-200">
          <ListTodo className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-black text-slate-800">No operational tasks found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Assign tasks to Trade Officers for documentation reviews, phytosanitary checks, or balance follow-ups.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(task.is_central_directive || task.created_by === 'Central Admin' || (task.notes && task.notes.toLowerCase().includes('central admin'))) && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-[#58051E] text-white flex items-center gap-1 shadow-2xs">
                        Central HQ
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${getPriorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-600">
                      {task.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStatusToggle(task)}
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-black cursor-pointer transition-all shrink-0 ${
                      task.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : task.status === 'In Progress'
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    }`}
                    title="Click to advance status"
                  >
                    {task.status}
                  </button>
                </div>

                <h3 className="text-sm font-black text-slate-900 leading-snug mb-1">{task.title}</h3>

                {task.order_no && (
                  <div className="text-[11px] text-[#58051E] font-extrabold mb-2 flex items-center gap-1">
                    <span>Linked Order:</span> <span>{task.order_no} {task.client_name ? `(${task.client_name})` : ''}</span>
                  </div>
                )}

                {task.notes && (
                  <p className="text-xs text-slate-600 font-medium bg-slate-50 p-2 rounded-xl mb-3 border border-slate-100">
                    {task.notes}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span className="font-bold">{task.assigned_staff_name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Due: {task.due_date}</span>
                  <button
                    onClick={() => setReassigningTask(task)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    title="Reassign Staff"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(task.id, task.title)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ── CREATE / ASSIGN TASK MODAL ── */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowCreateModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#58051E]" /> Assign Operational Task
                </h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Review Phytosanitary Certificate for Lot #8801"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="Order Handling">Order Handling</option>
                      <option value="Documentation">Documentation</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Customs & Port">Customs & Port</option>
                      <option value="Finance">Finance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                      className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Link to Order (Optional)</label>
                  <select
                    value={formData.order_no}
                    onChange={(e) => handleOrderSelect(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- No specific order --</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.order_no}>{o.order_no} — {o.client_name}</option>
                    ))}
                  </select>
                </div>

                {/* Staff Assignment Mode Toggle */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">Staff Officer Assignment *</label>
                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setStaffAssignMode('select')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          staffAssignMode === 'select' ? 'bg-[#58051E] text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffAssignMode('new')}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                          staffAssignMode === 'new' ? 'bg-[#58051E] text-white' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        + Enter New Staff
                      </button>
                    </div>
                  </div>

                  {staffAssignMode === 'select' ? (
                    <div>
                      <select
                        value={formData.assigned_staff_name}
                        onChange={(e) => {
                          const st = staffList.find(s => s.name === e.target.value);
                          setFormData({
                            ...formData,
                            assigned_staff_name: e.target.value,
                            assigned_staff_email: st?.email || ''
                          });
                        }}
                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                      >
                        {staffList.map(s => (
                          <option key={s.email} value={s.name}>
                            {s.name} — {s.roleLabel || s.role} ({s.email})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <input
                            type="text"
                            value={newStaffForm.name}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                            placeholder="Officer Full Name *"
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                          />
                        </div>
                        <div>
                          <input
                            type="email"
                            value={newStaffForm.email}
                            onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                            placeholder="officer@ferex.com *"
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newStaffForm.role}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                          className="w-full h-8 px-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                        >
                          <option value="logistics_officer">Trade Logistics Officer</option>
                          <option value="trade_admin">Trade Director</option>
                          <option value="customs_officer">Customs & Port Specialist</option>
                          <option value="staff">Operations Staff</option>
                        </select>
                        <input
                          type="text"
                          value={newStaffForm.department}
                          onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value })}
                          placeholder="Department"
                          className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#58051E]"
                        />
                      </div>
                      <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 shrink-0" />
                        This officer will be registered automatically and available for all future tasks.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Instructions / Notes</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Specific operational instructions..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Assign Task</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── DIRECT ADD STAFF MODAL ── */}
      <AnimatePresence>
        {showAddStaffModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50" onClick={() => setShowAddStaffModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#58051E]" /> Register Trade Staff Officer
                </h3>
                <button onClick={() => setShowAddStaffModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleDirectAddStaff} className="space-y-3 text-xs font-semibold">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStaffForm.name}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, name: e.target.value })}
                    placeholder="e.g. Alexander Vance"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newStaffForm.email}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, email: e.target.value })}
                    placeholder="e.g. alexander@ferex.com"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Operational Role</label>
                  <select
                    value={newStaffForm.role}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, role: e.target.value })}
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="logistics_officer">Trade Logistics Officer</option>
                    <option value="trade_admin">Trade Director</option>
                    <option value="customs_officer">Customs & Port Specialist</option>
                    <option value="staff">Operations Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={newStaffForm.department}
                    onChange={(e) => setNewStaffForm({ ...newStaffForm, department: e.target.value })}
                    placeholder="Trade Logistics & Customs"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#58051E]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddStaffModal(false)}>Cancel</Button>
                  <Button type="submit" size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white">Save Staff Officer</Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── REASSIGN STAFF MODAL ── */}
      <AnimatePresence>
        {reassigningTask && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50" onClick={() => setReassigningTask(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1 }} className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-3xl shadow-2xl z-50 border border-slate-100 p-6 text-left">
              <h3 className="text-sm font-black text-slate-900 mb-1">Reassign Task</h3>
              <p className="text-xs text-slate-500 font-semibold mb-4">"{reassigningTask.title}"</p>
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto pr-1">
                {staffList.map(s => (
                  <button
                    key={s.email}
                    onClick={() => handleReassignSubmit(s.name, s.email)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-[#58051E] hover:bg-[#58051E]/5 text-left transition-all flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] text-slate-400">{s.roleLabel || s.role}</span>
                  </button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => setReassigningTask(null)}>Cancel</Button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TradeTasks;

