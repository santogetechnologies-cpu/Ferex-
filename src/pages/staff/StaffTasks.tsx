import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, CheckCircle2, Clock, LayoutGrid, List, Plus, X,
  Search, ArrowRight, RotateCcw, Zap, AlertCircle, Calendar, Sparkles
} from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../contexts/AuthContext';
import type { Task } from '../../lib/types';

export const StaffTasks: React.FC = () => {
  const { user } = useAuth();
  const { tasks, loading, addTask, changeStatus } = useTasks();
  const [toast, setToast] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('Medium');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  // Helper to normalize task status into our 3 core buckets
  const getNormalizedStatus = (status: string): 'Pending' | 'Processing' | 'Completed' => {
    const s = (status || '').toLowerCase();
    if (s.includes('complete') || s.includes('done')) return 'Completed';
    if (s.includes('progress') || s.includes('process') || s.includes('review')) return 'Processing';
    return 'Pending';
  };

  const handleStatusChange = async (id: string, newStatus: Task['status']) => {
    try {
      await changeStatus(id, newStatus);
      const label = newStatus === 'In Progress' ? 'Processing' : newStatus;
      showToast(`Task status updated to ${label}`);
    } catch (err: any) {
      showToast(`Error updating task: ${err.message}`);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !user) return;

    try {
      setIsSubmitting(true);
      await addTask({
        created_by: user.id,
        title: newTitle.trim(),
        description: newDesc.trim(),
        priority: newPriority,
        due_date: newDueDate || undefined,
      });
      showToast(`Task "${newTitle}" created successfully!`);
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
    } catch (err: any) {
      showToast(`Error adding task: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Metrics
  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => getNormalizedStatus(t.status) === 'Pending').length,
    processing: tasks.filter(t => getNormalizedStatus(t.status) === 'Processing').length,
    completed: tasks.filter(t => getNormalizedStatus(t.status) === 'Completed').length,
  };

  const filteredTasks = tasks.filter(t => {
    const norm = getNormalizedStatus(t.status);
    const matchesStatus =
      filterStatus === 'All' ||
      (filterStatus === 'Pending' && norm === 'Pending') ||
      (filterStatus === 'Processing' && norm === 'Processing') ||
      (filterStatus === 'Completed' && norm === 'Completed');

    const matchesPriority = filterPriority === 'All' || t.priority === filterPriority;

    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getPriorityStyle = (p: Task['priority']) => {
    switch (p) {
      case 'Critical': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'High': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Medium': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 text-left antialiased select-none min-h-[550px]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-8 z-50 bg-[#58051E] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/20"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-[#58051E]" /> My Assigned Tasks
          </h1>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">
            Monitor, process, and complete assigned advisory milestones, document audits, and operational tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer shadow-xs"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" /> Create Task
          </Button>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-2xs font-extrabold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Kanban
            </button>
          </div>
        </div>
      </div>

      {/* ── Status KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card
          onClick={() => setFilterStatus('All')}
          className={`p-3.5 border transition-all cursor-pointer ${
            filterStatus === 'All' ? 'border-[#58051E] bg-[#58051E]/5 shadow-sm' : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Tasks</div>
          <div className="text-xl font-black text-slate-900 mt-1">{counts.all}</div>
        </Card>

        <Card
          onClick={() => setFilterStatus('Pending')}
          className={`p-3.5 border transition-all cursor-pointer ${
            filterStatus === 'Pending' ? 'border-amber-500 bg-amber-50 shadow-sm' : 'border-amber-200/80 bg-amber-50/40 hover:border-amber-300'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <Clock className="w-3 h-3" /> ⏳ Pending
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">{counts.pending}</div>
        </Card>

        <Card
          onClick={() => setFilterStatus('Processing')}
          className={`p-3.5 border transition-all cursor-pointer ${
            filterStatus === 'Processing' ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-blue-200/80 bg-blue-50/40 hover:border-blue-300'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1">
            <Zap className="w-3 h-3 text-blue-600" /> ⚡ Processing
          </div>
          <div className="text-xl font-black text-blue-900 mt-1">{counts.processing}</div>
        </Card>

        <Card
          onClick={() => setFilterStatus('Completed')}
          className={`p-3.5 border transition-all cursor-pointer ${
            filterStatus === 'Completed' ? 'border-emerald-500 bg-emerald-50 shadow-sm' : 'border-emerald-200/80 bg-emerald-50/40 hover:border-emerald-300'
          }`}
        >
          <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ✓ Completed
          </div>
          <div className="text-xl font-black text-emerald-900 mt-1">{counts.completed}</div>
        </Card>
      </div>

      {/* ── Search & Filter Tabs ── */}
      <Card className="p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, note, or ID..."
            className="w-full h-9 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#58051E]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Status Filter:</span>
          {[
            { key: 'All', label: 'All', count: counts.all },
            { key: 'Pending', label: 'Pending', count: counts.pending },
            { key: 'Processing', label: 'Processing', count: counts.processing },
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

      {/* Task Content */}
      {loading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <Card className="p-12 text-center space-y-3 border border-slate-200/80 bg-slate-50/50">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-800">No Tasks Found in this view</h3>
            <p className="text-xs font-semibold text-slate-500">Try changing your status filter or create a new advisory task.</p>
          </div>
          <Button size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white text-xs font-bold cursor-pointer" onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add New Task
          </Button>
        </Card>
      ) : viewMode === 'list' ? (
        <div className="space-y-3.5">
          {filteredTasks.map(task => {
            const normStatus = getNormalizedStatus(task.status);
            const isCompleted = normStatus === 'Completed';
            const isProcessing = normStatus === 'Processing';
            const isPending = normStatus === 'Pending';

            return (
              <Card key={task.id} className="p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-3.5 text-left bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase font-mono text-[#58051E] bg-[#58051E]/10 px-2 py-0.5 rounded-md">
                        #{task.id.slice(0, 8)}
                      </span>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${getPriorityStyle(task.priority)}`}>
                        {task.priority} Priority
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">{task.title}</h3>
                    {task.description && <p className="text-xs font-semibold text-slate-500 mt-1">{task.description}</p>}
                  </div>

                  {/* Prominent Status Pill */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.due_date && (
                      <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Due: {task.due_date}
                      </span>
                    )}

                    <span className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 border shadow-2xs ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : isProcessing
                        ? 'bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}>
                      {isCompleted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Completed
                        </>
                      ) : isProcessing ? (
                        <>
                          <Zap className="w-3.5 h-3.5 text-blue-600 animate-pulse" /> Processing
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Pending
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Status Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold pt-1">
                  <div className="text-[11px] text-slate-400">
                    Created: <span className="font-mono text-slate-600">{task.created_at ? new Date(task.created_at).toLocaleDateString() : 'Active'}</span>
                  </div>

                    <div className="flex items-center gap-2">
                      {isPending && (
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer shadow-xs"
                          onClick={() => handleStatusChange(task.id, 'In Progress')}
                        >
                          <Zap className="w-3.5 h-3.5 mr-1 text-blue-200" /> Start Processing ➔
                        </Button>
                      )}

                      {isProcessing && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer shadow-xs"
                          onClick={() => handleStatusChange(task.id, 'Completed')}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark as Completed ✓
                        </Button>
                      )}

                      {isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs font-bold border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer"
                          onClick={() => handleStatusChange(task.id, 'In Progress')}
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" /> Reopen as Processing
                        </Button>
                      )}

                      <button
                        onClick={async () => {
                          if (window.confirm('Delete this task?')) {
                            const { deleteTask } = await import('../../lib/api/tasks');
                            await deleteTask(task.id);
                            showToast('Task removed.');
                            window.dispatchEvent(new Event('ferex_tasks_change'));
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="Delete Task"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['Pending', 'Processing', 'Completed'] as const).map(colStatus => {
            const colTasks = filteredTasks.filter(t => getNormalizedStatus(t.status) === colStatus);
            const isColPending = colStatus === 'Pending';
            const isColProcessing = colStatus === 'Processing';
            const isColCompleted = colStatus === 'Completed';

            return (
              <div key={colStatus} className="space-y-3">
                <div className={`p-3 rounded-2xl flex items-center justify-between text-xs font-black border ${
                  isColCompleted
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    : isColProcessing
                    ? 'bg-blue-50 text-blue-900 border-blue-200'
                    : 'bg-amber-50 text-amber-900 border-amber-200'
                }`}>
                  <span className="flex items-center gap-1.5">
                    {isColCompleted ? '✓ Completed' : isColProcessing ? '⚡ Processing' : '⏳ Pending'}
                  </span>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    isColCompleted ? 'bg-emerald-200 text-emerald-900' : isColProcessing ? 'bg-blue-200 text-blue-900' : 'bg-amber-200 text-amber-900'
                  }`}>
                    {colTasks.length}
                  </span>
                </div>

                <div className="space-y-3 min-h-[150px]">
                  {colTasks.length === 0 ? (
                    <div className="p-8 text-center text-xs font-semibold text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      No {colStatus.toLowerCase()} tasks
                    </div>
                  ) : (
                    colTasks.map(task => (
                      <Card key={task.id} className="p-4 border border-slate-200/80 shadow-2xs hover:shadow-md transition-all space-y-3 text-left bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-[#58051E] bg-[#58051E]/10 px-1.5 py-0.5 rounded">
                            #{task.id.slice(0, 8)}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityStyle(task.priority)}`}>
                            {task.priority}
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900">{task.title}</h4>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-2">{task.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] font-semibold text-slate-400">
                          <span>{task.due_date ? `Due: ${task.due_date}` : 'No due date'}</span>
                          {isColPending && (
                            <button
                              onClick={() => handleStatusChange(task.id, 'In Progress')}
                              className="text-blue-600 font-bold hover:underline cursor-pointer"
                            >
                              Process ➔
                            </button>
                          )}
                          {isColProcessing && (
                            <button
                              onClick={() => handleStatusChange(task.id, 'Completed')}
                              className="text-emerald-600 font-bold hover:underline cursor-pointer"
                            >
                              Complete ✓
                            </button>
                          )}
                          {isColCompleted && (
                            <button
                              onClick={() => handleStatusChange(task.id, 'In Progress')}
                              className="text-slate-500 font-bold hover:underline cursor-pointer"
                            >
                              Reopen ↺
                            </button>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 z-10 text-left space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#58051E]" /> Create New Advisory Task
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4 text-xs font-semibold">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Task Title *</label>
                  <input type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Audit student financial affidavit" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:border-[#58051E]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Priority</label>
                    <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold">
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Due Date</label>
                    <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Description / Notes</label>
                  <textarea rows={2} value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Task details and instructions..." className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900" />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => setShowAddModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting} size="sm" className="bg-[#58051E] hover:bg-[#430316] text-white font-black cursor-pointer">{isSubmitting ? 'Creating...' : 'Create Task'}</Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffTasks;

